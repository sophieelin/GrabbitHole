import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class GroupNotFound extends Error {}
export class EmptyName extends Error {}
export class NameTaken extends Error {}
export class NotGrouped extends Error {}

export type Group = string & { readonly __brand: "Group" };

const NO_GROUP = "There is no such group.";
const NEEDS_NAME = "A group needs a name.";
const TAKEN = "A group with this name already exists.";

/*
 * Storage layout. Each group is a document, and a unique index on scope and name enforces the rule
 * that no two groups in a scope share a name. Each membership is a document whose `_id` is the
 * item, so an item can never have two memberships, and putting an item in another group replaces
 * its one document. The ObjectId fields `made` and `placed` are used only to sort by time.
 */

interface GroupDocument<Scope> {
  _id: Group;
  scope: Scope;
  name: string;
  made: ObjectId;
}

interface MembershipDocument<Item> {
  _id: Item;
  group: Group;
  placed: ObjectId;
}

/** Organizes items into named groups so users can see which items belong together. */
export class GroupingConcept<Item extends string, Scope extends string> {
  private readonly groups: Collection<GroupDocument<Scope>>;
  private readonly memberships: Collection<MembershipDocument<Item>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Grouping") {
    const prefix = name.toLowerCase();
    this.groups = database.collection(`${prefix}.groups`);
    this.memberships = database.collection(`${prefix}.memberships`);
  }

  /** Creates the indexes once. If creating them fails, the next action tries again. */
  #ready() {
    this.indexes ??= Promise.all([
      this.groups.createIndex({ scope: 1, name: 1 }, { unique: true }),
      this.memberships.createIndex({ group: 1 }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async createGroup({ scope, name }: { scope: Scope; name: string }) {
    const trimmed = name.trim();
    if (trimmed === "") throw new EmptyName(NEEDS_NAME);
    await this.#ready();
    const group = crypto.randomUUID() as Group;
    try {
      await this.groups.insertOne({ _id: group, scope, name: trimmed, made: new ObjectId() });
    } catch (error) {
      if (isDuplicate(error)) throw new NameTaken(TAKEN);
      throw error;
    }
    return { group };
  }

  async renameGroup({ group, name }: { group: Group; name: string }) {
    const trimmed = name.trim();
    if ((await this.groups.findOne({ _id: group })) === null) throw new GroupNotFound(NO_GROUP);
    if (trimmed === "") throw new EmptyName(NEEDS_NAME);
    await this.#ready();
    let updated;
    try {
      updated = await this.groups.updateOne({ _id: group }, { $set: { name: trimmed } });
    } catch (error) {
      if (isDuplicate(error)) throw new NameTaken(TAKEN);
      throw error;
    }
    // The group was removed between the check and the update.
    if (updated.matchedCount === 0) throw new GroupNotFound(NO_GROUP);
    return {};
  }

  async removeGroup({ group }: { group: Group }) {
    const removed = await this.groups.deleteOne({ _id: group });
    if (removed.deletedCount === 0) throw new GroupNotFound(NO_GROUP);
    await this.memberships.deleteMany({ group });
    return {};
  }

  async assign({ group, item }: { group: Group; item: Item }) {
    if ((await this.groups.findOne({ _id: group })) === null) throw new GroupNotFound(NO_GROUP);
    await this.#ready();
    // One document per item: this moves the item if it was in another group. An item already in
    // this group matches nothing, so the upsert tries to insert it again and fails as a duplicate;
    // the same happens when another assign inserted the item first. The second try settles both:
    // it either moves the item here or finds it already here.
    for (const attempt of [1, 2]) {
      try {
        await this.memberships.updateOne(
          { _id: item, group: { $ne: group } } as never,
          { $set: { group, placed: new ObjectId() } },
          { upsert: true },
        );
        break;
      } catch (error) {
        if (!isDuplicate(error)) throw error;
        if (attempt === 2) break;
      }
    }
    // If the group was removed while the item was being placed, do not leave the item in it.
    if ((await this.groups.findOne({ _id: group })) === null) {
      await this.memberships.deleteOne({ _id: item, group } as never);
      throw new GroupNotFound(NO_GROUP);
    }
    return {};
  }

  async unassign({ item }: { item: Item }) {
    const removed = await this.memberships.deleteOne({ _id: item } as never);
    if (removed.deletedCount === 0) throw new NotGrouped("This item is not in a group.");
    return {};
  }

  async _group({ group }: { group: Group }) {
    const found = await this.groups.findOne({ _id: group });
    return found === null ? [] : [{ scope: found.scope, name: found.name }];
  }

  async _groups({ scope }: { scope: Scope }) {
    const found = await this.groups.find({ scope } as never).sort({ made: 1 }).toArray();
    return found.map(({ _id, name }) => ({ group: _id, name }));
  }

  async _items({ group }: { group: Group }) {
    const found = await this.memberships.find({ group } as never).sort({ placed: 1 }).toArray();
    return found.map(({ _id }) => ({ item: _id as Item }));
  }

  async _groupOf({ item }: { item: Item }) {
    const found = await this.memberships.findOne({ _id: item } as never);
    return found === null ? [] : [{ group: found.group }];
  }
}

function isDuplicate(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}
