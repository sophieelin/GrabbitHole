
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Contributing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Graph } from "../DiscoveryLinking/DiscoveryLinking.ts";
import {
  ContributingConcept,
  ProposalNotFound,
  ProposalNotPending,
  NotProposer,
} from "./Contributing.ts";

class Contributing extends ContributingConcept<User, Graph, string> {}

export const contributing = registerConcept({
  class: Contributing,
  spec,
  floors: {
    mongo: ({ database }: { database: Db }, name: string) =>
      new Contributing(database, name),
  },
  refusals: {
  PROPOSAL_NOT_FOUND: ProposalNotFound,
  PROPOSAL_NOT_PENDING: ProposalNotPending,
  NOT_PROPOSER: NotProposer,
},
});
