# Grouping

## Purpose

Organize items into named groups so users can see which items belong together.

## Principle

A user looks over the sources in a research graph and creates a group named after a topic. They put the sources about that topic in the group, and make a second group for another topic. Each source is in at most one group, so putting a source in a different group moves it. Later they rename a group, take a source out, or remove a group, which leaves its sources ungrouped.

## Types

```types
external Item
  The thing being grouped.

external Scope
  The collection of items that a set of groups organizes.
```

## State

```state
a set of Groups with
  a scope Scope
  a name String

a set of Memberships with
  an item Item
  a group Group

Rule: No two Groups have the same scope and name.
Rule: Each Item has at most one Membership.
```

## Actions

```actions
createGroup(scope: Scope, name: String) : returns (group: Group)
  where name is empty after trimming spaces
  then
    refuses EMPTY_NAME "A group needs a name."
  where some Group has the given scope and the same name
  then
    refuses NAME_TAKEN "A group with this name already exists."
  where name is not empty and no Group has the given scope and name
  then
    create a new Group with scope set to given scope and name set to the trimmed name
    returns group

renameGroup(group: Group, name: String) : returns ()
  where group is not in Groups
  then
    refuses GROUP_NOT_FOUND "There is no such group."
  where name is empty after trimming spaces
  then
    refuses EMPTY_NAME "A group needs a name."
  where some other Group has the same scope as group and the same name
  then
    refuses NAME_TAKEN "A group with this name already exists."
  where group is in Groups, name is not empty, and no other Group in its scope has the name
  then
    set group's name to the trimmed name
    returns

removeGroup(group: Group) : returns ()
  where group is not in Groups
  then
    refuses GROUP_NOT_FOUND "There is no such group."
  where group is in Groups
  then
    remove every Membership whose group is group
    remove group
    returns

assign(group: Group, item: Item) : returns ()
  where group is not in Groups
  then
    refuses GROUP_NOT_FOUND "There is no such group."
  where group is in Groups
  then
    remove any Membership of item
    create a Membership with item set to given item and group set to given group
    returns

unassign(item: Item) : returns ()
  where item has no Membership
  then
    refuses NOT_GROUPED "This item is not in a group."
  where item has a Membership
  then
    remove the Membership of item
    returns
```

## Queries

```queries
_group(group: Group) : optional (scope: Scope, name: String)
  Returns the group's scope and name, or no row for an unknown group.

_groups(scope: Scope) : many (group: Group, name: String)
  Returns each group in the scope, ordered by when it was created. Returns no rows for a scope with no groups.

_items(group: Group) : many (item: Item)
  Returns each item in the group, ordered by when it was put there. Returns no rows for an unknown or empty group.

_groupOf(item: Item) : optional (group: Group)
  Returns the group the item is in, or no row if it is in none.
```
