import { describe, expect, test } from "bun:test";
import { NotSignedIn, type Session, SignInConcept } from "../../src/concepts/SignIn/SignIn.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

async function setup() {
  const database = await testDatabase();
  // Starts at the real time so the database's expiry sweep never removes a session mid-test.
  const started = new Date();
  let now = started;
  const clock = () => now;
  const advance = (milliseconds: number) => (now = new Date(now.getTime() + milliseconds));
  return { signIn: new SignInConcept(database, "SignIn", clock), database, started, advance };
}

describe("SignIn", () => {
  test("its principle: Maya stays signed in until she signs out, leaves a session unused for a week, or reaches 90 days", async () => {
    const { signIn, started, advance } = await setup();

    const { session: laptop, expiresAt } = await signIn.start({ subject: "maya" });
    expect(expiresAt).toEqual(new Date(started.getTime() + 90 * DAY));
    expect(await signIn.use({ session: laptop })).toEqual({ subject: "maya" });

    const { session: browser } = await signIn.start({ subject: "maya" });
    expect(await signIn.use({ session: browser })).toEqual({ subject: "maya" });
    expect(await signIn.end({ session: browser })).toEqual({ session: browser });
    await expect(signIn.use({ session: browser })).rejects.toThrow(NotSignedIn);

    const { session: library } = await signIn.start({ subject: "maya" });
    for (let day = 1; day < 90; day += 1) {
      advance(DAY);
      expect(await signIn.use({ session: laptop })).toEqual({ subject: "maya" });
      if (day === 7) {
        const refusal = signIn.use({ session: library });
        await expect(refusal).rejects.toThrow(NotSignedIn);
        await expect(refusal).rejects.toThrow("Your session has ended. Sign in again.");
      }
    }

    advance(DAY);
    await expect(signIn.use({ session: laptop })).rejects.toThrow(NotSignedIn);
  });

  test("a session's identity is 32 random bytes in base64url", async () => {
    const { signIn } = await setup();
    const { session: first } = await signIn.start({ subject: "maya" });
    const { session: second } = await signIn.start({ subject: "maya" });
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });

  test("every use sets lastUsed to now, so the week of idleness counts from the latest use", async () => {
    const { signIn, database, started, advance } = await setup();
    const sessions = database.collection<{ _id: string; lastUsed: Date }>("signin.sessions");
    const { session } = await signIn.start({ subject: "maya" });

    advance(MINUTE);
    await signIn.use({ session });
    expect((await sessions.findOne({ _id: session }))?.lastUsed).toEqual(new Date(started.getTime() + MINUTE));

    advance(7 * DAY - MINUTE);
    expect(await signIn.use({ session })).toEqual({ subject: "maya" });
    advance(7 * DAY - MINUTE);
    expect(await signIn.use({ session })).toEqual({ subject: "maya" });
    advance(7 * DAY);
    await expect(signIn.use({ session })).rejects.toThrow(NotSignedIn);
  });

  test("a refused use or end changes no session", async () => {
    const { signIn, database, advance } = await setup();
    const sessions = database.collection("signin.sessions");
    const { session: idle } = await signIn.start({ subject: "maya" });
    const { session: forgotten } = await signIn.start({ subject: "sam" });
    const before = await sessions.find().sort({ _id: 1 }).toArray();

    advance(7 * DAY);
    await expect(signIn.use({ session: idle })).rejects.toThrow(NotSignedIn);
    await expect(signIn.end({ session: forgotten })).rejects.toThrow(NotSignedIn);
    await expect(signIn.end({ session: idle })).rejects.toThrow(NotSignedIn);
    expect(await sessions.find().sort({ _id: 1 }).toArray()).toEqual(before);
  });

  test("SignIn refuses to use or end an unknown or ended session", async () => {
    const { signIn } = await setup();
    await expect(signIn.use({ session: "missing" as Session })).rejects.toThrow(NotSignedIn);
    await expect(signIn.end({ session: "missing" as Session })).rejects.toThrow(NotSignedIn);

    const { session } = await signIn.start({ subject: "maya" });
    await signIn.end({ session });
    await expect(signIn.end({ session })).rejects.toThrow(NotSignedIn);
    await expect(signIn.use({ session })).rejects.toThrow(NotSignedIn);
  });

  test("of two ends of one session at once, SignIn accepts one and refuses the other with NOT_SIGNED_IN", async () => {
    const { signIn } = await setup();
    const { session } = await signIn.start({ subject: "maya" });
    await expectOneWinner([signIn.end({ session }), signIn.end({ session })], NotSignedIn);
  });
});
