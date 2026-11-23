import type { GroupId, SourceId } from "../graph/types.ts";
import { useSession } from "../reusable/session.ts";

/** One group Claude suggests: sources to add to an existing group (`group` is set) or to a new one. */
export interface Suggestion {
  name: string;
  group: GroupId | null;
  sources: { source: SourceId; url: string }[];
}

const SENTENCES: Record<string, string> = {
  UNAVAILABLE: "Group suggestions aren't set up on this server yet.",
  FORBIDDEN: "Only members of this project can ask for suggestions.",
  NOT_FOUND: "That project doesn't exist.",
};

/** Whether this server can suggest groups. It can when it was started with an API key for Claude. */
export async function canSuggestGroups(): Promise<boolean> {
  try {
    const response = await fetch("/api/capabilities");
    return response.ok && ((await response.json()) as { suggestGroups?: boolean }).suggestGroups === true;
  } catch {
    return false;
  }
}

/** Asks Claude to sort the project's ungrouped sources. Nothing changes until the suggestions are applied. */
export async function suggestGroups(project: string): Promise<{ suggestions: Suggestion[] } | { failed: string }> {
  let body: { suggestions?: Suggestion[]; error?: string; message?: string };
  try {
    const response = await fetch("/api/projects/groups/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    body = (await response.json()) as typeof body;
  } catch {
    return { failed: "The server couldn't be reached. Try again." };
  }
  if (body.suggestions) return { suggestions: body.suggestions };
  if (body.error === "UNAUTHORIZED") useSession().sessionEnded();
  if (body.error === "MODEL_FAILED" && body.message) return { failed: body.message };
  return { failed: SENTENCES[body.error ?? ""] ?? "Something went wrong. Try again." };
}
