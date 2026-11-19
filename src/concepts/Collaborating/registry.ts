
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Collaborating.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import { CollaboratingConcept } from "./Collaborating.ts";

class Collaborating extends CollaboratingConcept<User> {}

export const collaborating = registerConcept({
  class: Collaborating,
  spec,
  floors: {
    mongo: ({ database }: { database: Db }, name: string) =>
      new Collaborating(database, name),
  },
});