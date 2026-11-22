/**
 * The sentence to show for each HTTP category, by endpoint outside `/auth`. Each refusal is mapped
 * to its category in `src/host/http.ts`. Add a line here for each endpoint you write, for example:
 *   "/projects/create": { INVALID_REQUEST: "A project needs a name." },
 */
const messages: Record<string, Record<string, string>> = {
  "/projects/graph": {
    FORBIDDEN: "Only members of this project can see its research graph.",
    NOT_FOUND: "That project doesn't exist.",
  },
};

/** The sentence to show when the endpoint at `path` returns `error`. */
export function messageFor(path: string, error: string): string {
  const fallback = error === "NOT_FOUND" ? "That isn't available." : "Something went wrong. Try again.";
  return messages[path]?.[error] ?? fallback;
}
