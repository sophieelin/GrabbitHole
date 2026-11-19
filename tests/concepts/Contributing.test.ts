
import { describe, expect, test } from "bun:test";
import {
  ContributingConcept,
  NotProposer,
  ProposalNotPending,
  type Proposal,
} from "../../src/concepts/Contributing/Contributing.ts";
import type { User } from "../../src/concepts/Registering/Registering.ts";
import type { Graph } from "../../src/concepts/DiscoveryLinking/DiscoveryLinking.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

const maya = "maya" as User;
const sam = "sam" as User;

async function setup() {
  return {
    contributing: new ContributingConcept<User, Graph, string>(
      await testDatabase()
    ),
  };
}

describe("Contributing", () => {
  test("propose creates a pending graph contribution", async () => {
    const { contributing } = await setup();

    const target = "main-graph" as Graph;
    const change = JSON.stringify({
      operation: "MERGE_GRAPH",
      other: "preliminary-graph",
    });

    const { proposal } = await contributing.propose({
      user: maya,
      target,
      change,
    });

    expect(await contributing._proposal({ proposal })).toEqual([
      {
        proposer: maya,
        target,
        change,
        status: "PENDING",
        reviewer: "",
        reason: "",
      },
    ]);

    expect(await contributing._pending({ target })).toEqual([
      { proposal, proposer: maya, change },
    ]);
  });

  test("multiple proposals targeting one graph remain distinct", async () => {
    const { contributing } = await setup();
    const target = "main-graph" as Graph;

    const first = await contributing.propose({
      user: maya,
      target,
      change: "first change",
    });

    const second = await contributing.propose({
      user: sam,
      target,
      change: "second change",
    });

    expect(first.proposal).not.toBe(second.proposal);
    expect(await contributing._pending({ target })).toHaveLength(2);
  });

  test("queries return no rows for unknown proposals or targets", async () => {
    const { contributing } = await setup();

    expect(
      await contributing._proposal({
        proposal: "missing" as Proposal,
      })
    ).toEqual([]);

    expect(
      await contributing._pending({
        target: "missing" as Graph,
      })
    ).toEqual([]);
  });

  test("proposals persist across concept instances", async () => {
    const database = await testDatabase();
    const first = new ContributingConcept<User, Graph, string>(database);

    const target = "main-graph" as Graph;
    const change = JSON.stringify({
      operation: "MERGE_GRAPH",
      other: "preliminary-graph",
    });

    const { proposal } = await first.propose({
      user: maya,
      target,
      change,
    });

    const second = new ContributingConcept<User, Graph, string>(database);

    expect(await second._proposal({ proposal })).toEqual([
      {
        proposer: maya,
        target,
        change,
        status: "PENDING",
        reviewer: "",
        reason: "",
      },
    ]);
  });



test("accepting a proposal records its reviewer", async () => {
  const { contributing } = await setup();
  const target = "main-graph" as Graph;

  const { proposal } = await contributing.propose({
    user: maya,
    target,
    change: "merge graph",
  });

  expect(await contributing.accept({ proposal, reviewer: sam }))
    .toEqual({});

  expect(await contributing._proposal({ proposal })).toEqual([{
    proposer: maya,
    target,
    change: "merge graph",
    status: "ACCEPTED",
    reviewer: sam,
    reason: "",
  }]);

  expect(await contributing._pending({ target })).toEqual([]);
});

test("rejecting a proposal records its reason", async () => {
  const { contributing } = await setup();
  const target = "main-graph" as Graph;

  const { proposal } = await contributing.propose({
    user: maya,
    target,
    change: "remove connection",
  });

  await contributing.reject({
    proposal,
    reviewer: sam,
    reason: "The connection is supported by the evidence.",
  });

  expect(await contributing._proposal({ proposal })).toEqual([{
    proposer: maya,
    target,
    change: "remove connection",
    status: "REJECTED",
    reviewer: sam,
    reason: "The connection is supported by the evidence.",
  }]);

  expect(await contributing._pending({ target })).toEqual([]);
});

test("a proposer can withdraw a pending proposal", async () => {
  const { contributing } = await setup();
  const target = "main-graph" as Graph;

  const { proposal } = await contributing.propose({
    user: maya,
    target,
    change: "edit note",
  });

  await contributing.withdraw({ proposal, user: maya });

  expect((await contributing._proposal({ proposal }))[0]?.status)
    .toBe("WITHDRAWN");

  expect(await contributing._pending({ target })).toEqual([]);
});

test("another user cannot withdraw a proposal", async () => {
  const { contributing } = await setup();

  const { proposal } = await contributing.propose({
    user: maya,
    target: "main-graph" as Graph,
    change: "edit note",
  });

  await expect(
    contributing.withdraw({ proposal, user: sam }),
  ).rejects.toThrow(NotProposer);

  expect((await contributing._proposal({ proposal }))[0]?.status)
    .toBe("PENDING");
});

test("a decided proposal cannot be decided again", async () => {
  const { contributing } = await setup();

  const { proposal } = await contributing.propose({
    user: maya,
    target: "main-graph" as Graph,
    change: "merge graph",
  });

  await contributing.accept({ proposal, reviewer: sam });

  await expect(
    contributing.accept({ proposal, reviewer: sam }),
  ).rejects.toThrow(ProposalNotPending);

  await expect(
    contributing.reject({
      proposal,
      reviewer: sam,
      reason: "Too late",
    }),
  ).rejects.toThrow(ProposalNotPending);

  await expect(
    contributing.withdraw({ proposal, user: maya }),
  ).rejects.toThrow(ProposalNotPending);
});

test("simultaneous decisions allow only one winner", async () => {
  const { contributing } = await setup();

  const { proposal } = await contributing.propose({
    user: maya,
    target: "main-graph" as Graph,
    change: "merge graph",
  });

  const results = await Promise.allSettled([
    contributing.accept({ proposal, reviewer: sam }),
    contributing.reject({
      proposal,
      reviewer: maya,
      reason: "Rejected",
    }),
  ]);

  expect(results.filter((result) => result.status === "fulfilled"))
    .toHaveLength(1);

  const rejected = results.filter(
    (result) => result.status === "rejected",
  ) as PromiseRejectedResult[];

  expect(rejected).toHaveLength(1);
  expect(rejected[0]!.reason).toBeInstanceOf(ProposalNotPending);

  const [stored] = await contributing._proposal({ proposal });
  expect(["ACCEPTED", "REJECTED"]).toContain(stored?.status);
});

});
