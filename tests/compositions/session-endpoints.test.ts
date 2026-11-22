import { describe, expect, test } from "bun:test";
import type { Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const ARTICLE = "https://news.example/roman-concrete";
const MUSEUM = "https://museum.example/pantheon";
const PAPER = "https://journal.example/lime-clasts";

async function setup() {
  const app = await startGrabbitHole();
  const researcher = await app.register("researcher");
  const other = await app.register("other");

  /** Starts a session for the researcher through the endpoint. */
  async function start() {
    return ok(await app.api["/sessions/start"]({ session: researcher.session })).browsingSession as Session;
  }

  /** The session's graph, as visited URLs and "from → to" connections, once the request's work is done. */
  async function graphOf(browsingSession: Session) {
    await app.application.whenIdle();
    const { Sessioning, DiscoveryLinking } = app.application.concepts;
    const [row] = await Sessioning._getItem({ session: browsingSession });
    const graph = row!.item;
    const sources = await DiscoveryLinking._sources({ graph });
    const urlOf = new Map(sources.map(({ source, url }) => [source, url]));
    const connections = await DiscoveryLinking._connections({ graph });
    return {
      urls: sources.map(({ url }) => url),
      connections: connections.map(({ source, destination }) => `${urlOf.get(source)} → ${urlOf.get(destination)}`),
    };
  }

  return { ...app, researcher, other, start, graphOf };
}

describe("Starting a browsing session", () => {
  test("the signed-in user gets a new active session that already has its graph", async () => {
    const { application, api, researcher } = await setup();
    const { Sessioning, DiscoveryLinking } = application.concepts;

    const { browsingSession } = ok(await api["/sessions/start"]({ session: researcher.session }));
    const session = browsingSession as Session;

    expect(await Sessioning._session({ session })).toEqual([{ user: researcher.user, status: "ACTIVE" }]);
    // The endpoint answered only after the graph was associated, so no wait is needed here.
    const [row] = await Sessioning._getItem({ session });
    expect(await DiscoveryLinking._graph({ graph: row!.item })).toEqual([{ name: "Research Session" }]);
  });

  test("each start makes a separate session with its own graph", async () => {
    const { application, api, researcher } = await setup();
    const { Sessioning } = application.concepts;

    const first = ok(await api["/sessions/start"]({ session: researcher.session })).browsingSession as Session;
    const second = ok(await api["/sessions/start"]({ session: researcher.session })).browsingSession as Session;

    expect(first).not.toEqual(second);
    const [a] = await Sessioning._getItem({ session: first });
    const [b] = await Sessioning._getItem({ session: second });
    expect(a!.item).not.toEqual(b!.item);
  });

  test("a caller who is not signed in cannot start one", async () => {
    const { api, researcher } = await setup();
    ok(await api.auth.logout({ session: researcher.session }));

    expect(await api["/sessions/start"]({ session: researcher.session })).toEqual({ error: "NOT_SIGNED_IN" });
  });
});

describe("Recording a visit", () => {
  test("the owner's visits become the session graph's sources and connections", async () => {
    const { api, researcher, start, graphOf } = await setup();
    const browsingSession = await start();
    const visit = async (url: string, sourceUrl: string) =>
      ok(await api["/sessions/visit"]({ session: researcher.session, browsingSession, url, sourceUrl }));

    // The first page has no page before it, so it is sent as its own source.
    await visit(ARTICLE, ARTICLE);
    await visit(MUSEUM, ARTICLE);
    await visit(PAPER, MUSEUM);

    expect(await graphOf(browsingSession)).toEqual({
      urls: [ARTICLE, MUSEUM, PAPER].sort(),
      connections: [`${ARTICLE} → ${MUSEUM}`, `${MUSEUM} → ${PAPER}`],
    });
  });

  test("someone else cannot record into the session, and nothing is added", async () => {
    const { api, other, start, graphOf } = await setup();
    const browsingSession = await start();

    expect(
      await api["/sessions/visit"]({ session: other.session, browsingSession, url: ARTICLE, sourceUrl: ARTICLE }),
    ).toEqual({ error: "FORBIDDEN" });
    expect(await graphOf(browsingSession)).toEqual({ urls: [], connections: [] });
  });

  test("an unknown session is not found, and a stopped session refuses visits", async () => {
    const { application, api, researcher, start } = await setup();
    const browsingSession = await start();

    expect(
      await api["/sessions/visit"]({
        session: researcher.session,
        browsingSession: "no-such-session" as Session,
        url: ARTICLE,
        sourceUrl: ARTICLE,
      }),
    ).toEqual({ error: "SESSION_NOT_FOUND" });

    ok(await application.concepts.Sessioning.stopSession({ session: browsingSession }));
    expect(
      await api["/sessions/visit"]({ session: researcher.session, browsingSession, url: ARTICLE, sourceUrl: ARTICLE }),
    ).toMatchObject({ error: "SESSION_NOT_ACTIVE" });
  });

  test("a caller who is not signed in cannot record a visit", async () => {
    const { api, researcher, start } = await setup();
    const browsingSession = await start();
    ok(await api.auth.logout({ session: researcher.session }));

    expect(
      await api["/sessions/visit"]({ session: researcher.session, browsingSession, url: ARTICLE, sourceUrl: ARTICLE }),
    ).toEqual({ error: "NOT_SIGNED_IN" });
  });
});
