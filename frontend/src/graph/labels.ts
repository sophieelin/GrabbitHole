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

/**
 * A short name for a source, to fit inside a pill on the graph. A search is named by its words in
 * quotes. A page whose address ends in an id rather than words (a DOI, an article number) is named
 * by its site, since the id says nothing to a reader.
 */
export function shortName(url: string, limit = 28): string {
  const { site, page } = labelOf(url);
  let name = page;
  if (name.startsWith("Search: ")) name = `“${name.slice(8)}”`;
  else {
    // Drop a trailing number left over from the address, such as a date stamp.
    name = name.replace(/\s+\d+$/, "");
    const looksLikeAnId = !name.includes(" ") && /\d{3,}/.test(name);
    if (name === "" || looksLikeAnId) name = site;
    else name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name.length > limit ? `${name.slice(0, limit - 1).trimEnd()}…` : name;
}

/** One line naming a source, for lists and headings: its name, then its site when the name is not the site already. */
export function titleOf(url: string): string {
  const { site } = labelOf(url);
  const name = shortName(url, 60);
  return name === site ? site : `${name} · ${site}`;
}

/** A source as the graph holds it. `title` is the page's own title, once sources carry one. */
export interface NamedSource {
  url: string;
  title?: string | null;
}

/**
 * The name to show for a source: its page title when it has one, otherwise the name `shortName`
 * makes from its URL. Nothing records page titles yet, so for now this is always the URL's name.
 */
export function sourceName(source: NamedSource, limit = 60): string {
  const title = source.title?.trim();
  if (!title) return shortName(source.url, limit);
  return title.length > limit ? `${title.slice(0, limit - 1).trimEnd()}…` : title;
}
