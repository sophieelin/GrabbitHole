import { describe, expect, test } from "bun:test";
import {
  type Session,
  SessionNotActive,
  SessionNotFound,
  SessioningConcept,
} from "../../src/concepts/Sessioning/Sessioning.ts";
import type { User } from "../../src/concepts/Registering/Registering.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

const dylan = "dylan" as User;

const ARTICLE = "https://news.example/roman-concrete";
const MUSEUM = "https://museum.example/pantheon";
const PAPER = "https://journal.example/lime-clasts";
const MUSEUM_TOUR = "https://museum.example/tour";
const TIKTOK = "https://tiktok.example/video";

async function setup() {
  return { sessioning: new SessioningConcept<User>(await testDatabase()) };
}

describe("Sessioning", () => {
  test("its principle: Dylan's visits and the links he follows are recorded once each, and saved when he stops", async () => {
    const { sessioning } = await setup();
    const { session } = await sessioning.startSession({ user: dylan });
    expect(await sessioning._session({ session })).toEqual([{ user: dylan, status: "ACTIVE" }]);
    expect(await sessioning._visited({ session })).toEqual([]);

    await sessioning.recordVisit({ session, url: ARTICLE });
    await sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE });
    await sessioning.recordVisit({ session, url: PAPER, sourceUrl: MUSEUM });
    // Another page on the museum's site, opened from the article in a new tab.
    await sessioning.recordVisit({ session, url: MUSEUM_TOUR, sourceUrl: ARTICLE });
    // Following the same link again duplicates neither the sources nor the connection.
    await sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE });
    // A page whose origin is unknown is recorded without a connection.
    await sessioning.recordVisit({ session, url: TIKTOK });

    await sessioning.stopSession({ session });

    expect(await sessioning._session({ session })).toEqual([{ user: dylan, status: "STOPPED" }]);
    expect(await sessioning._visited({ session })).toEqual([
      { url: ARTICLE },
      { url: MUSEUM },
      { url: PAPER },
      { url: MUSEUM_TOUR },
      { url: TIKTOK },
    ]);
    expect(await sessioning._connections({ session })).toEqual([
      { source: ARTICLE, destination: MUSEUM },
      { source: MUSEUM, destination: PAPER },
      { source: ARTICLE, destination: MUSEUM_TOUR },
    ]);
  });

  test("a sourceUrl not yet visited is added to the visited URLs too", async () => {
    const { sessioning } = await setup();
    const { session } = await sessioning.startSession({ user: dylan });
    await sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE });
    expect(await sessioning._visited({ session })).toEqual([{ url: MUSEUM }, { url: ARTICLE }]);
    expect(await sessioning._connections({ session })).toEqual([{ source: ARTICLE, destination: MUSEUM }]);
  });

  test("a sourceUrl equal to url records the visit without a connection", async () => {
    const { sessioning } = await setup();
    const { session } = await sessioning.startSession({ user: dylan });
    await sessioning.recordVisit({ session, url: ARTICLE, sourceUrl: ARTICLE });
    expect(await sessioning._visited({ session })).toEqual([{ url: ARTICLE }]);
    expect(await sessioning._connections({ session })).toEqual([]);
  });

  test("connections and visits belong to their own session", async () => {
    const { sessioning } = await setup();
    const { session: first } = await sessioning.startSession({ user: dylan });
    const { session: second } = await sessioning.startSession({ user: dylan });
    expect(second).not.toBe(first);
    await sessioning.recordVisit({ session: first, url: MUSEUM, sourceUrl: ARTICLE });
    await sessioning.recordVisit({ session: second, url: MUSEUM, sourceUrl: ARTICLE });
    expect(await sessioning._connections({ session: first })).toEqual([{ source: ARTICLE, destination: MUSEUM }]);
    expect(await sessioning._connections({ session: second })).toEqual([{ source: ARTICLE, destination: MUSEUM }]);
    await sessioning.stopSession({ session: first });
    await sessioning.recordVisit({ session: second, url: PAPER });
    expect(await sessioning._visited({ session: first })).toEqual([{ url: MUSEUM }, { url: ARTICLE }]);
  });

  test("a stopped session refuses visits and a second stop with SESSION_NOT_ACTIVE", async () => {
    const { sessioning } = await setup();
    const { session } = await sessioning.startSession({ user: dylan });
    await sessioning.recordVisit({ session, url: ARTICLE });
    await sessioning.stopSession({ session });

    const visit = sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE });
    await expect(visit).rejects.toThrow(SessionNotActive);
    await expect(visit).rejects.toThrow("This session has stopped.");
    await expect(sessioning.stopSession({ session })).rejects.toThrow(SessionNotActive);
    expect(await sessioning._visited({ session })).toEqual([{ url: ARTICLE }]);
    expect(await sessioning._connections({ session })).toEqual([]);
  });

  test("an unknown session is refused with SESSION_NOT_FOUND and has no rows", async () => {
    const { sessioning } = await setup();
    const missing = "missing" as Session;
    const visit = sessioning.recordVisit({ session: missing, url: ARTICLE });
    await expect(visit).rejects.toThrow(SessionNotFound);
    await expect(visit).rejects.toThrow("There is no such session.");
    await expect(sessioning.stopSession({ session: missing })).rejects.toThrow(SessionNotFound);
    expect(await sessioning._session({ session: missing })).toEqual([]);
    expect(await sessioning._visited({ session: missing })).toEqual([]);
    expect(await sessioning._connections({ session: missing })).toEqual([]);
  });

  test("the same link followed twice at once records one connection", async () => {
    const { sessioning } = await setup();
    const { session } = await sessioning.startSession({ user: dylan });
    await Promise.all([
      sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE }),
      sessioning.recordVisit({ session, url: MUSEUM, sourceUrl: ARTICLE }),
    ]);
    expect(await sessioning._connections({ session })).toEqual([{ source: ARTICLE, destination: MUSEUM }]);
    expect(await sessioning._visited({ session })).toEqual([{ url: MUSEUM }, { url: ARTICLE }]);
  });
});
