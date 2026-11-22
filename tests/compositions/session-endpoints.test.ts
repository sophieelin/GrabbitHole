import { describe, expect, test } from "bun:test";
import type { Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

async function setup() {
  const app = await startGrabbitHole();
  const researcher = await app.register("researcher");
  const other = await app.register("other");
  return { ...app, researcher, other };
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
