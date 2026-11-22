# Project graphs

Every project in GrabbitHole has one main research graph, where approved contributions from its members' browsing sessions are merged. Collaborating records which graph belongs to which project (its `Item` is `DiscoveryLinking.Graph`), and DiscoveryLinking owns the graph itself. Neither concept refers to the other.

When `Collaborating.createProject` returns a project, the application [creates the project's main graph and associates it with the project](reaction:projectGraphs.CreateProjectGraph). It asks `DiscoveryLinking.createGraph` for an empty graph with the project's name, then passes the returned graph to `Collaborating.setItem`. These are two stages of one chain because the second needs the graph the first returns, so the graph associated with a project is always the one created for it. This combines the `createProjectGraph` and `associateProjectGraph` reactions in our F3 concept design.

The reaction watches only a returned `createProject`, so a project that fails to be created gets no graph. The two actions are not atomic: if `setItem` failed after `createGraph` returned, the graph would remain without a project. `setItem` refuses only for an unknown project, a project that already has an item, or an item already associated with another project, and none of these can hold for a project and graph that were just created.

## Reading a project's graph

Project members open their project's main graph through the [project graph endpoint](reaction:projectGraphs.GetProjectGraph). It identifies the caller with `SignIn.use`, and the request names a project, never a graph. When `Collaborating._canView` says the caller is a member, the endpoint finds the project's graph with `Collaborating._getItem` and responds with the [research graph](former:the research graph (graph)). Because the graph is always the one Collaborating associates with the project, a caller cannot read an arbitrary graph by its identity, and no preliminary session graph can be reached this way.

The research graph has the graph's identity and name, every source with its URL, and every directed connection with the sources at each end. Each source and connection lists its contributors and its notes, and each person is given by user and username so the frontend can show attribution without another request.

A signed-in caller who is not a member of an existing project gets `FORBIDDEN`. An unknown project gets `PROJECT_NOT_FOUND`. A member of a project without an associated graph gets `PROJECT_GRAPH_NOT_FOUND`; this happens only if [creating the project's graph](reaction:projectGraphs.CreateProjectGraph) failed. A caller who is not signed in is refused by `SignIn.use` with `NOT_SIGNED_IN`, as on every endpoint that requires a session.

```endpoints
projectGraphs.GetProjectGraph at /projects/graph
```
