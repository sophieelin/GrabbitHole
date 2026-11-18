import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/DiscoveryLinking.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import {
  ConnectionExists,
  ConnectionNotFound,
  ConnectionNotInGraph,
  DiscoveryLinkingConcept,
  GraphNotFound,
  NoteNotFound,
  SameGraph,
  SourceExists,
  SourceNotFound,
  SourceNotInGraph,
} from "./DiscoveryLinking.ts";

class DiscoveryLinking extends DiscoveryLinkingConcept<User> {}

export const discoveryLinking = registerConcept({
  class: DiscoveryLinking,
  spec,
  refusals: {
    GRAPH_NOT_FOUND: GraphNotFound,
    SOURCE_EXISTS: SourceExists,
    SOURCE_NOT_FOUND: SourceNotFound,
    SOURCE_NOT_IN_GRAPH: SourceNotInGraph,
    CONNECTION_EXISTS: ConnectionExists,
    CONNECTION_NOT_FOUND: ConnectionNotFound,
    CONNECTION_NOT_IN_GRAPH: ConnectionNotInGraph,
    NOTE_NOT_FOUND: NoteNotFound,
    SAME_GRAPH: SameGraph,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new DiscoveryLinking(database, name) },
});
