## DiscoveryLinking

**Types**

```text
external User
```

**Purpose**

Preserve connections between sources so that users can understand how discoveries relate to one another and trace the paths between them.

**Principle**

A user discovers a connection between two sources and adds a note explaining their relationship. Another user can then follow this connection to understand how the sources relate and the reasoning behind it.

**State**

```text
a set of Graphs with
  a name String
  a sources set of Sources
  a connections set of Connections

a set of Sources with
  a url String
  a notes set of Notes
  a contributors set of Users

a set of Notes with
  a text String
  an author User

a set of Connections with
  a source Source
  a destination Source
  a notes set of Notes
  a contributors set of Users

Rule: Each Source belongs to exactly one Graph.
Rule: Each Connection belongs to exactly one Graph.
Rule: No two Sources within the same Graph have the same URL.
Rule: No two Connections within the same Graph have the same source and destination.
Rule: Both endpoints of a Connection belong to the same Graph as the Connection.
Rule: Each Note belongs to exactly one Source or Connection.
```

**Actions**

```text
createGraph(name: String): returns (graph: Graph)
  then
    create a new Graph with the given name
      and empty sources and connections
    return graph

addSource(graph: Graph, url: String, contributor: User):
  returns (source: Source)
  where
    graph exists
    no source with the same URL exists in graph
  then
    create a new Source with the given URL
      and contributor included in contributors
    add source to graph
    return source

addConnection(graph: Graph, source: Source,
  destination: Source, contributor: User):
  returns (connection: Connection)
  where
    graph exists
    source and destination belong to graph
    no connection from source to destination exists in graph
  then
    create a new Connection with the given source and destination
      and contributor included in contributors
    add connection to graph
    return connection

addNoteToSource(source: Source, author: User, text: String):
  returns (note: Note)
  where
    source exists
  then
    create a new Note with the given text and author
    add note to source's notes
    return note

addNoteToConnection(connection: Connection, author: User, text: String):
  returns (note: Note)
  where
    connection exists
  then
    create a new Note with the given text and author
    add note to connection's notes
    return note

removeSource(graph: Graph, source: Source)
  where
    graph exists
    source belongs to graph
  then
    remove source and its associated notes
    remove all connections involving source
      and their associated notes

removeConnection(graph: Graph, connection: Connection)
  where
    graph exists
    connection belongs to graph
  then
    remove connection and its associated notes

removeNote(note: Note)
  where
    note exists
  then
    remove note from its source or connection
    remove note from the set of Notes


editNote(note: Note, text: String)
  where
    note exists
  then
    replace note's text with the given text


mergeGraph(target: Graph, other: Graph)
  where
    target and other exist
    target is not other
  then
    for each Source in other
      reuse a Source in target with the same URL if one exists
      otherwise create a new Source in target

    for each Connection in other
      reuse a Connection in target with the same source
        and destination URLs if one exists
      otherwise create a new Connection in target

    combine notes and contributors from matching
      Sources and Connections, preserving their authors
```

**Notes**

- In Grabbithole, Graphs can represent either preliminary research graphs created from individual browsing sessions or main research graphs associated with project spaces. DiscoveryLinking treats both as Graph individuals.
- When merging, the target graph receives sources and connections from the other graph, while the other graph remains unchanged.
- When merging two graphs, notes and contributors from both graphs are preserved, even when matching sources or connections are combined.

---

## Sessioning

**Types**

```text
external User

Status is ACTIVE or STOPPED
```

**Purpose**

Preserve the paths between visited sources so users can understand how they discovered information during a browsing session.

**Principle**

A user starts a browsing session while researching a topic. They open several articles from the same website in different tabs, then follow additional links from those articles. The system records the visited URLs and which pages led to other pages, without duplicating sources or connections. When the session ends, the recorded research paths are saved for later review.

**State**

```text
a set of Sessions with
  a user User
  a status Status
  a visited set of Strings

a set of Connections with
  a session Session
  a source String
  a destination String

Rule: No two Connections have the same session, source, and destination.
```

**Actions**

```text
startSession(user: User): returns (session: Session)
  then
    create a new Session with
      user set to given user
      status set to ACTIVE
      an empty set of visited URLs
    return session

recordVisit(session: Session, url: String, sourceUrl?: String)
  where
    session exists
    session's status is ACTIVE
  then
    add url to session's visited URLs if not already present

    if sourceUrl is provided and different from url
      add sourceUrl to session's visited URLs if not already present
      if no Connection with the same session, source, and destination exists
        create a Connection with
          session set to given session
          source set to sourceUrl
          destination set to url

stopSession(session: Session)
  where
    session exists
    session's status is ACTIVE
  then
    set session's status to STOPPED
```

**Notes**

- The browser extension identifies visited URLs and their originating pages when possible, including links opened in new tabs.
- Returning to a previously visited page or switching tabs does not create a new connection unless the user follows a link.
- If the originating page cannot be determined, the URL is recorded without a connection.
- When a session starts, application reactions create a preliminary research graph. As the user browses, recorded URLs and connections are added to this graph. When the session ends, the graph is available for review and editing before being merged into the main project graph.

## Grouping

**Types**

```text
external Item
```

**Purpose**

Organize related items into groups so users can navigate large collections of information more easily.

**Principle**

A user collects items related to different topics. Related items are automatically organized into broader groups. When new items are added, they are assigned to existing groups or placed into new ones without changing previous assignments. The user can also manually adjust the groupings.

**State**

```text
a set of Groups with
  a name String
  an items set of Items

Rule: Each Item belongs to at most one Group.
```

**Actions**

```text
createGroup(name: String): returns (group: Group)
  then
    create a new Group with the given name
    return group

assignItem(group: Group, item: Item)
  where
    group exists
    item does not belong to any group
  then
    add item to group's items

moveItem(item: Item, destination: Group)
  where
    destination exists
    item belongs to an existing group
    item does not already belong to destination
  then
    remove item from its current group
    add item to destination's items

removeItem(group: Group, item: Item)
  where
    group exists
    item belongs to group
  then
    remove item from group's items

renameGroup(group: Group, name: String)
  where
    group exists
  then
    replace group's name with the given name

removeGroup(group: Group)
  where
    group exists
  then
    remove group
```

**Notes**

- An LLM suggests topic names and assignments, which are stored through Grouping's actions. However, researchers are able to manually adjust groupings.
- Items can only belong to one group.
- Removing a group does not delete its items.


## Contributing

**Types**

```text
external User
external Item
external Change

Status is PENDING or ACCEPTED or REJECTED or WITHDRAWN
```

**Purpose**

Allow users to propose changes to shared work while preventing unapproved modifications.

**Principle**

A user proposes a change to someone else's work. An authorized reviewer can accept the proposal, incorporating the change into the original work, or reject it, leaving the original unchanged.

**State**

```text
a set of Proposals with
  a proposer User
  a target Item
  a change Change
  a status Status
  an optional reviewer User
  an optional reason String
```

**Actions**

```text
propose(user: User, target: Item, change: Change):
  returns (proposal: Proposal)
  then
    create a new Proposal with
      proposer set to user
      target set to target
      change set to change
      status set to PENDING
    return proposal

accept(proposal: Proposal, reviewer: User)
  where
    proposal exists
    proposal's status is PENDING
  then
    set proposal's status to ACCEPTED
    set reviewer to the given reviewer

reject(proposal: Proposal, reviewer: User, reason: String)
  where
    proposal exists
    proposal's status is PENDING
  then
    set proposal's status to REJECTED
    set reviewer to the given reviewer
    set reason to the given reason

withdraw(proposal: Proposal, user: User)
  where
    proposal exists
    proposal's status is PENDING
    user is the proposer
  then
    set proposal's status to WITHDRAWN
```

**Notes**

- Contributing manages proposals and approval status, not the changes themselves.
- A `Change` represents a proposed operation and its arguments. In Grabbithole, this can be an individual edit to an existing graph or the merging of a preliminary graph into the main project graph.
- Accepted proposals trigger reactions that perform the corresponding DiscoveryLinking actions.

## Collaborating

**Types**

```text
external User
external Item

InvitationStatus is PENDING or ACCEPTED or DECLINED
```

**Purpose**

Allow users to manage participation and permissions within shared projects.

**Principle**

A user creates a shared project and invites others to participate. Once they accept, they become members of the project. The project owner can manage membership and grant certain members permission to review contributions.

**State**

```text
a set of Projects with
  a name String
  an owner User
  a members set of Users
  a reviewers set of Users
  an optional item Item

a set of Invitations with
  a project Project
  an invitee User
  a status InvitationStatus

Rule: Each project's owner belongs to its members and reviewers.
Rule: Each project's reviewers are members of that project.
Rule: Each Item is associated with at most one Project.
```

**Actions**

```text
createProject(owner: User, name: String):
  returns (project: Project)
  then
    create a new Project with
      name set to given name
      owner set to given owner
      owner included in members and reviewers
      no associated item
    return project

setItem(project: Project, item: Item)
  where
    project exists
    project has no associated item
    item is not associated with another Project
  then
    set project's item to given item

invite(project: Project, inviter: User, invitee: User):
  returns (invitation: Invitation)
  where
    project exists
    inviter is the project owner
    invitee is not already a member
    no pending invitation exists for invitee
      in the project
  then
    create a new Invitation with
      project set to given project
      invitee set to given invitee
      status set to PENDING
    return invitation

acceptInvitation(invitation: Invitation, user: User)
  where
    invitation exists
    invitation's status is PENDING
    user is the invitee
  then
    set invitation's status to ACCEPTED
    add user to project's members

declineInvitation(invitation: Invitation, user: User)
  where
    invitation exists
    invitation's status is PENDING
    user is the invitee
  then
    set invitation's status to DECLINED

removeMember(project: Project, owner: User, member: User)
  where
    project exists
    owner is the project owner
    member belongs to project's members
    member is not the owner
  then
    remove member from project's members
    remove member from reviewers if applicable

grantReviewer(project: Project, owner: User, member: User)
  where
    project exists
    owner is the project owner
    member belongs to project's members
    member is not already a reviewer
  then
    add member to project's reviewers

revokeReviewer(project: Project, owner: User, member: User)
  where
    project exists
    owner is the project owner
    member belongs to project's reviewers
    member is not the owner
  then
    remove member from project's reviewers
```

**Queries**

```text
_getMembers(project: Project): many (user: User)
  returns all members of the project

_canReview(project: Project, user: User): one (allowed: Flag)
  returns true if user belongs to project's reviewers

_canView(project: Project, user: User): one (allowed: Flag)
  returns true if user belongs to project's members

_getItem(project: Project): optional (item: Item)
  returns the Item associated with the project, if one exists

_getProjectByItem(item: Item): optional (project: Project)
  returns the Project associated with the item, if one exists
```

**Notes**

- Each project has one owner and may have multiple collaborators.
- Collaborators can propose contributions, but only authorized reviewers can approve them.
- Collaborating manages project membership, permissions, and associations with shared items without managing the items' contents.
- In Grabbithole, `Collaborating.Item` is instantiated as `DiscoveryLinking.Graph`.
- When a project is created, an application reaction creates its main research graph and associates it with the project using `setItem`.

## Some Essential Reactions

### 1. Creating a Project Graph

When a project is created, initialize its main research graph.

```text
reaction createProjectGraph
when
  Collaborating.createProject(owner, name): (project)
then
  DiscoveryLinking.createGraph(name): (graph)
```

Associate the newly created graph with its project.

```text
reaction associateProjectGraph
when
  Collaborating.createProject(owner, name): (project)
  DiscoveryLinking.createGraph(name): (graph)
then
  Collaborating.setItem(project, graph)
```

**Note:** The graph in the second reaction is the graph created specifically for that project.

### 2. Creating a Preliminary Graph

When a research session starts, create an empty preliminary graph.

```text
reaction createSessionGraph
when
  Sessioning.startSession(user): (session)
then
  DiscoveryLinking.createGraph("Research Session"): (graph)
```

**Note:** The application associates the preliminary graph with the session.

### 3. Recording Sources and Connections

When a user visits a URL, add any newly recorded URLs to the session's preliminary graph.

```text
reaction recordSessionSource
when
  Sessioning.recordVisit(session, url, sourceUrl?)
then
  for each newly recorded URL
    DiscoveryLinking.addSource(graph, url, user)
```

When Sessioning records a new connection, add the corresponding connection to the preliminary graph.

```text
reaction recordSessionConnection
when
  Sessioning.recordVisit(session, url, sourceUrl?)
  a new Connection from sourceUrl to url is recorded
then
  DiscoveryLinking.addConnection(
    graph, source, destination, user
  )
```

**Note:** `graph` is the preliminary graph associated with the session, and `user` is the session's researcher. `source` and `destination` are the corresponding `DiscoveryLinking` Sources. Browser navigation that does not represent following a link does not create a connection, and previously recorded sources or connections are not duplicated.

### 4. Accepting a Contribution

Before accepting a contribution, check whether the reviewer is authorized.

```text
reaction authorizeContribution
when
  Requesting.acceptContribution(proposal, reviewer)
then
  if Collaborating._canReview(project, reviewer)
    Contributing.accept(proposal, reviewer)
```

When an authorized reviewer accepts a contribution, apply the proposed change to the main research graph.

```text
reaction acceptGraphContribution
when
  Contributing.accept(proposal, reviewer)
  proposal contains MERGE_GRAPH(target, other)
then
  DiscoveryLinking.mergeGraph(target, other)
```

For individual edits, the corresponding DiscoveryLinking action is performed instead.

```text
reaction acceptNoteEdit
when
  Contributing.accept(proposal, reviewer)
  proposal contains EDIT_NOTE(note, text)
then
  DiscoveryLinking.editNote(note, text)
```

**Note:** These are representative reactions. Other accepted edits invoke their corresponding DiscoveryLinking actions. The application identifies the project associated with the proposal's target graph using `Collaborating._getProjectByItem(target)` before checking reviewer permissions.

### 5. Grouping Newly Incorporated Sources

When new sources are incorporated into the main project graph, automatically organize them into topic groups.

**Assigning to an existing group**

```text
reaction groupNewSourceExisting
when
  DiscoveryLinking.mergeGraph(target, other)
then
  for each newly added Source with an existing suggested Group
    Grouping.assignItem(group, source)
```

**Creating a new group**

```text
reaction createNewTopicGroup
when
  DiscoveryLinking.mergeGraph(target, other)
then
  for each suggested topic with no existing Group
    Grouping.createGroup(name): (group)
```

**Assigning to a newly created group**

```text
reaction groupNewSourceNew
when
  DiscoveryLinking.mergeGraph(target, other)
  Grouping.createGroup(name): (group)
then
  for each newly added Source assigned to that topic
    Grouping.assignItem(group, source)
```

**Note:** An LLM suggests topic names and assignments. Existing groups are reused when appropriate, and previous assignments remain unchanged.

### 6. Removing Deleted Sources from Groups

When a source is removed from a graph, remove it from its topic group.

```text
reaction cleanupRemovedSource
when
  DiscoveryLinking.removeSource(graph, source)
then
  for each Group containing source
    Grouping.removeItem(group, source)
```

**Note:** Removing a source does not delete the group itself.

---

## Concept Roles

### Generic Type Instantiations

1. `DiscoveryLinking.User` → Grabbithole users
2. `Sessioning.User` → Grabbithole users
3. `Grouping.Item` → `DiscoveryLinking.Source`
4. `Contributing.User` → Grabbithole users
5. `Contributing.Item` → `DiscoveryLinking.Graph`
6. `Contributing.Change` → Proposed DiscoveryLinking operations and their arguments
7. `Collaborating.User` → Grabbithole users
8. `Collaborating.Item` → `DiscoveryLinking.Graph`

**DiscoveryLinking** manages research graphs, including sources, connections, notes, and contributor attribution. **Sessioning** records visited URLs and the navigation relationships between them, including links opened in different tabs. It works with DiscoveryLinking to create a preliminary graph for each research session. Researchers can review and edit the graph, including its connections and notes, before incorporating it into their project's main graph.

**Collaborating** manages project membership, reviewer permissions, and associations with shared items. In Grabbithole, each project is associated with a main research graph through `Collaborating.Item`, instantiated as `DiscoveryLinking.Graph`. Each research session is separately associated with a preliminary graph. **Contributing** allows users to propose changes to a project's main graph. A `Change` represents a DiscoveryLinking operation and its arguments, such as removing sources, adding or removing connections, adding, editing, or removing notes, or merging preliminary graphs. The application collects these arguments when users submit a proposal and preserves them until review. Only authorized reviewers, as determined by Collaborating, can approve or reject contributions. Accepted changes are applied through DiscoveryLinking.

**Grouping** organizes sources in the main research graph into topics. An LLM suggests group names and assignments when new sources are incorporated, while users can manually adjust these groupings. Existing assignments remain unchanged unless edited.