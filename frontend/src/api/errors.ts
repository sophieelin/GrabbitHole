/**
 * The sentence to show for each HTTP category, by endpoint outside `/auth`. Each refusal is mapped
 * to its category in `src/host/http.ts`. Add a line here for each endpoint you write.
 */
const reviewersOnly = "Only a reviewer of this project can accept or reject proposals.";
const membersOnly = "Only members of this project can propose changes to it.";

const ownerOnly = "Only the project's owner can do that.";

const groupErrors = {
  INVALID_REQUEST: "A group needs a name.",
  CONFLICT: "A group with that name already exists.",
  NOT_FOUND: "That group no longer exists.",
  FORBIDDEN: "Only members of this project can change its groups.",
};

const messages: Record<string, Record<string, string>> = {
  "/projects/groups/create": groupErrors,
  "/projects/groups/rename": groupErrors,
  "/projects/groups/remove": groupErrors,
  "/projects/groups/assign": { ...groupErrors, NOT_FOUND: "That group or source no longer exists." },
  "/projects/groups/unassign": { ...groupErrors, CONFLICT: "That source isn't in a group." },
  "/projects/invite": {
    NOT_FOUND: "Nobody has that username.",
    CONFLICT: "That person is already a member or already invited.",
    FORBIDDEN: "Only the project's owner can invite people.",
    INVALID_REQUEST: "Type a username first.",
  },
  "/invitations/accept": { NOT_FOUND: "That invitation is no longer open." },
  "/invitations/decline": { NOT_FOUND: "That invitation is no longer open." },
  "/projects/reviewers/grant": { FORBIDDEN: ownerOnly, CONFLICT: "That member already reviews." },
  "/projects/reviewers/revoke": { FORBIDDEN: ownerOnly, CONFLICT: "The owner always reviews." },
  "/projects/members/remove": { FORBIDDEN: ownerOnly, CONFLICT: "The owner can't be removed." },
  "/projects/create": { INVALID_REQUEST: "A project needs a name." },
  "/projects/graph": {
    FORBIDDEN: "Only members of this project can see its research graph.",
    NOT_FOUND: "That project doesn't exist.",
  },
  "/projects/contributions/submit-source-note": { FORBIDDEN: membersOnly, INVALID_REQUEST: "Write a note first." },
  "/projects/contributions/submit-source-removal": { FORBIDDEN: membersOnly },
  "/projects/contributions/submit-note-removal": { FORBIDDEN: membersOnly },
  "/projects/contributions/accept": { FORBIDDEN: reviewersOnly, INVALID_REQUEST: "That proposal was already decided." },
  "/projects/contributions/reject": { FORBIDDEN: reviewersOnly, INVALID_REQUEST: "That proposal was already decided." },
};

/** The sentence to show when the endpoint at `path` returns `error`. */
export function messageFor(path: string, error: string): string {
  const fallback = error === "NOT_FOUND" ? "That isn't available." : "Something went wrong. Try again.";
  return messages[path]?.[error] ?? fallback;
}
