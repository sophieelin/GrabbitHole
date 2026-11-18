# For coding agents

This app is built on sync-engine. Its documentation for the installed version is in `node_modules/@mit-sdg/sync-engine/docs/user/` after `bun install`; start with `llms.txt` there. Use only the public package entry points it lists.

- The team's design is in `f3/` (concept design, user journey, design summary, visual design study). Follow it; don't invent concepts or behavior it doesn't describe.
- Concept specifications are in `design/concepts/`, in the engine's format (`docs/user/reference/concept-specification.md`). `design/concepts/Registering.md` with `src/concepts/Registering/` and `tests/concepts/Registering.test.ts` is a short example.
- No concept class imports another concept. Concepts are connected only in `src/compositions/`.
- After any change: `bun run generate`, then `bun run check`, then `bun run test`.
- Never edit `generated/` by hand. After merging, run `bun run generate` again instead of resolving conflicts there.
