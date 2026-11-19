
import { describe, expect, test } from "bun:test";
import {
  CollaboratingConcept,
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
});
