import { type Collection, type Db, type Filter, MongoServerError, ObjectId } from "mongodb";

export class GraphNotFound extends Error {}
export class SourceExists extends Error {}
export class SourceNotFound extends Error {}
export class SourceNotInGraph extends Error {}
export class ConnectionExists extends Error {}
export class ConnectionNotFound extends Error {}
export class ConnectionNotInGraph extends Error {}
export class NoteNotFound extends Error {}
export class SameGraph extends Error {}

export type Graph = string & { readonly __brand: "Graph" };
export type Source = string & { readonly __brand: "Source" };
export type Connection = string & { readonly __brand: "Connection" };
export type Note = string & { readonly __brand: "Note" };

const NO_GRAPH = "There is no such graph.";
const SOURCE_EXISTS = "This graph already has a source with that URL.";
const ENDPOINT_NOT_IN_GRAPH = "Both sources of a connection must belong to its graph.";
const CONNECTION_EXISTS = "This graph already has a connection from that source to that destination.";

/*
 * Storage layout. The spec's "graph's sources" and "graph's connections" are stored as a `graph`
 * field on each source and connection, and "source's notes" and "connection's notes" as a
 * `source` or `connection` field on each note. That way the unique indexes below can enforce
 * "no two sources in a graph share a URL" and "no two connections in a graph share endpoints".
 * `added` is an ObjectId, used only to sort rows by when they were added.
 *
 * A note copied by mergeGraph keeps the note it was first written as in `origin`, so a later merge
 * can tell the copy is already there. Two notes with the same author and text are still different
 * notes, because their origins differ.
 */

interface GraphDocument {
  _id: Graph;
  name: string;
}

interface SourceDocument<User> {
  _id: Source;
  graph: Graph;
  url: string;
  contributors: User[];
  added: ObjectId;
}

interface ConnectionDocument<User> {
  _id: Connection;
  graph: Graph;
  source: Source;
  destination: Source;
  contributors: User[];
  added: ObjectId;
}

interface NoteDocument<User> {
  _id: Note;
  source?: Source;
  connection?: Connection;
  author: User;
  text: string;
  origin?: Note;
  added: ObjectId;
}

type Owner = { source: Source } | { connection: Connection };

/** Preserves connections between sources so that users can understand how discoveries relate to one another and trace the paths between them. */
export class DiscoveryLinkingConcept<User extends string> {
  private readonly graphs: Collection<GraphDocument>;
  private readonly sources: Collection<SourceDocument<User>>;
  private readonly connections: Collection<ConnectionDocument<User>>;
  private readonly notes: Collection<NoteDocument<User>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "DiscoveryLinking") {
    const prefix = name.toLowerCase();
    this.graphs = database.collection(`${prefix}.graphs`);
    this.sources = database.collection(`${prefix}.sources`);
    this.connections = database.collection(`${prefix}.connections`);
    this.notes = database.collection(`${prefix}.notes`);
  }

  /** Creates the indexes once. The unique ones make MongoDB refuse a duplicate URL or connection in a graph, even when two are added at once. If creating them fails, the next action tries again. */
  #ready() {
    this.indexes ??= Promise.all([
      this.sources.createIndex({ graph: 1, url: 1 }, { unique: true }),
      this.connections.createIndex({ graph: 1, source: 1, destination: 1 }, { unique: true }),
      this.connections.createIndex({ graph: 1, destination: 1 }),
      this.notes.createIndex({ source: 1 }, { sparse: true }),
      this.notes.createIndex({ connection: 1 }, { sparse: true }),
      // At most one copy of each origin on a source or connection, even when two merges copy it at once.
      this.notes.createIndex(
        { source: 1, origin: 1 },
        { unique: true, partialFilterExpression: { source: { $exists: true }, origin: { $exists: true } } },
      ),
      this.notes.createIndex(
        { connection: 1, origin: 1 },
        { unique: true, partialFilterExpression: { connection: { $exists: true }, origin: { $exists: true } } },
      ),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async #requireGraph(graph: Graph) {
    if ((await this.graphs.countDocuments({ _id: graph }, { limit: 1 })) === 0) throw new GraphNotFound(NO_GRAPH);
  }

  async #bothInGraph(graph: Graph, source: Source, destination: Source) {
    const found = await this.sources.countDocuments({ graph, _id: { $in: [source, destination] } });
    return found === (source === destination ? 1 : 2);
  }

  async createGraph({ name }: { name: string }) {
    const graph = crypto.randomUUID() as Graph;
    await this.graphs.insertOne({ _id: graph, name });
    return { graph };
  }

  async addSource({ graph, url, contributor }: { graph: Graph; url: string; contributor: User }) {
    await this.#requireGraph(graph);
    const source = crypto.randomUUID() as Source;
    await this.#ready();
    try {
      await this.sources.insertOne({ _id: source, graph, url, contributors: [contributor], added: new ObjectId() });
    } catch (error) {
      if (isDuplicate(error)) throw new SourceExists(SOURCE_EXISTS);
      throw error;
    }
    return { source };
  }

  async addConnection({
    graph,
    source,
    destination,
    contributor,
  }: {
    graph: Graph;
    source: Source;
    destination: Source;
    contributor: User;
  }) {
    await this.#requireGraph(graph);
    if (!(await this.#bothInGraph(graph, source, destination))) throw new SourceNotInGraph(ENDPOINT_NOT_IN_GRAPH);
    const connection = crypto.randomUUID() as Connection;
    await this.#ready();
    try {
      await this.connections.insertOne({
        _id: connection,
        graph,
        source,
        destination,
        contributors: [contributor],
        added: new ObjectId(),
      });
    } catch (error) {
      if (isDuplicate(error)) throw new ConnectionExists(CONNECTION_EXISTS);
      throw error;
    }
    // removeSource deletes the source before its connections, so if an endpoint was removed
    // while this connection was being added, one of the two sees the other and the connection
    // does not outlive its endpoint.
    if (!(await this.#bothInGraph(graph, source, destination))) {
      await this.connections.deleteOne({ _id: connection });
      throw new SourceNotInGraph(ENDPOINT_NOT_IN_GRAPH);
    }
    return { connection };
  }

  async addNoteToSource({ source, author, text }: { source: Source; author: User; text: string }) {
    if ((await this.sources.countDocuments({ _id: source }, { limit: 1 })) === 0) {
      throw new SourceNotFound("There is no such source.");
    }
    const note = await this.#insertNote({ source, author, text });
    // As in addConnection: a note added while its source is removed does not outlive it.
    if ((await this.sources.countDocuments({ _id: source }, { limit: 1 })) === 0) {
      await this.notes.deleteOne({ _id: note });
      throw new SourceNotFound("There is no such source.");
    }
    return { note };
  }

  async addNoteToConnection({ connection, author, text }: { connection: Connection; author: User; text: string }) {
    if ((await this.connections.countDocuments({ _id: connection }, { limit: 1 })) === 0) {
      throw new ConnectionNotFound("There is no such connection.");
    }
    const note = await this.#insertNote({ connection, author, text });
    if ((await this.connections.countDocuments({ _id: connection }, { limit: 1 })) === 0) {
      await this.notes.deleteOne({ _id: note });
      throw new ConnectionNotFound("There is no such connection.");
    }
    return { note };
  }

  async #insertNote(fields: Owner & { author: User; text: string }) {
    const note = crypto.randomUUID() as Note;
    await this.#ready();
    await this.notes.insertOne({ _id: note, ...fields, added: new ObjectId() });
    return note;
  }

  async removeSource({ graph, source }: { graph: Graph; source: Source }) {
    await this.#requireGraph(graph);
    const removed = await this.sources.findOneAndDelete({ _id: source, graph });
    if (removed === null) throw new SourceNotInGraph("That source does not belong to this graph.");
    const involved = await this.connections
      .find({ graph, $or: [{ source }, { destination: source }] }, { projection: { _id: 1 } })
      .toArray();
    const connections = involved.map(({ _id }) => _id);
    await this.connections.deleteMany({ _id: { $in: connections } });
    await this.notes.deleteMany({ $or: [{ source }, { connection: { $in: connections } }] });
    return {};
  }

  async removeConnection({ graph, connection }: { graph: Graph; connection: Connection }) {
    await this.#requireGraph(graph);
    const removed = await this.connections.findOneAndDelete({ _id: connection, graph });
    if (removed === null) throw new ConnectionNotInGraph("That connection does not belong to this graph.");
    await this.notes.deleteMany({ connection });
    return {};
  }

  async editNote({ note, text }: { note: Note; text: string }) {
    const { matchedCount } = await this.notes.updateOne({ _id: note }, { $set: { text } });
    if (matchedCount === 0) throw new NoteNotFound("There is no such note.");
    return {};
  }

  async removeNote({ note }: { note: Note }) {
    const { deletedCount } = await this.notes.deleteOne({ _id: note });
    if (deletedCount === 0) throw new NoteNotFound("There is no such note.");
    return {};
  }

  async mergeGraph({ target, other }: { target: Graph; other: Graph }) {
    await this.#requireGraph(target);
    await this.#requireGraph(other);
    if (target === other) throw new SameGraph("A graph cannot be merged into itself.");
    await this.#ready();

    // Each of other's sources maps to the target source with the same URL, created if needed.
    const counterparts = new Map<Source, Source>();
    for (const from of await this.sources.find({ graph: other }).sort({ added: 1 }).toArray()) {
      const into = await upsert(this.sources, { graph: target, url: from.url }, from.contributors);
      counterparts.set(from._id, into);
      await this.#copyNotes({ source: from._id }, { source: into });
    }

    // Each of other's connections maps to the target connection between the counterparts of its
    // endpoints, which are the target sources with the same URLs.
    for (const from of await this.connections.find({ graph: other }).sort({ added: 1 }).toArray()) {
      const source = counterparts.get(from.source);
      const destination = counterparts.get(from.destination);
      // Unreachable while the invariant holds: both endpoints of a connection are in its graph.
      if (source === undefined || destination === undefined) continue;
      const into = await upsert(this.connections, { graph: target, source, destination }, from.contributors);
      await this.#copyNotes({ connection: from._id }, { connection: into });
    }
    return {};
  }

  /**
   * Copies `from`'s notes onto `to`, skipping each note whose origin `to` already has, either as
   * one of its own notes (a copy merged back into the graph it came from) or as an earlier copy.
   */
  async #copyNotes(from: Owner, to: Owner) {
    for (const note of await this.notes.find(from).sort({ added: 1 }).toArray()) {
      const origin = note.origin ?? note._id;
      if ((await this.notes.countDocuments({ ...to, $or: [{ _id: origin }, { origin }] }, { limit: 1 })) > 0) continue;
      try {
        await this.notes.insertOne({
          _id: crypto.randomUUID() as Note,
          ...to,
          author: note.author,
          text: note.text,
          origin,
          added: new ObjectId(),
        });
      } catch (error) {
        // Another merge copied this origin onto `to` at the same moment; that copy is the one kept.
        if (!isDuplicate(error)) throw error;
      }
    }
  }

  async _graph({ graph }: { graph: Graph }) {
    const found = await this.graphs.findOne({ _id: graph });
    return found === null ? [] : [{ name: found.name }];
  }

  async _sources({ graph }: { graph: Graph }) {
    const found = await this.sources.find({ graph }).sort({ url: 1 }).toArray();
    return found.map(({ _id, url }) => ({ source: _id, url }));
  }

  async _sourceByUrl({ graph, url }: { graph: Graph; url: string }) {
    const found = await this.sources.findOne({ graph, url });
    return found === null ? [] : [{ source: found._id }];
  }

  async _note({ note }: { note: Note }) {
    const found = await this.notes.findOne({ _id: note });
    if (found === null) return [];
    const owner =
      found.source !== undefined
        ? await this.sources.findOne({ _id: found.source })
        : found.connection !== undefined
          ? await this.connections.findOne({ _id: found.connection })
          : null;
    return owner === null ? [] : [{ graph: owner.graph, author: found.author, text: found.text }];
  }

  async _source({ source }: { source: Source }) {
    const found = await this.sources.findOne({ _id: source });
    return found === null ? [] : [{ graph: found.graph, url: found.url }];
  }

  async _connections({ graph }: { graph: Graph }) {
    const found = await this.connections.find({ graph }).sort({ added: 1 }).toArray();
    return found.map(({ _id, source, destination }) => ({ connection: _id, source, destination }));
  }

  async _connection({ connection }: { connection: Connection }) {
    const found = await this.connections.findOne({ _id: connection });
    return found === null ? [] : [{ graph: found.graph, source: found.source, destination: found.destination }];
  }

  async _sourceContributors({ source }: { source: Source }) {
    const found = await this.sources.findOne({ _id: source });
    return (found?.contributors ?? []).map((contributor) => ({ contributor }));
  }

  async _connectionContributors({ connection }: { connection: Connection }) {
    const found = await this.connections.findOne({ _id: connection });
    return (found?.contributors ?? []).map((contributor) => ({ contributor }));
  }

  async _sourceNotes({ source }: { source: Source }) {
    return this.#notesOf({ source });
  }

  async _connectionNotes({ connection }: { connection: Connection }) {
    return this.#notesOf({ connection });
  }

  async #notesOf(owner: Owner) {
    const found = await this.notes.find(owner).sort({ added: 1 }).toArray();
    return found.map(({ _id, author, text }) => ({ note: _id, author, text }));
  }
}

/**
 * Finds the document matching `key` (a graph and URL, or a graph and endpoints), creating it if
 * there is none, and adds `contributors` to it. Returns its identity. The unique index makes two
 * concurrent upserts of one key collide; the loser retries and then finds the winner's document.
 */
async function upsert<Doc extends { _id: string; contributors: string[] }>(
  collection: Collection<Doc>,
  key: Filter<Doc>,
  contributors: Doc["contributors"],
): Promise<Doc["_id"]> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const found = await collection.findOneAndUpdate(
        key,
        {
          $addToSet: { contributors: { $each: contributors } },
          $setOnInsert: { _id: crypto.randomUUID(), added: new ObjectId() },
        } as never,
        { upsert: true, returnDocument: "after", projection: { _id: 1 } },
      );
      return (found as { _id: Doc["_id"] })._id;
    } catch (error) {
      if (attempt === 0 && isDuplicate(error)) continue;
      throw error;
    }
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
