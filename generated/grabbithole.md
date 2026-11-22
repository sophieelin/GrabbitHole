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

### sessioning.recording.CreateSessionGraph

Authored path: `sessioning.recording.CreateSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 5.

```reaction
when Sessioning.startSession (session)
then
  DiscoveryLinking.createGraph (name: "Research Session")
```

### sessioning.recording.CreateSessionGraph#2

Authored path: `sessioning.recording.CreateSessionGraph`.
- Covered by [Sessioning](../design/compositions/sessioning.md), line 5.

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
