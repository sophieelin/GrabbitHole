import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Collaborating, DiscoveryLinking, Grouping, SignIn } = concepts;

/** The topic groups of a graph, in the order they were made, each with the sources in it. */
const GroupsOf = former("the groups of (graph)", ({ graph }, { group, name, source }) =>
  each(Grouping._groups({ scope: graph }).is({ group, name })).form({
    group,
    name,
    sources: each(Grouping._items({ group }).is({ item: source })).form({ source }),
  }),
);

/** A source removed from its graph leaves its group, so no group lists a source that is gone. */
const UngroupRemovedSource = reaction(({ source }) =>
  when(DiscoveryLinking.removeSource({ source }).responds({}))
    .where(Grouping._groupOf({ item: source }).is({}))
    .then(Grouping.unassign({ item: source })),
);

/** A member reads the topic groups of the project's graph. */
const ListGroups = endpoint(
  "/projects/groups",
  ({ session, project, user, graph }) =>
    receive({ session, project })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: graph }),
        )
          .then(respond({ groups: GroupsOf({ graph }) }))
          .named("member"),

        where(Collaborating._project({ project }).is({}), Collaborating._canView({ project, user }).is({ allowed: false }))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** A member makes a topic group in the project's graph. */
const CreateGroup = endpoint(
  "/projects/groups/create",
  ({ session, project, name, user, graph, group }) =>
    receive({ session, project, name })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: graph }),
        )
          .then(Grouping.createGroup({ scope: graph, name }).responds({ group }))
          .then(respond({ group }))
          .named("member"),

        where(Collaborating._project({ project }).is({}), Collaborating._canView({ project, user }).is({ allowed: false }))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

/** A member of the project a group belongs to renames it. */
const RenameGroup = endpoint(
  "/projects/groups/rename",
  ({ session, group, name, user, graph, project }) =>
    receive({ session, group, name })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: true }),
        )
          .then(Grouping.renameGroup({ group, name }).responds({}))
          .then(respond({}))
          .named("member"),

        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: false }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(Grouping._group({ group }).is({ scope: graph }), no(Collaborating._getProjectByItem({ item: graph })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notAProjectGraph"),

        where(no(Grouping._group({ group })))
          .then(respond({ error: "GROUP_NOT_FOUND" }))
          .named("unknownGroup"),
      ),
  { validators: { input: textInput } },
);

/** A member of the project a group belongs to removes it; its sources become ungrouped. */
const RemoveGroup = endpoint(
  "/projects/groups/remove",
  ({ session, group, user, graph, project }) =>
    receive({ session, group })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: true }),
        )
          .then(Grouping.removeGroup({ group }).responds({}))
          .then(respond({}))
          .named("member"),

        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: false }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(Grouping._group({ group }).is({ scope: graph }), no(Collaborating._getProjectByItem({ item: graph })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notAProjectGraph"),

        where(no(Grouping._group({ group })))
          .then(respond({ error: "GROUP_NOT_FOUND" }))
          .named("unknownGroup"),
      ),
  { validators: { input: textInput } },
);

/** A member puts a source of the project's graph in one of that graph's groups, moving it if it was in another. */
const AssignSource = endpoint(
  "/projects/groups/assign",
  ({ session, group, source, user, graph, project }) =>
    receive({ session, group, source })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: true }),
          DiscoveryLinking._source({ source }).is({ graph }),
        )
          .then(Grouping.assign({ group, item: source }).responds({}))
          .then(respond({}))
          .named("member"),

        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: true }),
          no(DiscoveryLinking._source({ source }).is({ graph })),
        )
          .then(respond({ error: "SOURCE_NOT_IN_GRAPH" }))
          .named("sourceElsewhere"),

        where(
          Grouping._group({ group }).is({ scope: graph }),
          Collaborating._getProjectByItem({ item: graph }).is({ project }),
          Collaborating._canView({ project, user }).is({ allowed: false }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(Grouping._group({ group }).is({ scope: graph }), no(Collaborating._getProjectByItem({ item: graph })))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notAProjectGraph"),

        where(no(Grouping._group({ group })))
          .then(respond({ error: "GROUP_NOT_FOUND" }))
          .named("unknownGroup"),
      ),
  { validators: { input: textInput } },
);

/** A member takes a source of the project's graph out of its group. */
const UnassignSource = endpoint(
  "/projects/groups/unassign",
  ({ session, project, source, user, graph }) =>
    receive({ session, project, source })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: graph }),
          DiscoveryLinking._source({ source }).is({ graph }),
        )
          .then(Grouping.unassign({ item: source }).responds({}))
          .then(respond({}))
          .named("member"),

        where(
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: graph }),
          no(DiscoveryLinking._source({ source }).is({ graph })),
        )
          .then(respond({ error: "SOURCE_NOT_IN_GRAPH" }))
          .named("sourceElsewhere"),

        where(Collaborating._project({ project }).is({}), Collaborating._canView({ project, user }).is({ allowed: false }))
          .then(respond({ error: "FORBIDDEN" }))
          .named("notMember"),

        where(no(Collaborating._project({ project })))
          .then(respond({ error: "PROJECT_NOT_FOUND" }))
          .named("unknownProject"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  UngroupRemovedSource,
  ListGroups,
  CreateGroup,
  RenameGroup,
  RemoveGroup,
  AssignSource,
  UnassignSource,
};
