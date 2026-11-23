# Session projects

A researcher who stops a browsing session can propose its graph to a new project from the browser extension. The signed-in user [creates the project](reaction:sessionProjects.CreateProject) with `Collaborating.createProject`, which makes them its owner, a member and a reviewer. The endpoint identifies the caller with `SignIn.use`, so a caller who is not signed in is refused with `NOT_SIGNED_IN`.

[Creating the project's main graph](reaction:projectGraphs.CreateProjectGraph) follows from that action. The endpoint waits for the rest of the request's work to finish, so it answers with the new `project` only after the graph is associated, and the session's graph can be proposed to it right away. If the graph could not be associated, it answers `PROJECT_GRAPH_NOT_FOUND` instead.

The signed-in user [lists their projects](reaction:sessionProjects.ListMyProjects) and gets [the projects they are a member of](former:the projects of (user)), from `Collaborating._projectsOf`, ordered by name. A user in no project gets an empty list.

```endpoints
sessionProjects.CreateProject at /projects/create
sessionProjects.ListMyProjects at /projects/mine
```
