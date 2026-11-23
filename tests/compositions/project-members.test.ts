import { describe, expect, test } from "bun:test";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

describe("Managing a project's members", () => {
  test("an invited user accepts and becomes a member the owner can make a reviewer", async () => {
    const { api, register } = await startGrabbitHole();
    const owner = await register("owner");
    const friend = await register("friend");
    const { project } = ok(await api["/projects/create"]({ session: owner.session, name: "Roman Concrete" }));

    const { invitation } = ok(await api["/projects/invite"]({ session: owner.session, project, username: "friend" }));
    expect(await api["/invitations/mine"]({ session: friend.session })).toEqual({
      invitations: [{ invitation, project, name: "Roman Concrete" }],
    });
    // An invitation alone does not let the user in.
    expect(await api["/projects/members"]({ session: friend.session, project })).toEqual({ error: "FORBIDDEN" });

    ok(await api["/invitations/accept"]({ session: friend.session, invitation }));
    expect(await api["/invitations/mine"]({ session: friend.session })).toEqual({ invitations: [] });
    ok(await api["/projects/reviewers/grant"]({ session: owner.session, project, member: friend.user }));

    const people = ok(await api["/projects/members"]({ session: friend.session, project }));
    expect(people.owner).toBe(owner.user);
    expect(people.members).toEqual(
      expect.arrayContaining([
        { user: owner.user, username: "owner" },
        { user: friend.user, username: "friend" },
      ]),
    );
    expect(people.reviewers).toEqual(expect.arrayContaining([{ user: owner.user }, { user: friend.user }]));

    ok(await api["/projects/reviewers/revoke"]({ session: owner.session, project, member: friend.user }));
    ok(await api["/projects/members/remove"]({ session: owner.session, project, member: friend.user }));
    expect(await api["/projects/members"]({ session: friend.session, project })).toEqual({ error: "FORBIDDEN" });
  });

  test("a declined invitation adds nobody", async () => {
    const { api, register } = await startGrabbitHole();
    const owner = await register("owner");
    const friend = await register("friend");
    const { project } = ok(await api["/projects/create"]({ session: owner.session, name: "Roman Concrete" }));
    const { invitation } = ok(await api["/projects/invite"]({ session: owner.session, project, username: "friend" }));

    ok(await api["/invitations/decline"]({ session: friend.session, invitation }));

    expect(ok(await api["/projects/members"]({ session: owner.session, project })).members).toEqual([
      { user: owner.user, username: "owner" },
    ]);
    expect(await api["/invitations/accept"]({ session: friend.session, invitation })).toEqual({
      error: "INVITATION_NOT_FOUND",
    });
  });

  test("only the owner invites, and only a real user who is not already in or invited", async () => {
    const { api, register } = await startGrabbitHole();
    const owner = await register("owner");
    const friend = await register("friend");
    const { project } = ok(await api["/projects/create"]({ session: owner.session, name: "Roman Concrete" }));
    const invite = (session: typeof owner.session, username: string) => api["/projects/invite"]({ session, project, username });

    expect(await invite(friend.session, "owner")).toEqual({ error: "FORBIDDEN" });
    expect(await invite(owner.session, "nobody")).toEqual({ error: "USER_NOT_FOUND" });
    expect(await invite(owner.session, "owner")).toEqual({ error: "ALREADY_MEMBER" });
    ok(await invite(owner.session, "friend"));
    expect(await invite(owner.session, "friend")).toEqual({ error: "ALREADY_INVITED" });
  });

  test("another user cannot accept someone's invitation", async () => {
    const { api, register } = await startGrabbitHole();
    const owner = await register("owner");
    await register("friend");
    const stranger = await register("stranger");
    const { project } = ok(await api["/projects/create"]({ session: owner.session, name: "Roman Concrete" }));
    const { invitation } = ok(await api["/projects/invite"]({ session: owner.session, project, username: "friend" }));

    expect(await api["/invitations/accept"]({ session: stranger.session, invitation })).toEqual({
      error: "INVITATION_NOT_FOUND",
    });
  });

  test("members see the proposals waiting for review, until one is decided", async () => {
    const { application, api, register } = await startGrabbitHole();
    const owner = await register("owner");
    const stranger = await register("stranger");
    const page = "https://news.example/roman-concrete";
    const { session } = owner;
    const { browsingSession } = ok(await api["/sessions/start"]({ session }));
    ok(await api["/sessions/visit"]({ session, browsingSession, url: page, sourceUrl: page }));
    ok(await api["/sessions/stop"]({ session, browsingSession }));
    await application.whenIdle();
    const other = ok(await api["/sessions/graph"]({ session, browsingSession })).graph.graph;
    const { project } = ok(await api["/projects/create"]({ session, name: "Roman Concrete" }));
    const { proposal } = ok(await api["/projects/contributions/submit"]({ session, project, other }));

    const { proposals } = ok(await api["/projects/contributions/pending"]({ session, project }));
    expect(proposals).toEqual([{ proposal, proposer: owner.user, proposerName: "owner", change: expect.any(String) }]);
    expect(JSON.parse(proposals[0]!.change)).toEqual({ operation: "MERGE_GRAPH", other });
    expect(await api["/projects/contributions/pending"]({ session: stranger.session, project })).toEqual({
      error: "FORBIDDEN",
    });

    ok(await api["/projects/contributions/accept"]({ session, proposal }));
    expect(await api["/projects/contributions/pending"]({ session, project })).toEqual({ proposals: [] });
  });
});
