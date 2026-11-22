import { describe, expect, test } from "bun:test";
import type { Graph } from "../../src/concepts/DiscoveryLinking/DiscoveryLinking.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/**
 * A researcher, a second member of the same project, and helpers to make session graphs. Only the
 * submitting user's own graph from a stopped session can be proposed for merging into a project.
 */
async function setup() {
  const app = await startGrabbitHole();
  const { application, api, register } = app;
  const { Collaborating, Sessioning } = application.concepts;

  const researcher = await register("researcher");
  const teammate = await register("teammate");

  const { project } = ok(await Collaborating.createProject({ owner: researcher.user, name: "Roman Concrete" }));
  const { invitation } = ok(await Collaborating.invite({ project, inviter: researcher.user, invitee: teammate.user }));
  ok(await Collaborating.acceptInvitation({ invitation, user: teammate.user }));
  await application.whenIdle();
  const [main] = await Collaborating._getItem({ project });
  const target = main!.item;

  /** Starts a session for someone and returns it with its graph. */
  async function startSession(who: typeof researcher) {
    const { session } = ok(await Sessioning.startSession({ user: who.user }));
    await application.whenIdle();
    const [row] = await Sessioning._getItem({ session });
    return { session, graph: row!.item };
  }

  /** Proposes `other` for merging into the project, as `who`. */
  function submit(who: typeof researcher, other: Graph) {
    return api["/projects/contributions/submit"]({ session: who.session, project, other });
  }

  /** The proposals waiting on the project's main graph. */
  async function pending() {
    return application.concepts.Contributing._pending({ target });
  }

  return { ...app, Collaborating, Sessioning, researcher, teammate, project, target, startSession, submit, pending };
}

describe("Proposing a session graph for a project", () => {
  test("the researcher's own graph from a stopped session can be proposed", async () => {
    const { Sessioning, researcher, startSession, submit, pending } = await setup();
    const { session, graph } = await startSession(researcher);
    ok(await Sessioning.stopSession({ session }));

    const { proposal } = ok(await submit(researcher, graph));
    expect((await pending()).map((row) => row.proposal)).toEqual([proposal]);
  });

  test("a session that is still recording cannot be proposed until it stops", async () => {
    const { Sessioning, researcher, startSession, submit, pending } = await setup();
    const { session, graph } = await startSession(researcher);

    expect(await submit(researcher, graph)).toEqual({ error: "SESSION_STILL_RECORDING" });
    expect(await pending()).toEqual([]);

    ok(await Sessioning.stopSession({ session }));
    ok(await submit(researcher, graph));
  });

  test("another member's session graph cannot be proposed", async () => {
    const { Sessioning, researcher, teammate, startSession, submit, pending } = await setup();
    const { session, graph } = await startSession(teammate);
    ok(await Sessioning.stopSession({ session }));

    expect(await submit(researcher, graph)).toEqual({ error: "FORBIDDEN" });
    expect(await pending()).toEqual([]);
  });

  test("a project's main graph cannot be proposed, whether its own or another project's", async () => {
    const { application, Collaborating, researcher, target, submit, pending } = await setup();
    const { project: other } = ok(await Collaborating.createProject({ owner: researcher.user, name: "Aqueducts" }));
    await application.whenIdle();
    const [row] = await Collaborating._getItem({ project: other });
    const otherMain = row!.item;

    expect(await submit(researcher, otherMain)).toEqual({ error: "NOT_A_SESSION_GRAPH" });
    expect(await submit(researcher, target)).toEqual({ error: "NOT_A_SESSION_GRAPH" });
    expect(await pending()).toEqual([]);
  });

  test("a graph that came from no browsing session cannot be proposed", async () => {
    const { application, researcher, submit, pending } = await setup();
    const { graph } = ok(await application.concepts.DiscoveryLinking.createGraph({ name: "Made directly" }));

    expect(await submit(researcher, graph)).toEqual({ error: "NOT_A_SESSION_GRAPH" });
    expect(await pending()).toEqual([]);
  });
});
