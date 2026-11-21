
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
          Collaborating._canView({ project, user }).is({ allowed: true }),
          Collaborating._getItem({ project }).is({ item: target }),
          DiscoveryLinking._graph({ graph: other }).is({}),
          compute(
            computations.makeMergeGraphChange,
            { other },
            change,
          ),
        )
          .then(
            Contributing.propose({ user, target, change }).responds({
              proposal,
            }),
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
  ({ session, proposal, user, target, change, project, other }) =>
    receive({ session, proposal })
      .then(SignIn.use({ session }).responds({ subject: user }))
      .then(
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
            computations.parseMergeGraphChange,
            { change },
            other,
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
  Accept,
  Reject,
};
