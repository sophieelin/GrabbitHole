import { describe, expect, test } from "bun:test";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/**
 * Proposals whose target is gone by the time they are submitted or reviewed. Each of these used to
 * get no answer at all, because no branch of the endpoint matched. Now each is refused with a
 * reason, and a proposal that cannot be accepted stays pending so a reviewer can reject it.
 */

/** Every call here must answer; a request that hangs fails the test instead of timing it out. */
async function answered<T>(request: Promise<T>): Promise<T> {
  const hung = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("The request got no answer.")), 3000));
  return Promise.race([request, hung]);
}

/** Maya's project: sources a, b and c; a connection a → b; a note on a and one on a → b. Sam is a member, not a reviewer. */
async function setUp() {
  const app = await startGrabbitHole();
  const { application, api, register } = app;
  const { Collaborating, DiscoveryLinking } = application.concepts;
  const maya = await register("maya");
  const sam = await register("sam");
  const { project } = ok(await Collaborating.createProject({ owner: maya.user, name: "Roman History" }));
  await application.whenIdle();
  const { invitation } = ok(await Collaborating.invite({ project, inviter: maya.user, invitee: sam.user }));
  ok(await Collaborating.acceptInvitation({ invitation, user: sam.user }));
  const [{ item: target }] = await Collaborating._getItem({ project });
  const add = async (url: string) => ok(await DiscoveryLinking.addSource({ graph: target, url, contributor: maya.user })).source;
  const a = await add("https://example.com/a");
  const b = await add("https://example.com/b");
  const c = await add("https://example.com/c");
  const { connection } = ok(await DiscoveryLinking.addConnection({ graph: target, source: a, destination: b, contributor: maya.user }));
  const { note: sourceNote } = ok(await DiscoveryLinking.addNoteToSource({ source: a, author: maya.user, text: "On a" }));
  const { note: connectionNote } = ok(await DiscoveryLinking.addNoteToConnection({ connection, author: maya.user, text: "On a → b" }));

  type Path =
    | "submit-source-removal"
    | "submit-connection-removal"
    | "submit-note-removal"
    | "submit-note-edit"
    | "submit-connection"
    | "submit-source-note"
    | "submit-connection-note";
  const endpoint = (path: Path) => api[`/projects/contributions/${path}`] as (input: object) => Promise<{ proposal: string } | { error: string }>;
  /** Sam proposes something; returns the proposal. */
  const propose = async (path: Path, input: object) => {
    const answer = await answered(endpoint(path)({ session: sam.session, project, ...input }));
    if ("error" in answer) throw new Error(`Proposing failed: ${answer.error}`);
    return answer.proposal;
  };
  const accept = (proposal: string, by = maya) => answered(api["/projects/contributions/accept"]({ session: by.session, proposal: proposal as never }));
  const reject = (proposal: string, by = maya) =>
    answered(api["/projects/contributions/reject"]({ session: by.session, proposal: proposal as never, reason: "Out of date" }));
  const status = async (proposal: string) => (await application.concepts.Contributing._proposal({ proposal: proposal as never }))[0]?.status;

  /** Accepting is refused with `error`, the proposal stays pending, and Maya can then reject it. */
  async function refusedThenRejected(proposal: string, error: string) {
    expect<unknown>(await accept(proposal)).toEqual({ error });
    expect(await status(proposal)).toBe("PENDING");
    // A member who is not a reviewer still may not decide it.
    expect(await accept(proposal, sam)).toEqual({ error: "FORBIDDEN" });
    expect(await reject(proposal, sam)).toEqual({ error: "FORBIDDEN" });
    ok(await reject(proposal));
    expect(await status(proposal)).toBe("REJECTED");
  }

  return { ...app, maya, sam, project, target, a, b, c, connection, sourceNote, connectionNote, endpoint, propose, accept, reject, status, refusedThenRejected };
}

describe("accepting a proposal another accepted proposal made obsolete", () => {
  test("removing a connection whose source was removed", async () => {
    const x = await setUp();
    const removal = await x.propose("submit-connection-removal", { connection: x.connection });
    ok(await x.accept(await x.propose("submit-source-removal", { source: x.a })));
    await x.refusedThenRejected(removal, "CONNECTION_NOT_IN_GRAPH");
  });

  test("removing a connection twice", async () => {
    const x = await setUp();
    const first = await x.propose("submit-connection-removal", { connection: x.connection });
    const second = await x.propose("submit-connection-removal", { connection: x.connection });
    ok(await x.accept(first));
    await x.refusedThenRejected(second, "CONNECTION_NOT_IN_GRAPH");
  });

  test("removing a note twice", async () => {
    const x = await setUp();
    const first = await x.propose("submit-note-removal", { note: x.sourceNote });
    const second = await x.propose("submit-note-removal", { note: x.sourceNote });
    ok(await x.accept(first));
    await x.refusedThenRejected(second, "NOTE_NOT_FOUND");
  });

  test("removing a note whose source was removed", async () => {
    const x = await setUp();
    const removal = await x.propose("submit-note-removal", { note: x.sourceNote });
    ok(await x.accept(await x.propose("submit-source-removal", { source: x.a })));
    await x.refusedThenRejected(removal, "NOTE_NOT_FOUND");
  });

  test("editing a note that was removed", async () => {
    const x = await setUp();
    const edit = await x.propose("submit-note-edit", { note: x.connectionNote, text: "Revised" });
    ok(await x.accept(await x.propose("submit-note-removal", { note: x.connectionNote })));
    await x.refusedThenRejected(edit, "NOTE_NOT_FOUND");
  });

  test("adding a connection whose source was removed", async () => {
    const x = await setUp();
    const link = await x.propose("submit-connection", { source: x.b, destination: x.c });
    ok(await x.accept(await x.propose("submit-source-removal", { source: x.b })));
    await x.refusedThenRejected(link, "SOURCE_NOT_IN_GRAPH");
  });

  test("adding a connection whose destination was removed", async () => {
    const x = await setUp();
    const link = await x.propose("submit-connection", { source: x.b, destination: x.c });
    ok(await x.accept(await x.propose("submit-source-removal", { source: x.c })));
    await x.refusedThenRejected(link, "SOURCE_NOT_IN_GRAPH");
  });

  test("adding a connection that another proposal already added", async () => {
    const x = await setUp();
    const first = await x.propose("submit-connection", { source: x.b, destination: x.c });
    const second = await x.propose("submit-connection", { source: x.b, destination: x.c });
    ok(await x.accept(first));
    await x.refusedThenRejected(second, "CONNECTION_EXISTS");
  });

  test("adding a note to a source that was removed", async () => {
    const x = await setUp();
    const note = await x.propose("submit-source-note", { source: x.c, text: "Useful" });
    ok(await x.accept(await x.propose("submit-source-removal", { source: x.c })));
    await x.refusedThenRejected(note, "SOURCE_NOT_IN_GRAPH");
  });

  test("adding a note to a connection that was removed", async () => {
    const x = await setUp();
    const note = await x.propose("submit-connection-note", { connection: x.connection, text: "Useful" });
    ok(await x.accept(await x.propose("submit-connection-removal", { connection: x.connection })));
    await x.refusedThenRejected(note, "CONNECTION_NOT_IN_GRAPH");
  });
});

describe("deciding a proposal that cannot be decided", () => {
  test("an unknown proposal is PROPOSAL_NOT_FOUND for accept and reject", async () => {
    const x = await setUp();
    expect(await x.accept("no-such-proposal")).toEqual({ error: "PROPOSAL_NOT_FOUND" });
    expect(await x.reject("no-such-proposal")).toEqual({ error: "PROPOSAL_NOT_FOUND" });
  });

  test("a withdrawn proposal is PROPOSAL_NOT_PENDING for accept and reject, and stays withdrawn", async () => {
    const x = await setUp();
    const proposal = await x.propose("submit-source-removal", { source: x.c });
    ok(await x.application.concepts.Contributing.withdraw({ proposal: proposal as never, user: x.sam.user }));
    expect(await x.accept(proposal)).toEqual({ error: "PROPOSAL_NOT_PENDING" });
    expect(await x.reject(proposal)).toEqual({ error: "PROPOSAL_NOT_PENDING" });
    expect(await x.accept(proposal, x.sam)).toEqual({ error: "FORBIDDEN" });
    expect(await x.status(proposal)).toBe("WITHDRAWN");
    expect(await x.application.concepts.DiscoveryLinking._source({ source: x.c })).toHaveLength(1);
  });
});

describe("proposing a change to something not in the project's graph", () => {
  const cases = [
    ["submit-source-removal", { source: "no-such-source" }, "SOURCE_NOT_IN_GRAPH"],
    ["submit-source-note", { source: "no-such-source", text: "t" }, "SOURCE_NOT_IN_GRAPH"],
    ["submit-connection-removal", { connection: "no-such-connection" }, "CONNECTION_NOT_IN_GRAPH"],
    ["submit-connection-note", { connection: "no-such-connection", text: "t" }, "CONNECTION_NOT_IN_GRAPH"],
    ["submit-note-removal", { note: "no-such-note" }, "NOTE_NOT_FOUND"],
    ["submit-note-edit", { note: "no-such-note", text: "t" }, "NOTE_NOT_FOUND"],
  ] as const;
  for (const [path, input, error] of cases) {
    test(`${path} is refused with ${error}`, async () => {
      const x = await setUp();
      expect(await answered(x.endpoint(path)({ session: x.sam.session, project: x.project, ...input }))).toEqual({ error });
    });
  }

  test("submit-source-removal-in-batch is refused with SOURCE_NOT_IN_GRAPH", async () => {
    const x = await setUp();
    expect(
      await answered(x.api["/projects/contributions/submit-source-removal-in-batch"]({ session: x.sam.session, project: x.project, source: "no-such-source" as never, batch: "b" })),
    ).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
  });

  test("submit-connection with either end missing is refused with SOURCE_NOT_IN_GRAPH", async () => {
    const x = await setUp();
    const link = x.endpoint("submit-connection");
    expect(await answered(link({ session: x.sam.session, project: x.project, source: "missing", destination: x.b }))).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
    expect(await answered(link({ session: x.sam.session, project: x.project, source: x.b, destination: "missing" }))).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
    expect(await answered(link({ session: x.sam.session, project: x.project, source: "missing", destination: "also-missing" }))).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
  });

  test("a source from another project's graph is not in this one", async () => {
    const x = await setUp();
    const { Collaborating, DiscoveryLinking } = x.application.concepts;
    const { project: other } = ok(await Collaborating.createProject({ owner: x.maya.user, name: "Other" }));
    await x.application.whenIdle();
    const [{ item: otherGraph }] = await Collaborating._getItem({ project: other });
    const { source: elsewhere } = ok(await DiscoveryLinking.addSource({ graph: otherGraph, url: "https://example.com/elsewhere", contributor: x.maya.user }));
    expect(await answered(x.endpoint("submit-source-removal")({ session: x.sam.session, project: x.project, source: elsewhere }))).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
  });

  test("a non-member is still FORBIDDEN, whatever the target", async () => {
    const x = await setUp();
    const outsider = await x.register("outsider");
    expect(await answered(x.endpoint("submit-source-removal")({ session: outsider.session, project: x.project, source: "no-such-source" }))).toEqual({ error: "FORBIDDEN" });
    expect(await answered(x.endpoint("submit-source-removal")({ session: outsider.session, project: x.project, source: x.a }))).toEqual({ error: "FORBIDDEN" });
  });
});

describe("valid proposals still work", () => {
  test("each operation applies when its target is there", async () => {
    const x = await setUp();
    const { DiscoveryLinking } = x.application.concepts;
    ok(await x.accept(await x.propose("submit-note-edit", { note: x.connectionNote, text: "Revised" })));
    ok(await x.accept(await x.propose("submit-source-note", { source: x.c, text: "On c" })));
    ok(await x.accept(await x.propose("submit-connection", { source: x.b, destination: x.c })));
    ok(await x.accept(await x.propose("submit-connection-note", { connection: x.connection, text: "Second" })));
    ok(await x.accept(await x.propose("submit-note-removal", { note: x.sourceNote })));
    ok(await x.accept(await x.propose("submit-connection-removal", { connection: x.connection })));
    ok(await x.accept(await x.propose("submit-source-removal", { source: x.a })));
    expect(await DiscoveryLinking._source({ source: x.a })).toEqual([]);
    expect(await DiscoveryLinking._connection({ connection: x.connection })).toEqual([]);
    expect(await DiscoveryLinking._sourceNotes({ source: x.c })).toHaveLength(1);
    expect(await x.application.concepts.Contributing._pending({ target: x.target })).toEqual([]);
  });
});
