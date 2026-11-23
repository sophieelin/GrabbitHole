import { ModelFailure, type Reasoner } from "./suggester.ts";

/**
 * A reasoner that asks Claude through Anthropic's Messages API. The key comes from the
 * ANTHROPIC_API_KEY setting on the server and is never sent to the browser or written to a log.
 */
export function claudeReasoner({ apiKey, model, send = fetch }: { apiKey: string; model: string; send?: typeof fetch }): Reasoner {
  return async ({ system, prompt }) => {
    let response: Response;
    try {
      response = await send("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2026-10-21" },
        body: JSON.stringify({ model, max_tokens: 2048, system, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new ModelFailure(timedOut ? "Claude took too long to answer. Try again." : "Claude couldn't be reached. Try again.");
    }
    if (!response.ok) throw new ModelFailure(reasonFor(response.status));
    const body = (await response.json().catch(() => null)) as { content?: { type?: string; text?: string }[] } | null;
    const text = (body?.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("");
    if (text === "") throw new ModelFailure("Claude gave no answer. Try again.");
    return text;
  };
}

/** The sentence to show for a refused request. It names the cause without repeating anything the API sent back. */
function reasonFor(status: number): string {
  if (status === 401 || status === 403) return "Claude didn't accept this server's API key.";
  if (status === 404) return "This server asks for a Claude model that isn't available to its API key.";
  if (status === 429) return "Claude is busy or this server's API key is out of credit. Try again in a minute.";
  if (status === 529 || status >= 500) return "Claude is overloaded right now. Try again in a minute.";
  return "Claude couldn't answer this request.";
}
