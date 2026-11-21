import { reaction, when } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Collaborating, DiscoveryLinking } = concepts;

/**
 * Each new project gets its own main research graph, named after the project, and the project is
 * associated with it. The second step needs the graph the first one returns, so they are chained.
 */
const CreateProjectGraph = reaction(({ project, name, graph }) =>
  when(Collaborating.createProject({ name }).responds({ project }))
    .then(DiscoveryLinking.createGraph({ name }).responds({ graph }))
    .then(Collaborating.setItem({ project, item: graph })),
);

export const composition = { CreateProjectGraph };
