import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Collaborating, SignIn } = concepts;

/**
 * The signed-in user creates a project, so the extension can propose a session to it. It answers
 * only once the project's main graph is associated, so the project can take a proposal right away.
 */
const CreateProject = endpoint(
  "/projects/create",
  ({ session, user, name, project }) =>
    receive({ session, name })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(Collaborating.createProject({ owner: user, name }).responds({ project }))
      .afterFlowSettles()
      .then(
        where(Collaborating._getItem({ project }).is({}))
          .then(respond({ project }))
          .named("ready"),

        where(no(Collaborating._getItem({ project })))
          .then(respond({ error: "PROJECT_GRAPH_NOT_FOUND" }))
          .named("noGraph"),
      ),
  { validators: { input: textInput } },
);

/** The projects the user is a member of, by name. */
const ProjectsOf = former("the projects of (user)", ({ user }, { project, name }) =>
  each(Collaborating._projectsOf({ user }).is({ project, name })).form({ project, name }),
);

/** The signed-in user lists the projects they are a member of. */
const ListMyProjects = endpoint(
  "/projects/mine",
  ({ session, user }) =>
    receive({ session })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(respond({ projects: ProjectsOf({ user }) })),
  { validators: { input: textInput } },
);

export const composition = { CreateProject, ListMyProjects };
