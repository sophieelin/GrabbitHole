import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { discoveryLinking } from "./concepts/DiscoveryLinking/registry.ts";
import { registering } from "./concepts/Registering/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";
import { collaborating } from "./concepts/Collaborating/registry.ts";
import { contributing } from "./concepts/Contributing/registry.ts";

/**
 * Every concept in GrabbitHole. To add yours: write `design/concepts/<Name>.md` and
 * `src/concepts/<Name>/` with a `registry.ts`, add it here and to `design/types.md`,
 * then run `bun run generate` and `bun run check`.
 */
export const applicationConceptSet = conceptSet({
  Registering: registering,
  Authenticating: authenticating,
  Sessioning: sessioning,
  DiscoveryLinking: discoveryLinking,
  Collaborating: collaborating,
  Contributing: contributing,
});
export const { concepts } = applicationConceptSet;
