/**
 * The suggester: it asks a model to sort a project's ungrouped sources into topic groups.
 *
 * It only proposes. It reads the project through the same endpoints the website uses, and nothing
 * changes until a member accepts the suggestion and the website makes the groups through the
 * ordinary group endpoints.
 */

/** Asks a model one question and returns its answer as text. Throws `ModelFailure` when it cannot. */
export type Reasoner = (question: { system: string; prompt: string }) => Promise<string>;

/** The model could not answer. `message` is a sentence that can be shown to the user. */
export class ModelFailure extends Error {}

export interface SourceToGroup {
  source: string;
  url: string;
}
export interface ExistingGroup {
  group: string;
  name: string;
}
/** One suggested group: an existing group to add to (`group` is set) or a new one to make. */
export interface Suggestion {
  name: string;
  group: string | null;
  sources: SourceToGroup[];
}

const MOST_SOURCES = 150;
const LONGEST_NAME = 40;

const SYSTEM = [
  "You organize the web pages from a research session into topic groups.",
  "You are given the pages as numbered addresses, and the names of any groups the researchers already made.",
  "Put each page into the one group whose topic it best fits.",
  "Use an existing group when a page fits it, spelled exactly as given. Otherwise make a new group.",
  "Name a new group in one to three plain words, in title case, by the topic the pages share, not by the website they are on.",
  "Aim for two to six groups in total. Leave a page out if it fits no group, such as a search page or a home page.",
  'Answer with JSON only, in this form: {"groups":[{"name":"Group Name","pages":[1,2]}]}',
].join("\n");

/** The question for the model: the ungrouped pages, numbered, and the groups that exist. */
export function buildPrompt(sources: SourceToGroup[], groups: ExistingGroup[]): string {
  const pages = sources.map(({ url }, index) => `${index + 1}. ${url}`).join("\n");
  const existing = groups.length === 0 ? "None yet." : groups.map(({ name }) => `- ${name}`).join("\n");
  return `Pages to group:\n${pages}\n\nExisting groups:\n${existing}`;
}

/**
 * Turns the model's answer into suggestions, keeping only what is safe to act on: pages that were
 * asked about, each in one group, under a usable name. Throws `ModelFailure` if the answer is not
 * the JSON that was asked for.
 */
export function readAnswer(answer: string, sources: SourceToGroup[], groups: ExistingGroup[]): Suggestion[] {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    throw new ModelFailure("The model's answer couldn't be read. Try again.");
  }
  const listed = (parsed as { groups?: unknown }).groups;
  if (!Array.isArray(listed)) throw new ModelFailure("The model's answer couldn't be read. Try again.");

  const existing = new Map(groups.map((group) => [group.name.toLowerCase(), group]));
  const placed = new Set<number>();
  const byName = new Map<string, Suggestion>();
  for (const entry of listed as { name?: unknown; pages?: unknown }[]) {
    if (typeof entry?.name !== "string" || !Array.isArray(entry.pages)) continue;
    const typed = entry.name.trim().replace(/\s+/g, " ").slice(0, LONGEST_NAME).trim();
    if (typed === "") continue;
    const match = existing.get(typed.toLowerCase());
    const key = typed.toLowerCase();
    const suggestion = byName.get(key) ?? { name: match?.name ?? typed, group: match?.group ?? null, sources: [] };
    for (const page of entry.pages) {
      const index = typeof page === "number" ? page - 1 : Number.NaN;
      const source = Number.isInteger(index) ? sources[index] : undefined;
      if (source === undefined || placed.has(index)) continue;
      placed.add(index);
      suggestion.sources.push(source);
    }
    if (suggestion.sources.length > 0) byName.set(key, suggestion);
  }
  return [...byName.values()];
}

/** Suggests groups for the given ungrouped sources. With none to group, it suggests nothing and does not ask the model. */
export async function suggestGroups(reasoner: Reasoner, sources: SourceToGroup[], groups: ExistingGroup[]): Promise<Suggestion[]> {
  const asked = sources.slice(0, MOST_SOURCES);
  if (asked.length === 0) return [];
  const answer = await reasoner({ system: SYSTEM, prompt: buildPrompt(asked, groups) });
  return readAnswer(answer, asked, groups);
}
