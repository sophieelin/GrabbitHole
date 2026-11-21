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


### Remaining work 

#### Collaborating and Contributing (Amber)
- Add proposal-status viewing so project members and proposal authors can see pending, accepted, and rejected contributions, including rejection reasons.
- Improve error handling for missing resources, invalid proposals, and unsupported operations.
- Strengthen handling of concurrent approvals and partial failures between graph changes and proposal status updates.
- Expose proposal withdrawal through an authenticated application endpoint.

