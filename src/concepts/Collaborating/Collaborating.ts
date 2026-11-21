
import {
  type Collection,
  type Db,
  MongoServerError,
} from "mongodb";

export class ProjectNotFound extends Error {}
export class NotOwner extends Error {}
export class AlreadyMember extends Error {}
export class AlreadyInvited extends Error {}
export class InvitationNotFound extends Error {}
export class InvitationNotPending extends Error {}
export class NotInvitee extends Error {}
export class NotMember extends Error {}
export class CannotRemoveOwner extends Error {}
export class AlreadyReviewer extends Error {}
export class CannotRevokeOwner extends Error {}
export class NotReviewer extends Error {}
export class ItemAlreadySet extends Error {}
export class ItemAlreadyAssociated extends Error {}

export type Project = string & { readonly __brand: "Project" };
export type Invitation = string & { readonly __brand: "Invitation" };
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

interface ProjectDocument<User, Item> {
  _id: Project;
  name: string;
  owner: User;
  members: User[];
  reviewers: User[];
  item?: Item;
}

interface InvitationDocument<User> {
  _id: Invitation;
  project: Project;
  invitee: User;
  status: InvitationStatus;
}

/**
 * Manages participation, permissions, and shared item
 * associations within projects.
 */
export class CollaboratingConcept<
  User extends string,
  Item extends string
> {
  private readonly projects: Collection<ProjectDocument<User, Item>>;
  private readonly invitations: Collection<InvitationDocument<User>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Collaborating") {
    const prefix = name.toLowerCase();

    this.projects = database.collection(`${prefix}.projects`);
    this.invitations = database.collection(`${prefix}.invitations`);
  }

  /** Ensure unique item associations and pending invitations. */
  #ready() {
    this.indexes ??= Promise.all([
      this.projects.createIndex(
        { item: 1 },
        {
          unique: true,
          partialFilterExpression: {
            item: { $exists: true },
          },
        },
      ),
      this.invitations.createIndex(
        { project: 1, invitee: 1 },
        {
          unique: true,
          partialFilterExpression: {
            status: "PENDING",
          },
        },
      ),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });

    return this.indexes;
  }

  async createProject({
    owner,
    name,
  }: {
    owner: User;
    name: string;
  }) {
    const project = crypto.randomUUID() as Project;

    await this.projects.insertOne({
      _id: project,
      name,
      owner,
      members: [owner],
      reviewers: [owner],
    });

    return { project };
  }

  async setItem({
    project,
    item,
  }: {
    project: Project;
    item: Item;
  }) {
    await this.#ready();

    const found = await this.projects.findOne({ _id: project });

    if (!found) {
      throw new ProjectNotFound("There is no such project.");
    }

    if (found.item !== undefined) {
      throw new ItemAlreadySet(
        "This project already has an associated item.",
      );
    }

    try {
      const result = await this.projects.updateOne(
        {
          _id: project,
          item: { $exists: false },
        },
        {
          $set: { item },
        },
      );

      if (result.modifiedCount === 0) {
        throw new ItemAlreadySet(
          "This project already has an associated item.",
        );
      }
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        throw new ItemAlreadyAssociated(
          "This item is already associated with another project.",
        );
      }

      throw error;
    }

    return {};
  }

  async invite({
    project,
    inviter,
    invitee,
  }: {
    project: Project;
    inviter: User;
    invitee: User;
  }) {
    const found = await this.projects.findOne({ _id: project });

    if (!found) {
      throw new ProjectNotFound("There is no such project.");
    }

    if (found.owner !== inviter) {
      throw new NotOwner(
        "Only the project owner can invite users.",
      );
    }

    if (found.members.includes(invitee)) {
      throw new AlreadyMember(
        "This user is already a member.",
      );
    }

    await this.#ready();

    const invitation = crypto.randomUUID() as Invitation;

    try {
      await this.invitations.insertOne({
        _id: invitation,
        project,
        invitee,
        status: "PENDING",
      });
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        throw new AlreadyInvited(
          "This user already has a pending invitation.",
        );
      }

      throw error;
    }

    return { invitation };
  }

  async acceptInvitation({
    invitation,
    user,
  }: {
    invitation: Invitation;
    user: User;
  }) {
    const found = await this.invitations.findOne({
      _id: invitation,
    });

    if (!found) {
      throw new InvitationNotFound(
        "There is no such invitation.",
      );
    }

    if (found.status !== "PENDING") {
      throw new InvitationNotPending(
        "This invitation is no longer pending.",
      );
    }

    if (found.invitee !== user) {
      throw new NotInvitee(
        "Only the invited user can accept this invitation.",
      );
    }

    const result = await this.invitations.updateOne(
      {
        _id: invitation,
        status: "PENDING",
      },
      {
        $set: { status: "ACCEPTED" },
      },
    );

    if (result.modifiedCount === 0) {
      throw new InvitationNotPending(
        "This invitation is no longer pending.",
      );
    }

    await this.projects.updateOne(
      { _id: found.project },
      { $addToSet: { members: user } } as never,
    );

    return {};
  }

  async declineInvitation({
    invitation,
    user,
  }: {
    invitation: Invitation;
    user: User;
  }) {
    const found = await this.invitations.findOne({
      _id: invitation,
    });

    if (!found) {
      throw new InvitationNotFound(
        "There is no such invitation.",
      );
    }

    if (found.status !== "PENDING") {
      throw new InvitationNotPending(
        "This invitation is no longer pending.",
      );
    }

    if (found.invitee !== user) {
      throw new NotInvitee(
        "Only the invited user can decline this invitation.",
      );
    }

    const result = await this.invitations.updateOne(
      {
        _id: invitation,
        status: "PENDING",
      },
      {
        $set: { status: "DECLINED" },
      },
    );

    if (result.modifiedCount === 0) {
      throw new InvitationNotPending(
        "This invitation is no longer pending.",
      );
    }

    return {};
  }

  async removeMember({
    project,
    owner,
    member,
  }: {
    project: Project;
    owner: User;
    member: User;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    if (!found) {
      throw new ProjectNotFound(
        "There is no such project.",
      );
    }

    if (found.owner !== owner) {
      throw new NotOwner(
        "Only the project owner can remove members.",
      );
    }

    if (!found.members.includes(member)) {
      throw new NotMember(
        "This user is not a member.",
      );
    }

    if (found.owner === member) {
      throw new CannotRemoveOwner(
        "The project owner cannot be removed.",
      );
    }

    await this.projects.updateOne(
      { _id: project, owner },
      {
        $pull: {
          members: member,
          reviewers: member,
        },
      } as never,
    );

    return {};
  }

  async grantReviewer({
    project,
    owner,
    member,
  }: {
    project: Project;
    owner: User;
    member: User;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    if (!found) {
      throw new ProjectNotFound(
        "There is no such project.",
      );
    }

    if (found.owner !== owner) {
      throw new NotOwner(
        "Only the project owner can grant reviewer permissions.",
      );
    }

    if (!found.members.includes(member)) {
      throw new NotMember(
        "Only project members can become reviewers.",
      );
    }

    if (found.reviewers.includes(member)) {
      throw new AlreadyReviewer(
        "This member is already a reviewer.",
      );
    }

    await this.projects.updateOne(
      {
        _id: project,
        owner,
        members: member,
      },
      {
        $addToSet: { reviewers: member },
      } as never,
    );

    return {};
  }

  async revokeReviewer({
    project,
    owner,
    member,
  }: {
    project: Project;
    owner: User;
    member: User;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    if (!found) {
      throw new ProjectNotFound(
        "There is no such project.",
      );
    }

    if (found.owner !== owner) {
      throw new NotOwner(
        "Only the project owner can revoke reviewer permissions.",
      );
    }

    if (found.owner === member) {
      throw new CannotRevokeOwner(
        "The project owner's reviewer permissions cannot be revoked.",
      );
    }

    if (!found.reviewers.includes(member)) {
      throw new NotReviewer(
        "This user is not a reviewer.",
      );
    }

    await this.projects.updateOne(
      { _id: project, owner },
      {
        $pull: { reviewers: member },
      } as never,
    );

    return {};
  }

  async _project({
    project,
  }: {
    project: Project;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    return found === null
      ? []
      : [{
          name: found.name,
          owner: found.owner,
        }];
  }

  async _members({
    project,
  }: {
    project: Project;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    return (found?.members ?? []).map((user) => ({
      user,
    }));
  }

  async _reviewers({
    project,
  }: {
    project: Project;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    return (found?.reviewers ?? []).map((user) => ({
      user,
    }));
  }

  async _invitation({
    invitation,
  }: {
    invitation: Invitation;
  }) {
    const found = await this.invitations.findOne({
      _id: invitation,
    });

    return found === null
      ? []
      : [{
          project: found.project,
          invitee: found.invitee,
          status: found.status,
        }];
  }

  async _pendingInvitations({
    user,
  }: {
    user: User;
  }) {
    const found = await this.invitations
      .find({
        invitee: user,
        status: "PENDING",
      })
      .toArray();

    return found.map(({ _id, project }) => ({
      invitation: _id,
      project,
    }));
  }

  async _canReview({
  project,
  user,
}: {
  project: Project;
  user: User;
}) {
  const found = await this.projects.findOne({ _id: project });

  return {
    allowed: found?.reviewers.includes(user) ?? false,
  };
}

 async _canView({
  project,
  user,
}: {
  project: Project;
  user: User;
}) {
  const found = await this.projects.findOne({ _id: project });

  return {
    allowed: found?.members.includes(user) ?? false,
  };
}
  async _getItem({
    project,
  }: {
    project: Project;
  }) {
    const found = await this.projects.findOne({
      _id: project,
    });

    return found?.item === undefined
      ? []
      : [{ item: found.item }];
  }

  async _getProjectByItem({
    item,
  }: {
    item: Item;
  }) {
    const found = await this.projects.findOne({
      item,
    });

    return found === null
      ? []
      : [{ project: found._id }];
  }
}
