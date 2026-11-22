# Sessioning

Dylan starts a browsing session, and every page he opens and every link he follows during it is copied into a preliminary research graph of its own. He can then review and edit that graph before proposing to merge it into his project's main graph. These reactions are the ones in sections 2 and 3 of the essential reactions in `f3/concept-design.md`.

When a session starts, [a new graph is created for it](reaction:sessioning.recording.CreateSessionGraph) with `DiscoveryLinking.createGraph`, named "Research Session", and associated with the session using `Sessioning.setItem`. Every later reaction finds the session's graph with `Sessioning._getItem`, and the session's researcher with `Sessioning._session`, who is recorded as the contributor.

Each time Sessioning records a visit, [the visited URL is added to the graph](reaction:sessioning.recording.RecordSessionSource) as a source, unless `DiscoveryLinking._sourceByUrl` finds it there already. When the visit came from following a link and Sessioning recorded a connection from the earlier page, [that page is added too](reaction:sessioning.recording.RecordSessionOrigin) if it is new. A visit whose originating page is the page itself creates no connection in Sessioning, so this reaction does not apply to it.

[The connection between the two pages is added](reaction:sessioning.recording.RecordSessionConnection) once both sources are in the graph, unless the graph already has a connection between them. It waits until the rest of the visit's reactions have finished, because the two source reactions run in no particular order. Returning to a page or switching tabs records no new connection in Sessioning, so it adds none to the graph either.

A visit recorded before the session's graph exists is not copied, because `Sessioning._getItem` has no row for it yet. That is why [the endpoint that starts a session](reaction:sessioning.browsing.StartSession) answers only after its graph is associated.

## Browsing-session endpoints

The browser extension records a session through these endpoints. Each identifies the caller with `SignIn.use`, so a caller who is not signed in is refused with `NOT_SIGNED_IN`. The browsing session is passed as `browsingSession`, because `session` is the sign-in cookie.

The extension [starts a session](reaction:sessioning.browsing.StartSession) for the signed-in user with `Sessioning.startSession`. The endpoint waits for the rest of the request's work to finish, so it answers with the new `browsingSession` only after [the session's graph](reaction:sessioning.recording.CreateSessionGraph) is associated, and a visit recorded right after starting is always copied into the graph. If the graph could not be associated, it answers `SESSION_GRAPH_NOT_FOUND` instead.

While a session is active, the extension [records each visit](reaction:sessioning.browsing.RecordVisit) with `Sessioning.recordVisit`, sending the visited `url` and the `sourceUrl` it came from. Only the session's owner, as `Sessioning._session` gives it, can record into a session: anyone else gets `FORBIDDEN`, and an unknown session gets `SESSION_NOT_FOUND`. A visit to a stopped session is refused by Sessioning with `SESSION_NOT_ACTIVE`. Every request names a `sourceUrl`; for a page with no page before it, the extension sends the page itself, which Sessioning records with no connection. The endpoint answers once Sessioning has recorded the visit. [Copying it into the session's graph](reaction:sessioning.recording.RecordSessionConnection) finishes in the same request's work right after, so a graph read sent immediately after the answer may not include it yet.

When the researcher is done, the extension [stops the session](reaction:sessioning.browsing.StopSession) with `Sessioning.stopSession`, and it records no more visits. The same owner check applies: anyone else gets `FORBIDDEN`, and an unknown session gets `SESSION_NOT_FOUND`. Stopping a session that has already stopped is refused by Sessioning with `SESSION_NOT_ACTIVE`.

To review a session, its owner [reads the session's graph](reaction:sessioning.browsing.GetSessionGraph), found with `Sessioning._getItem`. It responds with the same [research graph](former:the research graph (graph)) as a project's main graph, so the frontend draws both the same way. The request names a session, never a graph, so a caller can read only a graph that Sessioning associates with a session of their own. Anyone else gets `FORBIDDEN`, and an unknown session gets `SESSION_NOT_FOUND`. A session with no associated graph gets `SESSION_GRAPH_NOT_FOUND`; this happens only if [creating the session's graph](reaction:sessioning.recording.CreateSessionGraph) failed.

```endpoints
sessioning.browsing.StartSession at /sessions/start
sessioning.browsing.RecordVisit at /sessions/visit
sessioning.browsing.StopSession at /sessions/stop
sessioning.browsing.GetSessionGraph at /sessions/graph
```
