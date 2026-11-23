import { describe, expect, test } from "bun:test";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const ARTICLE = "https://news.example/roman-concrete";
const PAPER = "https://journal.example/lime-clasts";

/** An owner with a project whose graph has two sources, merged from a stopped session. */
async function projectWithSources() {
  const started = await startGrabbitHole();
  const { application, api, register } = started;
  const owner = await register("owner");
  const { session } = owner;
  const { browsingSession } = ok(await api["/sessions/start"]({ session }));
  ok(await api["/sessions/visit"]({ session, browsingSession, url: ARTICLE, sourceUrl: ARTICLE }));
  ok(await api["/sessions/visit"]({ session, browsingSession, url: PAPER, sourceUrl: ARTICLE }));
  ok(await api["/sessions/stop"]({ session, browsingSession }));
  await application.whenIdle();
  const other = ok(await api["/sessions/graph"]({ session, browsingSession })).graph.graph;
  const { project } = ok(await api["/projects/create"]({ session, name: "Roman Concrete" }));
  const { proposal } = ok(await api["/projects/contributions/submit"]({ session, project, other }));
  ok(await api["/projects/contributions/accept"]({ session, proposal }));
  const { graph } = ok(await api["/projects/graph"]({ session, project }));
  const sourceAt = (url: string) => graph.sources.find((row: { url: string }) => row.url === url)!.source;
  return { ...started, owner, session, project, article: sourceAt(ARTICLE), paper: sourceAt(PAPER) };
}

describe("Grouping a project's sources", () => {
  test("a member makes groups, puts sources in them, moves one, and takes one out", async () => {
    const { api, session, project, article, paper } = await projectWithSources();
    const { group: chemistry } = ok(await api["/projects/groups/create"]({ session, project, name: "Chemistry" }));
    const { group: history } = ok(await api["/projects/groups/create"]({ session, project, name: "History" }));

    ok(await api["/projects/groups/assign"]({ session, group: chemistry, source: article }));
    ok(await api["/projects/groups/assign"]({ session, group: chemistry, source: paper }));
    ok(await api["/projects/groups/assign"]({ session, group: history, source: article }));
    expect(await api["/projects/groups"]({ session, project })).toEqual({
      groups: [
        { group: chemistry, name: "Chemistry", sources: [{ source: paper }] },
        { group: history, name: "History", sources: [{ source: article }] },
      ],
    });

    ok(await api["/projects/groups/unassign"]({ session, project, source: article }));
    ok(await api["/projects/groups/rename"]({ session, group: history, name: "Buildings" }));
    ok(await api["/projects/groups/remove"]({ session, group: chemistry }));
    expect(await api["/projects/groups"]({ session, project })).toEqual({
      groups: [{ group: history, name: "Buildings", sources: [] }],
    });
  });

  test("names must be filled in and different, and a source must be in a group to leave it", async () => {
    const { api, session, project, article } = await projectWithSources();
    ok(await api["/projects/groups/create"]({ session, project, name: "Chemistry" }));

    expect(await api["/projects/groups/create"]({ session, project, name: "  " })).toEqual({ error: "EMPTY_NAME" });
    expect(await api["/projects/groups/create"]({ session, project, name: "Chemistry" })).toEqual({
      error: "NAME_TAKEN",
    });
    expect(await api["/projects/groups/unassign"]({ session, project, source: article })).toEqual({
      error: "NOT_GROUPED",
    });
  });

  test("someone who is not a member can neither read nor change a project's groups", async () => {
    const { api, register, session, project, article } = await projectWithSources();
    const { group } = ok(await api["/projects/groups/create"]({ session, project, name: "Chemistry" }));
    const stranger = (await register("stranger")).session;

    const forbidden = { error: "FORBIDDEN" } as const;
    expect(await api["/projects/groups"]({ session: stranger, project })).toEqual(forbidden);
    expect(await api["/projects/groups/create"]({ session: stranger, project, name: "Mine" })).toEqual(forbidden);
    expect(await api["/projects/groups/rename"]({ session: stranger, group, name: "Mine" })).toEqual(forbidden);
    expect(await api["/projects/groups/assign"]({ session: stranger, group, source: article })).toEqual(forbidden);
    expect(await api["/projects/groups/unassign"]({ session: stranger, project, source: article })).toEqual(forbidden);
    expect(await api["/projects/groups/remove"]({ session: stranger, group })).toEqual(forbidden);
    expect(await api["/projects/groups"]({ session, project })).toEqual({
      groups: [{ group, name: "Chemistry", sources: [] }],
    });
  });

  test("a source from another project's graph cannot be put in a group", async () => {
    const { api, session, project, article } = await projectWithSources();
    const { project: second } = ok(await api["/projects/create"]({ session, name: "Aqueducts" }));
    const { group } = ok(await api["/projects/groups/create"]({ session, project: second, name: "Water" }));

    expect(await api["/projects/groups/assign"]({ session, group, source: article })).toEqual({
      error: "SOURCE_NOT_IN_GRAPH",
    });
    expect(await api["/projects/groups/unassign"]({ session, project: second, source: article })).toEqual({
      error: "SOURCE_NOT_IN_GRAPH",
    });
    expect(await api["/projects/groups"]({ session, project })).toEqual({ groups: [] });
  });

  test("an unknown group or project is not found", async () => {
    const { api, session, article } = await projectWithSources();
    const group = "missing" as never;
    expect(await api["/projects/groups/rename"]({ session, group, name: "Mine" })).toEqual({ error: "GROUP_NOT_FOUND" });
    expect(await api["/projects/groups/remove"]({ session, group })).toEqual({ error: "GROUP_NOT_FOUND" });
    expect(await api["/projects/groups/assign"]({ session, group, source: article })).toEqual({
      error: "GROUP_NOT_FOUND",
    });
    expect(await api["/projects/groups"]({ session, project: "missing" as never })).toEqual({
      error: "PROJECT_NOT_FOUND",
    });
  });

  test("a source removed from the graph leaves its group", async () => {
    const { application, api, session, project, article, paper } = await projectWithSources();
    const { group } = ok(await api["/projects/groups/create"]({ session, project, name: "Chemistry" }));
    ok(await api["/projects/groups/assign"]({ session, group, source: article }));
    ok(await api["/projects/groups/assign"]({ session, group, source: paper }));

    const { proposal } = ok(await api["/projects/contributions/submit-source-removal"]({ session, project, source: paper }));
    ok(await api["/projects/contributions/accept"]({ session, proposal }));
    await application.whenIdle();

    expect(await api["/projects/groups"]({ session, project })).toEqual({
      groups: [{ group, name: "Chemistry", sources: [{ source: article }] }],
    });
  });
});
