import { describe, expect, test } from "bun:test";
import type { Project } from "../../src/concepts/Collaborating/Collaborating.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

describe("Creating a project for a session", () => {
  test("the signed-in user owns and reviews the new project, which already has its graph", async () => {
    const { application, api, register } = await startGrabbitHole();
    const { Collaborating, DiscoveryLinking } = application.concepts;
    const researcher = await register("researcher");

    const project = ok(await api["/projects/create"]({ session: researcher.session, name: "Roman Concrete" }))
      .project as Project;

    expect(await Collaborating._project({ project })).toEqual([{ name: "Roman Concrete", owner: researcher.user }]);
    expect(await Collaborating._canReview({ project, user: researcher.user })).toEqual({ allowed: true });
    // The endpoint answered only after the graph was associated, so no wait is needed here.
    const [row] = await Collaborating._getItem({ project });
    expect(await DiscoveryLinking._graph({ graph: row!.item })).toEqual([{ name: "Roman Concrete" }]);
  });

  test("a stopped session proposed to the new project and accepted is merged into its graph", async () => {
    const { application, api, register } = await startGrabbitHole();
    const { session } = await register("researcher");
    const page = "https://news.example/roman-concrete";

    const { browsingSession } = ok(await api["/sessions/start"]({ session }));
    ok(await api["/sessions/visit"]({ session, browsingSession, url: page, sourceUrl: page }));
    ok(await api["/sessions/stop"]({ session, browsingSession }));
    await application.whenIdle();
    const other = ok(await api["/sessions/graph"]({ session, browsingSession })).graph.graph;

    const { project } = ok(await api["/projects/create"]({ session, name: "Roman Concrete" }));
    const { proposal } = ok(await api["/projects/contributions/submit"]({ session, project, other }));
    ok(await api["/projects/contributions/accept"]({ session, proposal }));

    const { graph } = ok(await api["/projects/graph"]({ session, project }));
    expect(graph.sources.map(({ url }: { url: string }) => url)).toEqual([page]);
  });

  test("a caller who is not signed in cannot create one", async () => {
    const { api, register } = await startGrabbitHole();
    const researcher = await register("researcher");
    ok(await api.auth.logout({ session: researcher.session }));

    expect(await api["/projects/create"]({ session: researcher.session, name: "Roman Concrete" })).toEqual({
      error: "NOT_SIGNED_IN",
    });
  });
});
