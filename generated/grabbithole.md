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

- `Authenticating` — instance of `Authenticating` — [GrabbitHole types](../design/types.md), line 16.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 17.

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

- `Collaborating` — instance of `Collaborating` — [GrabbitHole types](../design/types.md), line 29.
  - `Item` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 31.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 30.

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

- `Contributing` — instance of `Contributing` — [GrabbitHole types](../design/types.md), line 33.
  - `Change` is `Text` — [GrabbitHole types](../design/types.md), line 36.
  - `Item` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 35.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 34.

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

- `DiscoveryLinking` — instance of `DiscoveryLinking` — [GrabbitHole types](../design/types.md), line 26.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 27.

### Grouping

Defined in [Grouping](../design/concepts/Grouping.md), line 1.

#### Actions

- `createGroup(scope: Scope, name: String) : returns (group: Group)`
  - Refuses `EMPTY_NAME`: A group needs a name.
  - Refuses `NAME_TAKEN`: A group with this name already exists.
- `renameGroup(group: Group, name: String) : returns ()`
  - Refuses `GROUP_NOT_FOUND`: There is no such group.
  - Refuses `EMPTY_NAME`: A group needs a name.
  - Refuses `NAME_TAKEN`: A group with this name already exists.
- `removeGroup(group: Group) : returns ()`
  - Refuses `GROUP_NOT_FOUND`: There is no such group.
- `assign(group: Group, item: Item) : returns ()`
  - Refuses `GROUP_NOT_FOUND`: There is no such group.
- `unassign(item: Item) : returns ()`
  - Refuses `NOT_GROUPED`: This item is not in a group.

#### Queries

- `_group(group: Group) : optional (scope: Scope, name: String)`
- `_groups(scope: Scope) : many (group: Group, name: String)`
- `_items(group: Group) : many (item: Item)`
- `_groupOf(item: Item) : optional (group: Group)`

#### Instances

- `Grouping` — instance of `Grouping` — [GrabbitHole types](../design/types.md), line 38.
  - `Item` is `DiscoveryLinking.Source` — [GrabbitHole types](../design/types.md), line 39.
  - `Scope` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 40.

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

- `Registering` — instance of `Registering` — [GrabbitHole types](../design/types.md), line 14.

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

- `Sessioning` — instance of `Sessioning` — [GrabbitHole types](../design/types.md), line 22.
  - `Item` is `DiscoveryLinking.Graph` — [GrabbitHole types](../design/types.md), line 24.
  - `User` is `Registering.User` — [GrabbitHole types](../design/types.md), line 23.

### SignIn

Defined in [SignIn](../design/concepts/SignIn.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `SignIn` — instance of `SignIn` — [GrabbitHole types](../design/types.md), line 19.
  - `Subject` is `Registering.User` — [GrabbitHole types](../design/types.md), line 20.

## Application types

Concrete types:

- `Text` — [GrabbitHole types](../design/types.md), line 10.

## Computations

- `decodeChange(change: String) : Record` — [Project contributions](../design/compositions/project-contributions.md), line 189.
- `makeAddConnectionChange(source: String, destination: String, contributor: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 198.
- `makeAddConnectionNoteChange(connection: String, text: String, author: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 207.
- `makeAddSourceNoteChange(source: String, text: String, author: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 204.
- `makeBatchedRemoveSourceChange(source: String, batch: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 195.
- `makeEditNoteChange(note: String, text: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 186.
- `makeMergeGraphChange(other: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 183.
- `makeRemoveConnectionChange(connection: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 201.
- `makeRemoveNoteChange(note: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 210.
- `makeRemoveSourceChange(source: String) : String` — [Project contributions](../design/compositions/project-contributions.md), line 192.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the groups of (graph)

```former
Former "the groups of (graph)" — inputs (graph); bindings (group, name, source); promises exactly one record — forms:
  each Grouping._groups (scope: graph) has (group, name)
    form a record of
      group
      name
      sources: each Grouping._items (group) has (item: source)
        form a record of
          source
```

### the invitations of (user)

```former
Former "the invitations of (user)" — inputs (user); bindings (invitation, project, name); promises exactly one record — forms:
  each Collaborating._pendingInvitations (user) has (invitation, project)
    where Collaborating._project (project) has (name)
    form a record of
      invitation
      name
      project
```

### the members of (project)

```former
Former "the members of (project)" — inputs (project); bindings (member, username); promises exactly one record — forms:
  each Collaborating._members (project) has (user: member)
    where Registering._username (user: member) has (username)
    form a record of
      user: member
      username
```

### the pending proposals for (target)

```former
Former "the pending proposals for (target)" — inputs (target); bindings (proposal, proposer, proposerName, change); promises exactly one record — forms:
  each Contributing._pending (target) has (change, proposal, proposer)
    where Registering._username (user: proposer) has (username: proposerName)
    form a record of
      change
      proposal
      proposer
      proposerName
```

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

### the reviewers of (project)

```former
Former "the reviewers of (project)" — inputs (project); bindings (reviewer); promises exactly one record — forms:
  each Collaborating._reviewers (project) has (user: reviewer)
    form a record of
      user: reviewer
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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.Accept:alreadyAccepted#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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

### projectContributions.Accept:alreadyWithdrawn#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (status: "WITHDRAWN", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_PENDING", requestId)
```

### projectContributions.Accept:approved#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approved#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedConnection#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedConnection#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedConnectionNote#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedConnectionNote#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedConnectionRemoval#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedConnectionRemoval#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedNoteEdit#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedNoteEdit#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedNoteRemoval#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedNoteRemoval#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedSourceNote#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedSourceNote#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:approvedSourceRemoval#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when Contributing.accept (proposal, reviewer: user), asked by projectContributions.Accept:approvedSourceRemoval#3
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Accept:connectionDestinationGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (destination, operation: "ADD_CONNECTION", source) is decodeChange (change)
  DiscoveryLinking._source (source) has (graph: target)
  no DiscoveryLinking._source (source: destination) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectContributions.Accept:connectionNoteGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (connection, operation: "ADD_CONNECTION_NOTE") is decodeChange (change)
  no DiscoveryLinking._connection (connection) has (graph: target)
then
  RequestBoundary.respond (error: "CONNECTION_NOT_IN_GRAPH", requestId)
```

### projectContributions.Accept:connectionRemovalGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (connection, operation: "REMOVE_CONNECTION") is decodeChange (change)
  no DiscoveryLinking._connection (connection) has (graph: target)
then
  RequestBoundary.respond (error: "CONNECTION_NOT_IN_GRAPH", requestId)
```

### projectContributions.Accept:connectionSourceGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (destination, operation: "ADD_CONNECTION", source) is decodeChange (change)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectContributions.Accept:denied#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

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

### projectContributions.Accept:noteEditGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (note, operation: "EDIT_NOTE") is decodeChange (change)
  no DiscoveryLinking._note (note) has (graph: target)
then
  RequestBoundary.respond (error: "NOTE_NOT_FOUND", requestId)
```

### projectContributions.Accept:noteRemovalGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (note, operation: "REMOVE_NOTE") is decodeChange (change)
  no DiscoveryLinking._note (note) has (graph: target)
then
  RequestBoundary.respond (error: "NOTE_NOT_FOUND", requestId)
```

### projectContributions.Accept:sourceNoteGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (operation: "ADD_SOURCE_NOTE", source) is decodeChange (change)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectContributions.Accept:sourceRemovalGone#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  Contributing._proposal (proposal) has (change, status: "PENDING", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
  (operation: "REMOVE_SOURCE", source) is decodeChange (change)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectContributions.Accept:unknownProposal#2

Authored path: `projectContributions.Accept`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 156.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 172.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Accept
where
  earlier, RequestBoundary.request (path: "/projects/contributions/accept", proposal, requestId, session)
  no Contributing._proposal (proposal)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_FOUND", requestId)
```

### projectContributions.Reject

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

```reaction
when RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
then
  SignIn.use (session)
```

### projectContributions.Reject:alreadyAccepted#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

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

### projectContributions.Reject:alreadyWithdrawn#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Reject
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
  Contributing._proposal (proposal) has (status: "WITHDRAWN", target)
  Collaborating._getProjectByItem (item: target) has (project)
  Collaborating._canReview (project, user) has (allowed: true)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_PENDING", requestId)
```

### projectContributions.Reject:denied#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

```reaction
when Contributing.reject (proposal, reason, reviewer: user), asked by projectContributions.Reject:rejected#2
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectContributions.Reject:unknownProposal#2

Authored path: `projectContributions.Reject`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 169.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 173.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.Reject
where
  earlier, RequestBoundary.request (path: "/projects/contributions/reject", proposal, reason, requestId, session)
  no Contributing._proposal (proposal)
then
  RequestBoundary.respond (error: "PROPOSAL_NOT_FOUND", requestId)
```

### projectContributions.SubmitBatchedSourceRemoval

Authored path: `projectContributions.SubmitBatchedSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 130.

```reaction
when RequestBoundary.request (batch, path: "/projects/contributions/submit-source-removal-in-batch", project, requestId, session, source)
then
  SignIn.use (session)
```

### projectContributions.SubmitBatchedSourceRemoval:allowed#2

Authored path: `projectContributions.SubmitBatchedSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 130.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitBatchedSourceRemoval
where
  earlier, RequestBoundary.request (batch, path: "/projects/contributions/submit-source-removal-in-batch", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._source (source) has (graph: target)
  change is makeBatchedRemoveSourceChange (batch, source)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitBatchedSourceRemoval:allowed#3

Authored path: `projectContributions.SubmitBatchedSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 130.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitBatchedSourceRemoval:allowed#2
where
  earlier, RequestBoundary.request (batch, path: "/projects/contributions/submit-source-removal-in-batch", project, requestId, session, source)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitBatchedSourceRemoval:denied#2

Authored path: `projectContributions.SubmitBatchedSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 130.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitBatchedSourceRemoval
where
  earlier, RequestBoundary.request (batch, path: "/projects/contributions/submit-source-removal-in-batch", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitBatchedSourceRemoval:notInGraph#2

Authored path: `projectContributions.SubmitBatchedSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 125.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 130.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitBatchedSourceRemoval
where
  earlier, RequestBoundary.request (batch, path: "/projects/contributions/submit-source-removal-in-batch", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
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

### projectContributions.SubmitConnection:destinationNotInGraph#2

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
  no DiscoveryLinking._source (source: destination) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectContributions.SubmitConnection:sourceNotInGraph#2

Authored path: `projectContributions.SubmitConnection`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 92.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 101.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnection
where
  earlier, RequestBoundary.request (destination, path: "/projects/contributions/submit-connection", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
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

### projectContributions.SubmitConnectionNote:notInGraph#2

Authored path: `projectContributions.SubmitConnectionNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 41.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 50.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnectionNote
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-note", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._connection (connection) has (graph: target)
then
  RequestBoundary.respond (error: "CONNECTION_NOT_IN_GRAPH", requestId)
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

### projectContributions.SubmitConnectionRemoval:notInGraph#2

Authored path: `projectContributions.SubmitConnectionRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 75.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 84.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitConnectionRemoval
where
  earlier, RequestBoundary.request (connection, path: "/projects/contributions/submit-connection-removal", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._connection (connection) has (graph: target)
then
  RequestBoundary.respond (error: "CONNECTION_NOT_IN_GRAPH", requestId)
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
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 137.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 146.

```reaction
when RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
then
  SignIn.use (session)
```

### projectContributions.SubmitNoteEdit:allowed#2

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 137.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 146.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteEdit
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._note (note) has (author: user, graph: target)
  change is makeEditNoteChange (note, text)
then
  Contributing.propose (change, target, user)
```

### projectContributions.SubmitNoteEdit:allowed#3

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 137.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 146.

```reaction
when Contributing.propose (change, target, user, proposal), asked by projectContributions.SubmitNoteEdit:allowed#2
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
then
  RequestBoundary.respond (proposal, requestId)
```

### projectContributions.SubmitNoteEdit:denied#2

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 137.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 146.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteEdit
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectContributions.SubmitNoteEdit:notInGraph#2

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 137.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 146.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteEdit
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._note (note) has (graph: target)
then
  RequestBoundary.respond (error: "NOTE_NOT_FOUND", requestId)
```

### projectContributions.SubmitNoteEdit:notNoteAuthor#2

Authored path: `projectContributions.SubmitNoteEdit`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 137.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 146.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteEdit
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-edit", project, requestId, session, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  DiscoveryLinking._note (note) has (graph: target)
  no DiscoveryLinking._note (note) has (author: user, graph: target)
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

### projectContributions.SubmitNoteRemoval:notInGraph#2

Authored path: `projectContributions.SubmitNoteRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 24.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 33.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitNoteRemoval
where
  earlier, RequestBoundary.request (note, path: "/projects/contributions/submit-note-removal", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._note (note) has (graph: target)
then
  RequestBoundary.respond (error: "NOTE_NOT_FOUND", requestId)
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

### projectContributions.SubmitSourceNote:notInGraph#2

Authored path: `projectContributions.SubmitSourceNote`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 58.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 67.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitSourceNote
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-note", project, requestId, session, source, text)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
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

### projectContributions.SubmitSourceRemoval:notInGraph#2

Authored path: `projectContributions.SubmitSourceRemoval`.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 109.
- Covered by [Project contributions](../design/compositions/project-contributions.md), line 118.

```reaction
when SignIn.use (session, subject: user), asked by projectContributions.SubmitSourceRemoval
where
  earlier, RequestBoundary.request (path: "/projects/contributions/submit-source-removal", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
  no DiscoveryLinking._source (source) has (graph: target)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
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

### projectGroups.AssignSource

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
then
  SignIn.use (session)
```

### projectGroups.AssignSource:member#2

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.AssignSource
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: true)
  DiscoveryLinking._source (source) has (graph)
then
  Grouping.assign (group, item: source)
```

### projectGroups.AssignSource:member#3

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when Grouping.assign (group, item: source), asked by projectGroups.AssignSource:member#2
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
then
  RequestBoundary.respond (requestId)
```

### projectGroups.AssignSource:notAProjectGraph#2

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.AssignSource
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
  Grouping._group (group) has (scope: graph)
  no Collaborating._getProjectByItem (item: graph)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.AssignSource:notMember#2

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.AssignSource
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.AssignSource:sourceElsewhere#2

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.AssignSource
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: true)
  no DiscoveryLinking._source (source) has (graph)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectGroups.AssignSource:unknownGroup#2

Authored path: `projectGroups.AssignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.AssignSource
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/assign", requestId, session, source)
  no Grouping._group (group)
then
  RequestBoundary.respond (error: "GROUP_NOT_FOUND", requestId)
```

### projectGroups.CreateGroup

Authored path: `projectGroups.CreateGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 13.

```reaction
when RequestBoundary.request (name, path: "/projects/groups/create", project, requestId, session)
then
  SignIn.use (session)
```

### projectGroups.CreateGroup:member#2

Authored path: `projectGroups.CreateGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 13.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.CreateGroup
where
  earlier, RequestBoundary.request (name, path: "/projects/groups/create", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: graph)
then
  Grouping.createGroup (name, scope: graph)
```

### projectGroups.CreateGroup:member#3

Authored path: `projectGroups.CreateGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 13.

```reaction
when Grouping.createGroup (name, scope: graph, group), asked by projectGroups.CreateGroup:member#2
where
  earlier, RequestBoundary.request (name, path: "/projects/groups/create", project, requestId, session)
then
  RequestBoundary.respond (group, requestId)
```

### projectGroups.CreateGroup:notMember#2

Authored path: `projectGroups.CreateGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 13.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.CreateGroup
where
  earlier, RequestBoundary.request (name, path: "/projects/groups/create", project, requestId, session)
  Collaborating._project (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.CreateGroup:unknownProject#2

Authored path: `projectGroups.CreateGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 13.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.CreateGroup
where
  earlier, RequestBoundary.request (name, path: "/projects/groups/create", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectGroups.ListGroups

Authored path: `projectGroups.ListGroups`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 12.

```reaction
when RequestBoundary.request (path: "/projects/groups", project, requestId, session)
then
  SignIn.use (session)
```

### projectGroups.ListGroups:member#2

Authored path: `projectGroups.ListGroups`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 12.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.ListGroups
where
  earlier, RequestBoundary.request (path: "/projects/groups", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: graph)
then
  RequestBoundary.respond (groups: former "the groups of (graph)" with (graph), requestId)
```

### projectGroups.ListGroups:notMember#2

Authored path: `projectGroups.ListGroups`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 12.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.ListGroups
where
  earlier, RequestBoundary.request (path: "/projects/groups", project, requestId, session)
  Collaborating._project (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.ListGroups:unknownProject#2

Authored path: `projectGroups.ListGroups`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 5.
- Covered by [Project groups](../design/compositions/project-groups.md), line 12.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.ListGroups
where
  earlier, RequestBoundary.request (path: "/projects/groups", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectGroups.RemoveGroup

Authored path: `projectGroups.RemoveGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 15.

```reaction
when RequestBoundary.request (group, path: "/projects/groups/remove", requestId, session)
then
  SignIn.use (session)
```

### projectGroups.RemoveGroup:member#2

Authored path: `projectGroups.RemoveGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 15.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RemoveGroup
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/remove", requestId, session)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: true)
then
  Grouping.removeGroup (group)
```

### projectGroups.RemoveGroup:member#3

Authored path: `projectGroups.RemoveGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 15.

```reaction
when Grouping.removeGroup (group), asked by projectGroups.RemoveGroup:member#2
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/remove", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectGroups.RemoveGroup:notAProjectGraph#2

Authored path: `projectGroups.RemoveGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 15.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RemoveGroup
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/remove", requestId, session)
  Grouping._group (group) has (scope: graph)
  no Collaborating._getProjectByItem (item: graph)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.RemoveGroup:notMember#2

Authored path: `projectGroups.RemoveGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 15.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RemoveGroup
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/remove", requestId, session)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.RemoveGroup:unknownGroup#2

Authored path: `projectGroups.RemoveGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 15.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RemoveGroup
where
  earlier, RequestBoundary.request (group, path: "/projects/groups/remove", requestId, session)
  no Grouping._group (group)
then
  RequestBoundary.respond (error: "GROUP_NOT_FOUND", requestId)
```

### projectGroups.RenameGroup

Authored path: `projectGroups.RenameGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 14.

```reaction
when RequestBoundary.request (group, name, path: "/projects/groups/rename", requestId, session)
then
  SignIn.use (session)
```

### projectGroups.RenameGroup:member#2

Authored path: `projectGroups.RenameGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RenameGroup
where
  earlier, RequestBoundary.request (group, name, path: "/projects/groups/rename", requestId, session)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: true)
then
  Grouping.renameGroup (group, name)
```

### projectGroups.RenameGroup:member#3

Authored path: `projectGroups.RenameGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 14.

```reaction
when Grouping.renameGroup (group, name), asked by projectGroups.RenameGroup:member#2
where
  earlier, RequestBoundary.request (group, name, path: "/projects/groups/rename", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectGroups.RenameGroup:notAProjectGraph#2

Authored path: `projectGroups.RenameGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RenameGroup
where
  earlier, RequestBoundary.request (group, name, path: "/projects/groups/rename", requestId, session)
  Grouping._group (group) has (scope: graph)
  no Collaborating._getProjectByItem (item: graph)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.RenameGroup:notMember#2

Authored path: `projectGroups.RenameGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RenameGroup
where
  earlier, RequestBoundary.request (group, name, path: "/projects/groups/rename", requestId, session)
  Grouping._group (group) has (scope: graph)
  Collaborating._getProjectByItem (item: graph) has (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.RenameGroup:unknownGroup#2

Authored path: `projectGroups.RenameGroup`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.RenameGroup
where
  earlier, RequestBoundary.request (group, name, path: "/projects/groups/rename", requestId, session)
  no Grouping._group (group)
then
  RequestBoundary.respond (error: "GROUP_NOT_FOUND", requestId)
```

### projectGroups.UnassignSource

Authored path: `projectGroups.UnassignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 17.

```reaction
when RequestBoundary.request (path: "/projects/groups/unassign", project, requestId, session, source)
then
  SignIn.use (session)
```

### projectGroups.UnassignSource:member#2

Authored path: `projectGroups.UnassignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.UnassignSource
where
  earlier, RequestBoundary.request (path: "/projects/groups/unassign", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: graph)
  DiscoveryLinking._source (source) has (graph)
then
  Grouping.unassign (item: source)
```

### projectGroups.UnassignSource:member#3

Authored path: `projectGroups.UnassignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 17.

```reaction
when Grouping.unassign (item: source), asked by projectGroups.UnassignSource:member#2
where
  earlier, RequestBoundary.request (path: "/projects/groups/unassign", project, requestId, session, source)
then
  RequestBoundary.respond (requestId)
```

### projectGroups.UnassignSource:notMember#2

Authored path: `projectGroups.UnassignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.UnassignSource
where
  earlier, RequestBoundary.request (path: "/projects/groups/unassign", project, requestId, session, source)
  Collaborating._project (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectGroups.UnassignSource:sourceElsewhere#2

Authored path: `projectGroups.UnassignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.UnassignSource
where
  earlier, RequestBoundary.request (path: "/projects/groups/unassign", project, requestId, session, source)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: graph)
  no DiscoveryLinking._source (source) has (graph)
then
  RequestBoundary.respond (error: "SOURCE_NOT_IN_GRAPH", requestId)
```

### projectGroups.UnassignSource:unknownProject#2

Authored path: `projectGroups.UnassignSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 7.
- Covered by [Project groups](../design/compositions/project-groups.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectGroups.UnassignSource
where
  earlier, RequestBoundary.request (path: "/projects/groups/unassign", project, requestId, session, source)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectGroups.UngroupRemovedSource

Authored path: `projectGroups.UngroupRemovedSource`.
- Covered by [Project groups](../design/compositions/project-groups.md), line 9.

```reaction
when DiscoveryLinking.removeSource (source)
where
  Grouping._groupOf (item: source)
then
  Grouping.unassign (item: source)
```

### projectMembers.AcceptInvitation

Authored path: `projectMembers.AcceptInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 16.

```reaction
when RequestBoundary.request (invitation, path: "/invitations/accept", requestId, session)
then
  SignIn.use (session)
```

### projectMembers.AcceptInvitation:invitee#2

Authored path: `projectMembers.AcceptInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.AcceptInvitation
where
  earlier, RequestBoundary.request (invitation, path: "/invitations/accept", requestId, session)
  Collaborating._invitation (invitation) has (invitee: user, status: "PENDING")
then
  Collaborating.acceptInvitation (invitation, user)
```

### projectMembers.AcceptInvitation:invitee#3

Authored path: `projectMembers.AcceptInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 16.

```reaction
when Collaborating.acceptInvitation (invitation, user), asked by projectMembers.AcceptInvitation:invitee#2
where
  earlier, RequestBoundary.request (invitation, path: "/invitations/accept", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectMembers.AcceptInvitation:noInvitation#2

Authored path: `projectMembers.AcceptInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 16.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.AcceptInvitation
where
  earlier, RequestBoundary.request (invitation, path: "/invitations/accept", requestId, session)
  no Collaborating._invitation (invitation) has (invitee: user, status: "PENDING")
then
  RequestBoundary.respond (error: "INVITATION_NOT_FOUND", requestId)
```

### projectMembers.DeclineInvitation

Authored path: `projectMembers.DeclineInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 17.

```reaction
when RequestBoundary.request (invitation, path: "/invitations/decline", requestId, session)
then
  SignIn.use (session)
```

### projectMembers.DeclineInvitation:invitee#2

Authored path: `projectMembers.DeclineInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.DeclineInvitation
where
  earlier, RequestBoundary.request (invitation, path: "/invitations/decline", requestId, session)
  Collaborating._invitation (invitation) has (invitee: user, status: "PENDING")
then
  Collaborating.declineInvitation (invitation, user)
```

### projectMembers.DeclineInvitation:invitee#3

Authored path: `projectMembers.DeclineInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 17.

```reaction
when Collaborating.declineInvitation (invitation, user), asked by projectMembers.DeclineInvitation:invitee#2
where
  earlier, RequestBoundary.request (invitation, path: "/invitations/decline", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectMembers.DeclineInvitation:noInvitation#2

Authored path: `projectMembers.DeclineInvitation`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 17.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.DeclineInvitation
where
  earlier, RequestBoundary.request (invitation, path: "/invitations/decline", requestId, session)
  no Collaborating._invitation (invitation) has (invitee: user, status: "PENDING")
then
  RequestBoundary.respond (error: "INVITATION_NOT_FOUND", requestId)
```

### projectMembers.GrantReviewer

Authored path: `projectMembers.GrantReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 18.

```reaction
when RequestBoundary.request (member, path: "/projects/reviewers/grant", project, requestId, session)
then
  SignIn.use (session)
```

### projectMembers.GrantReviewer:notOwner#2

Authored path: `projectMembers.GrantReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.GrantReviewer
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/grant", project, requestId, session)
  Collaborating._project (project)
  no Collaborating._project (project) has (owner: user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectMembers.GrantReviewer:owner#2

Authored path: `projectMembers.GrantReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.GrantReviewer
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/grant", project, requestId, session)
  Collaborating._project (project) has (owner: user)
then
  Collaborating.grantReviewer (member, owner: user, project)
```

### projectMembers.GrantReviewer:owner#3

Authored path: `projectMembers.GrantReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 18.

```reaction
when Collaborating.grantReviewer (member, owner: user, project), asked by projectMembers.GrantReviewer:owner#2
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/grant", project, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectMembers.GrantReviewer:unknownProject#2

Authored path: `projectMembers.GrantReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 18.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.GrantReviewer
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/grant", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectMembers.Invite

Authored path: `projectMembers.Invite`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 14.

```reaction
when RequestBoundary.request (path: "/projects/invite", project, requestId, session, username)
then
  SignIn.use (session)
```

### projectMembers.Invite:notOwner#2

Authored path: `projectMembers.Invite`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.Invite
where
  earlier, RequestBoundary.request (path: "/projects/invite", project, requestId, session, username)
  Collaborating._project (project)
  no Collaborating._project (project) has (owner: user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectMembers.Invite:owner#2

Authored path: `projectMembers.Invite`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.Invite
where
  earlier, RequestBoundary.request (path: "/projects/invite", project, requestId, session, username)
  Collaborating._project (project) has (owner: user)
  Registering._byUsername (username) has (user: invitee)
then
  Collaborating.invite (invitee, inviter: user, project)
```

### projectMembers.Invite:owner#3

Authored path: `projectMembers.Invite`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 14.

```reaction
when Collaborating.invite (invitee, inviter: user, project, invitation), asked by projectMembers.Invite:owner#2
where
  earlier, RequestBoundary.request (path: "/projects/invite", project, requestId, session, username)
then
  RequestBoundary.respond (invitation, requestId)
```

### projectMembers.Invite:unknownProject#2

Authored path: `projectMembers.Invite`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.Invite
where
  earlier, RequestBoundary.request (path: "/projects/invite", project, requestId, session, username)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectMembers.Invite:unknownUser#2

Authored path: `projectMembers.Invite`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 14.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.Invite
where
  earlier, RequestBoundary.request (path: "/projects/invite", project, requestId, session, username)
  Collaborating._project (project) has (owner: user)
  no Registering._byUsername (username)
then
  RequestBoundary.respond (error: "USER_NOT_FOUND", requestId)
```

### projectMembers.ListMembers

Authored path: `projectMembers.ListMembers`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 12.

```reaction
when RequestBoundary.request (path: "/projects/members", project, requestId, session)
then
  SignIn.use (session)
```

### projectMembers.ListMembers:member#2

Authored path: `projectMembers.ListMembers`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 12.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListMembers
where
  earlier, RequestBoundary.request (path: "/projects/members", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._project (project) has (owner)
then
  RequestBoundary.respond (members: former "the members of (project)" with (project), owner, requestId, reviewers: former "the reviewers of (project)" with (project))
```

### projectMembers.ListMembers:notMember#2

Authored path: `projectMembers.ListMembers`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 12.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListMembers
where
  earlier, RequestBoundary.request (path: "/projects/members", project, requestId, session)
  Collaborating._project (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectMembers.ListMembers:unknownProject#2

Authored path: `projectMembers.ListMembers`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 12.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListMembers
where
  earlier, RequestBoundary.request (path: "/projects/members", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectMembers.ListMyInvitations

Authored path: `projectMembers.ListMyInvitations`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 15.

```reaction
when RequestBoundary.request (path: "/invitations/mine", requestId, session)
then
  SignIn.use (session)
```

### projectMembers.ListMyInvitations#2

Authored path: `projectMembers.ListMyInvitations`.
- Covered by [Project members](../design/compositions/project-members.md), line 7.
- Covered by [Project members](../design/compositions/project-members.md), line 15.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListMyInvitations
where
  earlier, RequestBoundary.request (path: "/invitations/mine", requestId, session)
then
  RequestBoundary.respond (invitations: former "the invitations of (user)" with (user), requestId)
```

### projectMembers.ListPendingProposals

Authored path: `projectMembers.ListPendingProposals`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 13.

```reaction
when RequestBoundary.request (path: "/projects/contributions/pending", project, requestId, session)
then
  SignIn.use (session)
```

### projectMembers.ListPendingProposals:member#2

Authored path: `projectMembers.ListPendingProposals`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 13.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListPendingProposals
where
  earlier, RequestBoundary.request (path: "/projects/contributions/pending", project, requestId, session)
  Collaborating._canView (project, user) has (allowed: true)
  Collaborating._getItem (project) has (item: target)
then
  RequestBoundary.respond (proposals: former "the pending proposals for (target)" with (target), requestId)
```

### projectMembers.ListPendingProposals:notMember#2

Authored path: `projectMembers.ListPendingProposals`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 13.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListPendingProposals
where
  earlier, RequestBoundary.request (path: "/projects/contributions/pending", project, requestId, session)
  Collaborating._project (project)
  Collaborating._canView (project, user) has (allowed: false)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectMembers.ListPendingProposals:unknownProject#2

Authored path: `projectMembers.ListPendingProposals`.
- Covered by [Project members](../design/compositions/project-members.md), line 5.
- Covered by [Project members](../design/compositions/project-members.md), line 13.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.ListPendingProposals
where
  earlier, RequestBoundary.request (path: "/projects/contributions/pending", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectMembers.RemoveMember

Authored path: `projectMembers.RemoveMember`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 20.

```reaction
when RequestBoundary.request (member, path: "/projects/members/remove", project, requestId, session)
then
  SignIn.use (session)
```

### projectMembers.RemoveMember:notOwner#2

Authored path: `projectMembers.RemoveMember`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 20.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.RemoveMember
where
  earlier, RequestBoundary.request (member, path: "/projects/members/remove", project, requestId, session)
  Collaborating._project (project)
  no Collaborating._project (project) has (owner: user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectMembers.RemoveMember:owner#2

Authored path: `projectMembers.RemoveMember`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 20.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.RemoveMember
where
  earlier, RequestBoundary.request (member, path: "/projects/members/remove", project, requestId, session)
  Collaborating._project (project) has (owner: user)
then
  Collaborating.removeMember (member, owner: user, project)
```

### projectMembers.RemoveMember:owner#3

Authored path: `projectMembers.RemoveMember`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 20.

```reaction
when Collaborating.removeMember (member, owner: user, project), asked by projectMembers.RemoveMember:owner#2
where
  earlier, RequestBoundary.request (member, path: "/projects/members/remove", project, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectMembers.RemoveMember:unknownProject#2

Authored path: `projectMembers.RemoveMember`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 20.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.RemoveMember
where
  earlier, RequestBoundary.request (member, path: "/projects/members/remove", project, requestId, session)
  no Collaborating._project (project)
then
  RequestBoundary.respond (error: "PROJECT_NOT_FOUND", requestId)
```

### projectMembers.RevokeReviewer

Authored path: `projectMembers.RevokeReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 19.

```reaction
when RequestBoundary.request (member, path: "/projects/reviewers/revoke", project, requestId, session)
then
  SignIn.use (session)
```

### projectMembers.RevokeReviewer:notOwner#2

Authored path: `projectMembers.RevokeReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 19.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.RevokeReviewer
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/revoke", project, requestId, session)
  Collaborating._project (project)
  no Collaborating._project (project) has (owner: user)
then
  RequestBoundary.respond (error: "FORBIDDEN", requestId)
```

### projectMembers.RevokeReviewer:owner#2

Authored path: `projectMembers.RevokeReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 19.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.RevokeReviewer
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/revoke", project, requestId, session)
  Collaborating._project (project) has (owner: user)
then
  Collaborating.revokeReviewer (member, owner: user, project)
```

### projectMembers.RevokeReviewer:owner#3

Authored path: `projectMembers.RevokeReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 19.

```reaction
when Collaborating.revokeReviewer (member, owner: user, project), asked by projectMembers.RevokeReviewer:owner#2
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/revoke", project, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### projectMembers.RevokeReviewer:unknownProject#2

Authored path: `projectMembers.RevokeReviewer`.
- Covered by [Project members](../design/compositions/project-members.md), line 9.
- Covered by [Project members](../design/compositions/project-members.md), line 19.

```reaction
when SignIn.use (session, subject: user), asked by projectMembers.RevokeReviewer
where
  earlier, RequestBoundary.request (member, path: "/projects/reviewers/revoke", project, requestId, session)
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
  RequestBoundary.respond (requestId, user, username)
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
- `/invitations/accept` — requires `invitation`, `session`
- `/invitations/decline` — requires `invitation`, `session`
- `/invitations/mine` — requires `session`
- `/projects/contributions/accept` — requires `proposal`, `session`
- `/projects/contributions/pending` — requires `project`, `session`
- `/projects/contributions/reject` — requires `proposal`, `reason`, `session`
- `/projects/contributions/submit` — requires `other`, `project`, `session`
- `/projects/contributions/submit-connection` — requires `destination`, `project`, `session`, `source`
- `/projects/contributions/submit-connection-note` — requires `connection`, `project`, `session`, `text`
- `/projects/contributions/submit-connection-removal` — requires `connection`, `project`, `session`
- `/projects/contributions/submit-note-edit` — requires `note`, `project`, `session`, `text`
- `/projects/contributions/submit-note-removal` — requires `note`, `project`, `session`
- `/projects/contributions/submit-source-note` — requires `project`, `session`, `source`, `text`
- `/projects/contributions/submit-source-removal` — requires `project`, `session`, `source`
- `/projects/contributions/submit-source-removal-in-batch` — requires `batch`, `project`, `session`, `source`
- `/projects/create` — requires `name`, `session`
- `/projects/graph` — requires `project`, `session`
- `/projects/groups` — requires `project`, `session`
- `/projects/groups/assign` — requires `group`, `session`, `source`
- `/projects/groups/create` — requires `name`, `project`, `session`
- `/projects/groups/remove` — requires `group`, `session`
- `/projects/groups/rename` — requires `group`, `name`, `session`
- `/projects/groups/unassign` — requires `project`, `session`, `source`
- `/projects/invite` — requires `project`, `session`, `username`
- `/projects/members` — requires `project`, `session`
- `/projects/members/remove` — requires `member`, `project`, `session`
- `/projects/mine` — requires `session`
- `/projects/reviewers/grant` — requires `member`, `project`, `session`
- `/projects/reviewers/revoke` — requires `member`, `project`, `session`
- `/sessions/graph` — requires `browsingSession`, `session`
- `/sessions/start` — requires `session`
- `/sessions/stop` — requires `browsingSession`, `session`
- `/sessions/visit` — requires `browsingSession`, `session`, `sourceUrl`, `url`
