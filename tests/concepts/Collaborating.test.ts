
import { describe, expect, test } from "bun:test";
import {
    AlreadyInvited,
  CollaboratingConcept,
  InvitationNotPending,
  NotInvitee,
  NotOwner,
  CannotRemoveOwner,
    NotMember,
  type Project,
} from "../../src/concepts/Collaborating/Collaborating.ts";
import type { User } from "../../src/concepts/Registering/Registering.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

const maya = "maya" as User;
const sam = "sam" as User;

async function setup() {
  return {
    collaborating: new CollaboratingConcept<User>(
      await testDatabase()
    ),
  };
}

describe("Collaborating", () => {
  test("createProject makes the creator the owner, member, and reviewer", async () => {
    const { collaborating } = await setup();

    const { project } = await collaborating.createProject({
      owner: maya,
      name: "Roman History",
    });

    expect(await collaborating._project({ project })).toEqual([
      { name: "Roman History", owner: maya },
    ]);

    expect(await collaborating._members({ project })).toEqual([
      { user: maya },
    ]);

    expect(await collaborating._reviewers({ project })).toEqual([
      { user: maya },
    ]);
  });

  test("two projects with the same name are distinct", async () => {
    const { collaborating } = await setup();

    const { project: first } = await collaborating.createProject({
      owner: maya,
      name: "Roman History",
    });

    const { project: second } = await collaborating.createProject({
      owner: sam,
      name: "Roman History",
    });

    expect(first).not.toBe(second);

    expect(await collaborating._project({ project: first })).toEqual([
      { name: "Roman History", owner: maya },
    ]);

    expect(await collaborating._project({ project: second })).toEqual([
      { name: "Roman History", owner: sam },
    ]);
  });

  test("queries return no rows for an unknown project", async () => {
    const { collaborating } = await setup();
    const missing = "missing" as Project;

    expect(await collaborating._project({ project: missing })).toEqual([]);
    expect(await collaborating._members({ project: missing })).toEqual([]);
    expect(await collaborating._reviewers({ project: missing })).toEqual([]);
  });

  test("projects persist across concept instances", async () => {
  const database = await testDatabase();
  const first = new CollaboratingConcept<User>(database);

  const { project } = await first.createProject({
    owner: maya,
    name: "Roman History",
  });

  const second = new CollaboratingConcept<User>(database);

  expect(await second._project({ project })).toEqual([
    { name: "Roman History", owner: maya },
  ]);
});


test("owner invites a user who accepts and becomes a member", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Roman History",
  });

  const { invitation } = await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });

  expect(await collaborating._pendingInvitations({ user: sam }))
    .toEqual([{ invitation, project }]);

  await collaborating.acceptInvitation({ invitation, user: sam });

  expect(await collaborating._invitation({ invitation })).toEqual([
    { project, invitee: sam, status: "ACCEPTED" },
  ]);

  expect(await collaborating._members({ project })).toEqual([
    { user: maya },
    { user: sam },
  ]);

  expect(await collaborating._reviewers({ project })).toEqual([
    { user: maya },
  ]);

  expect(await collaborating._pendingInvitations({ user: sam }))
    .toEqual([]);
});

test("only the project owner can invite users", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Roman History",
  });

  await expect(
    collaborating.invite({
      project,
      inviter: sam,
      invitee: maya,
    }),
  ).rejects.toThrow(NotOwner);
});

test("duplicate pending invitations are refused", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Roman History",
  });

  await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });

  await expect(
    collaborating.invite({
      project,
      inviter: maya,
      invitee: sam,
    }),
  ).rejects.toThrow(AlreadyInvited);
});

test("only the invitee can accept an invitation", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Roman History",
  });

  const { invitation } = await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });

  await expect(
    collaborating.acceptInvitation({ invitation, user: maya }),
  ).rejects.toThrow(NotInvitee);

  expect(await collaborating._members({ project }))
    .toEqual([{ user: maya }]);
});

test("an accepted invitation cannot be accepted again", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Roman History",
  });

  const { invitation } = await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });

  await collaborating.acceptInvitation({ invitation, user: sam });

  await expect(
    collaborating.acceptInvitation({ invitation, user: sam }),
  ).rejects.toThrow(InvitationNotPending);
});

test("the same user can be invited to different projects", async () => {
  const { collaborating } = await setup();

  const { project: first } = await collaborating.createProject({
    owner: maya,
    name: "Project A",
  });

  const { project: second } = await collaborating.createProject({
    owner: maya,
    name: "Project B",
  });

  const a = await collaborating.invite({
    project: first,
    inviter: maya,
    invitee: sam,
  });

  const b = await collaborating.invite({
    project: second,
    inviter: maya,
    invitee: sam,
  });

  expect(a.invitation).not.toBe(b.invitation);
  expect(await collaborating._pendingInvitations({ user: sam }))
    .toEqual(expect.arrayContaining([
      { invitation: a.invitation, project: first },
      { invitation: b.invitation, project: second },
    ]));
});


test("an invitee can decline without becoming a member", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Research",
  });
  const { invitation } = await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });

  await collaborating.declineInvitation({ invitation, user: sam });

  expect(await collaborating._invitation({ invitation })).toEqual([
    { project, invitee: sam, status: "DECLINED" },
  ]);
  expect(await collaborating._members({ project })).toEqual([
    { user: maya },
  ]);
  expect(await collaborating._pendingInvitations({ user: sam })).toEqual([]);

  await expect(
    collaborating.acceptInvitation({ invitation, user: sam }),
  ).rejects.toThrow(InvitationNotPending);
});

test("removing a member also removes their reviewer permission", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Research",
  });
  const { invitation } = await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });
  await collaborating.acceptInvitation({ invitation, user: sam });
  await collaborating.grantReviewer({ project, owner: maya, member: sam });

  await collaborating.removeMember({
    project,
    owner: maya,
    member: sam,
  });

  expect(await collaborating._members({ project })).toEqual([
    { user: maya },
  ]);
  expect(await collaborating._reviewers({ project })).toEqual([
    { user: maya },
  ]);
  expect(await collaborating._canReview({ project, user: sam }))
    .toEqual([{ allowed: false }]);
});

test("the project owner cannot be removed", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Research",
  });

  await expect(
    collaborating.removeMember({
      project,
      owner: maya,
      member: maya,
    }),
  ).rejects.toThrow(CannotRemoveOwner);
});

test("reviewer permissions can be granted and revoked", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Research",
  });
  const { invitation } = await collaborating.invite({
    project,
    inviter: maya,
    invitee: sam,
  });
  await collaborating.acceptInvitation({ invitation, user: sam });

  expect(await collaborating._canReview({ project, user: sam }))
    .toEqual([{ allowed: false }]);

  await collaborating.grantReviewer({
    project,
    owner: maya,
    member: sam,
  });

  expect(await collaborating._canReview({ project, user: sam }))
    .toEqual([{ allowed: true }]);

  await collaborating.revokeReviewer({
    project,
    owner: maya,
    member: sam,
  });

  expect(await collaborating._canReview({ project, user: sam }))
    .toEqual([{ allowed: false }]);

  // Revoking review permission does not remove membership.
  expect(await collaborating._canView({ project, user: sam }))
    .toEqual([{ allowed: true }]);
});

test("non-owners cannot manage project permissions", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Research",
  });

  await expect(
    collaborating.grantReviewer({
      project,
      owner: sam,
      member: maya,
    }),
  ).rejects.toThrow(NotOwner);

  await expect(
    collaborating.removeMember({
      project,
      owner: sam,
      member: maya,
    }),
  ).rejects.toThrow(NotOwner);
});

test("reviewer permissions require membership", async () => {
  const { collaborating } = await setup();
  const { project } = await collaborating.createProject({
    owner: maya,
    name: "Research",
  });

  await expect(
    collaborating.grantReviewer({
      project,
      owner: maya,
      member: sam,
    }),
  ).rejects.toThrow(NotMember);

  expect(await collaborating._canView({ project, user: sam }))
    .toEqual([{ allowed: false }]);
  expect(await collaborating._canReview({ project, user: sam }))
    .toEqual([{ allowed: false }]);
});


});
