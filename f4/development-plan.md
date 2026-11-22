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

### Remaining work 

#### Collaborating and Contributing (Amber)
- Add proposal-status viewing so project members and proposal authors can see pending, accepted, and rejected contributions, including rejection reasons.
- Improve error handling for missing resources, invalid proposals, and unsupported operations.
- Strengthen handling of concurrent approvals and partial failures between graph changes and proposal status updates.
- Expose proposal withdrawal through an authenticated application endpoint.

#### DiscoveryLinking (April)

- Implement the Sessioning to DiscoveryLinking compositions to automatically create preliminary graphs and record visited sources and navigation connections.
- Coordinate with Sophie on the session-to-graph association needed for integration.
- Integrate with Grouping once Dylan's concept is ready.
- Add end-to-end tests for the complete browsing-to-project-graph workflow.
