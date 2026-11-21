
import { describe, expect, test } from "bun:test";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

describe("Project contributions", () => {
  test("a project member can submit a preliminary graph", async () => {
    const { application, api, register } = await startGrabbitHole();
    const { Collaborating, DiscoveryLinking, Contributing } =
      application.concepts;

    const maya = await register("maya");

    // Create a project.
    const { project } = ok(
      await Collaborating.createProject({
        owner: maya.user,
        name: "Roman History",
      }),
    );

    await application.whenIdle();

    // Retrieve the project's main graph.
    const [association] = await Collaborating._getItem({ project });
    expect(association).toBeDefined();
    const target = association!.item;

    // Create a preliminary graph.
    const { graph: other } = ok(
      await DiscoveryLinking.createGraph({
        name: "Research Session",
      }),
    );


    // Submit it for review.
    const { proposal } = ok(
      await api["/projects/contributions/submit"]({
  session: maya.session,
  project,
  other,
}),
    );

    // Verify the proposal.
    expect(await Contributing._proposal({ proposal })).toEqual([
      {
        proposer: maya.user,
        target,
        change: JSON.stringify({
          operation: "MERGE_GRAPH",
          other,
        }),
        status: "PENDING",
        reviewer: "",
        reason: "",
      },
    ]);

    // Submission must not merge the graphs yet.
    expect(await DiscoveryLinking._sources({ graph: target })).toEqual([]);
  });



test("a nonmember cannot submit a graph to another project", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");
  const sam = await register("sam");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Sam's Research",
    }),
  );

  const result = await api["/projects/contributions/submit"]({
    session: sam.session,
    project,
    other,
  });

  expect(result).toHaveProperty("error");
  expect(await Contributing._pending({ target })).toEqual([]);
});


test("an authorized reviewer accepts a graph contribution", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");

  // Create the project and its main graph.
  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  // Create a preliminary graph with a source.
  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  await DiscoveryLinking.addSource({
    graph: other,
    url: "https://example.com/roman-history",
    contributor: maya.user,
  });

  // Submit the preliminary graph.
  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // The main graph is unchanged before approval.
  expect(await DiscoveryLinking._sources({ graph: target })).toEqual([]);

  // Maya is the project owner and therefore a reviewer.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The approved source is now in the main graph.
  const sources = await DiscoveryLinking._sources({ graph: target });

  expect(sources).toHaveLength(1);
  expect(sources[0]?.url).toBe("https://example.com/roman-history");

  // The proposal is recorded as accepted.
  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("ACCEPTED");
  expect(stored?.reviewer).toBe(maya.user);
});


test("a nonreviewer cannot accept a contribution", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");
  const sam = await register("sam");

  // Maya creates the project.
  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  // Sam joins as a member, but is not a reviewer.
  const { invitation } = ok(
    await Collaborating.invite({
      project,
      inviter: maya.user,
      invitee: sam.user,
    }),
  );

  await Collaborating.acceptInvitation({
    invitation,
    user: sam.user,
  });

  expect(await Collaborating._canView({
    project,
    user: sam.user,
  })).toEqual({ allowed: true });

  expect(await Collaborating._canReview({
    project,
    user: sam.user,
  })).toEqual({ allowed: false });

  // Maya creates and submits a preliminary graph.
  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  await DiscoveryLinking.addSource({
    graph: other,
    url: "https://example.com/roman-history",
    contributor: maya.user,
  });

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // Sam attempts to approve the proposal.
  const result = await api["/projects/contributions/accept"]({
    session: sam.session,
    proposal,
  });

  expect(result).toEqual({ error: "FORBIDDEN" });

  // The proposal must remain pending.
  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("PENDING");

  // The main graph must remain unchanged.
  expect(await DiscoveryLinking._sources({ graph: target }))
    .toEqual([]);
});


test("an accepted proposal cannot be applied twice", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  await DiscoveryLinking.addSource({
    graph: other,
    url: "https://example.com/roman-history",
    contributor: maya.user,
  });

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // First approval succeeds.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // Second approval must be refused.
  const second = await api["/projects/contributions/accept"]({
    session: maya.session,
    proposal,
  });

  expect(second).toHaveProperty("error");

  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("ACCEPTED");

  const sources = await DiscoveryLinking._sources({ graph: target });
  expect(sources).toHaveLength(1);
});


test("an authorized reviewer can reject a contribution", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  await DiscoveryLinking.addSource({
    graph: other,
    url: "https://example.com/roman-history",
    contributor: maya.user,
  });

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // Reject the proposal.
  ok(
    await api["/projects/contributions/reject"]({
      session: maya.session,
      proposal,
      reason: "Not relevant to this project",
    }),
  );

  // Verify rejection details.
  const [stored] = await Contributing._proposal({ proposal });

  expect(stored?.status).toBe("REJECTED");
  expect(stored?.reviewer).toBe(maya.user);
  expect(stored?.reason).toBe("Not relevant to this project");

  // Rejection must not modify the main graph.
  expect(await DiscoveryLinking._sources({ graph: target }))
    .toEqual([]);
});



test("a rejected proposal cannot later be accepted", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  await DiscoveryLinking.addSource({
    graph: other,
    url: "https://example.com/roman-history",
    contributor: maya.user,
  });

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // Reject first.
  ok(
    await api["/projects/contributions/reject"]({
      session: maya.session,
      proposal,
      reason: "Not relevant",
    }),
  );

  // Attempt to accept afterward.
  const result = await api["/projects/contributions/accept"]({
    session: maya.session,
    proposal,
  });

  expect(result).toEqual({ error: "PROPOSAL_NOT_PENDING" });

  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("REJECTED");

  // No source should have been merged.
  expect(await DiscoveryLinking._sources({ graph: target }))
    .toEqual([]);
});


test("a nonreviewer cannot reject a contribution", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");
  const sam = await register("sam");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  // Sam joins the project but does not become a reviewer.
  const { invitation } = ok(
    await Collaborating.invite({
      project,
      inviter: maya.user,
      invitee: sam.user,
    }),
  );

  await Collaborating.acceptInvitation({
    invitation,
    user: sam.user,
  });

  // Maya submits a preliminary graph.
  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // Sam attempts to reject it.
  const result = await api["/projects/contributions/reject"]({
    session: sam.session,
    proposal,
    reason: "I disagree",
  });

  expect(result).toEqual({ error: "FORBIDDEN" });

  // The proposal must remain pending.
  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("PENDING");

  // The main graph must remain unchanged.
  expect(await DiscoveryLinking._sources({ graph: target }))
    .toEqual([]);
});



test("a nonmember cannot reject a contribution", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");
  const sam = await register("sam");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // Sam is not a member of Maya's project.
  expect(
    await Collaborating._canView({ project, user: sam.user }),
  ).toEqual({ allowed: false });

  // Sam attempts to reject Maya's proposal.
  const result = await api["/projects/contributions/reject"]({
    session: sam.session,
    proposal,
    reason: "I disagree",
  });

  expect(result).toEqual({ error: "FORBIDDEN" });

  // The proposal must remain pending.
  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("PENDING");

  // The project's graph must remain unchanged.
  expect(await DiscoveryLinking._sources({ graph: target }))
    .toEqual([]);
});


test("a rejected proposal cannot be rejected twice", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");

  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] = await Collaborating._getItem({ project });

  const { graph: other } = ok(
    await DiscoveryLinking.createGraph({
      name: "Research Session",
    }),
  );

  const { proposal } = ok(
    await api["/projects/contributions/submit"]({
      session: maya.session,
      project,
      other,
    }),
  );

  // First rejection succeeds.
  ok(
    await api["/projects/contributions/reject"]({
      session: maya.session,
      proposal,
      reason: "Not relevant",
    }),
  );

  // Second rejection should fail.
  const result = await api["/projects/contributions/reject"]({
    session: maya.session,
    proposal,
    reason: "Another reason",
  });

  expect(result).toEqual({ error: "PROPOSAL_NOT_PENDING" });

  const [stored] = await Contributing._proposal({ proposal });
  expect(stored?.status).toBe("REJECTED");
  expect(stored?.reason).toBe("Not relevant");

  expect(await DiscoveryLinking._sources({ graph: target }))
    .toEqual([]);
});




});
