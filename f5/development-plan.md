# F5: Updated Development Plan

## 1. Progress Since F4

### Completed

**Graph interactions (April)**

- Added cross-view navigation: double-clicking a source, or choosing "Show in path view" / "Show in group view" from its right-click menu, switches views with the source selected, centered, and briefly highlighted. Click, double-click, and right-click (including Control-click and trackpad secondary clicks) never trigger one another, and right-clicking leaves the selection and source panel alone; a dashed outline marks the menu's source instead.
- Added "Open original website" and "Copy source URL" to the right-click menu, and matching open and copy icons beside the URL in the source panel. Only `http` and `https` addresses are opened.
- Added "Propose removal" to the right-click menu. It and the source panel's existing button open the same confirmation, which names the connections, notes, and group the source would take with it, and then submit the existing `REMOVE_SOURCE` proposal. A second removal of a source already waiting for review is blocked.
- Added selection mode (the Select button beside the zoom controls) for picking several sources in either view. Picked sources keep their size and place and get a thin outline and a check mark; picks are kept when switching views. Its toolbar has Select all, Clear, Copy URLs (one per line), Done, and two matching dropdowns:
  - **Assign to group**: an existing group, or "Create new group…", which opens the Groups dialog and puts the selection in the new group.
  - **Remove**: "Remove from group" takes each selected source out of its own group (ungrouped ones are left alone) after a confirmation listing each affected group; nothing is deleted. "Propose removal from graph" proposes removing all selected sources.
- Added batched removal proposals. Removing several sources makes one `REMOVE_SOURCE` proposal per source through a new endpoint, `/projects/contributions/submit-source-removal-in-batch`, which records a shared batch in each change (`design/compositions/project-contributions.md`). The Contributing concept is unchanged. Reviewers see a batch as one entry with a checkbox per source and apply their choices in one step; each proposal is still accepted or rejected on its own, so only the approved sources are removed.
- Fixed every proposal request that could get no answer at all. A reproduction showed 21 hanging cases, each because the endpoint had a branch for success and one for a missing permission, but none for a permitted request whose target was gone:
  - Accepting a proposal whose target an earlier accepted proposal removed: removing a source, a connection or a note (including duplicates), editing a note, adding a connection whose source or destination is gone, and adding a note to a source or connection that is gone.
  - Accepting or rejecting a proposal that does not exist or was withdrawn.
  - Submitting any proposal (source removal, batched source removal, source note, connection, connection removal, connection note, note removal, note edit) for a source, connection or note that is not in the project's graph.

  Each now gets an existing refusal (`SOURCE_NOT_IN_GRAPH`, `CONNECTION_NOT_IN_GRAPH`, `NOTE_NOT_FOUND`, `PROPOSAL_NOT_FOUND`, `PROPOSAL_NOT_PENDING`). A proposal that cannot be accepted stays pending for the reviewer to reject; the proposal lifecycle and permissions are unchanged. Batch review rejects removals whose source is gone, counts proposals someone else already decided, and still decides the rest.
- Fixed HTTP statuses for proposal refusals: accepting or rejecting an already-decided proposal (`PROPOSAL_NOT_PENDING`) and adding a connection that already exists (`CONNECTION_EXISTS`) were 500 errors and are now 409 Conflict ("This proposal has already been reviewed."); the "not in the graph" refusals and `PROPOSAL_NOT_FOUND` are 404.
- Regression tests: `tests/compositions/stale-proposals.test.ts` (every confirmed hang, each made obsolete by another accepted proposal where applicable, plus permissions and valid proposals) and `tests/compositions/project-contributions-http.test.ts` (bulk and single removal over HTTP, and 409 for already-decided proposals).

### Remaining work
