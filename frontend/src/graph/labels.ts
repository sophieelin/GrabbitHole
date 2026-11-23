/**
 * A source is recorded as a URL only, so the graph and the side panel name it from the URL:
 * the site, and a readable form of the last part of the path.
 */
export interface SourceLabel {
  site: string;
  page: string;
}

export function labelOf(url: string): SourceLabel {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { site: url || "Unnamed source", page: "" };
  }
  const site = parsed.hostname.replace(/^www\./, "");
  const parts = parsed.pathname.split("/").filter((part) => part !== "");
  const last = parts.at(-1) ?? "";
  // A search page is named by what was searched for.
  const query = parsed.searchParams.get("q") ?? parsed.searchParams.get("query") ?? parsed.searchParams.get("search_query");
  if (query) return { site, page: `Search: ${query}` };
  let page = last;
  try {
    page = decodeURIComponent(last);
  } catch {
    // Keep the undecoded text when the path isn't valid percent-encoding.
  }
  page = page
    .replace(/\.(html?|php|aspx?|pdf)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return { site, page };
}

/** One line naming a source, for lists and headings. */
export function titleOf(url: string): string {
  const { site, page } = labelOf(url);
  return page === "" ? site : `${page} · ${site}`;
}
