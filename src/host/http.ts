import { httpPolicy, type HttpPolicy } from "@mit-sdg/sync-engine-http/policy";
import { accountsHttp } from "../compositions/reusable/accounts.ts";
import { passwordsHttp } from "../compositions/reusable/passwords.ts";

/**
 * The HTTP category the server returns for each refusal from the compositions in `src/compositions/`.
 * A refusal missing here reaches the browser as INTERNAL_ERROR (500), so each new refusal that an
 * endpoint can return needs a line. The browser receives only the category; the sentence for each
 * one is in `frontend/src/api/errors.ts`, or, for signing in, in the sign-in component.
 *
 * Example: `PROJECT_NOT_FOUND: "NOT_FOUND",`
 */
const publicErrors = {} as const;

/**
 * The HTTP settings: the API under /api, each refusal returned as an HTTP category, and the
 * session in an HttpOnly cookie that signing in sets and signing out clears.
 */
export function grabbitHolePolicy(publicOrigin: string): HttpPolicy {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    publicErrors: {
      ...accountsHttp.publicErrors,
      ...passwordsHttp.publicErrors,
      ...publicErrors,
    },
    cookies: {
      session: accountsHttp.sessionCookie("grabbithole-session", [...passwordsHttp.startingSessions]),
    },
  });
}
