import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Sessioning, DiscoveryLinking, SignIn } = concepts;

/** createSessionGraph and associateSessionGraph: each new session gets its own empty preliminary graph. */
const CreateSessionGraph = reaction(({ session, graph }) =>
  when(Sessioning.startSession({}).responds({ session }))
    .then(DiscoveryLinking.createGraph({ name: "Research Session" }).responds({ graph }))
    .then(Sessioning.setItem({ session, item: graph })),
);

/** recordSessionSource, for the visited URL: add it to the session's graph unless it is already there. */
const RecordSessionSource = reaction(({ session, url, graph, user }) =>
  when(Sessioning.recordVisit({ session, url }).responds({}))
    .where(
      Sessioning._getItem({ session }).is({ item: graph }),
      Sessioning._session({ session }).is({ user }),
      no(DiscoveryLinking._sourceByUrl({ graph, url })),
    )
    .then(DiscoveryLinking.addSource({ graph, url, contributor: user })),
);

/**
 * recordSessionSource, for the page the link was followed from. It applies only when Sessioning
 * recorded a connection from it, so a sourceUrl equal to url is never added twice.
 */
const RecordSessionOrigin = reaction(({ session, url, sourceUrl, graph, user }) =>
  when(Sessioning.recordVisit({ session, url, sourceUrl }).responds({}))
    .where(
      Sessioning._connections({ session }).is({ source: sourceUrl, destination: url }),
      Sessioning._getItem({ session }).is({ item: graph }),
      Sessioning._session({ session }).is({ user }),
      no(DiscoveryLinking._sourceByUrl({ graph, url: sourceUrl })),
    )
    .then(DiscoveryLinking.addSource({ graph, url: sourceUrl, contributor: user })),
);

/**
 * recordSessionConnection: once both sources are in the graph, add the connection Sessioning
 * recorded, unless the graph already has it. It waits for the flow to settle because the two
 * source reactions above run in no particular order.
 */
const RecordSessionConnection = reaction(({ session, url, sourceUrl, graph, user, source, destination }) =>
  when(Sessioning.recordVisit({ session, url, sourceUrl }).responds({}))
    .afterFlowSettles()
    .where(
      Sessioning._connections({ session }).is({ source: sourceUrl, destination: url }),
      Sessioning._getItem({ session }).is({ item: graph }),
      Sessioning._session({ session }).is({ user }),
      DiscoveryLinking._sourceByUrl({ graph, url: sourceUrl }).is({ source }),
      DiscoveryLinking._sourceByUrl({ graph, url }).is({ source: destination }),
      no(DiscoveryLinking._connections({ graph }).is({ source, destination })),
    )
    .then(DiscoveryLinking.addConnection({ graph, source, destination, contributor: user })),
);

/**
 * The signed-in user starts a browsing session. It answers only once the session's graph is
 * associated, so a visit the extension records right after cannot arrive before the graph exists.
 * The browsing session is named `browsingSession` because `session` is the sign-in cookie.
 */
const StartSession = endpoint(
  "/sessions/start",
  ({ session, user, browsingSession }) =>
    receive({ session })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(Sessioning.startSession({ user }).responds({ session: browsingSession }))
      .afterFlowSettles()
      .then(
        where(Sessioning._getItem({ session: browsingSession }).is({}))
          .then(respond({ browsingSession }))
          .named("ready"),

        where(no(Sessioning._getItem({ session: browsingSession })))
          .then(respond({ error: "SESSION_GRAPH_NOT_FOUND" }))
          .named("noGraph"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  recording: { CreateSessionGraph, RecordSessionSource, RecordSessionOrigin, RecordSessionConnection },
  browsing: { StartSession },
};
