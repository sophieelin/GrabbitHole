import { ModelFailure, type Reasoner, suggestGroups } from "../agents/suggester.ts";

/** Where the suggestion route lives. It is outside the generated API because it changes nothing: it only reads and asks a model. */
export const SUGGEST_PATH = "/api/projects/groups/suggest";
export const CAPABILITIES_PATH = "/api/capabilities";

type Graph = { sources: { source: string; url: string }[] };
type Groups = { group: string; name: string; sources: { source: string }[] }[];

const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Answers a member's request for suggested groups. It reads the project's graph and groups by
 * calling the ordinary endpoints with the caller's own request headers, so signing in, the
 * same-site check, and project membership are enforced exactly as they are for the website. It
 * then asks the model about the sources that are in no group and returns what it suggests.
 */
export async function handleSuggest(request: Request, api: (request: Request) => Promise<Response>, reasoner: Reasoner | undefined) {
  if (request.method !== "POST") return json({ error: "INVALID_REQUEST" }, 405);
  const input = (await request.json().catch(() => null)) as { project?: unknown } | null;
  if (typeof input?.project !== "string" || input.project === "") return json({ error: "INVALID_REQUEST" }, 400);

  const read = async (path: string) => {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    const response = await api(new Request(new URL(path, request.url), { method: "POST", headers, body: JSON.stringify({ project: input.project }) }));
    return { status: response.status, body: (await response.json().catch(() => null)) as Record<string, unknown> | null };
  };
  const graph = await read("/api/projects/graph");
  if (graph.status !== 200 || graph.body === null || "error" in graph.body) return json(graph.body ?? { error: "INTERNAL_ERROR" }, graph.status === 200 ? 500 : graph.status);
  const groups = await read("/api/projects/groups");
  if (groups.status !== 200 || groups.body === null || "error" in groups.body) return json(groups.body ?? { error: "INTERNAL_ERROR" }, groups.status === 200 ? 500 : groups.status);
  if (reasoner === undefined) return json({ error: "UNAVAILABLE" }, 503);

  const existing = groups.body.groups as Groups;
  const grouped = new Set(existing.flatMap(({ sources }) => sources.map(({ source }) => source)));
  const ungrouped = (graph.body.graph as Graph).sources.filter(({ source }) => !grouped.has(source)).map(({ source, url }) => ({ source, url }));
  try {
    const suggestions = await suggestGroups(reasoner, ungrouped, existing.map(({ group, name }) => ({ group, name })));
    return json({ suggestions });
  } catch (error) {
    if (error instanceof ModelFailure) return json({ error: "MODEL_FAILED", message: error.message }, 502);
    console.error("Suggesting groups failed.", error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
}

/** Tells the website which optional features this server has, so it can hide the ones it lacks. */
export function handleCapabilities(reasoner: Reasoner | undefined) {
  return json({ suggestGroups: reasoner !== undefined });
}
