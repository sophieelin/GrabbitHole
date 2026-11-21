import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Sessioning.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import { SessionNotActive, SessionNotFound, SessioningConcept } from "./Sessioning.ts";

class Sessioning extends SessioningConcept<User> {}

export const sessioning = registerConcept({
  class: Sessioning,
  spec,
  refusals: {
    SESSION_NOT_FOUND: SessionNotFound,
    SESSION_NOT_ACTIVE: SessionNotActive,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Sessioning(database, name) },
});
