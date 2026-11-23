/**
 * The HTTP server: the API under /api, a health check, and the built Vue app.
 *
 * Settings come from the environment:
 * - PORT and HOST: where to listen (3000 on every address unless set).
 * - PUBLIC_ORIGIN: the address people open in the browser. Sign-in requests from any other
 *   address are refused. Unset, it is http://localhost:<PORT>.
 * - MONGODB_URI: the database. Unset on your own machine, records are kept in an in-memory
 *   MongoDB and lost when the server stops. Anywhere else, the server refuses to start without it.
 * - ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL): lets members ask Claude to suggest topic
 *   groups. Unset, everything else works and the website hides that button.
 */
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { type Db, MongoClient } from "mongodb";
import type { GrabbitHoleWire } from "../../generated/wire.ts";
import { assembleGrabbitHole } from "../application.ts";
import { claudeReasoner } from "../agents/claude.ts";
import { grabbitHolePolicy } from "./http.ts";
import { CAPABILITIES_PATH, handleCapabilities, handleSuggest, SUGGEST_PATH } from "./suggest.ts";

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";
const publicOrigin = process.env.PUBLIC_ORIGIN ?? `http://localhost:${port}`;
const site = `${import.meta.dir}/../../frontend/dist`;

const database = await connect(process.env.MONGODB_URI);
const application = assembleGrabbitHole({ database });
const gateway = createGateway<GrabbitHoleWire>({ application });
const handleApi = createHttpHandler({ application, gateway, policy: grabbitHolePolicy(publicOrigin) });

const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = process.env;
const reasoner = ANTHROPIC_API_KEY ? claudeReasoner({ apiKey: ANTHROPIC_API_KEY, model: ANTHROPIC_MODEL || "claude-haiku-5-5" }) : undefined;

const NO_REFERRER = { "Referrer-Policy": "no-referrer" };

const server = Bun.serve({
  port,
  hostname,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === SUGGEST_PATH) return handleSuggest(request, handleApi, reasoner);
    if (pathname === CAPABILITIES_PATH) return handleCapabilities(reasoner);
    if (pathname.startsWith("/api/")) return handleApi(request);
    if (pathname === "/health") return new Response("ok");
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

    // A path such as /assets/index.js names a file in the built app; every other path is served index.html.
    const asset = Bun.file(site + pathname);
    if (pathname !== "/" && (await asset.exists())) return new Response(asset, { headers: NO_REFERRER });
    const page = Bun.file(`${site}/index.html`);
    if (await page.exists()) return new Response(page, { headers: NO_REFERRER });
    return new Response("The frontend isn't built yet: run `bun run build`.", { status: 404 });
  },
});
console.log(`GrabbitHole is listening on ${server.url} for ${publicOrigin}.`);
console.log(reasoner ? "Group suggestions are on." : "ANTHROPIC_API_KEY is not set, so group suggestions are off.");

/** True when the address people open is on this machine, which is the only place an in-memory database is allowed. */
function isLocal(origin: string): boolean {
  const { hostname: host } = new URL(origin);
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

async function connect(uri: string | undefined): Promise<Db> {
  if (uri !== undefined && uri !== "") return (await new MongoClient(uri).connect()).db();
  if (!isLocal(publicOrigin)) {
    throw new Error(
      `MONGODB_URI is not set, and PUBLIC_ORIGIN (${publicOrigin}) is not on this machine. ` +
        "Refusing to start with an in-memory database, which would lose all data on every restart. " +
        "Set MONGODB_URI to the deployed database's connection string.",
    );
  }
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memory = await MongoMemoryServer.create();
  console.warn("MONGODB_URI is not set, so the server stores data in memory and loses it when it stops.");
  return (await new MongoClient(memory.getUri()).connect()).db("grabbithole");
}
