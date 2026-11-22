# Sessioning

Dylan starts a browsing session, and every page he opens and every link he follows during it is copied into a preliminary research graph of its own. He can then review and edit that graph before proposing to merge it into his project's main graph. These reactions are the ones in sections 2 and 3 of the essential reactions in `f3/concept-design.md`.

When a session starts, [a new graph is created for it](reaction:sessioning.recording.CreateSessionGraph) with `DiscoveryLinking.createGraph`, named "Research Session", and associated with the session using `Sessioning.setItem`. Every later reaction finds the session's graph with `Sessioning._getItem`, and the session's researcher with `Sessioning._session`, who is recorded as the contributor.

Each time Sessioning records a visit, [the visited URL is added to the graph](reaction:sessioning.recording.RecordSessionSource) as a source, unless `DiscoveryLinking._sourceByUrl` finds it there already. When the visit came from following a link and Sessioning recorded a connection from the earlier page, [that page is added too](reaction:sessioning.recording.RecordSessionOrigin) if it is new. A visit whose originating page is the page itself creates no connection in Sessioning, so this reaction does not apply to it.

[The connection between the two pages is added](reaction:sessioning.recording.RecordSessionConnection) once both sources are in the graph, unless the graph already has a connection between them. It waits until the rest of the visit's reactions have finished, because the two source reactions run in no particular order. Returning to a page or switching tabs records no new connection in Sessioning, so it adds none to the graph either.

A visit recorded before the session's graph exists is not copied, because `Sessioning._getItem` has no row for it yet. The endpoint that starts a session should answer only after its graph is associated.
