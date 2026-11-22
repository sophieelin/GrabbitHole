import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { grabbitHolePolicy } from "../../src/host/http.ts";
import { startGrabbitHole } from "../support/app.ts";

const ORIGIN = "http://localhost:3000";
const SESSION = "__Host-grabbithole-session";

/** GrabbitHole behind its HTTP handler, and browsers that each keep their own cookies, so a test can see each cookie set and cleared. */
async function serve() {
  const app = await startGrabbitHole();
  const handle = createHttpHandler({
    application: app.application,
    gateway: createGateway({ application: app.application }),
    policy: grabbitHolePolicy(ORIGIN),
  });

  /** A client that keeps its own cookies; `origin: null` sends no `Origin`, as the browser extension does. */
  function browser(origin: string | null = ORIGIN) {
    const jar = new Map<string, string>();

    async function post(path: string, body: object = {}) {
      const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
      const response = await handle(
        new Request(`${ORIGIN}/api${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
            ...(origin === null ? {} : { Origin: origin }),
          },
          body: JSON.stringify(body),
        }),
      );
      const cookies = response.headers.getSetCookie();
      const set = cookies.map((line) => line.split(";")[0]?.split("=") ?? []);
      for (const [name = "", value = ""] of set) {
        if (value === "") jar.delete(name);
        else jar.set(name, value);
      }
      return { status: response.status, body: await response.json(), cookies };
    }

    return { jar, post };
  }

  return { ...app, browser };
}

describe("Signing in with a password over HTTP", () => {
  test("registering sets the session cookie, and signing out clears it", async () => {
    const { browser } = await serve();
    const dylan = browser();
    const registered = await dylan.post("/auth/register", { username: "dylan", password: "correct horse" });
    expect(registered.status).toBe(200);
    expect(dylan.jar.has(SESSION)).toBe(true);
    expect(registered.cookies[0]).toContain("HttpOnly");
    expect(registered.cookies[0]).toContain("SameSite=Strict");
    expect((await dylan.post("/auth/me")).body).toEqual({ username: "dylan" });

    expect((await dylan.post("/auth/logout")).status).toBe(200);
    expect(dylan.jar.has(SESSION)).toBe(false);
    expect((await dylan.post("/auth/me")).status).toBe(401);
  });

  test("a wrong password answers 401 and sets no cookie", async () => {
    const { browser, register } = await serve();
    await register("jordan");
    const stranger = browser();
    const refused = await stranger.post("/auth/login", { username: "jordan", password: "wrong horse" });
    expect(refused).toMatchObject({ status: 401, body: { error: "UNAUTHORIZED" } });
    expect(stranger.jar.has(SESSION)).toBe(false);
  });

  test("the browser extension's requests, which carry the cookie but no Origin, are answered", async () => {
    const { browser } = await serve();
    const dylan = browser();
    await dylan.post("/auth/register", { username: "dylan", password: "correct horse" });

    // The extension removes Origin from its own requests and sends the same sign-in cookie.
    const extension = browser(null);
    for (const [name, value] of dylan.jar) extension.jar.set(name, value);
    expect(await extension.post("/auth/me")).toMatchObject({ status: 200, body: { username: "dylan" } });

    // Had it kept its chrome-extension:// Origin, the server would refuse it.
    const withOrigin = browser("chrome-extension://abcdefghijklmnopabcdefghijklmnop");
    for (const [name, value] of dylan.jar) withOrigin.jar.set(name, value);
    expect((await withOrigin.post("/auth/me")).status).toBe(403);
  });
});
