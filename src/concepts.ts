import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { discoveryLinking } from "./concepts/DiscoveryLinking/registry.ts";
import { registering } from "./concepts/Registering/registry.ts";
import { signIn } from "./concepts/SignIn/registry.ts";
import { collaborating } from "./concepts/Collaborating/registry.ts";
import { contributing } from "./concepts/Contributing/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";

/**
 * Every concept in GrabbitHole. To add yours: write `design/concepts/<Name>.md` and
 * `src/concepts/<Name>/` with a `registry.ts`, add it here and to `design/types.md`,
 * then run `bun run generate` and `bun run check`.
 */
export const applicationConceptSet = conceptSet(
  {
    Registering: registering,
    Authenticating: authenticating,
    SignIn: signIn,
    DiscoveryLinking: discoveryLinking,
    Collaborating: collaborating,
    Contributing: contributing,
    Sessioning: sessioning,
  },
  {
    makeMergeGraphChange: ({ other }: { other: string }) =>
      JSON.stringify({
        operation: "MERGE_GRAPH",
        other,
      }),


parseMergeGraphChange: ({ change }: { change: string }): string => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(change);
  } catch {
    throw new Error("Invalid proposed change: malformed JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("operation" in parsed) ||
    parsed.operation !== "MERGE_GRAPH" ||
    !("other" in parsed) ||
    typeof parsed.other !== "string" ||
    parsed.other.length === 0
  ) {
    throw new Error("Invalid proposed change: expected MERGE_GRAPH.");
  }

  return parsed.other;
},

  },

  
);

export const { concepts, computations } = applicationConceptSet;
