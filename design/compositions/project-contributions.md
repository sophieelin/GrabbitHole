# Project contributions

Researchers can propose changes to a shared project's research graph without modifying it immediately. Project members submit proposals, and authorized reviewers decide whether to accept or reject them.

## Submitting a graph


The [SubmitGraph endpoint](reaction:projectContributions.SubmitGraph) identifies the researcher through `SignIn.use`, verifies project membership through `Collaborating._canView`, retrieves the project's main graph through `Collaborating._getItem`, and verifies that the preliminary graph exists through `DiscoveryLinking._graph`.

The application constructs a `MERGE_GRAPH` change containing the preliminary graph's identity and calls `Contributing.propose` with the main graph as the target. The proposal remains `PENDING` until reviewed.

The frontend supplies the project and preliminary graph identities, but the application derives the user from the authenticated session and constructs the change on the backend.

```endpoints
projectContributions.SubmitGraph at /projects/contributions/submit
```

## Reviewing contributions

When a reviewer requests approval, the application identifies the user through `SignIn.use`, retrieves the proposal through `Contributing._proposal`, and finds the associated project through `Collaborating._getProjectByItem`.

Only users for whom `Collaborating._canReview` returns true may accept or reject proposals. Accepted changes are applied using the corresponding DiscoveryLinking action.

The [Accept endpoint](reaction:projectContributions.Accept) identifies the signed-in reviewer, retrieves the pending proposal, and finds the project associated with its target graph. It checks `Collaborating._canReview` before allowing approval. For a `MERGE_GRAPH` proposal, the application applies the change through `DiscoveryLinking.mergeGraph` and records the decision through `Contributing.accept`.


The [Reject endpoint](reaction:projectContributions.Reject) identifies the signed-in reviewer, retrieves the pending proposal, and checks reviewer permissions through Collaborating. If authorized, it calls `Contributing.reject` with the reviewer's identity and reason. Rejection leaves the project's main graph unchanged.

```endpoints
projectContributions.Accept at /projects/contributions/accept
projectContributions.Reject at /projects/contributions/reject
```



## Constructing proposed changes

The application constructs merge proposals on the backend rather than trusting the frontend to supply serialized operations.

```computations
makeMergeGraphChange(other: String) : String
  Serializes a MERGE_GRAPH operation containing the preliminary graph's identity.

parseMergeGraphChange(change: String) : String
  Validates a serialized MERGE_GRAPH operation and returns the preliminary graph's identity.
```
