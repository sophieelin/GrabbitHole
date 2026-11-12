# Design Summary

## Overall Design

Grabbithole is a collaborative research platform that helps users preserve, organize, and build upon their paths of internet discoveries. Rather than simply saving bookmarks, the app records how users move between sources and allows them to share the reasoning behind those connections.

Our design centers around three concepts:

- **DiscoveryLinking** records browsing sessions through a browser extension, creating a preliminary graph where nodes represent visited websites and edges represent how users navigated between them. Users can review their sessions, remove irrelevant sources, edit connections, and add notes before saving them to a research project.
- **Grouping** organizes sources into broader topics and subtopics to make large research graphs easier to navigate. When new sources are added, an LLM assigns them to existing groups or creates new ones without changing the organization of previously saved sources. Users can also manually adjust these groupings.
- **Contributing** manages collaboration within shared research projects. Researchers can propose adding their browsing sessions to a shared graph, which authorized collaborators review before incorporation. Users can also fork a graph at a particular node to explore a different direction independently and later propose contributing their findings back.

These concepts work together when a researcher adds a browsing session to a project. `DiscoveryLinking` preserves the sources and their connections, while `Grouping` incorporates new sources into the existing topic hierarchy. If the project is shared, `Contributing` manages the approval process before the new findings become part of the shared graph. When combining sessions, matching URLs are represented by the same node, but their original connections are preserved.

Grabbithole also allows users to search public research graphs by topic or source, even when those sources appear within projects about different subjects. This makes it possible to discover unexpected connections, follow another researcher's path, and continue exploring through a fork.

## Addressing Ethical Concerns

Our ethical analysis raised concerns about privacy, monitoring, and how the app might influence research behavior.

To address privacy, browsing sessions are recorded only when users enable the extension. Before adding a session to a project, users can review the preliminary graph and remove any personal or irrelevant websites. Contributions to shared projects also require approval, giving collaborators control over what becomes part of the shared research graph.

We also considered how shared research histories and contribution records could be used to monitor teammates or compare their productivity. While Grabbithole preserves contributions for attribution and collaboration, we want to avoid features that rank users based on the number of websites visited or links contributed. The focus should remain on the research itself rather than individual activity.

Another concern is that users might change how they browse to produce cleaner or more impressive graphs. To reduce this pressure, Grabbithole separates the original browsing connections from the topic hierarchy. The LLM helps organize sources without replacing the paths users actually followed, and users can manually adjust groupings without losing those connections.

## Remaining Questions

- **Browser tracking:** We need to determine how the extension identifies navigation between websites, especially when users switch tabs, backtrack, or open multiple links from the same page.
- **Contribution approval:** We need to decide how authorized collaborators review proposed changes, particularly when a contribution contains many new sources and connections.
- **Forking:** We need to clarify whether a fork copies the entire existing graph or only the path leading to the selected node, and how contributions from forks can be merged back into the original project.
- **Graph visualization:** As projects grow, graphs may become difficult to navigate. We need to decide how topic groups can be expanded or collapsed while still allowing users to see individual sources and connections.
- **AI grouping:** We need to determine how to handle sources that fit into multiple topics and how to resolve conflicts between AI-suggested groups and users' manual organization.
