import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Collaborating, Contributing, Registering, SignIn } = concepts;

/** The members of a project, by user and username. */
const MembersOf = former("the members of (project)", ({ project }, { member, username }) =>
  each(Collaborating._members({ project }).is({ user: member }))
    .where(Registering._username({ user: member }).is({ username }))
    .form({ user: member, username }),
);

/** The members of a project who can review proposals. */
const ReviewersOf = former("the reviewers of (project)", ({ project }, { reviewer }) =>
  each(Collaborating._reviewers({ project }).is({ user: reviewer })).form({ user: reviewer }),
);

/** The proposals waiting for review on an item, with who proposed each. */
const PendingProposals = former(
  "the pending proposals for (target)",
  ({ target }, { proposal, proposer, proposerName, change }) =>
    each(Contributing._pending({ target }).is({ proposal, proposer, change }))
      .where(Registering._username({ user: proposer }).is({ username: proposerName }))
      .form({ proposal, proposer, proposerName, change }),
);

/** The invitations a user has not answered, with each project's name. */
const InvitationsOf = former("the invitations of (user)", ({ user }, { invitation, project, name }) =>
  each(Collaborating._pendingInvitations({ user }).is({ invitation, project }))
    .where(Collaborating._project({ project }).is({ name }))
    .form({ invitation, project, name }),
);

/** A member reads who is in the project: its owner, its members, and which of them review. */
const ListMembers = endpoint(
  "/projects/members",
  ({ session, project, user, owner }) =>
    receive({ session, project })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._project({ project }).is({ owner }),
        )
          .then(respond({ owner, members: MembersOf({ project }), reviewers: ReviewersOf({ project }) }))
          .named("member"),

        where(
          Collaborating._project({ project }).is({}),
          Collaborating._canView({ project, user }).is({ allowed: false }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** A member reads the proposals waiting for review on the project's graph. */
const ListPendingProposals = endpoint(
  "/projects/contributions/pending",
  ({ session, project, user, target }) =>
    receive({ session, project })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: target }),
        )
          .then(respond({ proposals: PendingProposals({ target }) }))
          .named("member"),

        where(
          Collaborating._project({ project }).is({}),
          Collaborating._canView({ project, user }).is({ allowed: false }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** The project's owner invites a user by username. */
const Invite = endpoint(
  "/projects/invite",
  ({ session, project, username, user, invitee, invitation }) =>
    receive({ session, project, username })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._project({ project }).is({ owner: user }),
          Registering._byUsername({ username }).is({ user: invitee }),
        )
          .then(Collaborating.invite({ project, inviter: user, invitee }).responds({ invitation }))
          .then(respond({ invitation }))
          .named("owner"),

        where(Collaborating._project({ project }).is({ owner: user }), no(Registering._byUsername({ username })))
          .then(respond({ error: "USER_NOT_FOUND" }))
          .named("unknownUser"),

        where(Collaborating._project({ project }).is({}), no(Collaborating._project({ project }).is({ owner: user })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** The signed-in user lists the invitations they have not answered. */
const ListMyInvitations = endpoint(
  "/invitations/mine",
  ({ session, user }) =>
    receive({ session })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(respond({ invitations: InvitationsOf({ user }) })),
  { validators: { input: textInput } },
);

/** The invited user accepts a pending invitation and becomes a member. */
const AcceptInvitation = endpoint(
  "/invitations/accept",
  ({ session, invitation, user }) =>
    receive({ session, invitation })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Collaborating._invitation({ invitation }).is({ invitee: user, status: "PENDING" }))
          .then(Collaborating.acceptInvitation({ invitation, user }).responds({}))
          .then(respond({}))
          .named("invitee"),

        where(no(Collaborating._invitation({ invitation }).is({ invitee: user, status: "PENDING" })))
          .then(respond({ error: "INVITATION_NOT_FOUND" }))
          .named("noInvitation"),
      ),
  { validators: { input: textInput } },
);

/** The invited user declines a pending invitation. */
const DeclineInvitation = endpoint(
  "/invitations/decline",
  ({ session, invitation, user }) =>
    receive({ session, invitation })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Collaborating._invitation({ invitation }).is({ invitee: user, status: "PENDING" }))
          .then(Collaborating.declineInvitation({ invitation, user }).responds({}))
          .then(respond({}))
          .named("invitee"),

        where(no(Collaborating._invitation({ invitation }).is({ invitee: user, status: "PENDING" })))
          .then(respond({ error: "INVITATION_NOT_FOUND" }))
          .named("noInvitation"),
      ),
  { validators: { input: textInput } },
);

/** The project's owner lets a member review proposals. */
const GrantReviewer = endpoint(
  "/projects/reviewers/grant",
  ({ session, project, member, user }) =>
    receive({ session, project, member })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Collaborating._project({ project }).is({ owner: user }))
          .then(Collaborating.grantReviewer({ project, owner: user, member }).responds({}))
          .then(respond({}))
          .named("owner"),

        where(Collaborating._project({ project }).is({}), no(Collaborating._project({ project }).is({ owner: user })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** The project's owner stops a member from reviewing proposals. */
const RevokeReviewer = endpoint(
  "/projects/reviewers/revoke",
  ({ session, project, member, user }) =>
    receive({ session, project, member })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Collaborating._project({ project }).is({ owner: user }))
          .then(Collaborating.revokeReviewer({ project, owner: user, member }).responds({}))
          .then(respond({}))
          .named("owner"),

        where(Collaborating._project({ project }).is({}), no(Collaborating._project({ project }).is({ owner: user })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** The project's owner removes a member from the project. */
const RemoveMember = endpoint(
  "/projects/members/remove",
  ({ session, project, member, user }) =>
    receive({ session, project, member })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Collaborating._project({ project }).is({ owner: user }))
          .then(Collaborating.removeMember({ project, owner: user, member }).responds({}))
          .then(respond({}))
          .named("owner"),

        where(Collaborating._project({ project }).is({}), no(Collaborating._project({ project }).is({ owner: user })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  ListMembers,
  ListPendingProposals,
  Invite,
  ListMyInvitations,
  AcceptInvitation,
  DeclineInvitation,
  GrantReviewer,
  RevokeReviewer,
  RemoveMember,
};
