import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { ResearchGraph } from "./project-graphs.ts";
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

/**
 * The session's owner records a visit. `sourceUrl` is the page the visit came from; for a page
 * with no page before it, the extension sends the page itself, which Sessioning records with no
 * connection. It answers once Sessioning has recorded the visit; copying it into the session's graph
 * finishes right after.
 */
const RecordVisit = endpoint(
  "/sessions/visit",
  ({ session, user, browsingSession, url, sourceUrl }) =>
    receive({ session, browsingSession, url, sourceUrl })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Sessioning._session({ session: browsingSession }).is({ user }))
          .then(Sessioning.recordVisit({ session: browsingSession, url, sourceUrl }).responds({}))
          .then(respond({}))
          .named("owner"),

        where(
          Sessioning._session({ session: browsingSession }).is({}),
          no(Sessioning._session({ session: browsingSession }).is({ user })),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Sessioning._session({ session: browsingSession })))
          .then(respond({ error: "SESSION_NOT_FOUND" }))
          .named("unknownSession"),
      ),
  { validators: { input: textInput } },
);

/** The session's owner stops it, so it records no more visits. */
const StopSession = endpoint(
  "/sessions/stop",
  ({ session, user, browsingSession }) =>
    receive({ session, browsingSession })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(Sessioning._session({ session: browsingSession }).is({ user }))
          .then(Sessioning.stopSession({ session: browsingSession }).responds({}))
          .then(respond({}))
          .named("owner"),

        where(
          Sessioning._session({ session: browsingSession }).is({}),
          no(Sessioning._session({ session: browsingSession }).is({ user })),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Sessioning._session({ session: browsingSession })))
          .then(respond({ error: "SESSION_NOT_FOUND" }))
          .named("unknownSession"),
      ),
  { validators: { input: textInput } },
);

/**
 * The session's owner reads the session's graph, in the same shape as a project's main graph. The
 * caller names the session, never a graph, so only the owner's own session graph can be read here.
 */
const GetSessionGraph = endpoint(
  "/sessions/graph",
  ({ session, user, browsingSession, graph }) =>
    receive({ session, browsingSession })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Sessioning._session({ session: browsingSession }).is({ user }),
          Sessioning._getItem({ session: browsingSession }).is({ item: graph }),
        )
          .then(respond({ graph: ResearchGraph({ graph }) }))
          .named("owner"),

        where(
          Sessioning._session({ session: browsingSession }).is({ user }),
          no(Sessioning._getItem({ session: browsingSession })),
        )
          .then(respond({ error: "SESSION_GRAPH_NOT_FOUND" }))
          .named("noGraph"),

        where(
          Sessioning._session({ session: browsingSession }).is({}),
          no(Sessioning._session({ session: browsingSession }).is({ user })),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("notOwner"),

        where(no(Sessioning._session({ session: browsingSession })))
          .then(respond({ error: "SESSION_NOT_FOUND" }))
          .named("unknownSession"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  recording: { CreateSessionGraph, RecordSessionSource, RecordSessionOrigin, RecordSessionConnection },
  browsing: { StartSession, RecordVisit, StopSession, GetSessionGraph },
};
