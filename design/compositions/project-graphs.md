# Project graphs

Every project in GrabbitHole has one main research graph, where approved contributions from its members' browsing sessions are merged. Collaborating records which graph belongs to which project (its `Item` is `DiscoveryLinking.Graph`), and DiscoveryLinking owns the graph itself. Neither concept refers to the other.

When `Collaborating.createProject` returns a project, the application [creates the project's main graph and associates it with the project](reaction:projectGraphs.CreateProjectGraph). It asks `DiscoveryLinking.createGraph` for an empty graph with the project's name, then passes the returned graph to `Collaborating.setItem`. These are two stages of one chain because the second needs the graph the first returns, so the graph associated with a project is always the one created for it. This combines the `createProjectGraph` and `associateProjectGraph` reactions in our F3 concept design.

The reaction watches only a returned `createProject`, so a project that fails to be created gets no graph. The two actions are not atomic: if `setItem` failed after `createGraph` returned, the graph would remain without a project. `setItem` refuses only for an unknown project, a project that already has an item, or an item already associated with another project, and none of these can hold for a project and graph that were just created.
