import { describe, expect, test } from "bun:test";
import { startGrabbitHole } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

describe("Signing in", () => {
  test("Dylan signs up with a password, signs out, and signs back in", async () => {
    const { api, register } = await startGrabbitHole();
    const dylan = await register("dylan");
    expect(await api.auth.me({ session: dylan.session })).toEqual({ username: "dylan" });

    ok(await api.auth.logout({ session: dylan.session }));
    expect(await api.auth.me({ session: dylan.session })).toEqual({ error: "NOT_SIGNED_IN" });

    const again = ok(await api.auth.login({ username: "dylan", password: "correct horse" }));
    expect(again.user).toBe(dylan.user);
    expect(await api.auth.me({ session: again.session })).toEqual({ username: "dylan" });
  });

  test("a taken username, a wrong password, and an unknown username are each refused", async () => {
    const { api, register } = await startGrabbitHole();
    await register("jordan");
    expect(await api.auth.register({ username: "jordan", password: "another horse" })).toEqual({ error: "USERNAME_TAKEN" });
    expect(await api.auth.login({ username: "jordan", password: "wrong horse" })).toEqual({ error: "INVALID_CREDENTIALS" });
    expect(await api.auth.login({ username: "marcus", password: "correct horse" })).toEqual({ error: "INVALID_CREDENTIALS" });
  });
});
