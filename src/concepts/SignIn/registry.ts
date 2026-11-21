import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/SignIn.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import { NotSignedIn, SignInConcept } from "./SignIn.ts";

class SignIn extends SignInConcept<User> {}

export const signIn = registerConcept({
  class: SignIn,
  spec,
  refusals: { NOT_SIGNED_IN: NotSignedIn },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new SignIn(database, name) },
});
