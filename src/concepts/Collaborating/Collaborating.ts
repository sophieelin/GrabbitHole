
import { type Collection, type Db } from "mongodb";

export type Project = string & { readonly __brand: "Project" };

interface ProjectDocument<User> {
  _id: Project;
  name: string;
  owner: User;
  members: User[];
  reviewers: User[];
}

/**
 * Manages participation and permissions within shared projects.
 */
export class CollaboratingConcept<User extends string> {
  private readonly projects: Collection<ProjectDocument<User>>;

  constructor(database: Db, name = "Collaborating") {
    this.projects = database.collection(
      `${name.toLowerCase()}.projects`
    );
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

  async _project({ project }: { project: Project }) {
    const found = await this.projects.findOne({ _id: project });

    return found === null
      ? []
      : [{ name: found.name, owner: found.owner }];
  }

  async _members({ project }: { project: Project }) {
    const found = await this.projects.findOne({ _id: project });

    return (found?.members ?? []).map((user) => ({ user }));
  }

  async _reviewers({ project }: { project: Project }) {
    const found = await this.projects.findOne({ _id: project });

    return (found?.reviewers ?? []).map((user) => ({ user }));
  }
}
