import { titleOf } from "../graph/labels.ts";
import type { ResearchGraph } from "../graph/types.ts";

/** One sentence saying what a proposal would change, from the change Contributing stores as JSON. */
export function describeChange(change: string, graph: ResearchGraph): string {
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(change) as Record<string, string>;
  } catch {
    return "A change to the graph";
  }
  const source = (id: string | undefined) => {
    const found = graph.sources.find((row) => row.source === id);
    return found ? titleOf(found.url) : "a source no longer in the graph";
  };
  const connection = (id: string | undefined) => {
    const found = graph.connections.find((row) => row.connection === id);
    return found ? `${source(found.source)} → ${source(found.destination)}` : "a link no longer in the graph";
  };
  const note = (id: string | undefined) => {
    const all = [...graph.sources, ...graph.connections].flatMap((row) => row.notes);
    const found = all.find((row) => row.note === id);
    return found ? `“${found.text}”` : "a note no longer in the graph";
  };
  switch (parsed.operation) {
    case "MERGE_GRAPH":
      return "Add a recorded browsing session";
    case "ADD_SOURCE_NOTE":
      return `Add a note to ${source(parsed.source)}: “${parsed.text}”`;
    case "ADD_CONNECTION_NOTE":
      return `Add a note to the link ${connection(parsed.connection)}: “${parsed.text}”`;
    case "EDIT_NOTE":
      return `Change the note ${note(parsed.note)} to “${parsed.text}”`;
    case "REMOVE_NOTE":
      return `Remove the note ${note(parsed.note)}`;
    case "REMOVE_SOURCE":
      return `Remove the source ${source(parsed.source)}`;
    case "ADD_CONNECTION":
      return `Add a link ${source(parsed.source)} → ${source(parsed.destination)}`;
    case "REMOVE_CONNECTION":
      return `Remove the link ${connection(parsed.connection)}`;
    default:
      return "A change to the graph";
  }
}
