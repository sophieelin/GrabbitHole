import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Collaborating, DiscoveryLinking, Registering, SignIn } = concepts;

/**
 * Each new project gets its own main research graph, named after the project, and the project is
 * associated with it. The second step needs the graph the first one returns, so they are chained.
 */
const CreateProjectGraph = reaction(({ project, name, graph }) =>
  when(Collaborating.createProject({ name }).responds({ project }))
    .then(DiscoveryLinking.createGraph({ name }).responds({ graph }))
    .then(Collaborating.setItem({ project, item: graph })),
);

/**
 * Everything the frontend needs to draw a graph: its sources with their URLs, its directed
 * connections between those sources, and the notes and contributors on each. People are given by
 * user and username. Each nested list has its own variable names so that no two lists are joined.
 */
const ResearchGraph = former(
  "the research graph (graph)",
  (
    { graph },
    {
      name,
      source,
      url,
      sourceContributor,
      sourceContributorName,
      sourceNote,
      sourceNoteAuthor,
      sourceNoteAuthorName,
      sourceNoteText,
      connection,
      from,
      to,
      connectionContributor,
      connectionContributorName,
      connectionNote,
      connectionNoteAuthor,
      connectionNoteAuthorName,
      connectionNoteText,
    },
  ) =>
    where(DiscoveryLinking._graph({ graph }).is({ name })).form({
      graph,
      name,
      sources: each(DiscoveryLinking._sources({ graph }).is({ source, url })).form({
        source,
        url,
        contributors: each(
          DiscoveryLinking._sourceContributors({ source }).is({ contributor: sourceContributor }),
        )
          .where(Registering._username({ user: sourceContributor }).is({ username: sourceContributorName }))
          .form({ user: sourceContributor, username: sourceContributorName }),
        notes: each(
          DiscoveryLinking._sourceNotes({ source }).is({
            note: sourceNote,
            author: sourceNoteAuthor,
            text: sourceNoteText,
          }),
        )
          .where(Registering._username({ user: sourceNoteAuthor }).is({ username: sourceNoteAuthorName }))
          .form({ note: sourceNote, author: sourceNoteAuthor, authorName: sourceNoteAuthorName, text: sourceNoteText }),
      }),
      connections: each(
        DiscoveryLinking._connections({ graph }).is({ connection, source: from, destination: to }),
      ).form({
        connection,
        source: from,
        destination: to,
        contributors: each(
          DiscoveryLinking._connectionContributors({ connection }).is({ contributor: connectionContributor }),
        )
          .where(Registering._username({ user: connectionContributor }).is({ username: connectionContributorName }))
          .form({ user: connectionContributor, username: connectionContributorName }),
        notes: each(
          DiscoveryLinking._connectionNotes({ connection }).is({
            note: connectionNote,
            author: connectionNoteAuthor,
            text: connectionNoteText,
          }),
        )
          .where(Registering._username({ user: connectionNoteAuthor }).is({ username: connectionNoteAuthorName }))
          .form({
            note: connectionNote,
            author: connectionNoteAuthor,
            authorName: connectionNoteAuthorName,
            text: connectionNoteText,
          }),
      }),
    }),
);

/**
 * A project member reads the project's main graph. The caller names the project, never a graph,
 * so this endpoint can only ever return a graph that Collaborating associates with a project the
 * signed-in user belongs to.
 */
const GetProjectGraph = endpoint(
  "/projects/graph",
  ({ session, project, user, graph }) =>
    receive({ session, project })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: graph }),
        )
          .then(respond({ graph: ResearchGraph({ graph }) }))
          .named("member"),

        where(
          Collaborating._project({ project }).is({}),
          Collaborating._canView({ project, user }).is({ allowed: false }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),

        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          no(Collaborating._getItem({ project })),
        )
          .then(respond({ error: "PROJECT_GRAPH_NOT_FOUND" }))
          .named("noGraph"),
      ),
  { validators: { input: textInput } },
);

export const composition = { CreateProjectGraph, GetProjectGraph };
