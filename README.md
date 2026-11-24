# GrabbitHole

# F2

- [Domain](f2/domain.md)
- [Bad Situations](f2/bad-situations.md)
- [Evidence](f2/evidence.md)
- [Workarounds and Comparables](f2/workarounds-comparables.md)
- [Solution Sketch](f2/solution-sketch.md)
- [Ethical Analysis](f2/ethical-analysis.md)

# F3

- [Concept Design](f3/concept-design.md)
- [User Journey](f3/user-journey.md)
- [Visual Design Study](f3/visual-design-study.md)
- [Design Summary](f3/design-summary.md)
- [Development Plan](f3/development-plan.md)

# F4

- [Alpha Development Plan](f4/development-plan.md)

# The app

GrabbitHole is built on [sync-engine](https://github.com/mit-sdg/sync-engine), with a Vue frontend. The code started as a copy of [ConceptBox](https://github.com/mit-sdg/conceptbox), the course's example app (MIT license, in `LICENSE-conceptbox`), cut down to signing in, with our own concepts added on top.

## Live Demo

**Deployed application:** https://grabbithole.mit-sdg.dev/

GrabbitHole allows researchers to record browsing sessions, visualize sources and connections, organize research into shared projects, and propose changes for review.

The web application is publicly deployed. The companion Chrome extension must be installed separately using the instructions below.

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

To let members ask Claude to suggest topic groups, set `ANTHROPIC_API_KEY` (in `.env` on your machine, or as a variable on the deployed app). Without it everything else works and the "Suggest groups" button is hidden. The suggestion code is in `src/agents/` and its route is in `src/host/suggest.ts`.

## Chrome Extension

GrabbitHole includes a Chrome extension that records browsing sessions and sends the collected research paths to the application.

### Installation

1. Download or clone the GrabbitHole GitHub repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `extension/` folder from the repository, which contains `manifest.json`.
6. Open GrabbitHole from Chrome's Extensions menu. The extension opens in Chrome's side panel.

### Connect to the Deployed App

1. Open the deployed application at https://grabbithole.mit-sdg.dev/ and sign in or register.
2. Open the GrabbitHole Chrome extension.
3. In the extension's **Server URL** field, enter:

   `https://grabbithole.mit-sdg.dev`

4. Save the server setting.

The extension is now configured to communicate with the deployed GrabbitHole backend.

### Using the Extension

1. Start a browsing session from the extension.
2. Browse websites and follow links as part of your research.
3. Stop the session when finished.
4. Use the extension to submit the recorded research graph to an existing project or create a new project.
5. Open the project in the GrabbitHole web application to view its research graph.

**Note:** Contributions submitted to an existing project may require approval from an authorized reviewer before appearing in the shared graph.

The extension is currently distributed through the repository rather than the Chrome Web Store.

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

GrabbitHole currently includes the following application concepts:

- **Registering, Authenticating, and SignIn:** User registration, password authentication, and sign-in sessions.
- **Sessioning:** Records browsing sessions, visited URLs, and navigation relationships.
- **DiscoveryLinking:** Manages research graphs, sources, connections, notes, and graph merging.
- **Collaborating:** Manages shared projects, invitations, membership, and reviewer permissions.
- **Contributing:** Manages proposed changes to shared research graphs, including submission, approval, rejection, and withdrawal at the concept level.

The application integrates these concepts through sync-engine compositions. The frontend provides the user interface for interacting with research projects and visualizing graph data, while the Chrome extension records browsing activity.

## Add your concept

1. Write `design/concepts/<Name>.md` in the engine's format: the same content as `f3/concept-design.md`, with each action's failure cases written as `refuses CODE "sentence"`, and a Queries section. `design/concepts/Registering.md` is a short example, and the format is described in `node_modules/@mit-sdg/sync-engine/docs/user/reference/concept-specification.md`.
2. Write `src/concepts/<Name>/<Name>.ts` and `registry.ts`, and `tests/concepts/<Name>.test.ts`. Copy Registering's.
3. Add the concept to `src/concepts.ts` and to `design/types.md`.
4. Run `bun run generate`, `bun run check`, and `bun run test`.

Reactions and endpoints go in `src/compositions/<name>.ts` with a matching `design/compositions/<name>.md`; add both to `src/application.ts` and `generated.config.ts`. ConceptBox's `src/compositions/` has examples of each.

The sign-in session concept is called **SignIn**, so that **Sessioning** is the browsing-session concept from `f3/concept-design.md`.

## Working together

- One branch per person, merged by pull request. `bun run check` and `bun run test` pass before merging.
- Never edit `generated/` by hand. After merging `main` into your branch, run `bun run generate` instead of resolving conflicts there.
- The files everyone touches are `src/concepts.ts`, `design/types.md`, `src/application.ts`, and `generated.config.ts`. Keep changes to them small.

## Deploy it

On [6.1040 Apps](https://61040.github.io/fa26/resources/deploying-apps/): runtime Bun, package directories `.` and `frontend`, build script `build`, start script `start`, port 3000, health check path `/health`. Add MongoDB with the variable name `MONGODB_URI`, and set `PUBLIC_ORIGIN` to `https://<name>.mit-sdg.dev`. The server refuses to start there without `MONGODB_URI`, so a missing setting can't silently run on an in-memory database. Pushing does not deploy: click "Deploy latest" after each push.

