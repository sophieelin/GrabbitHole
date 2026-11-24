# Project contributions

Researchers can propose changes to a shared project's research graph without modifying it immediately. Project members submit proposals, and authorized reviewers decide whether to accept or reject them.

## Submitting a graph


The [SubmitGraph endpoint](reaction:projectContributions.SubmitGraph) identifies the researcher through `SignIn.use`, verifies project membership through `Collaborating._canView`, retrieves the project's main graph through `Collaborating._getItem`, and verifies that the preliminary graph exists through `DiscoveryLinking._graph`.

The preliminary graph must be the researcher's own browsing-session graph, from a session that has stopped. The endpoint finds the graph's session through `Sessioning._getSessionByItem`, and checks the session's owner and status through `Sessioning._session`. It also checks through `Collaborating._getProjectByItem` that the graph is not a project's main graph. Another user's session graph is refused with `FORBIDDEN`. A session that is still recording is refused with `SESSION_STILL_RECORDING`, so no page recorded after proposing can reach the merge; the researcher stops the session first. A graph that belongs to no session, such as any project's main graph, is refused with `NOT_A_SESSION_GRAPH`.

The application constructs a `MERGE_GRAPH` change containing the preliminary graph's identity and calls `Contributing.propose` with the main graph as the target. The proposal remains `PENDING` until reviewed.

The frontend supplies the project and preliminary graph identities, but the application derives the user from the authenticated session and constructs the change on the backend.

```endpoints
projectContributions.SubmitGraph at /projects/contributions/submit
```

## Proposing note removals

Project members can propose removing existing notes from their project's main research graph.

The [SubmitNoteRemoval endpoint](reaction:projectContributions.SubmitNoteRemoval) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph through `Collaborating._getItem` and verifies that the note belongs to that graph through `DiscoveryLinking._note`.

The application constructs a `REMOVE_NOTE` change containing the note's identity and calls `Contributing.propose` with the project's main graph as the target.

The note remains unchanged while the proposal is pending. When an authorized reviewer accepts the proposal, `DiscoveryLinking.removeNote` deletes the note without removing its source or connection.

```endpoints
projectContributions.SubmitNoteRemoval at /projects/contributions/submit-note-removal
```


## Proposing connection notes

Project members can propose adding notes to connections in their project's main research graph.

The [SubmitConnectionNote endpoint](reaction:projectContributions.SubmitConnectionNote) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph through `Collaborating._getItem` and verifies that the connection belongs to that graph through `DiscoveryLinking._connection`.

The application constructs an `ADD_CONNECTION_NOTE` change containing the connection identity, proposed text, and authenticated author's identity. It calls `Contributing.propose` with the project's main graph as the target.

The note is created only after an authorized reviewer accepts the proposal through `DiscoveryLinking.addNoteToConnection`.

```endpoints
projectContributions.SubmitConnectionNote at /projects/contributions/submit-connection-note
```


## Proposing source notes

Project members can propose adding notes to sources in their project's main research graph.

The [SubmitSourceNote endpoint](reaction:projectContributions.SubmitSourceNote) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph through `Collaborating._getItem` and verifies that the source belongs to the graph through `DiscoveryLinking._source`.

The application constructs an `ADD_SOURCE_NOTE` change containing the source identity, proposed text, and authenticated author's identity. It calls `Contributing.propose` with the project's main graph as the target.

The note is created only after an authorized reviewer accepts the proposal through `DiscoveryLinking.addNoteToSource`.

```endpoints
projectContributions.SubmitSourceNote at /projects/contributions/submit-source-note
```


## Proposing connection removals

Project members can propose removing connections from their project's main research graph.

The [SubmitConnectionRemoval endpoint](reaction:projectContributions.SubmitConnectionRemoval) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph through `Collaborating._getItem` and verifies that the connection belongs to that graph through `DiscoveryLinking._connection`.

The application constructs a `REMOVE_CONNECTION` change containing the connection's identity and calls `Contributing.propose` with the main graph as the target.

The connection remains unchanged while the proposal is pending. When an authorized reviewer accepts the proposal, `DiscoveryLinking.removeConnection` removes the connection and its associated notes without removing either source.

```endpoints
projectContributions.SubmitConnectionRemoval at /projects/contributions/submit-connection-removal
```


## Proposing connections

Project members can propose new connections between sources in their project's main research graph.

The [SubmitConnection endpoint](reaction:projectContributions.SubmitConnection) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph using `Collaborating._getItem` and verifies through `DiscoveryLinking._source` that both the source and destination belong to that graph.

The application constructs an `ADD_CONNECTION` change containing the source, destination, and contributor identities, then calls `Contributing.propose` with the main graph as the target.

The connection is not created until an authorized reviewer accepts the proposal. Upon approval, the application calls `DiscoveryLinking.addConnection` with the project's main graph and the stored arguments.

```endpoints
projectContributions.SubmitConnection at /projects/contributions/submit-connection
```


## Proposing source removals

Project members can propose removing sources from their project's main research graph.

The [SubmitSourceRemoval endpoint](reaction:projectContributions.SubmitSourceRemoval) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph through `Collaborating._getItem` and verifies that the source belongs to that graph through `DiscoveryLinking._source`.

The application constructs a `REMOVE_SOURCE` change containing the source's identity and calls `Contributing.propose` with the project's main graph as the target.

The source remains unchanged while the proposal is pending. When an authorized reviewer accepts the proposal, `DiscoveryLinking.removeSource` removes the source, its associated connections, and their notes.

```endpoints
projectContributions.SubmitSourceRemoval at /projects/contributions/submit-source-removal
```

## Proposing source removals together

A member can select several sources and propose removing them together, while reviewers still decide each removal on its own.

The [SubmitBatchedSourceRemoval endpoint](reaction:projectContributions.SubmitBatchedSourceRemoval) makes the same checks as SubmitSourceRemoval: it identifies the researcher through `SignIn.use`, verifies membership through `Collaborating._canView`, retrieves the main graph through `Collaborating._getItem`, and verifies through `DiscoveryLinking._source` that the source belongs to it. It also receives a batch identity, chosen by the frontend and shared by every source proposed together.

The application constructs a `REMOVE_SOURCE` change containing the source's identity and the batch, and calls `Contributing.propose` with the main graph as the target. Each source is its own proposal, so a reviewer can accept some removals in a batch and reject others; accepting reads only the operation and the source, exactly as for a single removal. The batch only lets the review list show the proposals together. Contributing itself is unchanged: the change is opaque to it.

```endpoints
projectContributions.SubmitBatchedSourceRemoval at /projects/contributions/submit-source-removal-in-batch
```

## Proposing note edits

Project members can propose edits to notes in their project's main research graph.

The [SubmitNoteEdit endpoint](reaction:projectContributions.SubmitNoteEdit) identifies the signed-in researcher through `SignIn.use` and verifies project membership through `Collaborating._canView`.

It retrieves the project's main graph using `Collaborating._getItem` and checks that the note belongs to that graph using `DiscoveryLinking._note`.

The application constructs an `EDIT_NOTE` change containing the note's identity and proposed text, then calls `Contributing.propose` with the project's main graph as the target.

The original note remains unchanged until an authorized reviewer accepts the proposal.

```endpoints
projectContributions.SubmitNoteEdit at /projects/contributions/submit-note-edit
```


## Reviewing contributions

When a reviewer requests approval, the application identifies the user through `SignIn.use`, retrieves the proposal through `Contributing._proposal`, and finds the associated project through `Collaborating._getProjectByItem`.

Only users for whom `Collaborating._canReview` returns true may accept or reject proposals. Accepted changes are applied using the corresponding DiscoveryLinking action.

The [Accept endpoint](reaction:projectContributions.Accept) identifies the signed-in reviewer, retrieves the pending proposal, and finds the project associated with its target graph. It checks `Collaborating._canReview` before allowing approval. For a `MERGE_GRAPH` proposal, the application applies the change through `DiscoveryLinking.mergeGraph` and records the decision through `Contributing.accept`.

### When a proposal's target is gone

Every request gets an answer. A proposal names a source, connection or note that may be gone by the time it is submitted or reviewed: two proposals may remove the same thing, or accepting one proposal may remove what another depends on (removing a source also removes its connections and their notes).

- **Submitting.** Each submit endpoint checks its target against the project's main graph. A member naming a source, connection or note that is not in it is refused with `SOURCE_NOT_IN_GRAPH`, `CONNECTION_NOT_IN_GRAPH` or `NOTE_NOT_FOUND`; a connection is refused if either of its sources is missing. A non-member is refused with `FORBIDDEN` as before.
- **Accepting.** For each operation, a reviewer accepting a pending proposal whose target is no longer in the graph is refused with the same codes: `REMOVE_SOURCE` and `ADD_SOURCE_NOTE` with `SOURCE_NOT_IN_GRAPH`, `ADD_CONNECTION` (either source gone) with `SOURCE_NOT_IN_GRAPH`, `REMOVE_CONNECTION` and `ADD_CONNECTION_NOTE` with `CONNECTION_NOT_IN_GRAPH`, and `EDIT_NOTE` and `REMOVE_NOTE` with `NOTE_NOT_FOUND`. An `ADD_CONNECTION` whose connection already exists is refused by `DiscoveryLinking.addConnection` with `CONNECTION_EXISTS`. Nothing is applied and the proposal stays `PENDING`, so the reviewer rejects it through the Reject endpoint; the proposal lifecycle is unchanged. Other proposals, including the other removals in a batch, are unaffected, since each is its own proposal.
- **Deciding a proposal that cannot be decided.** Accepting or rejecting a proposal that was already accepted, rejected or withdrawn is refused with `PROPOSAL_NOT_PENDING`, and one that does not exist with `PROPOSAL_NOT_FOUND`.

Over HTTP (`src/host/http.ts`), the "not in the graph" refusals and `PROPOSAL_NOT_FOUND` are 404 `NOT_FOUND`, and `PROPOSAL_NOT_PENDING` and `CONNECTION_EXISTS` are 409 `CONFLICT`.


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

makeEditNoteChange(note: String, text: String) : String
  Serializes an EDIT_NOTE operation containing the note's identity and proposed replacement text.

decodeChange(change: String) : Record
  Validates a serialized proposed change and returns its operation and arguments in a common record format.

makeRemoveSourceChange(source: String) : String
  Serializes a REMOVE_SOURCE operation containing the source's identity.

makeBatchedRemoveSourceChange(source: String, batch: String) : String
  Serializes a REMOVE_SOURCE operation containing the source's identity and the batch it was proposed in.

makeAddConnectionChange(source: String, destination: String, contributor: String) : String
  Serializes an ADD_CONNECTION operation containing the source, destination, and authenticated contributor identities.

makeRemoveConnectionChange(connection: String) : String
  Serializes a REMOVE_CONNECTION operation containing the connection's identity.

makeAddSourceNoteChange(source: String, text: String, author: String) : String
  Serializes an ADD_SOURCE_NOTE operation containing the source, note text, and authenticated author.

makeAddConnectionNoteChange(connection: String, text: String, author: String) : String
  Serializes an ADD_CONNECTION_NOTE operation containing the connection, note text, and authenticated author.

makeRemoveNoteChange(note: String) : String
  Serializes a REMOVE_NOTE operation containing the note's identity.

```
