import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Collaborating.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Graph } from "../DiscoveryLinking/DiscoveryLinking.ts";

import {
  CollaboratingConcept,
  ProjectNotFound,
  NotOwner,
  AlreadyMember,
  AlreadyInvited,
  InvitationNotFound,
  InvitationNotPending,
  NotInvitee,
  CannotRemoveOwner,
  NotMember,
  AlreadyReviewer,
  NotReviewer,
  CannotRevokeOwner,
  ItemAlreadyAssociated,
  ItemAlreadySet,
} from "./Collaborating.ts";

class Collaborating extends CollaboratingConcept<User, Graph> {}

export const collaborating = registerConcept({
  class: Collaborating,
  spec,
  refusals: {
    PROJECT_NOT_FOUND: ProjectNotFound,
    NOT_OWNER: NotOwner,
    ALREADY_MEMBER: AlreadyMember,
    ALREADY_INVITED: AlreadyInvited,
    INVITATION_NOT_FOUND: InvitationNotFound,
    INVITATION_NOT_PENDING: InvitationNotPending,
    NOT_INVITEE: NotInvitee,
    NOT_MEMBER: NotMember,
    CANNOT_REMOVE_OWNER: CannotRemoveOwner,
    ALREADY_REVIEWER: AlreadyReviewer,
    CANNOT_REVOKE_OWNER: CannotRevokeOwner,
    NOT_REVIEWER: NotReviewer,
    ITEM_ALREADY_SET: ItemAlreadySet,
    ITEM_ALREADY_ASSOCIATED: ItemAlreadyAssociated,
  },
  floors: {
    mongo: ({ database }: { database: Db }, name: string) =>
      new Collaborating(database, name),
  },
});
