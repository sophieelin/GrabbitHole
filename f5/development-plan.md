# F5: Updated Development Plan

## 1. Progress Since F4

### Completed

**Node features (April)**

- Added cross-view navigation: double clicking a source, or choosing "Show in path view"/"Show in group view" from a node's right-click menu, switches views with the source highlighted. A dashed outline marks the chosen node.
- Added "Open original website" and "Copy source URL" to the right-click menu, and matching open and copy icons beside the URL in the source panel. 
- Added "Propose removal" to the right-click menu. 
- Added selection mode (the Select button beside the zoom controls) for picking several sources in either view. Its toolbar has Select all, Clear, a Copy URLs icon button (one URL per line), Done, and two dropdowns:
  - **Assign to group**: "Create new group…" or an existing group.
  - **Remove**: "Remove from groups" takes each selected source out of its own group after a confirmation listing each affected group, and deletes nothing. "Propose removal from graph" proposes removing every selected source.
- Added batched removal proposals. Removing several sources makes one `REMOVE_SOURCE` proposal per source through a new endpoint, `/projects/contributions/submit-source-removal-in-batch`, which records a shared batch in each change (`design/compositions/project-contributions.md`). The Contributing concept is unchanged. Reviewers see a batch as one entry with a checkbox per source and apply their choices in one step; each proposal is still accepted or rejected on its own, so only the approved sources are removed.
- Added source search: a search bar at the top left of the graph (hidden in selection mode) that finds sources by name, domain, or any part of the URL. Choosing one with the mouse or the keyboard selects it, opens its notes panel, and centers and pulses it.
- Fixed proposal requests that previously hung when targets were missing, removed, or outside the project's graph, or when proposals were nonexistent or withdrawn.
- Corrected HTTP error handling to return 404 for missing targets or proposals and 409 for already-reviewed proposals or duplicate connections instead of 500 errors.
- Added regression tests covering stale proposals, bulk and single-source removal, HTTP responses, permissions, and valid proposal operations.

### Remaining work
