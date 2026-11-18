# GrabbitHole

# F2

- [!Domain](f2/domain.md)
- [!Bad Situations](f2/bad-situations.md)
- [!Evidence](f2/evidence.md)
- [!Workarounds and Comparables](f2/workarounds-comparables.md)
- [!Solution Sketch](f2/solution-sketch.md)
- [!Ethical Analysis](f2/ethical-analysis.md)

# F3

- [!Concept Design](f3/concept-design.md)
- [!User Journey](f3/user-journey.md)
- [!Visual Design Study](f3/visual-design-study.md)
- [!Design Summary](f3/design-summary.md)
- [!Development Plan](f3/development-plan.md)

# The app

GrabbitHole is built on [sync-engine](https://github.com/mit-sdg/sync-engine), with a Vue frontend. The code started as a copy of [ConceptBox](https://github.com/mit-sdg/conceptbox), the course's example app (MIT license, in `LICENSE-conceptbox`), cut down to signing in, with our own concepts added on top.

## Run it

You need [Bun](https://bun.sh) 1.3 or later.

```sh
bun run install:all
bun run build && bun run start
```

Open http://localhost:3000 and create an account. With no `.env`, records are kept in an in-memory MongoDB and lost when the server stops, so nobody needs to set up a database to start.

While you edit, run `bun run dev` in one terminal and `bun run --cwd frontend dev` in another, and open http://localhost:5173.

| Command | What it does |
|---|---|
| `bun run generate` | Rewrites `generated/` from the design and code. Run it after changing a concept, a composition, or `design/`. |
| `bun run check` | Checks each concept's code against its specification, checks `generated/`, and runs TypeScript. The Vue type check needs [Node.js](https://nodejs.org). |
| `bun run test` | Runs the tests on an in-memory MongoDB. |

Settings are in `.env` (copy `.env.example`). Never commit `.env`.

## Where things are

| | Design | Code | Tests |
|---|---|---|---|
| Concepts | `design/concepts/` | `src/concepts/` | `tests/concepts/` |
| Reactions and endpoints | `design/compositions/` | `src/compositions/` | `tests/compositions/` |
| Which types each concept is instantiated with | `design/types.md` | `src/concepts.ts` | |
| The assembled app | | `src/application.ts` | `tests/support/app.ts` |
| The HTTP server | | `src/host/` | `tests/compositions/signing-in-http.test.ts` |
| The Vue frontend | | `frontend/src/` | |
| The browser extension | | `extension/` | |

What is here now is signing in with a password: the concepts Registering, Authenticating, and Sessioning, with the accounts and passwords compositions, all from ConceptBox. None of our own concepts are added yet.

## Add your concept

1. Write `design/concepts/<Name>.md` in the engine's format: the same content as `f3/concept-design.md`, with each action's failure cases written as `refuses CODE "sentence"`, and a Queries section. `design/concepts/Registering.md` is a short example, and the format is described in `node_modules/@mit-sdg/sync-engine/docs/user/reference/concept-specification.md`.
2. Write `src/concepts/<Name>/<Name>.ts` and `registry.ts`, and `tests/concepts/<Name>.test.ts`. Copy Registering's.
3. Add the concept to `src/concepts.ts` and to `design/types.md`.
4. Run `bun run generate`, `bun run check`, and `bun run test`.

Reactions and endpoints go in `src/compositions/<name>.ts` with a matching `design/compositions/<name>.md`; add both to `src/application.ts` and `generated.config.ts`. ConceptBox's `src/compositions/` has examples of each.

One thing that differs from `f3/concept-design.md`: **Sessioning here is the sign-in session.** The sign-in code refers to it by that name, so our browsing-session concept needs another name (such as Browsing) when it is added.

## Working together

- One branch per person, merged by pull request. `bun run check` and `bun run test` pass before merging.
- Never edit `generated/` by hand. After merging `main` into your branch, run `bun run generate` instead of resolving conflicts there.
- The files everyone touches are `src/concepts.ts`, `design/types.md`, `src/application.ts`, and `generated.config.ts`. Keep changes to them small.

## Deploy it

On [6.1040 Apps](https://61040.github.io/fa26/resources/deploying-apps/): runtime Bun, package directories `.` and `frontend`, build script `build`, start script `start`, port 3000, health check path `/health`. Add MongoDB with the variable name `MONGODB_URI`, and set `PUBLIC_ORIGIN` to `https://<name>.mit-sdg.dev`. The server refuses to start there without `MONGODB_URI`, so a missing setting can't silently run on an in-memory database. Pushing does not deploy: click "Deploy latest" after each push.

