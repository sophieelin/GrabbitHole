## Solution Sketch: Grabbithole

Grabbithole will act as a tool for visualizing and saving research paths.

Each collaborative research project has its own shared research space on Grabbithole. While researching, users can turn on Grabbithole's browser extension to record the websites they visit, with the option to add explanatory notes to sources or connections. After each session, a preliminary graph is saved, with each link represented as a node and the lines between nodes representing how the user moved from one link to another. Backtracking allows one node to connect to multiple others. Users can then review their graph, remove irrelevant links, manually edit connections, and add or edit notes explaining the importance or relevance of each source and connection.

Each researcher records their browsing sessions separately and can propose adding their preliminary graph to the shared project graph. The project owner or authorized reviewers can approve or reject these contributions before they are incorporated. Users can also propose edits to the shared graph, such as adding or removing connections or editing notes. Rejected proposals leave the shared graph unchanged.

Once a contribution is approved, Grabbithole combines its sources and connections with the existing graph, representing links with matching URLs as the same node while preserving their original connections, notes, and contributor attribution. An LLM then automatically assigns new sources to existing topic groups or creates new groups when necessary, without reorganizing previously added sources. Users can manually adjust these groupings if needed.

Project owners can invite collaborators to join their research space and grant certain members permission to review contributions. This allows researchers to share their discoveries and build on one another's work while maintaining control over changes to the shared graph.