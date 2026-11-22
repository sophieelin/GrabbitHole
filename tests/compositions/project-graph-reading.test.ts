import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { grabbitHolePolicy } from "../../src/host/http.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/** GrabbitHole with Marcus's "Roman Concrete" project, of which Dylan is a member and Lena is not. */
async function romanConcrete() {
  const app = await startGrabbitHole();
  const { Collaborating } = app.application.concepts;
  const marcus = await app.register("marcus");
  const dylan = await app.register("dylan");
  const lena = await app.register("lena");

  const { project } = ok(await Collaborating.createProject({ owner: marcus.user, name: "Roman Concrete" }));
  await app.application.whenIdle();
  const { invitation } = ok(await Collaborating.invite({ project, inviter: marcus.user, invitee: dylan.user }));
  ok(await Collaborating.acceptInvitation({ invitation, user: dylan.user }));
  const [association] = await Collaborating._getItem({ project });
  const graph = association!.item;

  return { ...app, marcus, dylan, lena, project, graph };
}

describe("Reading a project's research graph", () => {
  test("a new project's members see its empty main graph", async () => {
    const { api, marcus, dylan, project, graph } = await romanConcrete();
    const expected = { graph: { graph, name: "Roman Concrete", sources: [], connections: [] } };

    expect(await api["/projects/graph"]({ session: marcus.session, project })).toEqual(expected);
    expect(await api["/projects/graph"]({ session: dylan.session, project })).toEqual(expected);
  });

  test("a member sees every source, connection, note, and contributor, with usernames", async () => {
    const { application, api, marcus, dylan, project, graph } = await romanConcrete();
    const { DiscoveryLinking } = application.concepts;

    // Marcus adds the museum page and the paper to the main graph and connects them.
    const { source: museum } = ok(
      await DiscoveryLinking.addSource({ graph, url: "https://museum.example/pantheon", contributor: marcus.user }),
    );
    const { source: paper } = ok(
      await DiscoveryLinking.addSource({ graph, url: "https://journal.example/lime-clasts", contributor: marcus.user }),
    );
    const { connection } = ok(
      await DiscoveryLinking.addConnection({ graph, source: museum, destination: paper, contributor: marcus.user }),
    );
    const { note: connectionNote } = ok(
      await DiscoveryLinking.addNoteToConnection({ connection, author: marcus.user, text: "The museum cites this." }),
    );

    // Dylan's session graph reached the museum page too; merging it adds him as a contributor and keeps his note.
    const { graph: session } = ok(await DiscoveryLinking.createGraph({ name: "Research Session" }));
    const { source: hisMuseum } = ok(
      await DiscoveryLinking.addSource({ graph: session, url: "https://museum.example/pantheon", contributor: dylan.user }),
    );
    ok(await DiscoveryLinking.addNoteToSource({ source: hisMuseum, author: dylan.user, text: "Come back to this." }));
    ok(await DiscoveryLinking.mergeGraph({ target: graph, other: session }));
    const [museumNote] = await DiscoveryLinking._sourceNotes({ source: museum });

    expect(await api["/projects/graph"]({ session: dylan.session, project })).toEqual({
      graph: {
        graph,
        name: "Roman Concrete",
        // Sources come ordered by URL.
        sources: [
          {
            source: paper,
            url: "https://journal.example/lime-clasts",
            contributors: [{ user: marcus.user, username: "marcus" }],
            notes: [],
          },
          {
            source: museum,
            url: "https://museum.example/pantheon",
            contributors: [
              { user: marcus.user, username: "marcus" },
              { user: dylan.user, username: "dylan" },
            ],
            notes: [{ note: museumNote!.note, author: dylan.user, authorName: "dylan", text: "Come back to this." }],
          },
        ],
        connections: [
          {
            connection,
            source: museum,
            destination: paper,
            contributors: [{ user: marcus.user, username: "marcus" }],
            notes: [{ note: connectionNote, author: marcus.user, authorName: "marcus", text: "The museum cites this." }],
          },
        ],
      },
    });
  });

  test("a signed-in user who is not a member is refused, including a member who was removed", async () => {
    const { application, api, marcus, dylan, lena, project } = await romanConcrete();

    expect(await api["/projects/graph"]({ session: lena.session, project })).toEqual({ error: "FORBIDDEN" });

    ok(await application.concepts.Collaborating.removeMember({ project, owner: marcus.user, member: dylan.user }));
    expect(await api["/projects/graph"]({ session: dylan.session, project })).toEqual({ error: "FORBIDDEN" });
  });

  test("an unknown project is not found, and a graph's identity is not accepted in its place", async () => {
    const { application, api, marcus } = await romanConcrete();
    const { graph: session } = ok(await application.concepts.DiscoveryLinking.createGraph({ name: "Research Session" }));

    expect(await api["/projects/graph"]({ session: marcus.session, project: "no-such-project" as never })).toEqual({
      error: "PROJECT_NOT_FOUND",
    });
    expect(await api["/projects/graph"]({ session: marcus.session, project: session as never })).toEqual({
      error: "PROJECT_NOT_FOUND",
    });
  });

  test("a caller who is not signed in gets no graph", async () => {
    const { api, marcus, project } = await romanConcrete();
    ok(await api.auth.logout({ session: marcus.session }));

    expect(await api["/projects/graph"]({ session: marcus.session, project })).toEqual({ error: "NOT_SIGNED_IN" });
  });

  test("over HTTP, a non-member gets 403 and an unknown project 404", async () => {
    const origin = "http://localhost:3000";
    const { application, project } = await romanConcrete();
    const handle = createHttpHandler({
      application,
      gateway: createGateway({ application }),
      policy: grabbitHolePolicy(origin),
    });
    const post = (path: string, body: object, cookie = "") =>
      handle(
        new Request(`${origin}/api${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
          body: JSON.stringify(body),
        }),
      );

    const signUp = await post("/auth/register", { username: "jordan", password: "correct horse" });
    const cookie = signUp.headers.getSetCookie()[0]!.split(";")[0]!;

    expect((await post("/projects/graph", { project }, cookie)).status).toBe(403);
    expect((await post("/projects/graph", { project: "no-such-project" }, cookie)).status).toBe(404);
  });
});
