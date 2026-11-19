
# Collaborating

## Purpose

Allow users to manage participation and permissions within shared projects.

## Principle

A user creates a shared project and invites others to participate. Once they accept, they become members of the project. The project owner can manage membership and grant certain members permission to review contributions.

## Types

```types
external User
  A person who owns or participates in a project.
```

## State

```state
a set of Projects with
  a name String
  an owner User
  a members set of Users
  a reviewers set of Users

Rule: Each project's owner belongs to its members and reviewers.
Rule: Each project's reviewers are members of that project.
```

## Actions

```actions
createProject(owner: User, name: String) : returns (project: Project)
  where true
  then
    add a new project with name and owner,
      members containing only owner,
      and reviewers containing only owner
    returns project
```

## Queries

```queries
_project(project: Project) : optional (name: String, owner: User)
  Returns the project's name and owner, or no row for an unknown project.

_members(project: Project) : many (user: User)
  Returns each member of the project, or no rows for an unknown project.

_reviewers(project: Project) : many (user: User)
  Returns each reviewer of the project, or no rows for an unknown project.
```
