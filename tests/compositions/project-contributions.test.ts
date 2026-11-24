
import { describe, expect, test } from "bun:test";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

type GrabbitHole = Awaited<ReturnType<typeof startGrabbitHole>>;
type Researcher = Awaited<ReturnType<GrabbitHole["register"]>>;

/**
 * A preliminary graph made the way the app makes one: start a browsing session for the researcher,
 * which creates its graph, then stop it. Only the submitting user's own graph from a stopped
 * session can be proposed for merging into a project.
 */
async function stoppedSessionGraph(application: GrabbitHole["application"], researcher: Researcher) {
  const { Sessioning } = application.concepts;
  const { session } = ok(await Sessioning.startSession({ user: researcher.user }));
  await application.whenIdle();
  const [row] = await Sessioning._getItem({ session });
  ok(await Sessioning.stopSession({ session }));
  return { graph: row!.item };
}

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
    const { graph: other } = await stoppedSessionGraph(application, maya);


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

  const { graph: other } = await stoppedSessionGraph(application, sam);

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
  const { graph: other } = await stoppedSessionGraph(application, maya);

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
  const { graph: other } = await stoppedSessionGraph(application, maya);

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

  const { graph: other } = await stoppedSessionGraph(application, maya);

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

  const { graph: other } = await stoppedSessionGraph(application, maya);

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

  const { graph: other } = await stoppedSessionGraph(application, maya);

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
  const { graph: other } = await stoppedSessionGraph(application, maya);

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

  const { graph: other } = await stoppedSessionGraph(application, maya);

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

  const { graph: other } = await stoppedSessionGraph(application, maya);

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



test("an authorized reviewer accepts a proposed note edit", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } =
    application.concepts;

  const maya = await register("maya");

  // Create a project and retrieve its main graph.
  const { project } = ok(
    await Collaborating.createProject({
      owner: maya.user,
      name: "Roman History",
    }),
  );

  await application.whenIdle();

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  // Add a source and a note to the main graph.
  const { source } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/roman-history",
      contributor: maya.user,
    }),
  );

  const { note } = ok(
    await DiscoveryLinking.addNoteToSource({
      source,
      author: maya.user,
      text: "Original research note",
    }),
  );

  // Submit a proposed edit.
  const { proposal } = ok(
    await api["/projects/contributions/submit-note-edit"]({
      session: maya.session,
      project,
      note,
      text: "Updated research note",
    }),
  );

  // The original note must remain unchanged before approval.
  expect(await DiscoveryLinking._note({ note })).toEqual([
    {
      graph: target,
      author: maya.user,
      text: "Original research note",
    },
  ]);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve the proposed edit.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The note should now contain the approved text.
  expect(await DiscoveryLinking._note({ note })).toEqual([
    {
      graph: target,
      author: maya.user,
      text: "Updated research note",
    },
  ]);

  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
  expect(accepted?.reviewer).toBe(maya.user);
});


test("an authorized reviewer accepts a source removal", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  // Create two sources in the main graph.
  const { source: sourceA } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-a",
      contributor: maya.user,
    }),
  );

  const { source: sourceB } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-b",
      contributor: maya.user,
    }),
  );

  // Connect the two sources.
  const { connection } = ok(
    await DiscoveryLinking.addConnection({
      graph: target,
      source: sourceA,
      destination: sourceB,
      contributor: maya.user,
    }),
  );

  // Add a note to the source being removed.
  const { note } = ok(
    await DiscoveryLinking.addNoteToSource({
      source: sourceA,
      author: maya.user,
      text: "Important research note",
    }),
  );

  // Submit a source removal proposal.
  const { proposal } = ok(
    await api["/projects/contributions/submit-source-removal"]({
      session: maya.session,
      project,
      source: sourceA,
    }),
  );

  // Nothing should be deleted before approval.
  expect(await DiscoveryLinking._source({ source: sourceA }))
    .toHaveLength(1);
  expect(await DiscoveryLinking._connection({ connection }))
    .toHaveLength(1);
  expect(await DiscoveryLinking._note({ note }))
    .toHaveLength(1);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve the removal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The source, its connection, and its note are removed.
  expect(await DiscoveryLinking._source({ source: sourceA }))
    .toEqual([]);
  expect(await DiscoveryLinking._connection({ connection }))
    .toEqual([]);
  expect(await DiscoveryLinking._note({ note }))
    .toEqual([]);

  // The unrelated source remains.
  expect(await DiscoveryLinking._source({ source: sourceB }))
    .toHaveLength(1);

  // The proposal is accepted.
  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
});



test("rejecting a note edit leaves the original note unchanged", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  const { source } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/roman-history",
      contributor: maya.user,
    }),
  );

  const { note } = ok(
    await DiscoveryLinking.addNoteToSource({
      source,
      author: maya.user,
      text: "Original note",
    }),
  );

  // Submit a proposed edit.
  const { proposal } = ok(
    await api["/projects/contributions/submit-note-edit"]({
      session: maya.session,
      project,
      note,
      text: "Proposed replacement",
    }),
  );

  // Reject the proposal.
  ok(
    await api["/projects/contributions/reject"]({
      session: maya.session,
      proposal,
      reason: "The original note is more accurate",
    }),
  );

  // The original note must remain unchanged.
  const [storedNote] = await DiscoveryLinking._note({ note });
  expect(storedNote?.text).toBe("Original note");

  // The proposal records the rejection.
  const [storedProposal] = await Contributing._proposal({ proposal });
  expect(storedProposal?.status).toBe("REJECTED");
  expect(storedProposal?.reviewer).toBe(maya.user);
  expect(storedProposal?.reason).toBe(
    "The original note is more accurate",
  );
});


test("an authorized reviewer accepts a proposed connection", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  // Create two sources in the main graph.
  const { source: sourceA } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-a",
      contributor: maya.user,
    }),
  );

  const { source: sourceB } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-b",
      contributor: maya.user,
    }),
  );

  // Propose a connection.
  const { proposal } = ok(
    await api["/projects/contributions/submit-connection"]({
      session: maya.session,
      project,
      source: sourceA,
      destination: sourceB,
    }),
  );

  // The proposal exists, but no connection has been created.
  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  expect(await DiscoveryLinking._connections({ graph: target }))
    .toEqual([]);

  // Approve the proposal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The connection now exists.
  const connections =
    await DiscoveryLinking._connections({ graph: target });

  expect(connections).toHaveLength(1);
  expect(connections[0]?.source).toBe(sourceA);
  expect(connections[0]?.destination).toBe(sourceB);

  const contributors =
  await DiscoveryLinking._connectionContributors({
    connection: connections[0]!.connection,
  });

expect(contributors).toEqual([
  { contributor: maya.user },
]);

  // The proposal is accepted.
  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
  expect(accepted?.reviewer).toBe(maya.user);
});




test("an authorized reviewer accepts a connection removal", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  // Create two sources.
  const { source: sourceA } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-a",
      contributor: maya.user,
    }),
  );

  const { source: sourceB } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-b",
      contributor: maya.user,
    }),
  );

  // Connect them.
  const { connection } = ok(
    await DiscoveryLinking.addConnection({
      graph: target,
      source: sourceA,
      destination: sourceB,
      contributor: maya.user,
    }),
  );

  // Add a note to the connection.
  const { note } = ok(
    await DiscoveryLinking.addNoteToConnection({
      connection,
      author: maya.user,
      text: "These articles support each other",
    }),
  );

  // Propose removing the connection.
  const { proposal } = ok(
    await api["/projects/contributions/submit-connection-removal"]({
      session: maya.session,
      project,
      connection,
    }),
  );

  // Nothing should change before approval.
  expect(await DiscoveryLinking._connection({ connection }))
    .toHaveLength(1);
  expect(await DiscoveryLinking._note({ note }))
    .toHaveLength(1);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve removal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // Connection and its note are deleted.
  expect(await DiscoveryLinking._connection({ connection }))
    .toEqual([]);
  expect(await DiscoveryLinking._note({ note }))
    .toEqual([]);

  // Both sources remain in the graph.
  expect(await DiscoveryLinking._source({ source: sourceA }))
    .toHaveLength(1);
  expect(await DiscoveryLinking._source({ source: sourceB }))
    .toHaveLength(1);

  // Proposal is accepted.
  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
  expect(accepted?.reviewer).toBe(maya.user);
});



test("an authorized reviewer accepts a proposed source note", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  // Create a source in the project's main graph.
  const { source } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/roman-history",
      contributor: maya.user,
    }),
  );

  // Submit a proposed note.
  const { proposal } = ok(
    await api["/projects/contributions/submit-source-note"]({
      session: maya.session,
      project,
      source,
      text: "Roman concrete was highly durable",
    }),
  );

  // No note should exist before approval.
  expect(await DiscoveryLinking._sourceNotes({ source }))
    .toEqual([]);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve the proposal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The note is created with the original proposer as author.
  const notes = await DiscoveryLinking._sourceNotes({ source });

  expect(notes).toHaveLength(1);
  expect(notes[0]?.text).toBe(
    "Roman concrete was highly durable",
  );
  expect(notes[0]?.author).toBe(maya.user);

  // Proposal is accepted.
  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
  expect(accepted?.reviewer).toBe(maya.user);
});


test("an authorized reviewer accepts a proposed connection note", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  // Create two sources.
  const { source: sourceA } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-a",
      contributor: maya.user,
    }),
  );

  const { source: sourceB } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-b",
      contributor: maya.user,
    }),
  );

  // Create a connection between them.
  const { connection } = ok(
    await DiscoveryLinking.addConnection({
      graph: target,
      source: sourceA,
      destination: sourceB,
      contributor: maya.user,
    }),
  );

  // Propose adding a note to the connection.
  const { proposal } = ok(
    await api["/projects/contributions/submit-connection-note"]({
      session: maya.session,
      project,
      connection,
      text: "These sources provide supporting evidence",
    }),
  );

  // The note must not exist before approval.
  expect(await DiscoveryLinking._connectionNotes({ connection }))
    .toEqual([]);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve the proposal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The note now exists and credits Maya.
  const notes =
    await DiscoveryLinking._connectionNotes({ connection });

  expect(notes).toHaveLength(1);
  expect(notes[0]?.text).toBe(
    "These sources provide supporting evidence",
  );
  expect(notes[0]?.author).toBe(maya.user);

  // The proposal is accepted.
  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
  expect(accepted?.reviewer).toBe(maya.user);
});



test("an authorized reviewer accepts a source note removal", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  const { source } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/roman-history",
      contributor: maya.user,
    }),
  );

  const { note } = ok(
    await DiscoveryLinking.addNoteToSource({
      source,
      author: maya.user,
      text: "Original source note",
    }),
  );

  // Propose removing the note.
  const { proposal } = ok(
    await api["/projects/contributions/submit-note-removal"]({
      session: maya.session,
      project,
      note,
    }),
  );

  // The note remains until approval.
  expect(await DiscoveryLinking._note({ note }))
    .toHaveLength(1);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve the removal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The note is removed, but the source remains.
  expect(await DiscoveryLinking._note({ note }))
    .toEqual([]);
  expect(await DiscoveryLinking._source({ source }))
    .toHaveLength(1);

  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
});


test("an authorized reviewer accepts a connection note removal", async () => {
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

  const [{ item: target }] =
    await Collaborating._getItem({ project });

  const { source: sourceA } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-a",
      contributor: maya.user,
    }),
  );

  const { source: sourceB } = ok(
    await DiscoveryLinking.addSource({
      graph: target,
      url: "https://example.com/article-b",
      contributor: maya.user,
    }),
  );

  const { connection } = ok(
    await DiscoveryLinking.addConnection({
      graph: target,
      source: sourceA,
      destination: sourceB,
      contributor: maya.user,
    }),
  );

  const { note } = ok(
    await DiscoveryLinking.addNoteToConnection({
      connection,
      author: maya.user,
      text: "Original connection note",
    }),
  );

  // Propose removing the note.
  const { proposal } = ok(
    await api["/projects/contributions/submit-note-removal"]({
      session: maya.session,
      project,
      note,
    }),
  );

  // The note remains until approval.
  expect(await DiscoveryLinking._note({ note }))
    .toHaveLength(1);

  const [pending] = await Contributing._proposal({ proposal });
  expect(pending?.status).toBe("PENDING");

  // Approve the removal.
  ok(
    await api["/projects/contributions/accept"]({
      session: maya.session,
      proposal,
    }),
  );

  // The note is removed, but the connection remains.
  expect(await DiscoveryLinking._note({ note }))
    .toEqual([]);
  expect(await DiscoveryLinking._connection({ connection }))
    .toHaveLength(1);

  const [accepted] = await Contributing._proposal({ proposal });
  expect(accepted?.status).toBe("ACCEPTED");
});



});

test("removals proposed together are decided one by one", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking, Contributing } = application.concepts;
  const maya = await register("maya");
  const sam = await register("sam");

  const { project } = ok(await Collaborating.createProject({ owner: maya.user, name: "Roman History" }));
  await application.whenIdle();
  const [{ item: target }] = await Collaborating._getItem({ project });

  // Sam is a member, not a reviewer, so Maya decides.
  const { invitation } = ok(await Collaborating.invite({ project, inviter: maya.user, invitee: sam.user }));
  ok(await Collaborating.acceptInvitation({ invitation, user: sam.user }));

  const add = async (url: string) => ok(await DiscoveryLinking.addSource({ graph: target, url, contributor: maya.user })).source;
  const a = await add("https://example.com/a");
  const b = await add("https://example.com/b");
  const c = await add("https://example.com/c");
  const { connection } = ok(await DiscoveryLinking.addConnection({ graph: target, source: a, destination: b, contributor: maya.user }));

  // Sam proposes removing all three together.
  const batch = "batch-1";
  const propose = async (source: typeof a) =>
    ok(await api["/projects/contributions/submit-source-removal-in-batch"]({ session: sam.session, project, source, batch })).proposal;
  const forA = await propose(a);
  const forB = await propose(b);
  const forC = await propose(c);

  // Three separate pending proposals, each a REMOVE_SOURCE that names the batch; nothing removed yet.
  const pending = await Contributing._pending({ target });
  expect(pending).toHaveLength(3);
  for (const row of pending) expect(JSON.parse(row.change)).toMatchObject({ operation: "REMOVE_SOURCE", batch });
  expect(await DiscoveryLinking._source({ source: a })).toHaveLength(1);

  // Sam cannot accept his own proposals.
  expect(await api["/projects/contributions/accept"]({ session: sam.session, proposal: forA })).toEqual({ error: "FORBIDDEN" });

  // Maya removes a and c, and keeps b.
  ok(await api["/projects/contributions/accept"]({ session: maya.session, proposal: forA }));
  ok(await api["/projects/contributions/reject"]({ session: maya.session, proposal: forB, reason: "Kept by the reviewer" }));
  ok(await api["/projects/contributions/accept"]({ session: maya.session, proposal: forC }));

  expect(await DiscoveryLinking._source({ source: a })).toEqual([]);
  expect(await DiscoveryLinking._source({ source: b })).toHaveLength(1);
  expect(await DiscoveryLinking._source({ source: c })).toEqual([]);
  // The connection from a went with a.
  expect(await DiscoveryLinking._connection({ connection })).toEqual([]);
  expect((await Contributing._proposal({ proposal: forB }))[0]?.status).toBe("REJECTED");
  expect(await Contributing._pending({ target })).toEqual([]);
});

test("a source outside the project cannot be proposed for removal in a batch", async () => {
  const { application, api, register } = await startGrabbitHole();
  const { Collaborating, DiscoveryLinking } = application.concepts;
  const maya = await register("maya");
  const sam = await register("sam");

  const { project } = ok(await Collaborating.createProject({ owner: maya.user, name: "Roman History" }));
  await application.whenIdle();
  const [{ item: target }] = await Collaborating._getItem({ project });
  const { source } = ok(await DiscoveryLinking.addSource({ graph: target, url: "https://example.com/a", contributor: maya.user }));

  // Sam is not a member of Maya's project.
  expect(await api["/projects/contributions/submit-source-removal-in-batch"]({ session: sam.session, project, source, batch: "b" })).toEqual({ error: "FORBIDDEN" });
});

describe("accepting a source removal whose source is already gone", () => {
  /** Maya's project with sources a, b and c, a connection a → b, and a note on b. */
  async function setUp() {
    const grabbitHole = await startGrabbitHole();
    const { application, register } = grabbitHole;
    const { Collaborating, DiscoveryLinking } = application.concepts;
    const maya = await register("maya");
    const { project } = ok(await Collaborating.createProject({ owner: maya.user, name: "Roman History" }));
    await application.whenIdle();
    const [{ item: target }] = await Collaborating._getItem({ project });
    const add = async (url: string) => ok(await DiscoveryLinking.addSource({ graph: target, url, contributor: maya.user })).source;
    const a = await add("https://example.com/a");
    const b = await add("https://example.com/b");
    const c = await add("https://example.com/c");
    const { connection } = ok(await DiscoveryLinking.addConnection({ graph: target, source: a, destination: b, contributor: maya.user }));
    ok(await DiscoveryLinking.addNoteToSource({ source: b, author: maya.user, text: "Important" }));
    return { ...grabbitHole, maya, project, target, a, b, c, connection };
  }

  test("a duplicate removal is refused, stays pending, and can be rejected", async () => {
    const { application, api, maya, project, target, b } = await setUp();
    const { Contributing, DiscoveryLinking } = application.concepts;
    const removal = async () => ok(await api["/projects/contributions/submit-source-removal"]({ session: maya.session, project, source: b })).proposal;
    const first = await removal();
    const second = await removal();

    ok(await api["/projects/contributions/accept"]({ session: maya.session, proposal: first }));
    expect(await DiscoveryLinking._source({ source: b })).toEqual([]);

    // The second one answers at once, and changes nothing.
    expect(await api["/projects/contributions/accept"]({ session: maya.session, proposal: second })).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
    expect((await Contributing._proposal({ proposal: second }))[0]?.status).toBe("PENDING");

    // The reviewer rejects it, and nothing is left pending.
    ok(await api["/projects/contributions/reject"]({ session: maya.session, proposal: second, reason: "Already removed" }));
    expect((await Contributing._proposal({ proposal: second }))[0]?.status).toBe("REJECTED");
    expect(await Contributing._pending({ target })).toEqual([]);
  });

  test("a removal accepted after its source was removed another way is refused", async () => {
    const { application, api, maya, project, target, a, c } = await setUp();
    const { Contributing, DiscoveryLinking } = application.concepts;
    const { proposal } = ok(await api["/projects/contributions/submit-source-removal"]({ session: maya.session, project, source: a }));
    ok(await DiscoveryLinking.removeSource({ graph: target, source: a }));

    expect(await api["/projects/contributions/accept"]({ session: maya.session, proposal })).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
    expect((await Contributing._proposal({ proposal }))[0]?.status).toBe("PENDING");
    // The rest of the graph is untouched.
    expect(await DiscoveryLinking._source({ source: c })).toHaveLength(1);
  });

  test("a non-reviewer still gets FORBIDDEN, not the missing-source refusal", async () => {
    const { application, api, register, maya, project, a } = await setUp();
    const { Collaborating, DiscoveryLinking } = application.concepts;
    const sam = await register("sam");
    const { invitation } = ok(await Collaborating.invite({ project, inviter: maya.user, invitee: sam.user }));
    ok(await Collaborating.acceptInvitation({ invitation, user: sam.user }));
    const { proposal } = ok(await api["/projects/contributions/submit-source-removal"]({ session: sam.session, project, source: a }));
    const [{ item: target }] = await Collaborating._getItem({ project });
    ok(await DiscoveryLinking.removeSource({ graph: target, source: a }));

    expect(await api["/projects/contributions/accept"]({ session: sam.session, proposal })).toEqual({ error: "FORBIDDEN" });
  });

  test("a batch with an unavailable source: the others are still decided one by one", async () => {
    const { application, api, maya, project, target, a, b, c, connection } = await setUp();
    const { Contributing, DiscoveryLinking } = application.concepts;
    const batch = "batch-1";
    const propose = async (source: typeof a) =>
      ok(await api["/projects/contributions/submit-source-removal-in-batch"]({ session: maya.session, project, source, batch })).proposal;
    const forA = await propose(a);
    const forB = await propose(b);
    const forC = await propose(c);

    // b goes first through a separate removal.
    const { proposal: single } = ok(await api["/projects/contributions/submit-source-removal"]({ session: maya.session, project, source: b }));
    ok(await api["/projects/contributions/accept"]({ session: maya.session, proposal: single }));

    // The reviewer accepts a, is refused for b, rejects b, and accepts c.
    ok(await api["/projects/contributions/accept"]({ session: maya.session, proposal: forA }));
    expect(await api["/projects/contributions/accept"]({ session: maya.session, proposal: forB })).toEqual({ error: "SOURCE_NOT_IN_GRAPH" });
    ok(await api["/projects/contributions/reject"]({ session: maya.session, proposal: forB, reason: "Already removed" }));
    ok(await api["/projects/contributions/accept"]({ session: maya.session, proposal: forC }));

    expect(await DiscoveryLinking._source({ source: a })).toEqual([]);
    expect(await DiscoveryLinking._source({ source: c })).toEqual([]);
    expect(await DiscoveryLinking._connection({ connection })).toEqual([]);
    expect((await Contributing._proposal({ proposal: forA }))[0]?.status).toBe("ACCEPTED");
    expect((await Contributing._proposal({ proposal: forB }))[0]?.status).toBe("REJECTED");
    expect((await Contributing._proposal({ proposal: forC }))[0]?.status).toBe("ACCEPTED");
    expect(await Contributing._pending({ target })).toEqual([]);
  });
});
