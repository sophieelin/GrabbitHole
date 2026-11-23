import { describe, expect, test } from "bun:test";
import type { Graph, Source } from "../../src/concepts/DiscoveryLinking/DiscoveryLinking.ts";
import {
  EmptyName,
  type Group,
  GroupNotFound,
  GroupingConcept,
  NameTaken,
  NotGrouped,
} from "../../src/concepts/Grouping/Grouping.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

const graph = "roman-concrete" as Graph;
const otherGraph = "aqueducts" as Graph;
const [article, paper, museum] = ["article", "paper", "museum"] as Source[];

async function setup() {
  return { grouping: new GroupingConcept<Source, Graph>(await testDatabase()) };
}

describe("Grouping", () => {
  test("its principle: sources go into topic groups, move between them, and are left ungrouped when a group is removed", async () => {
    const { grouping } = await setup();
    const { group: chemistry } = await grouping.createGroup({ scope: graph, name: "Chemistry" });
    const { group: buildings } = await grouping.createGroup({ scope: graph, name: "Buildings" });

    await grouping.assign({ group: chemistry, item: article });
    await grouping.assign({ group: chemistry, item: paper });
    await grouping.assign({ group: buildings, item: museum });
    expect(await grouping._groups({ scope: graph })).toEqual([
      { group: chemistry, name: "Chemistry" },
      { group: buildings, name: "Buildings" },
    ]);
    expect(await grouping._items({ group: chemistry })).toEqual([{ item: article }, { item: paper }]);

    // Putting a source in another group moves it.
    await grouping.assign({ group: buildings, item: paper });
    expect(await grouping._items({ group: chemistry })).toEqual([{ item: article }]);
    expect(await grouping._items({ group: buildings })).toEqual([{ item: museum }, { item: paper }]);
    expect(await grouping._groupOf({ item: paper })).toEqual([{ group: buildings }]);

    await grouping.renameGroup({ group: chemistry, name: "Materials" });
    expect(await grouping._group({ group: chemistry })).toEqual([{ scope: graph, name: "Materials" }]);

    await grouping.unassign({ item: article });
    expect(await grouping._groupOf({ item: article })).toEqual([]);

    await grouping.removeGroup({ group: buildings });
    expect(await grouping._groups({ scope: graph })).toEqual([{ group: chemistry, name: "Materials" }]);
    expect(await grouping._groupOf({ item: museum })).toEqual([]);
    expect(await grouping._items({ group: buildings })).toEqual([]);
  });

  test("a group needs a name that no other group in its scope has", async () => {
    const { grouping } = await setup();
    const { group } = await grouping.createGroup({ scope: graph, name: "  Chemistry " });
    expect(await grouping._group({ group })).toEqual([{ scope: graph, name: "Chemistry" }]);

    await expect(grouping.createGroup({ scope: graph, name: "   " })).rejects.toBeInstanceOf(EmptyName);
    await expect(grouping.createGroup({ scope: graph, name: "Chemistry" })).rejects.toBeInstanceOf(NameTaken);
    // The same name is fine in another scope.
    await grouping.createGroup({ scope: otherGraph, name: "Chemistry" });

    const { group: buildings } = await grouping.createGroup({ scope: graph, name: "Buildings" });
    await expect(grouping.renameGroup({ group: buildings, name: "Chemistry" })).rejects.toBeInstanceOf(NameTaken);
    await expect(grouping.renameGroup({ group: buildings, name: "" })).rejects.toBeInstanceOf(EmptyName);
    // Renaming a group to its own name changes nothing and is allowed.
    await grouping.renameGroup({ group: buildings, name: "Buildings" });
    expect(await grouping._group({ group: buildings })).toEqual([{ scope: graph, name: "Buildings" }]);
  });

  test("an unknown group is refused", async () => {
    const { grouping } = await setup();
    const missing = "missing" as Group;
    await expect(grouping.renameGroup({ group: missing, name: "Chemistry" })).rejects.toBeInstanceOf(GroupNotFound);
    await expect(grouping.removeGroup({ group: missing })).rejects.toBeInstanceOf(GroupNotFound);
    await expect(grouping.assign({ group: missing, item: article })).rejects.toBeInstanceOf(GroupNotFound);
    expect(await grouping._group({ group: missing })).toEqual([]);
    expect(await grouping._groupOf({ item: article })).toEqual([]);
  });

  test("assigning an item to the group it is already in changes nothing", async () => {
    const { grouping } = await setup();
    const { group } = await grouping.createGroup({ scope: graph, name: "Chemistry" });
    await grouping.assign({ group, item: article });
    await grouping.assign({ group, item: paper });
    await grouping.assign({ group, item: article });
    expect(await grouping._items({ group })).toEqual([{ item: article }, { item: paper }]);
  });

  test("an item in no group cannot be taken out of one", async () => {
    const { grouping } = await setup();
    await expect(grouping.unassign({ item: article })).rejects.toBeInstanceOf(NotGrouped);
  });

  test("when two groups are created with the same name at once, only one is created", async () => {
    const { grouping } = await setup();
    await expectOneWinner(
      [0, 1, 2].map(() => grouping.createGroup({ scope: graph, name: "Chemistry" })),
      NameTaken,
    );
    expect(await grouping._groups({ scope: graph })).toHaveLength(1);
  });

  test("an item assigned to two groups at once ends up in exactly one", async () => {
    const { grouping } = await setup();
    const { group: chemistry } = await grouping.createGroup({ scope: graph, name: "Chemistry" });
    const { group: buildings } = await grouping.createGroup({ scope: graph, name: "Buildings" });
    await Promise.all([grouping.assign({ group: chemistry, item: article }), grouping.assign({ group: buildings, item: article })]);
    const inBoth = [...(await grouping._items({ group: chemistry })), ...(await grouping._items({ group: buildings }))];
    expect(inBoth).toEqual([{ item: article }]);
  });
});
