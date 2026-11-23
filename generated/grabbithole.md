<!-- Generated from the GrabbitHole assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# GrabbitHole — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `set(user: User, password: String) : returns (user: User)`
  - Refuses `INVALID_PASSWORD`: A password must have 8 to 128 characters.
  - Refuses `PASSWORD_SET`: This account already has a password.
- `authenticate(user: User, password: String) : returns (user: User)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Queries

- `_acceptable(password: String) : one (acceptable: Flag)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [GrabbitHole types](../design/types.md), line 14.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 15.

### Collaborating

Defined in [Collaborating](../design/concepts/Collaborating.md), line 2.

#### Actions

- `createProject(owner: User, name: String) : returns (project: Project)`
- `setItem(project: Project, item: Item) : returns ()`
  - Refuses `PROJECT_NOT_FOUND`: There is no such project.
  - Refuses `ITEM_ALREADY_SET`: This project already has an associated item.
  - Refuses `ITEM_ALREADY_ASSOCIATED`: This item is already associated with another project.
- `invite(project: Project, inviter: User, invitee: User) : returns (invitation: Invitation)`
  - Refuses `PROJECT_NOT_FOUND`: There is no such project.
  - Refuses `NOT_OWNER`: Only the project owner can invite users.
  - Refuses `ALREADY_MEMBER`: This user is already a member.
  - Refuses `ALREADY_INVITED`: This user already has a pending invitation.
- `acceptInvitation(invitation: Invitation, user: User) : returns ()`
  - Refuses `INVITATION_NOT_FOUND`: There is no such invitation.
  - Refuses `INVITATION_NOT_PENDING`: This invitation is no longer pending.
  - Refuses `NOT_INVITEE`: Only the invited user can accept this invitation.
- `declineInvitation(invitation: Invitation, user: User) : returns ()`
  - Refuses `INVITATION_NOT_FOUND`: There is no such invitation.
  - Refuses `INVITATION_NOT_PENDING`: This invitation is no longer pending.
  - Refuses `NOT_INVITEE`: Only the invited user can decline this invitation.
- `removeMember(project: Project, owner: User, member: User) : returns ()`
  - Refuses `PROJECT_NOT_FOUND`: There is no such project.
  - Refuses `NOT_OWNER`: Only the project owner can remove members.
  - Refuses `NOT_MEMBER`: This user is not a member.
  - Refuses `CANNOT_REMOVE_OWNER`: The project owner cannot be removed.
- `grantReviewer(project: Project, owner: User, member: User) : returns ()`
  - Refuses `PROJECT_NOT_FOUND`: There is no such project.
  - Refuses `NOT_OWNER`: Only the project owner can grant reviewer permissions.
  - Refuses `NOT_MEMBER`: Only project members can become reviewers.
  - Refuses `ALREADY_REVIEWER`: This member is already a reviewer.
- `revokeReviewer(project: Project, owner: User, member: User) : returns ()`
  - Refuses `PROJECT_NOT_FOUND`: There is no such project.
  - Refuses `NOT_OWNER`: Only the project owner can revoke reviewer permissions.
  - Refuses `CANNOT_REVOKE_OWNER`: The project owner's reviewer permissions cannot be revoked.
  - Refuses `NOT_REVIEWER`: This user is not a reviewer.

#### Queries

- `_project(project: Project) : optional (name: String, owner: User)`
- `_members(project: Project) : many (user: User)`
- `_reviewers(project: Project) : many (user: User)`
- `_invitation(invitation: Invitation) : optional (project: Project, invitee: User, status: InvitationStatus)`
- `_projectsOf(user: User) : many (project: Project, name: String)`
- `_pendingInvitations(user: User) : many (invitation: Invitation, project: Project)`
- `_canReview(project: Project, user: User) : one (allowed: Flag)`
- `_canView(project: Project, user: User) : one (allowed: Flag)`
- `_getItem(project: Project) : optional (item: Item)`
- `_getProjectByItem(item: Item) : optional (project: Project)`

#### Instances

- `Collaborating` — instance of `Collaborating` — [GrabbitHole types](../design/types.md), line 27.
  - `Item` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 29.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 28.

### Contributing

Defined in [Contributing](../design/concepts/Contributing.md), line 2.

#### Actions

- `propose(user: User, target: Item, change: Change) : returns (proposal: Proposal)`
- `accept(proposal: Proposal, reviewer: User) : returns ()`
  - Refuses `PROPOSAL_NOT_FOUND`: There is no such proposal.
  - Refuses `PROPOSAL_NOT_PENDING`: This proposal is no longer pending.
- `reject(proposal: Proposal, reviewer: User, reason: String) : returns ()`
  - Refuses `PROPOSAL_NOT_FOUND`: There is no such proposal.
  - Refuses `PROPOSAL_NOT_PENDING`: This proposal is no longer pending.
- `withdraw(proposal: Proposal, user: User) : returns ()`
  - Refuses `PROPOSAL_NOT_FOUND`: There is no such proposal.
  - Refuses `PROPOSAL_NOT_PENDING`: This proposal is no longer pending.
  - Refuses `NOT_PROPOSER`: Only the proposer can withdraw this proposal.

#### Queries

- `_proposal(proposal: Proposal) : optional (proposer: User, target: Item, change: Change, status: Status, reviewer: User, reason: String)`
- `_pending(target: Item) : many (proposal: Proposal, proposer: User, change: Change)`

#### Instances

- `Contributing` — instance of `Contributing` — [GrabbitHole types](../design/types.md), line 31.
  - `Change` is `Text` — [GrabbitHole types](../design/types.md), line 34.
  - `Item` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 33.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 32.

### DiscoveryLinking

Defined in [DiscoveryLinking](../design/concepts/DiscoveryLinking.md), line 1.

#### Actions

- `createGraph(name: String) : returns (graph: Graph)`
- `addSource(graph: Graph, url: String, contributor: User) : returns (source: Source)`
  - Refuses `GRAPH_NOT_FOUND`: There is no such graph.
  - Refuses `SOURCE_EXISTS`: This graph already has a source with that URL.
- `addConnection(graph: Graph, source: Source, destination: Source, contributor: User) : returns (connection: Connection)`
  - Refuses `GRAPH_NOT_FOUND`: There is no such graph.
  - Refuses `SOURCE_NOT_IN_GRAPH`: Both sources of a connection must belong to its graph.
  - Refuses `CONNECTION_EXISTS`: This graph already has a connection from that source to that destination.
- `addNoteToSource(source: Source, author: User, text: String) : returns (note: Note)`
  - Refuses `SOURCE_NOT_FOUND`: There is no such source.
- `addNoteToConnection(connection: Connection, author: User, text: String) : returns (note: Note)`
  - Refuses `CONNECTION_NOT_FOUND`: There is no such connection.
- `removeSource(graph: Graph, source: Source) : returns ()`
  - Refuses `GRAPH_NOT_FOUND`: There is no such graph.
  - Refuses `SOURCE_NOT_IN_GRAPH`: That source does not belong to this graph.
- `removeConnection(graph: Graph, connection: Connection) : returns ()`
  - Refuses `GRAPH_NOT_FOUND`: There is no such graph.
  - Refuses `CONNECTION_NOT_IN_GRAPH`: That connection does not belong to this graph.
- `editNote(note: Note, text: String) : returns ()`
  - Refuses `NOTE_NOT_FOUND`: There is no such note.
- `removeNote(note: Note) : returns ()`
  - Refuses `NOTE_NOT_FOUND`: There is no such note.
- `mergeGraph(target: Graph, other: Graph) : returns ()`
  - Refuses `GRAPH_NOT_FOUND`: There is no such graph.
  - Refuses `SAME_GRAPH`: A graph cannot be merged into itself.

#### Queries

- `_graph(graph: Graph) : optional (name: String)`
- `_sources(graph: Graph) : many (source: Source, url: String)`
- `_sourceByUrl(graph: Graph, url: String) : optional (source: Source)`
- `_note(note: Note) : optional (graph: Graph, author: User, text: String)`
- `_source(source: Source) : optional (graph: Graph, url: String)`
- `_connections(graph: Graph) : many (connection: Connection, source: Source, destination: Source)`
- `_connection(connection: Connection) : optional (graph: Graph, source: Source, destination: Source)`
- `_sourceContributors(source: Source) : many (contributor: User)`
- `_connectionContributors(connection: Connection) : many (contributor: User)`
- `_sourceNotes(source: Source) : many (note: Note, author: User, text: String)`
- `_connectionNotes(connection: Connection) : many (note: Note, author: User, text: String)`

#### Instances

- `DiscoveryLinking` — instance of `DiscoveryLinking` — [GrabbitHole types](../design/types.md), line 24.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 25.

### Registering

Defined in [Registering](../design/concepts/Registering.md), line 1.

#### Actions

- `register(username: String) : returns (user: User)`
  - Refuses `INVALID_USERNAME`: A username must have 3 to 32 letters, digits, underscores, or hyphens.
  - Refuses `USERNAME_TAKEN`: That username is taken.

#### Queries

- `_byUsername(username: String) : optional (user: User)`
- `_username(user: User) : optional (username: String)`

#### Instances

- `Registering` — instance of `Registering` — [GrabbitHole types](../design/types.md), line 12.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `startSession(user: User) : returns (session: Session)`
- `setItem(session: Session, item: Item) : returns ()`
  - Refuses `SESSION_NOT_FOUND`: There is no such session.
  - Refuses `ITEM_ALREADY_SET`: This session already has an associated item.
  - Refuses `ITEM_ALREADY_ASSOCIATED`: This item is already associated with another session.
- `recordVisit(session: Session, url: String, sourceUrl?: String) : returns ()`
  - Refuses `SESSION_NOT_FOUND`: There is no such session.
  - Refuses `SESSION_NOT_ACTIVE`: This session has stopped.
- `stopSession(session: Session) : returns ()`
  - Refuses `SESSION_NOT_FOUND`: There is no such session.
  - Refuses `SESSION_NOT_ACTIVE`: This session has stopped.

#### Queries

- `_session(session: Session) : optional (user: User, status: Status)`
- `_getItem(session: Session) : optional (item: Item)`
- `_getSessionByItem(item: Item) : optional (session: Session)`
- `_visited(session: Session) : many (url: String)`
- `_connections(session: Session) : many (source: String, destination: String)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [GrabbitHole types](../design/types.md), line 20.
  - `Item` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 22.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 21.

### SignIn

Defined in [SignIn](../design/concepts/SignIn.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `SignIn` — instance of `SignIn` — [GrabbitHole types](../design/types.md), line 17.
  - `Subject` is `Registering.User` — [GrabbitHole types](../design/types.md), line 18.

## Application types

Concrete types:

- `Text` — [GrabbitHole types](../design/types.md), line 8.

## Computations

- `decodeChange(change: String) : Record` — [Project contributions](../design/compositions/project-contributions.md), line 167.
- `makeAddConnectionChange(source: String, destination: String, contributor: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 173.
- `makeAddConnectionNoteChange(connection: String, text: String, author: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 182.
- `makeAddSourceNoteChange(source: String, text: String, author: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 179.
- `makeEditNoteChange(note: String, text: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 164.
- `makeMergeGraphChange(other: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 161.
- `makeRemoveConnectionChange(connection: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 176.
- `makeRemoveNoteChange(note: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 185.
- `makeRemoveSourceChange(source: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 170.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the projects of (user)

```former
Former "the projects of (user)" — inputs (user); bindings (project, name); promises exactly one record — forms:
  each Collaborating._projectsOf (user) has (name, project)
    form a record of
      name
      project
```

### the research graph (graph)

```former
Former "the research graph (graph)" — inputs (graph); bindings (name, source, url, sourceContributor, sourceContributorName, sourceNote, sourceNoteAuthor, sourceNoteAuthorName, sourceNoteText, connection, from, to, connectionContributor, connectionContributorName, connectionNote, connectionNoteAuthor, connectionNoteAuthorName, connectionNoteText); promises exactly one record — forms:
  a record of
    where DiscoveryLinking._graph (graph) has (name)
    connections: each DiscoveryLinking._connections (graph) has (connection, destination: to, source: from)
      form a record of
        connection
        contributors: each DiscoveryLinking._connectionContributors (connection) has (contributor: connectionContributor)
          where Registering._username (user: connectionContributor) has (username: connectionContributorName)
          form a record of
            user: connectionContributor
            username: connectionContributorName
        destination: to
        notes: each DiscoveryLinking._connectionNotes (connection) has (author: connectionNoteAuthor, note: connectionNote, text: connectionNoteText)
          where Registering._username (user: connectionNoteAuthor) has (username: connectionNoteAuthorName)
          form a record of
            author: connectionNoteAuthor
            authorName: connectionNoteAuthorName
            note: connectionNote
            text: connectionNoteText
        source: from
    graph
    name
    sources: each DiscoveryLinking._sources (graph) has (source, url)
      form a record of
        contributors: each DiscoveryLinking._sourceContributors (source) has (contributor: sourceContributor)
          where Registering._username (user: sourceContributor) has (username: sourceContributorName)
          form a record of
            user: sourceContributor
            username: sourceContributorName
        notes: each DiscoveryLinking._sourceNotes (source) has (author: sourceNoteAuthor, note: sourceNote, text: sourceNoteText)
          where Registering._username (user: sourceNoteAuthor) has (username: sourceNoteAuthorName)
          form a record of
            author: sourceNoteAuthor
            authorName: sourceNoteAuthorName
            note: sourceNote
            text: sourceNoteText
        source
        url
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### projectContributions.Accept

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.Accept:alreadyAccepted#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (status: "ACCEPTED", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_PENDING", requestId)
```

### projectContributions.Accept:alreadyRejected#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (status: "REJECTED", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_PENDING", requestId)
```

### projectContributions.Accept:approved#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (operation: "MERGE_GRAPH", other) is decodeChange (change)
  DiscoveryLinking._graph (graph: other)
then
  DiscoveryLinking.mergeGraph (other, target)
```

### projectContributions.Accept:approved#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.mergeGraph (other, target), asked by projectContributions.Accept:approved#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approved#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approved#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedConnection#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (contributor, destination, operation: "ADD_CONNECTION", source) is decodeChange (change)
  DiscoveryLinking._source (source) has (graph: target)
  DiscoveryLinking._source (source: destination) has (graph: target)
then
  DiscoveryLinking.addConnection (contributor, destination, graph: target, source)
```

### projectContributions.Accept:approvedConnection#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.addConnection (contributor, destination, graph: target, source), asked by projectContributions.Accept:approvedConnection#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedConnection#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedConnection#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedConnectionNote#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (author, connection, operation: "ADD_CONNECTION_NOTE", text) is decodeChange (change)
  DiscoveryLinking._connection (connection) has (graph: target)
then
  DiscoveryLinking.addNoteToConnection (author, connection, text)
```

### projectContributions.Accept:approvedConnectionNote#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.addNoteToConnection (author, connection, text), asked by projectContributions.Accept:approvedConnectionNote#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedConnectionNote#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedConnectionNote#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedConnectionRemoval#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (connection, operation: "REMOVE_CONNECTION") is decodeChange (change)
  DiscoveryLinking._connection (connection) has (graph: target)
then
  DiscoveryLinking.removeConnection (connection, graph: target)
```

### projectContributions.Accept:approvedConnectionRemoval#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.removeConnection (connection, graph: target), asked by projectContributions.Accept:approvedConnectionRemoval#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedConnectionRemoval#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedConnectionRemoval#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedNoteEdit#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (note, operation: "EDIT_NOTE", text) is decodeChange (change)
  DiscoveryLinking._note (note) has (graph: target)
then
  DiscoveryLinking.editNote (note, text)
```

### projectContributions.Accept:approvedNoteEdit#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.editNote (note, text), asked by projectContributions.Accept:approvedNoteEdit#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedNoteEdit#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedNoteEdit#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedNoteRemoval#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (note, operation: "REMOVE_NOTE") is decodeChange (change)
  DiscoveryLinking._note (note) has (graph: target)
then
  DiscoveryLinking.removeNote (note)
```

### projectContributions.Accept:approvedNoteRemoval#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.removeNote (note), asked by projectContributions.Accept:approvedNoteRemoval#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedNoteRemoval#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedNoteRemoval#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedSourceNote#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (author, operation: "ADD_SOURCE_NOTE", source, text) is decodeChange (change)
  DiscoveryLinking._source (source) has (graph: target)
then
  DiscoveryLinking.addNoteToSource (author, source, text)
```

### projectContributions.Accept:approvedSourceNote#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.addNoteToSource (author, source, text), asked by projectContributions.Accept:approvedSourceNote#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedSourceNote#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedSourceNote#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedSourceRemoval#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (operation: "REMOVE_SOURCE", source) is decodeChange (change)
  DiscoveryLinking._source (source) has (graph: target)
then
  DiscoveryLinking.removeSource (graph: target, source)
```

### projectContributions.Accept:approvedSourceRemoval#3

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when DiscoveryLinking.removeSource (graph: target, source), asked by projectContributions.Accept:approvedSourceRemoval#2
where
  earlier, SignIn.use (session, subject: user), asked by projectContributions.Accept
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  Contributing.accept (proposal, reviewer: user)
```

### projectContributions.Accept:approvedSourceRemoval#4

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedSourceRemoval#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:denied#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 144.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 150.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.Reject

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 147.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 151.

```reaction
when RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.Reject:alreadyAccepted#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 147.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 151.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Reject
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
  Contributing._proposal (proposal) has (status: "ACCEPTED", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_PENDING", requestId)
```

### projectContributions.Reject:alreadyRejected#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 147.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 151.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Reject
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
  Contributing._proposal (proposal) has (status: "REJECTED", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_PENDING", requestId)
```

### projectContributions.Reject:denied#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 147.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 151.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Reject
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
  Contributing._proposal (proposal) has (target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.Reject:rejected#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 147.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 151.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Reject
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
  Contributing._proposal (proposal) has (status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  Contributing.reject (proposal, reason, reviewer: user)
```

### projectContributions.Reject:rejected#3

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 147.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 151.

```reaction
when Contributing.reject (proposal, reason, reviewer: user), asked by projectContributions.Reject:rejected#2
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.SubmitConnection

Authored path: `projectContributions.SubmitConnection`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 92.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 101.

```reaction
when RequestBoundary.request (destination, path: "/projects/contributions/submit-connection", project, requestId, session, source)
then
  SignIn.use (session)
```

### projectContributions.SubmitConnection:allowed#2

Authored path: `projectContributions.SubmitConnection`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 92.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 101.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnection
where
  earlier, RequestBoundary.request (destination, path: "/projects/contributions/submit-connection", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._source (source) has (graph: target)
  DiscoveryLinking._source (source: destination) has (graph: target)
  change is makeAddConnectionChange (contributor: user, destination, source)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitConnection:allowed#3

Authored path: `projectContributions.SubmitConnection`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 92.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 101.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitConnection:allowed#2
where
  earlier, RequestBoundary.request (destination, path: "/projects/contributions/submit-connection", project, requestId, session, source)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitConnection:denied#2

Authored path: `projectContributions.SubmitConnection`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 92.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 101.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnection
where
  earlier, RequestBoundary.request (destination, path: "/projects/contributions/submit-connection", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitConnectionNote

Authored path: `projectContributions.SubmitConnectionNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 41.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 50.

```reaction
when RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-note", project, requestId, session, text)
then
  SignIn.use (session)
```

### projectContributions.SubmitConnectionNote:allowed#2

Authored path: `projectContributions.SubmitConnectionNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 41.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 50.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnectionNote
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-note", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._connection (connection) has (graph: target)
  change is makeAddConnectionNoteChange (author: user, connection, text)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitConnectionNote:allowed#3

Authored path: `projectContributions.SubmitConnectionNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 41.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 50.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitConnectionNote:allowed#2
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-note", project, requestId, session, text)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitConnectionNote:denied#2

Authored path: `projectContributions.SubmitConnectionNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 41.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 50.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnectionNote
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-note", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitConnectionRemoval

Authored path: `projectContributions.SubmitConnectionRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 75.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 84.

```reaction
when RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-removal", project, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.SubmitConnectionRemoval:allowed#2

Authored path: `projectContributions.SubmitConnectionRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 75.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 84.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnectionRemoval
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-removal", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._connection (connection) has (graph: target)
  change is makeRemoveConnectionChange (connection)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitConnectionRemoval:allowed#3

Authored path: `projectContributions.SubmitConnectionRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 75.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 84.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitConnectionRemoval:allowed#2
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-removal", project, requestId, session)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitConnectionRemoval:denied#2

Authored path: `projectContributions.SubmitConnectionRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 75.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 84.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnectionRemoval
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-removal", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitGraph

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.SubmitGraph:allowed#2

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitGraph
where
  earlier, RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  Sessioning._getSessionByItem (item: other) has (session: browsingSession)
  Sessioning._session (session: browsingSession) has (status: "STOPPED", user)
  no Collaborating._getProjectByItem (item: other)
  DiscoveryLinking._graph (graph: other)
  change is makeMergeGraphChange (other)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitGraph:allowed#3

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitGraph:allowed#2
where
  earlier, RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitGraph:denied#2

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitGraph
where
  earlier, RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitGraph:notOwnSession#2

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitGraph
where
  earlier, RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Sessioning._getSessionByItem (item: other) has (session: browsingSession)
  Sessioning._session (session: browsingSession)
  no Sessioning._session (session: browsingSession) has (user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitGraph:notSessionGraph#2

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitGraph
where
  earlier, RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  no Sessioning._getSessionByItem (item: other)
then
  RequestBoundary.respond (error: "NOT_A_SESSION_GRAPH", requestId)
```

### projectContributions.SubmitGraph:stillRecording#2

Authored path: `projectContributions.SubmitGraph`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 8.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitGraph
where
  earlier, RequestBoundary.request (other, path: "/projects/contributions/submit", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Sessioning._getSessionByItem (item: other) has (session: browsingSession)
  Sessioning._session (session: browsingSession) has (status: "ACTIVE", user)
then
  RequestBoundary.respond (error: "SESSION_STILL_RECORDING", requestId)
```

### projectContributions.SubmitNoteEdit

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 134.

```reaction
when RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
then
  SignIn.use (session)
```

### projectContributions.SubmitNoteEdit:allowed#2

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 134.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteEdit
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._note (note) has (graph: target)
  change is makeEditNoteChange (note, text)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitNoteEdit:allowed#3

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 134.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitNoteEdit:allowed#2
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitNoteEdit:denied#2

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 134.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteEdit
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitNoteRemoval

Authored path: `projectContributions.SubmitNoteRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 24.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 33.

```reaction
when RequestBoundary.request (note, path: "/projects/contributions/submit-note-removal", project, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.SubmitNoteRemoval:allowed#2

Authored path: `projectContributions.SubmitNoteRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 24.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 33.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteRemoval
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-removal", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._note (note) has (graph: target)
  change is makeRemoveNoteChange (note)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitNoteRemoval:allowed#3

Authored path: `projectContributions.SubmitNoteRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 24.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 33.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitNoteRemoval:allowed#2
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-removal", project, requestId, session)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitNoteRemoval:denied#2

Authored path: `projectContributions.SubmitNoteRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 24.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 33.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteRemoval
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-removal", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitSourceNote

Authored path: `projectContributions.SubmitSourceNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 58.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 67.

```reaction
when RequestBoundary.request (path: "/projects/contributions/submit-source-note", project, requestId, session, source, text)
then
  SignIn.use (session)
```

### projectContributions.SubmitSourceNote:allowed#2

Authored path: `projectContributions.SubmitSourceNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 58.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 67.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitSourceNote
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-note", project, requestId, session, source, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._source (source) has (graph: target)
  change is makeAddSourceNoteChange (author: user, source, text)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitSourceNote:allowed#3

Authored path: `projectContributions.SubmitSourceNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 58.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 67.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitSourceNote:allowed#2
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-note", project, requestId, session, source, text)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitSourceNote:denied#2

Authored path: `projectContributions.SubmitSourceNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 58.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 67.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitSourceNote
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-note", project, requestId, session, source, text)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitSourceRemoval

Authored path: `projectContributions.SubmitSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 109.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 118.

```reaction
when RequestBoundary.request (path: "/projects/contributions/submit-source-removal", project, requestId, session, source)
then
  SignIn.use (session)
```

### projectContributions.SubmitSourceRemoval:allowed#2

Authored path: `projectContributions.SubmitSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 109.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 118.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitSourceRemoval
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-removal", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._source (source) has (graph: target)
  change is makeRemoveSourceChange (source)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitSourceRemoval:allowed#3

Authored path: `projectContributions.SubmitSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 109.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 118.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitSourceRemoval:allowed#2
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-removal", project, requestId, session, source)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitSourceRemoval:denied#2

Authored path: `projectContributions.SubmitSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 109.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 118.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitSourceRemoval
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-removal", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGraphs.CreateProjectGraph

Authored path: `projectGraphs.CreateProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 5.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 15.
- Covered by [Session projects](../design/compositions/session-projects.md), line 5.

```reaction
when Collaborating.createProject (name, project)
then
  DiscoveryLinking.createGraph (name)
```

### projectGraphs.CreateProjectGraph#2

Authored path: `projectGraphs.CreateProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 5.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 15.
- Covered by [Session projects](../design/compositions/session-projects.md), line 5.

```reaction
when DiscoveryLinking.createGraph (name, graph), asked by projectGraphs.CreateProjectGraph
where
  earlier, Collaborating.createProject (name, project)
then
  Collaborating.setItem (item: graph, project)
```

### projectGraphs.GetProjectGraph

Authored path: `projectGraphs.GetProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 11.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 18.

```reaction
when RequestBoundary.request (path: "/projects/graph", project, requestId, session)
then
  SignIn.use (session)
```

### projectGraphs.GetProjectGraph:member#2

Authored path: `projectGraphs.GetProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 11.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectGraphs.GetProjectGraph
where
  earlier, RequestBoundary.request (path: "/projects/graph", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: graph)
then
  RequestBoundary.respond (graph: former "the research graph (graph)" with (graph), requestId)
```

### projectGraphs.GetProjectGraph:noGraph#2

Authored path: `projectGraphs.GetProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 11.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectGraphs.GetProjectGraph
where
  earlier, RequestBoundary.request (path: "/projects/graph", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  no Collaborating._getItem (project)
then
  RequestBoundary.respond (error: "PROJECT_GRAPH_NOT_FOUND", requestId)
```

### projectGraphs.GetProjectGraph:notMember#2

Authored path: `projectGraphs.GetProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 11.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectGraphs.GetProjectGraph
where
  earlier, RequestBoundary.request (path: "/projects/graph", project, requestId, session)
  Collaborating._project (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGraphs.GetProjectGraph:unknownProject#2

Authored path: `projectGraphs.GetProjectGraph`.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 11.
- Covered by [Project graphs](../design/compositions/project-graphs.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectGraphs.GetProjectGraph
where
  earlier, RequestBoundary.request (path: "/projects/graph", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### reusable.accounts.identifying.Me

Authored path: `reusable.accounts.identifying.Me`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 5.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 8.

```reaction
when RequestBoundary.request (path: "/auth/me", requestId, session)
then
  SignIn.use (session)
```

### reusable.accounts.identifying.Me#2

Authored path: `reusable.accounts.identifying.Me`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 5.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 8.

```reaction
when SignIn.use (session, subject: user), asked by reusable.accounts.identifying.Me
where
  Registering._username (user) has (username)
  earlier, RequestBoundary.request (path: "/auth/me", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### reusable.accounts.leaving.SignOut

Authored path: `reusable.accounts.leaving.SignOut`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 11.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 14.

```reaction
when RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  SignIn.end (session)
```

### reusable.accounts.leaving.SignOut#2

Authored path: `reusable.accounts.leaving.SignOut`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 11.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 14.

```reaction
when SignIn.end (session), asked by reusable.accounts.leaving.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### reusable.passwords.entering.Register:accepted

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  Authenticating._acceptable (password) has (acceptable: true)
then
  Registering.register (username)
```

### reusable.passwords.entering.Register:accepted#2

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Registering.register (username, user), asked by reusable.passwords.entering.Register:accepted
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.set (password, user)
```

### reusable.passwords.entering.Register:accepted#3

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Authenticating.set (password, user), asked by reusable.passwords.entering.Register:accepted#2
then
  SignIn.start (subject: user)
```

### reusable.passwords.entering.Register:accepted#4

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when SignIn.start (subject: user, expiresAt, session), asked by reusable.passwords.entering.Register:accepted#3
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.passwords.entering.Register:refused

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  Authenticating._acceptable (password) has (acceptable: false)
then
  RequestBoundary.respond (error: "INVALID_PASSWORD", requestId)
```

### reusable.passwords.entering.SignIn:known

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
where
  Registering._byUsername (username) has (user)
then
  Authenticating.authenticate (password, user)
```

### reusable.passwords.entering.SignIn:known#2

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when Authenticating.authenticate (password, user), asked by reusable.passwords.entering.SignIn:known
then
  SignIn.start (subject: user)
```

### reusable.passwords.entering.SignIn:known#3

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when SignIn.start (subject: user, expiresAt, session), asked by reusable.passwords.entering.SignIn:known#2
where
  earlier, RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.passwords.entering.SignIn:unknown

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
where
  no Registering._byUsername (username)
then
  RequestBoundary.respond (error: "INVALID_CREDENTIALS", requestId)
```

### sessionProjects.CreateProject

Authored path: `sessionProjects.CreateProject`.
- Covered by [Session projects](../design/compositions/session-projects.md), line 3.
- Covered by [Session projects](../design/compositions/session-projects.md), line 10.

```reaction
when RequestBoundary.request (name, path: "/projects/create", requestId, session)
then
  SignIn.use (session)
```

### sessionProjects.CreateProject#2

Authored path: `sessionProjects.CreateProject`.
- Covered by [Session projects](../design/compositions/session-projects.md), line 3.
- Covered by [Session projects](../design/compositions/session-projects.md), line 10.

```reaction
when SignIn.use (session, subject: user), asked by sessionProjects.CreateProject
where
  earlier, RequestBoundary.request (name, path: "/projects/create", requestId, session)
then
  Collaborating.createProject (name, owner: user)
```

### sessionProjects.CreateProject:noGraph#3

Authored path: `sessionProjects.CreateProject`.
- Covered by [Session projects](../design/compositions/session-projects.md), line 3.
- Covered by [Session projects](../design/compositions/session-projects.md), line 10.

```reaction
when Collaborating.createProject (name, owner: user, project), asked by sessionProjects.CreateProject#2
at the flow's settlement frontier
where
  no Collaborating._getItem (project)
  earlier, RequestBoundary.request (name, path: "/projects/create", requestId, session)
then
  RequestBoundary.respond (error: "PROJECT_GRAPH_NOT_FOUND", requestId)
```

### sessionProjects.CreateProject:ready#3

Authored path: `sessionProjects.CreateProject`.
- Covered by [Session projects](../design/compositions/session-projects.md), line 3.
- Covered by [Session projects](../design/compositions/session-projects.md), line 10.

```reaction
when Collaborating.createProject (name, owner: user, project), asked by sessionProjects.CreateProject#2
at the flow's settlement frontier
where
  Collaborating._getItem (project)
  earlier, RequestBoundary.request (name, path: "/projects/create", requestId, session)
then
  RequestBoundary.respond (project, requestId)
```

### sessionProjects.ListMyProjects

Authored path: `sessionProjects.ListMyProjects`.
- Covered by [Session projects](../design/compositions/session-projects.md), line 7.
- Covered by [Session projects](../design/compositions/session-projects.md), line 11.

```reaction
when RequestBoundary.request (path: "/projects/mine", requestId, session)
then
  SignIn.use (session)
```

### sessionProjects.ListMyProjects#2

Authored path: `sessionProjects.ListMyProjects`.
- Covered by [Session projects](../design/compositions/session-projects.md), line 7.
- Covered by [Session projects](../design/compositions/session-projects.md), line 11.

```reaction
when SignIn.use (session, subject: user), asked by sessionProjects.ListMyProjects
where
  earlier, RequestBoundary.request (path: "/projects/mine", requestId, session)
then
  RequestBoundary.respond (projects: former "the projects of (user)" with (user), requestId)
```

### sessioning.browsing.GetSessionGraph

Authored path: `sessioning.browsing.GetSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 29.

```reaction
when RequestBoundary.request (browsingSession, path: "/sessions/graph", requestId, session)
then
  SignIn.use (session)
```

### sessioning.browsing.GetSessionGraph:noGraph#2

Authored path: `sessioning.browsing.GetSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 29.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.GetSessionGraph
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/graph", requestId, session)
  Sessioning._session (session: browsingSession) has (user)
  no Sessioning._getItem (session: browsingSession)
then
  RequestBoundary.respond (error: "SESSION_GRAPH_NOT_FOUND", requestId)
```

### sessioning.browsing.GetSessionGraph:notOwner#2

Authored path: `sessioning.browsing.GetSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 29.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.GetSessionGraph
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/graph", requestId, session)
  Sessioning._session (session: browsingSession)
  no Sessioning._session (session: browsingSession) has (user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### sessioning.browsing.GetSessionGraph:owner#2

Authored path: `sessioning.browsing.GetSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 29.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.GetSessionGraph
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/graph", requestId, session)
  Sessioning._session (session: browsingSession) has (user)
  Sessioning._getItem (session: browsingSession) has (item: graph)
then
  RequestBoundary.respond (graph: former "the research graph (graph)" with (graph), requestId)
```

### sessioning.browsing.GetSessionGraph:unknownSession#2

Authored path: `sessioning.browsing.GetSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 29.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.GetSessionGraph
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/graph", requestId, session)
  no Sessioning._session (session: browsingSession)
then
  RequestBoundary.respond (error: "SESSION_NOT_FOUND", requestId)
```

### sessioning.browsing.RecordVisit

Authored path: `sessioning.browsing.RecordVisit`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 19.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 27.

```reaction
when RequestBoundary.request (browsingSession, path: "/sessions/visit", requestId, session, sourceUrl, url)
then
  SignIn.use (session)
```

### sessioning.browsing.RecordVisit:notOwner#2

Authored path: `sessioning.browsing.RecordVisit`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 19.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 27.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.RecordVisit
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/visit", requestId, session, sourceUrl, url)
  Sessioning._session (session: browsingSession)
  no Sessioning._session (session: browsingSession) has (user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### sessioning.browsing.RecordVisit:owner#2

Authored path: `sessioning.browsing.RecordVisit`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 19.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 27.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.RecordVisit
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/visit", requestId, session, sourceUrl, url)
  Sessioning._session (session: browsingSession) has (user)
then
  Sessioning.recordVisit (session: browsingSession, sourceUrl, url)
```

### sessioning.browsing.RecordVisit:owner#3

Authored path: `sessioning.browsing.RecordVisit`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 19.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 27.

```reaction
when Sessioning.recordVisit (session: browsingSession, sourceUrl, url), asked by sessioning.browsing.RecordVisit:owner#2
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/visit", requestId, session, sourceUrl, url)
then
  RequestBoundary.respond (requestId)
```

### sessioning.browsing.RecordVisit:unknownSession#2

Authored path: `sessioning.browsing.RecordVisit`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 19.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 27.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.RecordVisit
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/visit", requestId, session, sourceUrl, url)
  no Sessioning._session (session: browsingSession)
then
  RequestBoundary.respond (error: "SESSION_NOT_FOUND", requestId)
```

### sessioning.browsing.StartSession

Authored path: `sessioning.browsing.StartSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 11.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 17.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 26.

```reaction
when RequestBoundary.request (path: "/sessions/start", requestId, session)
then
  SignIn.use (session)
```

### sessioning.browsing.StartSession#2

Authored path: `sessioning.browsing.StartSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 11.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 17.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 26.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.StartSession
then
  Sessioning.startSession (user)
```

### sessioning.browsing.StartSession:noGraph#3

Authored path: `sessioning.browsing.StartSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 11.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 17.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 26.

```reaction
when Sessioning.startSession (user, session: browsingSession), asked by sessioning.browsing.StartSession#2
at the flow's settlement frontier
where
  no Sessioning._getItem (session: browsingSession)
  earlier, RequestBoundary.request (path: "/sessions/start", requestId, session)
then
  RequestBoundary.respond (error: "SESSION_GRAPH_NOT_FOUND", requestId)
```

### sessioning.browsing.StartSession:ready#3

Authored path: `sessioning.browsing.StartSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 11.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 17.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 26.

```reaction
when Sessioning.startSession (user, session: browsingSession), asked by sessioning.browsing.StartSession#2
at the flow's settlement frontier
where
  Sessioning._getItem (session: browsingSession)
  earlier, RequestBoundary.request (path: "/sessions/start", requestId, session)
then
  RequestBoundary.respond (browsingSession, requestId)
```

### sessioning.browsing.StopSession

Authored path: `sessioning.browsing.StopSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 21.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 28.

```reaction
when RequestBoundary.request (browsingSession, path: "/sessions/stop", requestId, session)
then
  SignIn.use (session)
```

### sessioning.browsing.StopSession:notOwner#2

Authored path: `sessioning.browsing.StopSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 21.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 28.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.StopSession
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/stop", requestId, session)
  Sessioning._session (session: browsingSession)
  no Sessioning._session (session: browsingSession) has (user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### sessioning.browsing.StopSession:owner#2

Authored path: `sessioning.browsing.StopSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 21.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 28.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.StopSession
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/stop", requestId, session)
  Sessioning._session (session: browsingSession) has (user)
then
  Sessioning.stopSession (session: browsingSession)
```

### sessioning.browsing.StopSession:owner#3

Authored path: `sessioning.browsing.StopSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 21.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 28.

```reaction
when Sessioning.stopSession (session: browsingSession), asked by sessioning.browsing.StopSession:owner#2
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/stop", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### sessioning.browsing.StopSession:unknownSession#2

Authored path: `sessioning.browsing.StopSession`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 21.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 28.

```reaction
when SignIn.use (session, subject: user), asked by sessioning.browsing.StopSession
where
  earlier, RequestBoundary.request (browsingSession, path: "/sessions/stop", requestId, session)
  no Sessioning._session (session: browsingSession)
then
  RequestBoundary.respond (error: "SESSION_NOT_FOUND", requestId)
```

### sessioning.recording.CreateSessionGraph

Authored path: `sessioning.recording.CreateSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 5.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 17.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.

```reaction
when Sessioning.startSession (session)
then
  DiscoveryLinking.createGraph (name: "Research Session")
```

### sessioning.recording.CreateSessionGraph#2

Authored path: `sessioning.recording.CreateSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 5.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 17.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 23.

```reaction
when DiscoveryLinking.createGraph (name: "Research Session", graph), asked by sessioning.recording.CreateSessionGraph
where
  earlier, Sessioning.startSession (session)
then
  Sessioning.setItem (item: graph, session)
```

### sessioning.recording.RecordSessionConnection

Authored path: `sessioning.recording.RecordSessionConnection`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 9.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 19.

```reaction
when Sessioning.recordVisit (session, sourceUrl, url)
at the flow's settlement frontier
where
  Sessioning._connections (session) has (destination: url, source: sourceUrl)
  Sessioning._getItem (session) has (item: graph)
  Sessioning._session (session) has (user)
  DiscoveryLinking._sourceByUrl (graph, url: sourceUrl) has (source)
  DiscoveryLinking._sourceByUrl (graph, url) has (source: destination)
  no DiscoveryLinking._connections (graph) has (destination, source)
then
  DiscoveryLinking.addConnection (contributor: user, destination, graph, source)
```

### sessioning.recording.RecordSessionOrigin

Authored path: `sessioning.recording.RecordSessionOrigin`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 7.

```reaction
when Sessioning.recordVisit (session, sourceUrl, url)
where
  Sessioning._connections (session) has (destination: url, source: sourceUrl)
  Sessioning._getItem (session) has (item: graph)
  Sessioning._session (session) has (user)
  no DiscoveryLinking._sourceByUrl (graph, url: sourceUrl)
then
  DiscoveryLinking.addSource (contributor: user, graph, url: sourceUrl)
```

### sessioning.recording.RecordSessionSource

Authored path: `sessioning.recording.RecordSessionSource`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 7.

```reaction
when Sessioning.recordVisit (session, url)
where
  Sessioning._getItem (session) has (item: graph)
  Sessioning._session (session) has (user)
  no DiscoveryLinking._sourceByUrl (graph, url)
then
  DiscoveryLinking.addSource (contributor: user, graph, url)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/login` — requires `password`, `username`
- `/auth/logout` — requires `session`
- `/auth/me` — requires `session`
- `/auth/register` — requires `password`, `username`
- `/projects/contributions/accept` — requires `proposal`, `session`
- `/projects/contributions/reject` — requires `proposal`, `reason`, `session`
- `/projects/contributions/submit` — requires `other`, `project`, `session`
- `/projects/contributions/submit-connection` — requires `destination`, `project`, `session`, `source`
- `/projects/contributions/submit-connection-note` — requires `connection`, `project`, `session`, `text`
- `/projects/contributions/submit-connection-removal` — requires `connection`, `project`, `session`
- `/projects/contributions/submit-note-edit` — requires `note`, `project`, `session`, `text`
- `/projects/contributions/submit-note-removal` — requires `note`, `project`, `session`
- `/projects/contributions/submit-source-note` — requires `project`, `session`, `source`, `text`
- `/projects/contributions/submit-source-removal` — requires `project`, `session`, `source`
- `/projects/create` — requires `name`, `session`
- `/projects/graph` — requires `project`, `session`
- `/projects/mine` — requires `session`
- `/sessions/graph` — requires `browsingSession`, `session`
- `/sessions/start` — requires `session`
- `/sessions/stop` — requires `browsingSession`, `session`
- `/sessions/visit` — requires `browsingSession`, `session`, `sourceUrl`, `url`
