
# Collaborating

## Purpose

Allow users to manage participation and permissions within shared projects.

## Principle

A user creates a shared project and invites others to participate. Once they accept, they become members of the project. The project owner can manage membership and grant certain members permission to review contributions.

## Types

```types
external User
  A person who owns or participates in a project.

external Item
  The shared item associated with a project.

InvitationStatus is PENDING or ACCEPTED or DECLINED
```

## State

```state
a set of Projects with
  a name String
  an owner User
  a members set of Users
  a reviewers set of Users
  an optional item Item

a set of Invitations with
  a project Project
  an invitee User
  a status InvitationStatus

Rule: Each project's owner belongs to its members and reviewers.
Rule: Each project's reviewers are members of that project.
Rule: Each Item is associated with at most one Project.
```

## Actions

```actions
createProject(owner: User, name: String) : returns (project: Project)
  where true
  then
    add a new project with name and owner,
      members containing only owner,
      reviewers containing only owner,
      and no associated item
    returns project

setItem(project: Project, item: Item) : returns ()
  where project is not in Projects
  then
    refuses PROJECT_NOT_FOUND "There is no such project."
  where project is in Projects and project has an associated item
  then
    refuses ITEM_ALREADY_SET "This project already has an associated item."
  where some other project in Projects has item
  then
    refuses ITEM_ALREADY_ASSOCIATED "This item is already associated with another project."
  where project is in Projects, project has no associated item, and no other project has item
  then
    set project's item to item
    returns

invite(project: Project, inviter: User, invitee: User) : returns (invitation: Invitation)
  where project is not in Projects
  then
    refuses PROJECT_NOT_FOUND "There is no such project."
  where project is in Projects and inviter is not project's owner
  then
    refuses NOT_OWNER "Only the project owner can invite users."
  where project is in Projects and invitee is in project's members
  then
    refuses ALREADY_MEMBER "This user is already a member."
  where project is in Projects and a pending invitation exists for invitee in project
  then
    refuses ALREADY_INVITED "This user already has a pending invitation."
  where project is in Projects, inviter is project's owner, invitee is not in project's members, and no pending invitation exists for invitee in project
  then
    add a new Invitation with project, invitee, and status PENDING
    returns invitation

acceptInvitation(invitation: Invitation, user: User) : returns ()
  where invitation is not in Invitations
  then
    refuses INVITATION_NOT_FOUND "There is no such invitation."
  where invitation is in Invitations and invitation's status is not PENDING
  then
    refuses INVITATION_NOT_PENDING "This invitation is no longer pending."
  where invitation is in Invitations and user is not invitation's invitee
  then
    refuses NOT_INVITEE "Only the invited user can accept this invitation."
  where invitation is in Invitations, invitation's status is PENDING, and user is invitation's invitee
  then
    set invitation's status to ACCEPTED
    add user to invitation's project's members
    returns

declineInvitation(invitation: Invitation, user: User) : returns ()
  where invitation is not in Invitations
  then
    refuses INVITATION_NOT_FOUND "There is no such invitation."
  where invitation is in Invitations and invitation's status is not PENDING
  then
    refuses INVITATION_NOT_PENDING "This invitation is no longer pending."
  where invitation is in Invitations and user is not invitation's invitee
  then
    refuses NOT_INVITEE "Only the invited user can decline this invitation."
  where invitation is in Invitations, invitation's status is PENDING, and user is invitation's invitee
  then
    set invitation's status to DECLINED
    returns

removeMember(project: Project, owner: User, member: User) : returns ()
  where project is not in Projects
  then
    refuses PROJECT_NOT_FOUND "There is no such project."
  where project is in Projects and owner is not project's owner
  then
    refuses NOT_OWNER "Only the project owner can remove members."
  where project is in Projects and member is not in project's members
  then
    refuses NOT_MEMBER "This user is not a member."
  where project is in Projects and member is project's owner
  then
    refuses CANNOT_REMOVE_OWNER "The project owner cannot be removed."
  where project is in Projects, owner is project's owner, member is in project's members, and member is not project's owner
  then
    remove member from project's members and reviewers
    returns

grantReviewer(project: Project, owner: User, member: User) : returns ()
  where project is not in Projects
  then
    refuses PROJECT_NOT_FOUND "There is no such project."
  where project is in Projects and owner is not project's owner
  then
    refuses NOT_OWNER "Only the project owner can grant reviewer permissions."
  where project is in Projects and member is not in project's members
  then
    refuses NOT_MEMBER "Only project members can become reviewers."
  where project is in Projects and member is in project's reviewers
  then
    refuses ALREADY_REVIEWER "This member is already a reviewer."
  where project is in Projects, owner is project's owner, member is in project's members, and member is not in project's reviewers
  then
    add member to project's reviewers
    returns

revokeReviewer(project: Project, owner: User, member: User) : returns ()
  where project is not in Projects
  then
    refuses PROJECT_NOT_FOUND "There is no such project."
  where project is in Projects and owner is not project's owner
  then
    refuses NOT_OWNER "Only the project owner can revoke reviewer permissions."
  where project is in Projects and member is project's owner
  then
    refuses CANNOT_REVOKE_OWNER "The project owner's reviewer permissions cannot be revoked."
  where project is in Projects and member is not in project's reviewers
  then
    refuses NOT_REVIEWER "This user is not a reviewer."
  where project is in Projects, owner is project's owner, member is in project's reviewers, and member is not project's owner
  then
    remove member from project's reviewers
    returns
```

## Queries

```queries
_project(project: Project) : optional (name: String, owner: User)
  Returns the project's name and owner, or no row for an unknown project.

_members(project: Project) : many (user: User)
  Returns each member of the project, or no rows for an unknown project.

_reviewers(project: Project) : many (user: User)
  Returns each reviewer of the project, or no rows for an unknown project.

_invitation(invitation: Invitation) : optional (project: Project, invitee: User, status: InvitationStatus)
  Returns the invitation's project, invitee, and status, or no row for an unknown invitation.

_projectsOf(user: User) : many (project: Project, name: String)
  Returns each project the user belongs to the members of, with its name, ordered by name and then by project; no rows for a user in no project.

_pendingInvitations(user: User) : many (invitation: Invitation, project: Project)
  Returns all pending invitations for the given user.

_canReview(project: Project, user: User) : one (allowed: Flag)
  Returns true if the project exists and user belongs to its reviewers, otherwise false.

_canView(project: Project, user: User) : one (allowed: Flag)
  Returns true if the project exists and user belongs to its members, otherwise false.

_getItem(project: Project) : optional (item: Item)
  Returns the item associated with the project, or no row if none exists.

_getProjectByItem(item: Item) : optional (project: Project)
  Returns the project associated with the item, or no row if none exists.
```
