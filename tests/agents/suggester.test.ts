import { describe, expect, test } from "bun:test";
import { claudeReasoner } from "../../src/agents/claude.ts";
import { buildPrompt, ModelFailure, readAnswer, suggestGroups } from "../../src/agents/suggester.ts";

const sources = [
  { source: "s1", url: "https://en.wikipedia.org/wiki/Pozzolana" },
  { source: "s2", url: "https://en.wikipedia.org/wiki/Volcanic_ash" },
  { source: "s3", url: "https://en.wikipedia.org/wiki/Pantheon,_Rome" },
];
const groups = [{ group: "g1", name: "Buildings" }];

describe("The suggester", () => {
  test("asks about each ungrouped page by number and names the existing groups", () => {
    const prompt = buildPrompt(sources, groups);
    expect(prompt).toContain("1. https://en.wikipedia.org/wiki/Pozzolana");
    expect(prompt).toContain("3. https://en.wikipedia.org/wiki/Pantheon,_Rome");
    expect(prompt).toContain("- Buildings");
    expect(buildPrompt(sources, [])).toContain("None yet.");
  });

  test("reads an answer into new groups and additions to existing ones", () => {
    const answer = 'Here you go:\n```json\n{"groups":[{"name":"Chemistry","pages":[1,2]},{"name":"buildings","pages":[3]}]}\n```';
    expect(readAnswer(answer, sources, groups)).toEqual([
      { name: "Chemistry", group: null, sources: [sources[0]!, sources[1]!] },
      { name: "Buildings", group: "g1", sources: [sources[2]!] },
    ]);
  });

  test("keeps only what is safe to act on", () => {
    const answer = JSON.stringify({
      groups: [
        { name: "  Chemistry  ", pages: [1, 1, 99, "2", 0, 2.5] },
        { name: "Other", pages: [1, 2] },
        { name: "", pages: [3] },
        { name: "Empty", pages: [] },
        { name: "chemistry", pages: [3] },
        { pages: [3] },
        "nonsense",
      ],
    });
    // Page 1 goes to the first group that claims it, page 2 to the next, and the repeated name is merged.
    expect(readAnswer(answer, sources, [])).toEqual([
      { name: "Chemistry", group: null, sources: [sources[0]!, sources[2]!] },
      { name: "Other", group: null, sources: [sources[1]!] },
    ]);
  });

  test("an answer that is not the JSON asked for is a failure, not a guess", () => {
    expect(() => readAnswer("I could not decide.", sources, groups)).toThrow(ModelFailure);
    expect(() => readAnswer('{"groups":"none"}', sources, groups)).toThrow(ModelFailure);
  });

  test("with nothing to group, it does not ask the model", async () => {
    let asked = 0;
    const reasoner = async () => {
      asked++;
      return "{}";
    };
    expect(await suggestGroups(reasoner, [], groups)).toEqual([]);
    expect(asked).toBe(0);
  });
});

describe("The Claude reasoner", () => {
  const ask = (send: typeof fetch) => claudeReasoner({ apiKey: "test-key", model: "test-model", send })({ system: "S", prompt: "P" });

  test("sends the question with the key in a header and returns the text of the answer", async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const send = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return Response.json({ content: [{ type: "text", text: '{"groups"' }, { type: "text", text: ":[]}" }] });
    }) as unknown as typeof fetch;

    expect(await ask(send)).toBe('{"groups":[]}');
    expect(sent!.url).toBe("https://api.anthropic.com/v1/messages");
    expect((sent!.init.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
    expect(JSON.parse(sent!.init.body as string)).toMatchObject({ model: "test-model", system: "S", messages: [{ role: "user", content: "P" }] });
  });

  test("a refused or failed request becomes a sentence that never includes the key or the reply", async () => {
    const refused = (status: number) => (async () => Response.json({ error: { message: "secret detail test-key" } }, { status })) as unknown as typeof fetch;
    for (const status of [401, 404, 429, 529, 400]) {
      const failure = await ask(refused(status)).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ModelFailure);
      expect((failure as Error).message).not.toContain("test-key");
      expect((failure as Error).message).not.toContain("secret detail");
    }
    const down = (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await ask(down).catch((error: unknown) => error)).toBeInstanceOf(ModelFailure);
    const empty = (async () => Response.json({ content: [] })) as unknown as typeof fetch;
    expect(await ask(empty).catch((error: unknown) => error)).toBeInstanceOf(ModelFailure);
  });
});
