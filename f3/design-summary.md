# Design Summary

## Overall Design

Grabbithole is a collaborative research platform that helps users preserve, organize, and build upon their paths of internet discoveries. Rather than simply saving bookmarks, the app records how users navigate between sources and allows them to share the reasoning behind those connections.

Our design centers around five concepts:

- **Sessioning** records visited URLs and the connections between them through the browser extension, including links opened in different tabs.
- **DiscoveryLinking** manages research graphs, including sources, connections, notes, and contributor attribution. Each browsing session produces a preliminary graph that users can review and edit before incorporating it into a project.
- **Grouping** organizes sources into topic groups. When new sources are added to a project's main graph, an LLM suggests existing or new groups for them. Previous group assignments remain unchanged unless manually edited.
- **Contributing** allows researchers to propose changes to shared project graphs, including merging preliminary graphs, editing notes, and modifying connections. These changes are only applied after approval.
- **Collaborating** manages project membership and permissions, determining which users are authorized to review contributions.

These concepts work together to support collaborative research. When a user starts a browsing session, `Sessioning` records their activity while `DiscoveryLinking` builds a preliminary graph. Users can review and edit this graph before proposing to add it to a shared project. `Contributing` manages the proposal, while `Collaborating` determines who can approve or reject it. Once approved, `DiscoveryLinking` incorporates the changes into the main graph, and `Grouping` organizes the newly added sources into the existing topic hierarchy.

When graphs are merged, sources with matching URLs are combined into the same node while preserving their connections, notes, and contributor attribution. This allows multiple researchers to contribute to a shared understanding of a topic without losing the original paths of discovery.

## Addressing Ethical Concerns

Our ethical analysis identified concerns related to privacy, monitoring, and changes in research behavior.

To address privacy, users explicitly start browsing sessions rather than having their activity continuously recorded. They can review their preliminary graphs, remove irrelevant or personal sources, and edit connections before sharing their research. Contribution approval also provides another opportunity to review what becomes part of the shared graph.

We also considered how contribution histories could be used to monitor teammates or compare their productivity. Although `DiscoveryLinking` preserves contributor attribution, we want to avoid features that rank users by the number of websites visited or contributions made. The emphasis should remain on sharing discoveries rather than measuring individual activity.

Finally, users might begin changing their browsing habits to produce cleaner or more impressive graphs. To reduce this pressure, users can review and edit their preliminary graphs before sharing them, removing irrelevant paths without affecting their actual browsing experience. They can also manually adjust AI-suggested groupings without changing the underlying research connections.

## Remaining Questions

- **Browser tracking:** How can the extension reliably identify which page led to another, especially when users open links in new tabs or navigate between existing tabs?
- **Contribution review:** How should reviewers inspect proposed changes, especially when a contribution contains many sources and connections?
- **Graph visualization:** How can we display topic groups and individual connections without overwhelming users as research graphs grow?
- **AI grouping:** How should we handle sources that fit into multiple topics or cases where the LLM suggests an incorrect group?