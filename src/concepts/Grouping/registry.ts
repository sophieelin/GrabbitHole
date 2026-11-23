import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Grouping.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Graph, Source } from "../DiscoveryLinking/DiscoveryLinking.ts";
import { EmptyName, GroupNotFound, GroupingConcept, NameTaken, NotGrouped } from "./Grouping.ts";

class Grouping extends GroupingConcept<Source, Graph> {}

export const grouping = registerConcept({
  class: Grouping,
  spec,
  refusals: {
    GROUP_NOT_FOUND: GroupNotFound,
    EMPTY_NAME: EmptyName,
    NAME_TAKEN: NameTaken,
    NOT_GROUPED: NotGrouped,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Grouping(database, name) },
});
