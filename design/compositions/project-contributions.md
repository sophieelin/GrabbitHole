# Project contributions

Researchers can propose changes to a shared project's research graph without modifying it immediately. Project members submit proposals, and authorized reviewers decide whether to accept or reject them.

## Submitting a graph


The [SubmitGraph endpoint](reaction:projectContributions.SubmitGraph) identifies the researcher through `SignIn.use`, verifies project membership through `Collaborating._canView`, retrieves the project's main graph through `Collaborating._getItem`, and verifies that the preliminary graph exists through `DiscoveryLinking._graph`.

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
