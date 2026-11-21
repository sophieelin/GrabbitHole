import { type Collection, type Db, MongoServerError, ObjectId, type UpdateFilter } from "mongodb";

export class SessionNotFound extends Error {}
export class SessionNotActive extends Error {}

export type Session = string & { readonly __brand: "Session" };
export type Status = "ACTIVE" | "STOPPED";

const NO_SESSION = "There is no such session.";
const STOPPED = "This session has stopped.";

/*
 * Storage layout. A session's visited URLs are an array kept in the order each URL was first
 * recorded; `$addToSet` appends only URLs that are not already there. Each connection is its own
 * document, and a unique index on session, source, and destination enforces the rule that no two
 * connections share all three. A connection's ObjectId `_id` is used only to sort by when it was
 * recorded.
 */

interface SessionDocument<User> {
  _id: Session;
  user: User;
  status: Status;
  visited: string[];
}

interface ConnectionDocument {
  _id: ObjectId;
  session: Session;
  source: string;
  destination: string;
}

/** Preserves the paths between visited sources so users can understand how they discovered information during a browsing session. */
export class SessioningConcept<User extends string> {
  private readonly sessions: Collection<SessionDocument<User>>;
  private readonly connections: Collection<ConnectionDocument>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Sessioning") {
    const prefix = name.toLowerCase();
    this.sessions = database.collection(`${prefix}.sessions`);
    this.connections = database.collection(`${prefix}.connections`);
  }

  /** Creates the unique connection index once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.connections
      .createIndex({ session: 1, source: 1, destination: 1 }, { unique: true })
      .catch((error: unknown) => {
        this.indexes = undefined;
        throw error;
      });
    return this.indexes;
  }

  async startSession({ user }: { user: User }) {
    const session = crypto.randomUUID() as Session;
    await this.sessions.insertOne({ _id: session, user, status: "ACTIVE", visited: [] });
    return { session };
  }

  async recordVisit({ session, url, sourceUrl }: { session: Session; url: string; sourceUrl?: string }) {
    const linked = sourceUrl !== undefined && sourceUrl !== url;
    const urls = linked ? [url, sourceUrl] : [url];
    // Only an active session is updated, so a visit cannot slip in after the session stops.
    const updated = await this.sessions.findOneAndUpdate(
      { _id: session, status: "ACTIVE" },
      { $addToSet: { visited: { $each: urls } } } as UpdateFilter<SessionDocument<User>>,
    );
    if (updated === null) await this.#refuse(session);
    if (linked) {
      await this.#ready();
      try {
        await this.connections.updateOne(
          { session, source: sourceUrl, destination: url },
          { $setOnInsert: { _id: new ObjectId() } },
          { upsert: true },
        );
      } catch (error) {
        // Two visits recording the same connection at once: the other one already added it.
        if (!isDuplicate(error)) throw error;
      }
    }
    return {};
  }

  async stopSession({ session }: { session: Session }) {
    const stopped = await this.sessions.findOneAndUpdate(
      { _id: session, status: "ACTIVE" },
      { $set: { status: "STOPPED" } },
    );
    if (stopped === null) await this.#refuse(session);
    return {};
  }

  /** Throws the refusal for a session that is not active: unknown, or already stopped. */
  async #refuse(session: Session): Promise<never> {
    const found = await this.sessions.findOne({ _id: session });
    if (found === null) throw new SessionNotFound(NO_SESSION);
    throw new SessionNotActive(STOPPED);
  }

  async _session({ session }: { session: Session }) {
    const found = await this.sessions.findOne({ _id: session });
    return found === null ? [] : [{ user: found.user, status: found.status }];
  }

  async _visited({ session }: { session: Session }) {
    const found = await this.sessions.findOne({ _id: session });
    return found === null ? [] : found.visited.map((url) => ({ url }));
  }

  async _connections({ session }: { session: Session }) {
    const found = await this.connections.find({ session }).sort({ _id: 1 }).toArray();
    return found.map(({ source, destination }) => ({ source, destination }));
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
