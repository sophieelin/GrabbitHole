# F4: Updated Development Plan

## 1. Progress Since F3

Since F3, the team has progressed from concept design toward a working alpha implementation of GrabbitHole.

### Completed

**Collaborating and Contributing (Amber)**

- Implemented project creation, invitations, membership management, and reviewer permissions.
- Implemented proposal creation, acceptance, rejection, and concept-level withdrawal.
- Integrated project creation with DiscoveryLinking so each project has an associated main research graph.
- Implemented eight contribution operations:
  - `MERGE_GRAPH`
  - `EDIT_NOTE`
  - `REMOVE_SOURCE`
  - `ADD_CONNECTION`
  - `REMOVE_CONNECTION`
  - `ADD_SOURCE_NOTE`
  - `ADD_CONNECTION_NOTE`
  - `REMOVE_NOTE`
- Added authorization checks so project members can submit contributions and authorized reviewers can approve or reject them.
- Added integration tests verifying that proposed changes do not modify the graph before approval.
- Updated design documents to reflect the implementation.

**DiscoveryLinking (April)**

- Implemented the graph data model for research sources, directed connections, notes, and contributor attribution.
- Added actions for creating graphs, managing sources and connections, and adding, editing, and removing notes.
- Implemented graph merging with deduplication of sources, connections, and notes while preserving contributor attribution.
- Added read queries for retrieving graph contents, notes, and contributors.
- Integrated with Collaborating so each new project automatically receives its own main research graph.
- Added an authenticated project graph-reading endpoint that returns sources, connections, notes, and contributors to authorized project members for frontend visualization.
- Added concept and integration tests covering graph operations, merging, project creation, and graph retrieval.

**Sessioning (Sophie)**

- Renamed the sign-in session concept to `SignIn` and implemented `Sessioning` as the browsing-session concept: starting and stopping sessions, recording visited URLs, and recording connections without duplicates.
- Associated each session with its own preliminary graph.
- Implemented the Sessioning to DiscoveryLinking syncs: starting a session creates an empty preliminary graph, and each recorded visit adds its sources and connection to that graph.
- Added tests covering session recording and graph building.
- Added authenticated endpoints to start a session, record a visit, stop a session, and read the session's graph.
- Let the extension call the API with the browser's sign-in cookie: the server rejects `chrome-extension://` origins, so the extension removes `Origin` from its own API requests, which the server answers as it does any caller that is not a web page.
- Built the browser extension with **Start session** and **Stop session** buttons. Each tab is a path of its own, and only following a link creates a connection: a link connects from the last page in its tab, and a link opened in a new tab connects from the page that opened it. Typing an address, searching from the address bar, and the back button record the page with no connection, but the next link branches from it. The popup lists the session's pages in order, marking new tabs and pages reached from earlier ones.
- Fixed `SubmitGraph` so only the submitting user's own session graph, from a session that has stopped, can be proposed for merging, never another user's session graph, a project's main graph, or a session still recording.

### Remaining work 

#### Sessioning and browser extension

- Show a user's past sessions so they can return to one for review.
- Let users edit their own session graph before proposing it (removing sources, adding notes), and prevent anyone else from editing it.


#### Collaborating and Contributing (Amber)
- Add proposal-status viewing so project members and proposal authors can see pending, accepted, and rejected contributions, including rejection reasons.
- Improve error handling for missing resources, invalid proposals, and unsupported operations.
- Strengthen handling of concurrent approvals and partial failures between graph changes and proposal status updates.
- Expose proposal withdrawal through an authenticated application endpoint.

#### DiscoveryLinking (April)

- Integrate the project graph-reading API with the frontend so users can view their project's research graph.
- Coordinate with Dylan on graph visualization, using the existing graph data returned by DiscoveryLinking.
- Add end-to-end integration tests for the complete browsing-to-project-graph workflow, including contribution approval, graph merging, and contributor attribution.
- Integrate DiscoveryLinking with Grouping once Dylan's concept is ready.
