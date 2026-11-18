import { describe, expect, test } from "bun:test";
import {
  type Connection,
  ConnectionExists,
  ConnectionNotFound,
  ConnectionNotInGraph,
  DiscoveryLinkingConcept,
  type Graph,
  GraphNotFound,
  type Note,
  NoteNotFound,
  SameGraph,
  type Source,
  SourceExists,
  SourceNotFound,
  SourceNotInGraph,
} from "../../src/concepts/DiscoveryLinking/DiscoveryLinking.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

type User = string & { readonly __brand: "User" };
const maya = "maya" as User;
const sam = "sam" as User;

const ARTICLE = "https://example.com/article";
const STUDY = "https://example.com/study";
const REVIEW = "https://example.com/review";

async function setup() {
  return { linking: new DiscoveryLinkingConcept<User>(await testDatabase()) };
}

/** The graph's sources and connections by URL, so graphs can be compared without their identities. */
async function shape(linking: DiscoveryLinkingConcept<User>, graph: Graph) {
  const sources = await linking._sources({ graph });
  const urlOf = new Map(sources.map(({ source, url }) => [source, url]));
  const connections = await linking._connections({ graph });
  return {
    sources: await Promise.all(
      sources.map(async ({ source, url }) => ({
        url,
        contributors: (await linking._sourceContributors({ source })).map(({ contributor }) => contributor),
        notes: (await linking._sourceNotes({ source })).map(({ author, text }) => ({ author, text })),
      })),
    ),
    connections: await Promise.all(
      connections.map(async ({ connection, source, destination }) => ({
        from: urlOf.get(source),
        to: urlOf.get(destination),
        contributors: (await linking._connectionContributors({ connection })).map(({ contributor }) => contributor),
        notes: (await linking._connectionNotes({ connection })).map(({ author, text }) => ({ author, text })),
      })),
    ),
  };
}

describe("DiscoveryLinking", () => {
  test("its principle: Sam follows Maya's connection and reads why the sources relate", async () => {
    const { linking } = await setup();
    const { graph } = await linking.createGraph({ name: "Sleep research" });
    const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
    const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
    const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
    const { note } = await linking.addNoteToConnection({ connection, author: maya, text: "The study is the evidence the article cites." });

    const [followed] = await linking._connections({ graph });
    expect(followed).toEqual({ connection, source: article, destination: study });
    expect(await linking._source({ source: followed!.destination })).toEqual([{ graph, url: STUDY }]);
    expect(await linking._connectionNotes({ connection })).toEqual([
      { note, author: maya, text: "The study is the evidence the article cites." },
    ]);
  });

  describe("graphs", () => {
    test("createGraph makes an empty graph with the given name", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "Research Session" });
      expect(await linking._graph({ graph })).toEqual([{ name: "Research Session" }]);
      expect(await linking._sources({ graph })).toEqual([]);
      expect(await linking._connections({ graph })).toEqual([]);
    });

    test("two graphs created with one name are distinct", async () => {
      const { linking } = await setup();
      const { graph: first } = await linking.createGraph({ name: "Research Session" });
      const { graph: second } = await linking.createGraph({ name: "Research Session" });
      expect(second).not.toBe(first);
    });

    test("queries return no rows for an unknown graph", async () => {
      const { linking } = await setup();
      const graph = "missing" as Graph;
      expect(await linking._graph({ graph })).toEqual([]);
      expect(await linking._sources({ graph })).toEqual([]);
      expect(await linking._connections({ graph })).toEqual([]);
      expect(await linking._sourceByUrl({ graph, url: ARTICLE })).toEqual([]);
    });
  });

  describe("sources", () => {
    test("addSource adds a URL attributed to its contributor", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      expect(await linking._sources({ graph })).toEqual([{ source, url: ARTICLE }]);
      expect(await linking._sourceByUrl({ graph, url: ARTICLE })).toEqual([{ source }]);
      expect(await linking._source({ source })).toEqual([{ graph, url: ARTICLE }]);
      expect(await linking._sourceContributors({ source })).toEqual([{ contributor: maya }]);
      expect(await linking._sourceNotes({ source })).toEqual([]);
    });

    test("a second source with the same URL in one graph is refused, whoever adds it, and the graph is unchanged", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const duplicate = linking.addSource({ graph, url: ARTICLE, contributor: sam });
      await expect(duplicate).rejects.toThrow(SourceExists);
      await expect(duplicate).rejects.toThrow("This graph already has a source with that URL.");
      expect(await linking._sources({ graph })).toEqual([{ source, url: ARTICLE }]);
      expect(await linking._sourceContributors({ source })).toEqual([{ contributor: maya }]);
    });

    test("URLs are compared exactly, so differently written URLs are different sources", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      await linking.addSource({ graph, url: `${ARTICLE}/`, contributor: maya });
      expect(await linking._sources({ graph })).toHaveLength(2);
    });

    test("the same URL may be a source in different graphs, as separate sources", async () => {
      const { linking } = await setup();
      const { graph: first } = await linking.createGraph({ name: "first" });
      const { graph: second } = await linking.createGraph({ name: "second" });
      const { source: a } = await linking.addSource({ graph: first, url: ARTICLE, contributor: maya });
      const { source: b } = await linking.addSource({ graph: second, url: ARTICLE, contributor: sam });
      expect(b).not.toBe(a);
      expect(await linking._sourceByUrl({ graph: first, url: ARTICLE })).toEqual([{ source: a }]);
      expect(await linking._sourceByUrl({ graph: second, url: ARTICLE })).toEqual([{ source: b }]);
    });

    test("_sources orders sources by URL", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      for (const url of [STUDY, ARTICLE, REVIEW]) await linking.addSource({ graph, url, contributor: maya });
      expect((await linking._sources({ graph })).map(({ url }) => url)).toEqual([ARTICLE, REVIEW, STUDY]);
    });

    test("addSource to an unknown graph is refused", async () => {
      const { linking } = await setup();
      const missing = linking.addSource({ graph: "missing" as Graph, url: ARTICLE, contributor: maya });
      await expect(missing).rejects.toThrow(GraphNotFound);
      await expect(missing).rejects.toThrow("There is no such graph.");
    });

    test("of two additions of one URL to a graph at once, one succeeds and the other is refused with SOURCE_EXISTS", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      await expectOneWinner(
        [
          linking.addSource({ graph, url: ARTICLE, contributor: maya }),
          linking.addSource({ graph, url: ARTICLE, contributor: sam }),
        ],
        SourceExists,
      );
      expect(await linking._sources({ graph })).toHaveLength(1);
    });
  });

  describe("connections", () => {
    async function twoSources() {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      return { linking, graph, article, study };
    }

    test("addConnection adds a directed connection attributed to its contributor", async () => {
      const { linking, graph, article, study } = await twoSources();
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: sam });
      expect(await linking._connections({ graph })).toEqual([{ connection, source: article, destination: study }]);
      expect(await linking._connection({ connection })).toEqual([{ graph, source: article, destination: study }]);
      expect(await linking._connectionContributors({ connection })).toEqual([{ contributor: sam }]);
      expect(await linking._connectionNotes({ connection })).toEqual([]);
    });

    test("a second connection with the same source and destination is refused, but the reverse direction is a different connection", async () => {
      const { linking, graph, article, study } = await twoSources();
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      const duplicate = linking.addConnection({ graph, source: article, destination: study, contributor: sam });
      await expect(duplicate).rejects.toThrow(ConnectionExists);
      await expect(duplicate).rejects.toThrow("This graph already has a connection from that source to that destination.");
      expect(await linking._connectionContributors({ connection })).toEqual([{ contributor: maya }]);

      const { connection: reverse } = await linking.addConnection({ graph, source: study, destination: article, contributor: maya });
      expect(reverse).not.toBe(connection);
      expect(await linking._connections({ graph })).toEqual([
        { connection, source: article, destination: study },
        { connection: reverse, source: study, destination: article },
      ]);
    });

    test("a connection between sources in different graphs is refused", async () => {
      const { linking, graph, article } = await twoSources();
      const { graph: other } = await linking.createGraph({ name: "other" });
      const { source: elsewhere } = await linking.addSource({ graph: other, url: REVIEW, contributor: maya });

      const across = linking.addConnection({ graph, source: article, destination: elsewhere, contributor: maya });
      await expect(across).rejects.toThrow(SourceNotInGraph);
      await expect(across).rejects.toThrow("Both sources of a connection must belong to its graph.");
      // Nor in the other graph, where `article` does not belong.
      await expect(
        linking.addConnection({ graph: other, source: elsewhere, destination: article, contributor: maya }),
      ).rejects.toThrow(SourceNotInGraph);
      expect(await linking._connections({ graph })).toEqual([]);
      expect(await linking._connections({ graph: other })).toEqual([]);
    });

    test("a connection to an unknown source, or in an unknown graph, is refused", async () => {
      const { linking, graph, article } = await twoSources();
      await expect(
        linking.addConnection({ graph, source: article, destination: "missing" as Source, contributor: maya }),
      ).rejects.toThrow(SourceNotInGraph);
      await expect(
        linking.addConnection({ graph: "missing" as Graph, source: article, destination: article, contributor: maya }),
      ).rejects.toThrow(GraphNotFound);
    });

    test("of two additions of one connection at once, one succeeds and the other is refused with CONNECTION_EXISTS", async () => {
      const { linking, graph, article, study } = await twoSources();
      await expectOneWinner(
        [
          linking.addConnection({ graph, source: article, destination: study, contributor: maya }),
          linking.addConnection({ graph, source: article, destination: study, contributor: sam }),
        ],
        ConnectionExists,
      );
      expect(await linking._connections({ graph })).toHaveLength(1);
    });

    test("removeConnection removes the connection and its notes but leaves its endpoints", async () => {
      const { linking, graph, article, study } = await twoSources();
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      const { note } = await linking.addNoteToConnection({ connection, author: maya, text: "why" });
      const { note: sourceNote } = await linking.addNoteToSource({ source: article, author: maya, text: "keep me" });

      expect(await linking.removeConnection({ graph, connection })).toEqual({});
      expect(await linking._connections({ graph })).toEqual([]);
      expect(await linking._connection({ connection })).toEqual([]);
      expect(await linking._connectionNotes({ connection })).toEqual([]);
      await expect(linking.editNote({ note, text: "gone" })).rejects.toThrow(NoteNotFound);
      expect((await linking._sources({ graph })).map(({ source }) => source)).toEqual([article, study]);
      expect(await linking._sourceNotes({ source: article })).toEqual([{ note: sourceNote, author: maya, text: "keep me" }]);

      // The removed connection may be added again.
      await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
    });

    test("removeConnection is refused for a connection in another graph, an unknown connection, or an unknown graph", async () => {
      const { linking, graph, article, study } = await twoSources();
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      const { graph: other } = await linking.createGraph({ name: "other" });

      const wrongGraph = linking.removeConnection({ graph: other, connection });
      await expect(wrongGraph).rejects.toThrow(ConnectionNotInGraph);
      await expect(wrongGraph).rejects.toThrow("That connection does not belong to this graph.");
      await expect(linking.removeConnection({ graph, connection: "missing" as Connection })).rejects.toThrow(
        ConnectionNotInGraph,
      );
      await expect(linking.removeConnection({ graph: "missing" as Graph, connection })).rejects.toThrow(GraphNotFound);
      expect(await linking._connections({ graph })).toHaveLength(1);
    });
  });

  describe("removing sources", () => {
    test("removeSource removes the source, its notes, and every connection into or out of it with their notes", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      const { source: review } = await linking.addSource({ graph, url: REVIEW, contributor: maya });
      const { connection: out } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      const { connection: into } = await linking.addConnection({ graph, source: review, destination: article, contributor: maya });
      const { connection: unrelated } = await linking.addConnection({ graph, source: review, destination: study, contributor: maya });
      const { note: onSource } = await linking.addNoteToSource({ source: article, author: maya, text: "a" });
      const { note: onOut } = await linking.addNoteToConnection({ connection: out, author: maya, text: "b" });
      const { note: onInto } = await linking.addNoteToConnection({ connection: into, author: sam, text: "c" });
      const { note: kept } = await linking.addNoteToConnection({ connection: unrelated, author: sam, text: "d" });

      expect(await linking.removeSource({ graph, source: article })).toEqual({});

      expect((await linking._sources({ graph })).map(({ source }) => source)).toEqual([review, study]);
      expect(await linking._source({ source: article })).toEqual([]);
      expect(await linking._connections({ graph })).toEqual([{ connection: unrelated, source: review, destination: study }]);
      for (const note of [onSource, onOut, onInto]) {
        await expect(linking.removeNote({ note })).rejects.toThrow(NoteNotFound);
      }
      expect(await linking._connectionNotes({ connection: unrelated })).toEqual([{ note: kept, author: sam, text: "d" }]);

      // Its URL may be added to the graph again, as a new source with no notes.
      const { source: again } = await linking.addSource({ graph, url: ARTICLE, contributor: sam });
      expect(again).not.toBe(article);
      expect(await linking._sourceNotes({ source: again })).toEqual([]);
    });

    test("removeSource does not touch a source with the same URL in another graph", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { graph: other } = await linking.createGraph({ name: "other" });
      const { source } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: twin } = await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      await linking.addNoteToSource({ source: twin, author: maya, text: "mine" });
      await linking.removeSource({ graph, source });
      expect(await linking._sources({ graph: other })).toEqual([{ source: twin, url: ARTICLE }]);
      expect(await linking._sourceNotes({ source: twin })).toHaveLength(1);
    });

    test("removeSource is refused for a source in another graph, an unknown source, or an unknown graph", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { graph: other } = await linking.createGraph({ name: "other" });
      const { source } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });

      const wrongGraph = linking.removeSource({ graph: other, source });
      await expect(wrongGraph).rejects.toThrow(SourceNotInGraph);
      await expect(wrongGraph).rejects.toThrow("That source does not belong to this graph.");
      await expect(linking.removeSource({ graph, source: "missing" as Source })).rejects.toThrow(SourceNotInGraph);
      await expect(linking.removeSource({ graph: "missing" as Graph, source })).rejects.toThrow(GraphNotFound);
      expect(await linking._sources({ graph })).toEqual([{ source, url: ARTICLE }]);

      await linking.removeSource({ graph, source });
      await expect(linking.removeSource({ graph, source })).rejects.toThrow(SourceNotInGraph);
    });

    test("a connection or note added while its source is being removed does not outlive the source", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      await Promise.allSettled([
        linking.removeSource({ graph, source: article }),
        linking.addConnection({ graph, source: article, destination: study, contributor: maya }),
        linking.addNoteToSource({ source: article, author: maya, text: "late" }),
      ]);
      expect(await linking._connections({ graph })).toEqual([]);
      expect(await linking._sourceNotes({ source: article })).toEqual([]);
    });
  });

  describe("notes", () => {
    async function connected() {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      return { linking, graph, article, study, connection };
    }

    test("notes on a source or connection keep their authors and are listed in the order they were added", async () => {
      const { linking, article, study, connection } = await connected();
      const { note: first } = await linking.addNoteToSource({ source: article, author: maya, text: "first" });
      const { note: second } = await linking.addNoteToSource({ source: article, author: sam, text: "second" });
      const { note: onConnection } = await linking.addNoteToConnection({ connection, author: sam, text: "link" });

      expect(await linking._sourceNotes({ source: article })).toEqual([
        { note: first, author: maya, text: "first" },
        { note: second, author: sam, text: "second" },
      ]);
      expect(await linking._sourceNotes({ source: study })).toEqual([]);
      expect(await linking._connectionNotes({ connection })).toEqual([{ note: onConnection, author: sam, text: "link" }]);
    });

    test("editNote replaces the text and keeps the author", async () => {
      const { linking, article, connection } = await connected();
      const { note } = await linking.addNoteToSource({ source: article, author: maya, text: "draft" });
      const { note: linkNote } = await linking.addNoteToConnection({ connection, author: sam, text: "draft" });
      expect(await linking.editNote({ note, text: "final" })).toEqual({});
      await linking.editNote({ note: linkNote, text: "revised" });
      expect(await linking._sourceNotes({ source: article })).toEqual([{ note, author: maya, text: "final" }]);
      expect(await linking._connectionNotes({ connection })).toEqual([{ note: linkNote, author: sam, text: "revised" }]);
    });

    test("removeNote removes only that note from its source or connection", async () => {
      const { linking, article, connection } = await connected();
      const { note: removed } = await linking.addNoteToSource({ source: article, author: maya, text: "a" });
      const { note: kept } = await linking.addNoteToSource({ source: article, author: maya, text: "b" });
      const { note: linkNote } = await linking.addNoteToConnection({ connection, author: maya, text: "c" });

      expect(await linking.removeNote({ note: removed })).toEqual({});
      await linking.removeNote({ note: linkNote });
      expect(await linking._sourceNotes({ source: article })).toEqual([{ note: kept, author: maya, text: "b" }]);
      expect(await linking._connectionNotes({ connection })).toEqual([]);
    });

    test("notes on an unknown source or connection, and edits or removals of an unknown note, are refused", async () => {
      const { linking } = await setup();
      const noSource = linking.addNoteToSource({ source: "missing" as Source, author: maya, text: "x" });
      await expect(noSource).rejects.toThrow(SourceNotFound);
      await expect(noSource).rejects.toThrow("There is no such source.");
      const noConnection = linking.addNoteToConnection({ connection: "missing" as Connection, author: maya, text: "x" });
      await expect(noConnection).rejects.toThrow(ConnectionNotFound);
      await expect(noConnection).rejects.toThrow("There is no such connection.");
      const noNote = linking.editNote({ note: "missing" as Note, text: "x" });
      await expect(noNote).rejects.toThrow(NoteNotFound);
      await expect(noNote).rejects.toThrow("There is no such note.");
      await expect(linking.removeNote({ note: "missing" as Note })).rejects.toThrow(NoteNotFound);
    });

    test("a removed note cannot be edited or removed again", async () => {
      const { linking, article } = await connected();
      const { note } = await linking.addNoteToSource({ source: article, author: maya, text: "a" });
      await linking.removeNote({ note });
      await expect(linking.removeNote({ note })).rejects.toThrow(NoteNotFound);
      await expect(linking.editNote({ note, text: "b" })).rejects.toThrow(NoteNotFound);
    });
  });

  describe("merging", () => {
    test("merging graphs with no overlap copies every source, connection, note, and contributor into the target", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { source: review } = await linking.addSource({ graph: target, url: REVIEW, contributor: sam });
      const { graph: other } = await linking.createGraph({ name: "session" });
      const { source: article } = await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph: other, url: STUDY, contributor: maya });
      const { connection } = await linking.addConnection({ graph: other, source: article, destination: study, contributor: maya });
      await linking.addNoteToSource({ source: article, author: maya, text: "read first" });
      await linking.addNoteToConnection({ connection, author: maya, text: "cites" });

      expect(await linking.mergeGraph({ target, other })).toEqual({});

      expect(await shape(linking, target)).toEqual({
        sources: [
          { url: ARTICLE, contributors: [maya], notes: [{ author: maya, text: "read first" }] },
          { url: REVIEW, contributors: [sam], notes: [] },
          { url: STUDY, contributors: [maya], notes: [] },
        ],
        connections: [{ from: ARTICLE, to: STUDY, contributors: [maya], notes: [{ author: maya, text: "cites" }] }],
      });
      expect(await linking._sourceByUrl({ graph: target, url: REVIEW })).toEqual([{ source: review }]);
    });

    test("merged connections join the target's own sources, not the other graph's", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { source: targetArticle } = await linking.addSource({ graph: target, url: ARTICLE, contributor: sam });
      const { graph: other } = await linking.createGraph({ name: "session" });
      const { source: article } = await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph: other, url: STUDY, contributor: maya });
      await linking.addConnection({ graph: other, source: article, destination: study, contributor: maya });

      await linking.mergeGraph({ target, other });

      const [{ source: targetStudy }] = (await linking._sourceByUrl({ graph: target, url: STUDY })) as [{ source: Source }];
      expect(targetStudy).not.toBe(study);
      const [merged] = await linking._connections({ graph: target });
      expect(merged).toMatchObject({ source: targetArticle, destination: targetStudy });
      expect(await linking._connection({ connection: merged!.connection })).toEqual([
        { graph: target, source: targetArticle, destination: targetStudy },
      ]);
    });

    test("overlapping sources and connections are matched by URL, combining their notes and contributors", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { source: tArticle } = await linking.addSource({ graph: target, url: ARTICLE, contributor: sam });
      const { source: tStudy } = await linking.addSource({ graph: target, url: STUDY, contributor: sam });
      const { connection: tLink } = await linking.addConnection({ graph: target, source: tArticle, destination: tStudy, contributor: sam });
      await linking.addNoteToSource({ source: tArticle, author: sam, text: "sam on article" });
      await linking.addNoteToConnection({ connection: tLink, author: sam, text: "sam on link" });

      const { graph: other } = await linking.createGraph({ name: "session" });
      const { source: oArticle } = await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      const { source: oStudy } = await linking.addSource({ graph: other, url: STUDY, contributor: maya });
      const { source: oReview } = await linking.addSource({ graph: other, url: REVIEW, contributor: maya });
      const { connection: oLink } = await linking.addConnection({ graph: other, source: oArticle, destination: oStudy, contributor: maya });
      await linking.addConnection({ graph: other, source: oStudy, destination: oReview, contributor: maya });
      await linking.addNoteToSource({ source: oArticle, author: maya, text: "maya on article" });
      await linking.addNoteToConnection({ connection: oLink, author: maya, text: "maya on link" });

      await linking.mergeGraph({ target, other });

      expect(await shape(linking, target)).toEqual({
        sources: [
          {
            url: ARTICLE,
            contributors: [sam, maya],
            notes: [
              { author: sam, text: "sam on article" },
              { author: maya, text: "maya on article" },
            ],
          },
          { url: REVIEW, contributors: [maya], notes: [] },
          { url: STUDY, contributors: [sam, maya], notes: [] },
        ],
        connections: [
          {
            from: ARTICLE,
            to: STUDY,
            contributors: [sam, maya],
            notes: [
              { author: sam, text: "sam on link" },
              { author: maya, text: "maya on link" },
            ],
          },
          { from: STUDY, to: REVIEW, contributors: [maya], notes: [] },
        ],
      });
      // The matched source and connection keep their identities in the target.
      expect(await linking._sourceByUrl({ graph: target, url: ARTICLE })).toEqual([{ source: tArticle }]);
      expect((await linking._connections({ graph: target }))[0]!.connection).toBe(tLink);
    });

    test("a contributor already on a matched source or connection is not listed twice", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { source: tArticle } = await linking.addSource({ graph: target, url: ARTICLE, contributor: maya });
      const { graph: other } = await linking.createGraph({ name: "session" });
      await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      await linking.mergeGraph({ target, other });
      expect(await linking._sourceContributors({ source: tArticle })).toEqual([{ contributor: maya }]);
    });

    test("merging leaves the other graph, its sources, connections, notes, and contributors unchanged", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { source: tArticle } = await linking.addSource({ graph: target, url: ARTICLE, contributor: sam });
      await linking.addNoteToSource({ source: tArticle, author: sam, text: "sam" });
      const { graph: other } = await linking.createGraph({ name: "session" });
      const { source: article } = await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph: other, url: STUDY, contributor: maya });
      const { connection } = await linking.addConnection({ graph: other, source: article, destination: study, contributor: maya });
      const { note } = await linking.addNoteToSource({ source: article, author: maya, text: "maya" });
      await linking.addNoteToConnection({ connection, author: maya, text: "link" });

      const before = {
        graph: await linking._graph({ graph: other }),
        sources: await linking._sources({ graph: other }),
        connections: await linking._connections({ graph: other }),
        shape: await shape(linking, other),
        notes: await linking._sourceNotes({ source: article }),
      };
      await linking.mergeGraph({ target, other });
      expect({
        graph: await linking._graph({ graph: other }),
        sources: await linking._sources({ graph: other }),
        connections: await linking._connections({ graph: other }),
        shape: await shape(linking, other),
        notes: await linking._sourceNotes({ source: article }),
      }).toEqual(before);

      // The copies in the target are separate notes: editing the original does not change them.
      await linking.editNote({ note, text: "edited" });
      expect((await linking._sourceNotes({ source: tArticle })).map(({ text }) => text)).toEqual(["sam", "maya"]);
    });

    test("merging an empty graph changes nothing, and merging into an empty graph copies everything", async () => {
      const { linking } = await setup();
      const { graph: full } = await linking.createGraph({ name: "full" });
      const { source: a } = await linking.addSource({ graph: full, url: ARTICLE, contributor: maya });
      const { source: b } = await linking.addSource({ graph: full, url: STUDY, contributor: sam });
      await linking.addConnection({ graph: full, source: a, destination: b, contributor: sam });
      const { graph: empty } = await linking.createGraph({ name: "empty" });

      const before = await shape(linking, full);
      await linking.mergeGraph({ target: full, other: empty });
      expect(await shape(linking, full)).toEqual(before);

      await linking.mergeGraph({ target: empty, other: full });
      expect(await shape(linking, empty)).toEqual(before);
    });

    test("merging is refused for an unknown graph or a graph into itself, leaving the graphs unchanged", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const before = await shape(linking, graph);

      const self = linking.mergeGraph({ target: graph, other: graph });
      await expect(self).rejects.toThrow(SameGraph);
      await expect(self).rejects.toThrow("A graph cannot be merged into itself.");
      await expect(linking.mergeGraph({ target: graph, other: "missing" as Graph })).rejects.toThrow(GraphNotFound);
      await expect(linking.mergeGraph({ target: "missing" as Graph, other: graph })).rejects.toThrow(GraphNotFound);
      await expect(
        linking.mergeGraph({ target: "missing" as Graph, other: "missing" as Graph }),
      ).rejects.toThrow(GraphNotFound);
      expect(await shape(linking, graph)).toEqual(before);
    });

    test("two graphs merged into one target at once do not duplicate a URL or connection they share", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const sessions = await Promise.all(
        [maya, sam].map(async (contributor) => {
          const { graph } = await linking.createGraph({ name: contributor });
          const { source: a } = await linking.addSource({ graph, url: ARTICLE, contributor });
          const { source: b } = await linking.addSource({ graph, url: STUDY, contributor });
          await linking.addConnection({ graph, source: a, destination: b, contributor });
          return graph;
        }),
      );
      await Promise.all(sessions.map((other) => linking.mergeGraph({ target, other })));
      const merged = await shape(linking, target);
      expect(merged.sources.map(({ url }) => url)).toEqual([ARTICLE, STUDY]);
      expect(merged.connections).toHaveLength(1);
      expect([...merged.connections[0]!.contributors].sort()).toEqual([maya, sam]);
    });
  });

  describe("repeated and transitive merges", () => {
    /** A graph with one connected pair of sources: two notes with the same author and text on the article, and one on the connection. */
    async function session(linking: DiscoveryLinkingConcept<User>, name = "session") {
      const { graph } = await linking.createGraph({ name });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      await linking.addNoteToSource({ source: article, author: maya, text: "same" });
      await linking.addNoteToSource({ source: article, author: maya, text: "same" });
      await linking.addNoteToConnection({ connection, author: maya, text: "cites" });
      return { graph, article, connection };
    }

    const merged = {
      sources: [
        {
          url: ARTICLE,
          contributors: [maya],
          notes: [
            { author: maya, text: "same" },
            { author: maya, text: "same" },
          ],
        },
        { url: STUDY, contributors: [maya], notes: [] },
      ],
      connections: [{ from: ARTICLE, to: STUDY, contributors: [maya], notes: [{ author: maya, text: "cites" }] }],
    };

    test("merging the same graph again adds no notes, and keeps distinct notes with the same author and text", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { graph: other } = await session(linking);
      const before = await shape(linking, other);

      await linking.mergeGraph({ target, other });
      expect(await shape(linking, target)).toEqual(merged);
      await linking.mergeGraph({ target, other });
      await linking.mergeGraph({ target, other });
      expect(await shape(linking, target)).toEqual(merged);
      expect(await shape(linking, other)).toEqual(before);
    });

    test("a note added to the other graph after a merge is copied by the next merge, once", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { graph: other, article } = await session(linking);
      await linking.mergeGraph({ target, other });
      await linking.addNoteToSource({ source: article, author: sam, text: "same" });
      await linking.mergeGraph({ target, other });
      await linking.mergeGraph({ target, other });

      const [{ source: copy }] = (await linking._sourceByUrl({ graph: target, url: ARTICLE })) as [{ source: Source }];
      expect((await linking._sourceNotes({ source: copy })).map(({ author, text }) => ({ author, text }))).toEqual([
        { author: maya, text: "same" },
        { author: maya, text: "same" },
        { author: sam, text: "same" },
      ]);
    });

    test("A merged into B, B into C, then A into C, gives C one copy of each of A's notes and leaves A and B unchanged", async () => {
      const { linking } = await setup();
      const { graph: a } = await session(linking, "A");
      const { graph: b } = await linking.createGraph({ name: "B" });
      const { graph: c } = await linking.createGraph({ name: "C" });

      await linking.mergeGraph({ target: b, other: a });
      const aBefore = await shape(linking, a);
      const bBefore = await shape(linking, b);
      await linking.mergeGraph({ target: c, other: b });
      await linking.mergeGraph({ target: c, other: a });

      expect(await shape(linking, c)).toEqual(merged);
      expect(await shape(linking, a)).toEqual(aBefore);
      expect(await shape(linking, b)).toEqual(bBefore);
    });

    test("merging a copy back into the graph it came from adds no duplicate", async () => {
      const { linking } = await setup();
      const { graph: a } = await session(linking, "A");
      const { graph: b } = await linking.createGraph({ name: "B" });
      await linking.mergeGraph({ target: b, other: a });
      await linking.mergeGraph({ target: a, other: b });
      expect(await shape(linking, a)).toEqual(merged);
    });

    test("a later merge neither overwrites nor duplicates a copy edited in the target, nor follows edits to the original", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { graph: other, connection } = await session(linking);
      await linking.mergeGraph({ target, other });

      const [{ connection: copyOwner }] = await linking._connections({ graph: target });
      const [{ note: copy }] = await linking._connectionNotes({ connection: copyOwner! });
      const [{ note: original }] = await linking._connectionNotes({ connection });
      await linking.editNote({ note: copy!, text: "edited in main" });
      await linking.editNote({ note: original!, text: "edited in session" });
      await linking.mergeGraph({ target, other });

      expect(await linking._connectionNotes({ connection: copyOwner! })).toEqual([
        { note: copy, author: maya, text: "edited in main" },
      ]);
    });

    test("a copy removed from the target is copied again by a later merge, as a removed source would be", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { graph: other } = await session(linking);
      await linking.mergeGraph({ target, other });
      const [{ connection: copyOwner }] = await linking._connections({ graph: target });
      const [{ note: copy }] = await linking._connectionNotes({ connection: copyOwner! });
      await linking.removeNote({ note: copy! });
      await linking.mergeGraph({ target, other });
      expect(await shape(linking, target)).toEqual(merged);
    });

    test("two merges of one graph into one target at once copy each note once", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { graph: other } = await session(linking);
      await Promise.all([linking.mergeGraph({ target, other }), linking.mergeGraph({ target, other })]);
      expect(await shape(linking, target)).toEqual(merged);
    });
  });

  describe("_note", () => {
    test("returns the graph, author, and text of a note on a source or on a connection", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      const { note: onSource } = await linking.addNoteToSource({ source: article, author: maya, text: "on source" });
      const { note: onConnection } = await linking.addNoteToConnection({ connection, author: sam, text: "on connection" });

      expect(await linking._note({ note: onSource })).toEqual([{ graph, author: maya, text: "on source" }]);
      expect(await linking._note({ note: onConnection })).toEqual([{ graph, author: sam, text: "on connection" }]);
      await linking.editNote({ note: onSource, text: "edited" });
      expect(await linking._note({ note: onSource })).toEqual([{ graph, author: maya, text: "edited" }]);
    });

    test("tells apart notes in different graphs, including a merged copy and its original", async () => {
      const { linking } = await setup();
      const { graph: target } = await linking.createGraph({ name: "main" });
      const { graph: other } = await linking.createGraph({ name: "session" });
      const { source } = await linking.addSource({ graph: other, url: ARTICLE, contributor: maya });
      const { note: original } = await linking.addNoteToSource({ source, author: maya, text: "why" });
      await linking.mergeGraph({ target, other });
      const [{ source: copyOwner }] = (await linking._sourceByUrl({ graph: target, url: ARTICLE })) as [{ source: Source }];
      const [{ note: copy }] = await linking._sourceNotes({ source: copyOwner });

      expect(copy).not.toBe(original);
      expect(await linking._note({ note: original })).toEqual([{ graph: other, author: maya, text: "why" }]);
      expect(await linking._note({ note: copy! })).toEqual([{ graph: target, author: maya, text: "why" }]);
    });

    test("returns no row for an unknown note, a removed note, or a note whose source or connection was removed", async () => {
      const { linking } = await setup();
      const { graph } = await linking.createGraph({ name: "g" });
      const { source: article } = await linking.addSource({ graph, url: ARTICLE, contributor: maya });
      const { source: study } = await linking.addSource({ graph, url: STUDY, contributor: maya });
      const { connection } = await linking.addConnection({ graph, source: article, destination: study, contributor: maya });
      const { note: removed } = await linking.addNoteToSource({ source: study, author: maya, text: "a" });
      const { note: onConnection } = await linking.addNoteToConnection({ connection, author: maya, text: "b" });
      const { note: onSource } = await linking.addNoteToSource({ source: article, author: maya, text: "c" });

      expect(await linking._note({ note: "missing" as Note })).toEqual([]);
      await linking.removeNote({ note: removed });
      expect(await linking._note({ note: removed })).toEqual([]);
      await linking.removeConnection({ graph, connection });
      expect(await linking._note({ note: onConnection })).toEqual([]);
      await linking.removeSource({ graph, source: article });
      expect(await linking._note({ note: onSource })).toEqual([]);
    });
  });
});
