import { describe, expect, test } from "bun:test";
import type { Graph } from "../../src/concepts/DiscoveryLinking/DiscoveryLinking.ts";
import type { Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import { startGrabbitHole } from "../support/app.ts";

const ARTICLE = "https://news.example/roman-concrete";
const MUSEUM = "https://museum.example/pantheon";
const PAPER = "https://journal.example/lime-clasts";
const TIKTOK = "https://tiktok.example/video";

async function setup() {
  const { application, register } = await startGrabbitHole();
  const { Sessioning, DiscoveryLinking } = application.concepts;
  const dylan = await register("dylan");

  async function start() {
    const { session } = (await Sessioning.startSession({ user: dylan.user })) as { session: Session };
    await application.whenIdle();
    const [row] = await Sessioning._getItem({ session });
    return { session, graph: row!.item as Graph };
  }

  async function visit(session: Session, url: string, sourceUrl?: string) {
    await Sessioning.recordVisit(sourceUrl === undefined ? { session, url } : { session, url, sourceUrl });
    await application.whenIdle();
  }

  /** The graph's sources as URLs, and its connections as "from → to" lines. */
  async function graphOf(graph: Graph) {
    const sources = await DiscoveryLinking._sources({ graph });
    const urlOf = new Map(sources.map(({ source, url }) => [source, url]));
    const connections = await DiscoveryLinking._connections({ graph });
    return {
      urls: sources.map(({ url }) => url),
      connections: connections.map(({ source, destination }) => `${urlOf.get(source)} → ${urlOf.get(destination)}`),
    };
  }

  return { application, Sessioning, DiscoveryLinking, dylan, start, visit, graphOf };
}

describe("Sessioning composition", () => {
  test("Dylan's session gets its own graph, holding each page he opens and each link he follows once", async () => {
    const { DiscoveryLinking, dylan, start, visit, graphOf } = await setup();
    const { session, graph } = await start();
    expect(await DiscoveryLinking._graph({ graph })).toEqual([{ name: "Research Session" }]);
    expect(await graphOf(graph)).toEqual({ urls: [], connections: [] });

    await visit(session, ARTICLE);
    await visit(session, MUSEUM, ARTICLE);
    await visit(session, PAPER, MUSEUM);
    await visit(session, MUSEUM, ARTICLE);
    await visit(session, TIKTOK);

    // _sources is ordered by URL.
    expect(await graphOf(graph)).toEqual({
      urls: [PAPER, MUSEUM, ARTICLE, TIKTOK].sort(),
      connections: [`${ARTICLE} → ${MUSEUM}`, `${MUSEUM} → ${PAPER}`],
    });
    const [museum] = await DiscoveryLinking._sourceByUrl({ graph, url: MUSEUM });
    expect(await DiscoveryLinking._sourceContributors({ source: museum!.source })).toEqual([
      { contributor: dylan.user },
    ]);
  });

  test("following a link from a page not yet visited adds both pages and the connection", async () => {
    const { start, visit, graphOf } = await setup();
    const { session, graph } = await start();
    await visit(session, MUSEUM, ARTICLE);
    expect(await graphOf(graph)).toEqual({
      urls: [MUSEUM, ARTICLE].sort(),
      connections: [`${ARTICLE} → ${MUSEUM}`],
    });
  });

  test("a link from a page to itself adds the page once and no connection", async () => {
    const { start, visit, graphOf } = await setup();
    const { session, graph } = await start();
    await visit(session, ARTICLE, ARTICLE);
    expect(await graphOf(graph)).toEqual({ urls: [ARTICLE], connections: [] });
  });

  test("each session records into its own graph", async () => {
    const { Sessioning, start, visit, graphOf } = await setup();
    const first = await start();
    const second = await start();
    expect(second.graph).not.toBe(first.graph);
    expect(await Sessioning._getSessionByItem({ item: first.graph })).toEqual([{ session: first.session }]);

    await visit(first.session, MUSEUM, ARTICLE);
    await visit(second.session, PAPER);
    expect(await graphOf(first.graph)).toEqual({
      urls: [MUSEUM, ARTICLE].sort(),
      connections: [`${ARTICLE} → ${MUSEUM}`],
    });
    expect(await graphOf(second.graph)).toEqual({ urls: [PAPER], connections: [] });
  });

  test("a visit refused because the session stopped adds nothing to its graph", async () => {
    const { Sessioning, start, visit, graphOf, application } = await setup();
    const { session, graph } = await start();
    await visit(session, ARTICLE);
    await Sessioning.stopSession({ session });
    await application.whenIdle();
    await Sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE });
    await application.whenIdle();
    expect(await graphOf(graph)).toEqual({ urls: [ARTICLE], connections: [] });
  });
});
