import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { describe, expect, test } from "bun:test";
import type { GrabbitHoleWire } from "../../generated/wire.ts";
import type { Reasoner } from "../../src/agents/suggester.ts";
import { ModelFailure } from "../../src/agents/suggester.ts";
import { assembleGrabbitHole } from "../../src/application.ts";
import { grabbitHolePolicy } from "../../src/host/http.ts";
import { handleCapabilities, handleSuggest, SUGGEST_PATH } from "../../src/host/suggest.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

const ORIGIN = "http://localhost:3000";
const ARTICLE = "https://en.wikipedia.org/wiki/Pozzolana";
const PAPER = "https://en.wikipedia.org/wiki/Volcanic_ash";
const TEMPLE = "https://en.wikipedia.org/wiki/Pantheon,_Rome";

/** The server's API handler on a fresh database, with a browser-like caller that keeps its sign-in cookie. */
async function start() {
  const application = assembleGrabbitHole({ database: await testDatabase() });
  const api = createHttpHandler({ application, gateway: createGateway<GrabbitHoleWire>({ application }), policy: grabbitHolePolicy(ORIGIN) });

  function browser() {
    let cookie = "";
    const request = (path: string, body: unknown) =>
      new Request(ORIGIN + path, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN, "sec-fetch-site": "same-origin", ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      });
    async function call<T = Record<string, never>>(path: string, body: unknown): Promise<T> {
      const response = await api(request(`/api${path}`, body));
      const set = response.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0]!;
      const result = (await response.json()) as T & { error?: string };
      if (result.error) throw new Error(`${path}: ${result.error}`);
      return result;
    }
    const suggest = (project: string, reasoner?: Reasoner) => handleSuggest(request(SUGGEST_PATH, { project }), api, reasoner);
    return { call, suggest };
  }
  return { application, browser };
}

/** An owner whose project has three sources, one of them already in a group. */
async function projectWithSources() {
  const { application, browser } = await start();
  const owner = browser();
  await owner.call("/auth/register", { username: "owner", password: "correct horse" });
  const { browsingSession } = await owner.call<{ browsingSession: string }>("/sessions/start", {});
  for (const url of [ARTICLE, PAPER, TEMPLE]) await owner.call("/sessions/visit", { browsingSession, url, sourceUrl: ARTICLE });
  await owner.call("/sessions/stop", { browsingSession });
  await application.whenIdle();
  const session = await owner.call<{ graph: { graph: string } }>("/sessions/graph", { browsingSession });
  const { project } = await owner.call<{ project: string }>("/projects/create", { name: "Roman Concrete" });
  const { proposal } = await owner.call<{ proposal: string }>("/projects/contributions/submit", { project, other: session.graph.graph });
  await owner.call("/projects/contributions/accept", { proposal });
  const { graph } = await owner.call<{ graph: { sources: { source: string; url: string }[] } }>("/projects/graph", { project });
  const idOf = (url: string) => graph.sources.find((source) => source.url === url)!.source;
  const { group } = await owner.call<{ group: string }>("/projects/groups/create", { project, name: "Buildings" });
  await owner.call("/projects/groups/assign", { group, source: idOf(TEMPLE) });
  return { browser, owner, project, group, idOf };
}

describe("Asking for suggested groups", () => {
  test("a member is offered groups for the sources that are in none, and nothing changes", async () => {
    const { owner, project, group, idOf } = await projectWithSources();
    let asked = "";
    const reasoner: Reasoner = async ({ prompt }) => {
      asked = prompt;
      return '{"groups":[{"name":"Chemistry","pages":[1,2]}]}';
    };

    const response = await owner.suggest(project, reasoner);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [
        {
          name: "Chemistry",
          group: null,
          sources: [
            { source: idOf(ARTICLE), url: ARTICLE },
            { source: idOf(PAPER), url: PAPER },
          ],
        },
      ],
    });
    // The model is told about the existing group but not asked about the source already in it.
    expect(asked).toContain("- Buildings");
    expect(asked).not.toContain(TEMPLE);
    // Suggesting made no group and moved no source.
    expect(await owner.call<unknown>("/projects/groups", { project })).toEqual({
      groups: [{ group, name: "Buildings", sources: [{ source: idOf(TEMPLE) }] }],
    });
  });

  test("someone who is not a member, or not signed in, gets nothing and the model is never asked", async () => {
    const { browser, project } = await projectWithSources();
    let asked = 0;
    const reasoner: Reasoner = async () => {
      asked++;
      return "{}";
    };
    const stranger = browser();
    await stranger.call("/auth/register", { username: "stranger", password: "correct horse" });

    const forbidden = await stranger.suggest(project, reasoner);
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "FORBIDDEN" });

    const signedOut = await browser().suggest(project, reasoner);
    expect(signedOut.status).toBe(401);
    expect(asked).toBe(0);
  });

  test("without an API key the route says so, but only to a member", async () => {
    const { browser, owner, project } = await projectWithSources();
    const unavailable = await owner.suggest(project, undefined);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: "UNAVAILABLE" });
    expect((await browser().suggest(project, undefined)).status).toBe(401);

    expect(await handleCapabilities(undefined).json()).toEqual({ suggestGroups: false });
    expect(await handleCapabilities(async () => "").json()).toEqual({ suggestGroups: true });
  });

  test("a model failure reaches the member as a sentence", async () => {
    const { owner, project } = await projectWithSources();
    const response = await owner.suggest(project, async () => {
      throw new ModelFailure("Claude is busy. Try again in a minute.");
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "MODEL_FAILED", message: "Claude is busy. Try again in a minute." });
  });

  test("a request without a project is refused", async () => {
    const { owner } = await projectWithSources();
    expect((await owner.suggest("", async () => "{}")).status).toBe(400);
  });
});
