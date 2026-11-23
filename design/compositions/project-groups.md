# Project groups

Members of a project sort the sources of its research graph into topic groups. Grouping knows only items and scopes: here an item is a `DiscoveryLinking.Source` and a scope is the `DiscoveryLinking.Graph` it belongs to. Every endpoint identifies the caller with `SignIn.use`, so a caller who is not signed in is refused with `NOT_SIGNED_IN`. Grouping a source does not change the research graph itself, so it is not a proposal and needs no reviewer.

A member [lists the groups](reaction:projectGroups.ListGroups) of the project's graph and gets [each group with its name and sources](former:the groups of (graph)), in the order the groups were made. A member [makes a group](reaction:projectGroups.CreateGroup) with `Grouping.createGroup`, which refuses an empty name with `EMPTY_NAME` and a name the graph already uses with `NAME_TAKEN`. Someone who is not a member gets `FORBIDDEN`, and an unknown project gets `PROJECT_NOT_FOUND`.

The other endpoints name a group. Each finds the group's graph with `Grouping._group`, the project that graph belongs to with `Collaborating._getProjectByItem`, and checks the caller is a member of it. A member [renames a group](reaction:projectGroups.RenameGroup) or [removes it](reaction:projectGroups.RemoveGroup), which leaves its sources ungrouped. A member [puts a source in a group](reaction:projectGroups.AssignSource), which moves it if it was in another group, since a source is in at most one. The source must belong to the same graph as the group; otherwise the answer is `SOURCE_NOT_IN_GRAPH`. A member [takes a source out of its group](reaction:projectGroups.UnassignSource), and Grouping refuses with `NOT_GROUPED` if it was in none. An unknown group gets `GROUP_NOT_FOUND`, and a caller who is not a member of the group's project gets `FORBIDDEN`.

When `DiscoveryLinking.removeSource` removes a source that is in a group, the application [takes it out of the group](reaction:projectGroups.UngroupRemovedSource), so no group lists a source that is gone.

```endpoints
projectGroups.ListGroups at /projects/groups
projectGroups.CreateGroup at /projects/groups/create
projectGroups.RenameGroup at /projects/groups/rename
projectGroups.RemoveGroup at /projects/groups/remove
projectGroups.AssignSource at /projects/groups/assign
projectGroups.UnassignSource at /projects/groups/unassign
```
