import { describe, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as projectGraphs } from "../../src/compositions/project-graphs.ts";
import { applicationConceptSet } from "../../src/concepts.ts";
import { CollaboratingConcept } from "../../src/concepts/Collaborating/Collaborating.ts";
import type { Graph } from "../../src/concepts/DiscoveryLinking/DiscoveryLinking.ts";
import type { User } from "../../src/concepts/Registering/Registering.ts";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

describe("Project graphs", () => {
  test("Marcus creates Roman Concrete, and it gets an empty main graph with the same name", async () => {
    const { application, database, register } = await startGrabbitHole();
    const { Collaborating, DiscoveryLinking } = application.concepts;
    const marcus = await register("marcus");

    const { project } = ok(await Collaborating.createProject({ owner: marcus.user, name: "Roman Concrete" }));

    expect(await database.collection("discoverylinking.graphs").countDocuments()).toBe(1);
    const items = await Collaborating._getItem({ project });
    expect(items).toHaveLength(1);
    const graph = items[0]!.item;
    expect(await DiscoveryLinking._graph({ graph })).toEqual([{ name: "Roman Concrete" }]);
    expect(await DiscoveryLinking._sources({ graph })).toEqual([]);
    expect(await DiscoveryLinking._connections({ graph })).toEqual([]);
    expect(await Collaborating._getProjectByItem({ item: graph })).toEqual([{ project }]);
  });

  test("two projects, even with the same name, get different graphs", async () => {
    const { application, register } = await startGrabbitHole();
    const { Collaborating } = application.concepts;
    const marcus = await register("marcus");
    const lena = await register("lena");

    const graphOf = async (owner: User, name: string) => {
      const { project } = ok(await Collaborating.createProject({ owner, name }));
      const [row] = await Collaborating._getItem({ project });
      return row!.item;
    };
    const first = await graphOf(marcus.user, "Roman Concrete");
    const second = await graphOf(lena.user, "Roman Concrete");
    const third = await graphOf(lena.user, "Cement Manufacturing");

    expect(new Set([first, second, third]).size).toBe(3);
  });

  test("when createProject fails, no graph is created or associated", async () => {
    // createProject has no refusal branch, so the only way it can fail to return is a fault.
    class FailingCollaborating extends CollaboratingConcept<User, Graph> {
      override async createProject(): Promise<never> {
        throw new Error("the database is unavailable");
      }
    }
    const database = await testDatabase();
    const application = assemble({
      conceptSet: applicationConceptSet,
      instances: {
        ...applicationConceptSet.implementations("mongo", { database }),
        Collaborating: new FailingCollaborating(database, "Collaborating"),
      },
      composition: { projectGraphs },
    });

    await expect(
      application.concepts.Collaborating.createProject({ owner: "marcus" as User, name: "Roman Concrete" }),
    ).rejects.toThrow();
    await application.whenIdle();

    expect(await database.collection("discoverylinking.graphs").countDocuments()).toBe(0);
  });
});
