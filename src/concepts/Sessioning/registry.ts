import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Sessioning.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Graph } from "../DiscoveryLinking/DiscoveryLinking.ts";
import type { User } from "../Registering/Registering.ts";
import {
  ItemAlreadyAssociated,
  ItemAlreadySet,
  SessionNotActive,
  SessionNotFound,
  SessioningConcept,
} from "./Sessioning.ts";

class Sessioning extends SessioningConcept<User, Graph> {}

export const sessioning = registerConcept({
  class: Sessioning,
  spec,
  refusals: {
    SESSION_NOT_FOUND: SessionNotFound,
    SESSION_NOT_ACTIVE: SessionNotActive,
    ITEM_ALREADY_SET: ItemAlreadySet,
    ITEM_ALREADY_ASSOCIATED: ItemAlreadyAssociated,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Sessioning(database, name) },
});
