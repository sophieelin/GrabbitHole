import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { grabbitHolePolicy } from "../../src/host/http.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/**
 * Proposals over HTTP, as the browser sends them: the status codes and categories the frontend
 * sees, not just the refusals the compositions return.
 */
const ORIGIN = "http://localhost:3000";

async function serve() {
  const app = await startGrabbitHole();
  const handle = createHttpHandler({
    application: app.application,
    gateway: createGateway({ application: app.application }),
    policy: grabbitHolePolicy(ORIGIN),
  });

  /** A browser with its own cookies. */
  function browser() {
    const jar = new Map<string, string>();
    async function post(path: string, body: object = {}) {
      const response = await handle(
        new Request(`${ORIGIN}/api${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
          body: JSON.stringify(body),
        }),
      );
      for (const line of response.headers.getSetCookie()) {
        const [name = "", value = ""] = line.split(";")[0]?.split("=") ?? [];
        if (value === "") jar.delete(name);
        else jar.set(name, value);
      }
      return { status: response.status, body: (await response.json()) as Record<string, string> };
    }
    return { post };
  }

  /** Maya, signed in, with a project whose graph holds two linked sources, as the user's Italian food project does. */
  async function mayasProject() {
    const maya = browser();
    expect((await maya.post("/auth/register", { username: "maya", password: "correct horse" })).status).toBe(200);
    const { project } = (await maya.post("/projects/create", { name: "Italian food" })).body as { project: string };
    await app.application.whenIdle();
    const { Collaborating, DiscoveryLinking, Registering } = app.application.concepts;
    const [{ item: target }] = await Collaborating._getItem({ project: project as never });
    const [{ user }] = await Registering._byUsername({ username: "maya" });
    const add = async (url: string) => ok(await DiscoveryLinking.addSource({ graph: target, url, contributor: user })).source;
    const berbere = await add("https://en.wikipedia.org/wiki/Berbere");
    const lasagna = await add("https://en.wikipedia.org/wiki/Lasagna");
    const cappuccino = await add("https://en.wikipedia.org/wiki/Cappuccino");
    ok(await DiscoveryLinking.addConnection({ graph: target, source: berbere, destination: lasagna, contributor: user }));
    return { maya, project, target, berbere, lasagna, cappuccino };
  }

  return { ...app, browser, mayasProject };
}

describe("Proposing source removals over HTTP", () => {
  // The batch endpoint was missing from the server the browser was talking to, which answered
  // 404 NOT_FOUND for every source; the page showed "Proposed removing 0 of 2 sources".
  test("proposing two sources together answers 200 for each and makes two pending removals", async () => {
    const { application, mayasProject } = await serve();
    const { maya, project, target, berbere, lasagna } = await mayasProject();

    // The sources the page shows are the ones it sends.
    const { graph } = (await maya.post("/projects/graph", { project })).body as unknown as { graph: { sources: { source: string }[] } };
    expect(graph.sources.map(({ source }) => source)).toEqual(expect.arrayContaining([berbere, lasagna]));

    for (const source of [berbere, lasagna]) {
      const answer = await maya.post("/projects/contributions/submit-source-removal-in-batch", { project, source, batch: "batch-1" });
      expect(answer.status).toBe(200);
      expect(answer.body.proposal).toBeString();
    }
    const pending = await application.concepts.Contributing._pending({ target });
    expect(pending.map(({ change }) => JSON.parse(change))).toEqual([
      { operation: "REMOVE_SOURCE", source: berbere, batch: "batch-1" },
      { operation: "REMOVE_SOURCE", source: lasagna, batch: "batch-1" },
    ]);
  });

  test("proposing one source answers 200 and makes one pending removal", async () => {
    const { application, mayasProject } = await serve();
    const { maya, project, target, cappuccino } = await mayasProject();
    const answer = await maya.post("/projects/contributions/submit-source-removal", { project, source: cappuccino });
    expect(answer.status).toBe(200);
    const pending = await application.concepts.Contributing._pending({ target });
    expect(pending.map(({ change }) => JSON.parse(change))).toEqual([{ operation: "REMOVE_SOURCE", source: cappuccino }]);
  });

  test("a source that is not in the project is 404 NOT_FOUND, and a non-member is 403", async () => {
    const { browser, mayasProject } = await serve();
    const { maya, project, berbere } = await mayasProject();
    const stray = await maya.post("/projects/contributions/submit-source-removal-in-batch", { project, source: "no-such-source", batch: "b" });
    expect(stray.status).toBe(404);
    const sam = browser();
    await sam.post("/auth/register", { username: "sam", password: "correct horse" });
    expect((await sam.post("/projects/contributions/submit-source-removal-in-batch", { project, source: berbere, batch: "b" })).status).toBe(403);
  });
});

describe("Deciding a proposal that was already decided over HTTP", () => {
  /** Maya proposes removing Berbere, and decides it with `first`. */
  async function decided(first: "accept" | "reject") {
    const app = await serve();
    const { maya, project, berbere } = await app.mayasProject();
    const { proposal } = (await maya.post("/projects/contributions/submit-source-removal", { project, source: berbere })).body;
    const body = first === "accept" ? { proposal } : { proposal, reason: "Keep it" };
    expect((await maya.post(`/projects/contributions/${first}`, body)).status).toBe(200);
    return { ...app, maya, proposal: proposal! };
  }

  for (const first of ["accept", "reject"] as const) {
    test(`after ${first}ing, accepting again is 409 CONFLICT, not 500`, async () => {
      const { maya, proposal } = await decided(first);
      const again = await maya.post("/projects/contributions/accept", { proposal });
      expect(again.status).toBe(409);
      expect(again.body).toEqual({ error: "CONFLICT" });
    });

    test(`after ${first}ing, rejecting again is 409 CONFLICT, not 500`, async () => {
      const { maya, proposal } = await decided(first);
      const again = await maya.post("/projects/contributions/reject", { proposal, reason: "Again" });
      expect(again.status).toBe(409);
      expect(again.body).toEqual({ error: "CONFLICT" });
    });
  }

  test("the decision stands: an accepted removal stays accepted after a second try", async () => {
    const { application, maya, proposal } = await decided("accept");
    await maya.post("/projects/contributions/reject", { proposal, reason: "Too late" });
    const [row] = await application.concepts.Contributing._proposal({ proposal: proposal as never });
    expect(row?.status).toBe("ACCEPTED");
  });
});
