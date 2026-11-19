
import { type Collection, type Db } from "mongodb";

export type Proposal = string & { readonly __brand: "Proposal" };
export class ProposalNotFound extends Error {}
export class ProposalNotPending extends Error {}
export class NotProposer extends Error {}

export type ProposalStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

interface ProposalDocument<User, Item, Change> {
  _id: Proposal;
  proposer: User;
  target: Item;
  change: Change;
  status: ProposalStatus;
  reviewer?: User;
  reason?: string;
}

/** Manages proposals and their approval status independently of the work being changed. */
export class ContributingConcept<
  User extends string,
  Item extends string,
  Change extends string
> {
  private readonly proposals: Collection<ProposalDocument<User, Item, Change>>;

  constructor(database: Db, name = "Contributing") {
    this.proposals = database.collection(
      `${name.toLowerCase()}.proposals`
    );
  }

  async propose({
    user,
    target,
    change,
  }: {
    user: User;
    target: Item;
    change: Change;
  }) {
    const proposal = crypto.randomUUID() as Proposal;

    await this.proposals.insertOne({
      _id: proposal,
      proposer: user,
      target,
      change,
      status: "PENDING",
    });

    return { proposal };
  }


async accept({
  proposal,
  reviewer,
}: {
  proposal: Proposal;
  reviewer: User;
}) {
  const result = await this.proposals.updateOne(
    { _id: proposal, status: "PENDING" },
    {
      $set: {
        status: "ACCEPTED",
        reviewer,
      },
    },
  );

  if (result.modifiedCount === 0) {
    const found = await this.proposals.findOne({ _id: proposal });

    if (!found) {
      throw new ProposalNotFound("There is no such proposal.");
    }

    throw new ProposalNotPending("This proposal is no longer pending.");
  }

  return {};
}

async reject({
  proposal,
  reviewer,
  reason,
}: {
  proposal: Proposal;
  reviewer: User;
  reason: string;
}) {
  const result = await this.proposals.updateOne(
    { _id: proposal, status: "PENDING" },
    {
      $set: {
        status: "REJECTED",
        reviewer,
        reason,
      },
    },
  );

  if (result.modifiedCount === 0) {
    const found = await this.proposals.findOne({ _id: proposal });

    if (!found) {
      throw new ProposalNotFound("There is no such proposal.");
    }

    throw new ProposalNotPending("This proposal is no longer pending.");
  }

  return {};
}

async withdraw({
  proposal,
  user,
}: {
  proposal: Proposal;
  user: User;
}) {
  const found = await this.proposals.findOne({ _id: proposal });

  if (!found) {
    throw new ProposalNotFound("There is no such proposal.");
  }

  if (found.status !== "PENDING") {
    throw new ProposalNotPending("This proposal is no longer pending.");
  }

  if (found.proposer !== user) {
    throw new NotProposer("Only the proposer can withdraw this proposal.");
  }

  const result = await this.proposals.updateOne(
    {
      _id: proposal,
      status: "PENDING",
      proposer: user,
    },
    { $set: { status: "WITHDRAWN" } },
  );

  if (result.modifiedCount === 0) {
    throw new ProposalNotPending("This proposal is no longer pending.");
  }

  return {};
}


  
async _proposal({ proposal }: { proposal: Proposal }) {
  const found = await this.proposals.findOne({ _id: proposal });

  return found === null
    ? []
    : [{
        proposer: found.proposer,
        target: found.target,
        change: found.change,
        status: found.status,
        reviewer: found.reviewer ?? "",
        reason: found.reason ?? "",
      }];
}


  async _pending({ target }: { target: Item }) {
    const found = await this.proposals
      .find({ target, status: "PENDING" })
      .toArray();

    return found.map(({ _id, proposer, change }) => ({
      proposal: _id,
      proposer,
      change,
    }));
  }
}
