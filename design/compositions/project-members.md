# Project members

A project's owner manages who is in it, and its members can see who they work with and what is waiting for review. Every endpoint identifies the caller with `SignIn.use`, so a caller who is not signed in is refused with `NOT_SIGNED_IN`.

A member [lists the project's people](reaction:projectMembers.ListMembers) and gets its owner, [its members](former:the members of (project)) by user and username, and [its reviewers](former:the reviewers of (project)). A member also [lists the pending proposals](reaction:projectMembers.ListPendingProposals) on the project's graph and gets [each proposal with its proposer and change](former:the pending proposals for (target)), from `Contributing._pending`. Someone who is not a member gets `FORBIDDEN`, and an unknown project gets `PROJECT_NOT_FOUND`.

The owner [invites a user by username](reaction:projectMembers.Invite) with `Collaborating.invite`. A username nobody has gets `USER_NOT_FOUND`, a caller who is not the owner gets `FORBIDDEN`, and Collaborating refuses a user who is already a member or already invited. The invited user [lists their invitations](reaction:projectMembers.ListMyInvitations) and gets [the ones they have not answered](former:the invitations of (user)) with each project's name, then [accepts one](reaction:projectMembers.AcceptInvitation) to become a member or [declines it](reaction:projectMembers.DeclineInvitation). An invitation that is not theirs or is no longer pending gets `INVITATION_NOT_FOUND`.

The owner [lets a member review](reaction:projectMembers.GrantReviewer), [stops a member from reviewing](reaction:projectMembers.RevokeReviewer), and [removes a member](reaction:projectMembers.RemoveMember). A caller who is not the owner gets `FORBIDDEN`. Collaborating refuses the rest: a user who is not a member, a member who already reviews or does not, and removing or revoking the owner.

```endpoints
projectMembers.ListMembers at /projects/members
projectMembers.ListPendingProposals at /projects/contributions/pending
projectMembers.Invite at /projects/invite
projectMembers.ListMyInvitations at /invitations/mine
projectMembers.AcceptInvitation at /invitations/accept
projectMembers.DeclineInvitation at /invitations/decline
projectMembers.GrantReviewer at /projects/reviewers/grant
projectMembers.RevokeReviewer at /projects/reviewers/revoke
projectMembers.RemoveMember at /projects/members/remove
```
