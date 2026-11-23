import { useSession } from "../reusable/session.ts";
import { messageFor } from "./errors.ts";

/**
 * Waits for an endpoint call and returns its output, or `{ failed }` with the sentence to show.
 * `path` picks the sentence. UNAUTHORIZED means the session ended, so the sign-in screen is shown.
 */
export async function call<T extends object>(path: string, request: Promise<T>): Promise<Exclude<T, { error: unknown }> | { failed: string }> {
  const result = await request;
  if (!("error" in result)) return result as Exclude<T, { error: unknown }>;
  const code = typeof result.error === "string" ? result.error : "";
  if (code === "UNAUTHORIZED") useSession().sessionEnded();
  return { failed: messageFor(path, code) };
}
