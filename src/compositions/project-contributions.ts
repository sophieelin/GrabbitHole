
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, where } from "@mit-sdg/sync-engine/language";
import { concepts, computations } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { SignIn, Collaborating, DiscoveryLinking, Contributing } = concepts;

// Submit a preliminary graph for review.
const SubmitGraph = endpoint(
  "/projects/contributions/submit",
  ({ session, project, other, user, target, change, proposal }) =>
    receive({ session, project, other })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._graph({ graph: other }).is({}),
          compute(
            computations.makeMergeGraphChange,
            { other },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);

// Submit a proposed edit to an existing note.
const SubmitNoteEdit = endpoint(
  "/projects/contributions/submit-note-edit",
  ({ session, project, note, text, user, target, change, proposal }) =>
    receive({ session, project, note, text })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._note({ note }).is({
            graph: target,
          }),
          compute(
            computations.makeEditNoteChange,
            { note, text },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);


const SubmitSourceNote = endpoint(
  "/projects/contributions/submit-source-note",
  ({ session, project, source, text, user, target, change, proposal }) =>
    receive({ session, project, source, text })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._source({ source }).is({
            graph: target,
          }),
          compute(
            computations.makeAddSourceNoteChange,
            { source, text, author: user },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);


const SubmitSourceRemoval = endpoint(
  "/projects/contributions/submit-source-removal",
  ({ session, project, source, user, target, change, proposal }) =>
    receive({ session, project, source })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._source({ source }).is({
            graph: target,
          }),
          compute(
            computations.makeRemoveSourceChange,
            { source },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);


const SubmitConnection = endpoint(
  "/projects/contributions/submit-connection",
  ({
    session, project, source, destination, user,
    target, change, proposal,
  }) =>
    receive({ session, project, source, destination })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._source({ source }).is({
            graph: target,
          }),
          DiscoveryLinking._source({ source: destination }).is({
            graph: target,
          }),
          compute(
            computations.makeAddConnectionChange,
            { source, destination, contributor: user },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);


const SubmitConnectionRemoval = endpoint(
  "/projects/contributions/submit-connection-removal",
  ({ session, project, connection, user, target, change, proposal }) =>
    receive({ session, project, connection })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._connection({ connection }).is({
            graph: target,
          }),
          compute(
            computations.makeRemoveConnectionChange,
            { connection },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);


const SubmitConnectionNote = endpoint(
  "/projects/contributions/submit-connection-note",
  ({ session, project, connection, text, user, target, change, proposal }) =>
    receive({ session, project, connection, text })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._connection({ connection }).is({
            graph: target,
          }),
          compute(
            computations.makeAddConnectionNoteChange,
            { connection, text, author: user },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);


const SubmitNoteRemoval = endpoint(
  "/projects/contributions/submit-note-removal",
  ({ session, project, note, user, target, change, proposal }) =>
    receive({ session, project, note })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        where(
          Collaborating._canView({ project, user }).is({
            allowed: true,
          }),
          Collaborating._getItem({ project }).is({
            item: target,
          }),
          DiscoveryLinking._note({ note }).is({
            graph: target,
          }),
          compute(
            computations.makeRemoveNoteChange,
            { note },
            change,
          ),
        )
          .then(
            Contributing.propose({
              user,
              target,
              change,
            }).responds({ proposal }),
          )
          .then(respond({ proposal }))
          .named("allowed"),

        where(
          Collaborating._canView({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),
      ),
  { validators: { input: textInput } },
);



// Accept a pending contribution.
const Accept = endpoint(
  "/projects/contributions/accept",
  ({ session, proposal, user, target, change, project, other, note, text, source, destination, contributor, connection, author }) =>
    receive({ session, proposal })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        // Approve MERGE_GRAPH.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "MERGE_GRAPH",
              other,
            },
          ),
          DiscoveryLinking._graph({ graph: other }).is({}),
        )
          .then(
            DiscoveryLinking.mergeGraph({
              target,
              other,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approved"),

        // Approve EDIT_NOTE.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "EDIT_NOTE",
              note,
              text,
            },
          ),
          DiscoveryLinking._note({ note }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.editNote({
              note,
              text,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedNoteEdit"),

        
        // Approve REMOVE_SOURCE.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "REMOVE_SOURCE",
              source,
            },
          ),
          DiscoveryLinking._source({ source }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.removeSource({
              graph: target,
              source,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedSourceRemoval"),


        // Approve ADD_CONNECTION.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "ADD_CONNECTION",
              source,
              destination,
              contributor,
            },
          ),
          DiscoveryLinking._source({ source }).is({
            graph: target,
          }),
          DiscoveryLinking._source({
            source: destination,
          }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.addConnection({
                graph: target,
                source,
                destination,
                contributor,
            }).responds({}),
            )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedConnection"),

        
        // Approve REMOVE_CONNECTION.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "REMOVE_CONNECTION",
              connection,
            },
          ),
          DiscoveryLinking._connection({ connection }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.removeConnection({
              graph: target,
              connection,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedConnectionRemoval"),

        
        // Approve ADD_SOURCE_NOTE.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "ADD_SOURCE_NOTE",
              source,
              text,
              author,
            },
          ),
          DiscoveryLinking._source({ source }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.addNoteToSource({
              source,
              author,
              text,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedSourceNote"),

          
        
        // Approve ADD_CONNECTION_NOTE.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "ADD_CONNECTION_NOTE",
              connection,
              text,
              author,
            },
          ),
          DiscoveryLinking._connection({ connection }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.addNoteToConnection({
              connection,
              author,
              text,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedConnectionNote"),


        // Approve REMOVE_NOTE.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            change,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
          compute(
            computations.decodeChange,
            { change },
            {
              operation: "REMOVE_NOTE",
              note,
            },
          ),
          DiscoveryLinking._note({ note }).is({
            graph: target,
          }),
        )
          .then(
            DiscoveryLinking.removeNote({
              note,
            }).responds({}),
          )
          .then(
            Contributing.accept({
              proposal,
              reviewer: user,
            }).responds({}),
          )
          .then(respond({}))
          .named("approvedNoteRemoval"),


        // Unauthorized reviewer.
        where(
          Contributing._proposal({ proposal }).is({ target }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),

        // Already accepted.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            status: "ACCEPTED",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
        )
          .then(respond({ error: "PROPOSAL_NOT_PENDING" }))
          .named("alreadyAccepted"),

        // Already rejected.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            status: "REJECTED",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
        )
          .then(respond({ error: "PROPOSAL_NOT_PENDING" }))
          .named("alreadyRejected"),
      ),
  { validators: { input: textInput } },
);

// Reject a pending contribution.
const Reject = endpoint(
  "/projects/contributions/reject",
  ({ session, proposal, reason, user, target, project }) =>
    receive({ session, proposal, reason })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
        // Authorized rejection.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            status: "PENDING",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
        )
          .then(
            Contributing.reject({
              proposal,
              reviewer: user,
              reason,
            }).responds({}),
          )
          .then(respond({}))
          .named("rejected"),

        // Unauthorized reviewer.
        where(
          Contributing._proposal({ proposal }).is({ target }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: false,
          }),
        )
          .then(respond({ error: "FORBIDDEN" }))
          .named("denied"),

        // Already rejected.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            status: "REJECTED",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
        )
          .then(respond({ error: "PROPOSAL_NOT_PENDING" }))
          .named("alreadyRejected"),

        // Already accepted.
        where(
          Contributing._proposal({ proposal }).is({
            target,
            status: "ACCEPTED",
          }),
          Collaborating._getProjectByItem({
            item: target,
          }).is({ project }),
          Collaborating._canReview({ project, user }).is({
            allowed: true,
          }),
        )
          .then(respond({ error: "PROPOSAL_NOT_PENDING" }))
          .named("alreadyAccepted"),
      ),
  { validators: { input: textInput } },
);



export const composition = {
  SubmitGraph,
  SubmitNoteEdit,
  SubmitSourceRemoval,
  SubmitConnection,
    SubmitConnectionRemoval,
    SubmitSourceNote,
    SubmitConnectionNote,
    SubmitNoteRemoval,
  Accept,
  Reject,
};