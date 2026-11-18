import type { OperationalObserver } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { GrabbitHoleWire } from "../../generated/wire.ts";
import { assembleGrabbitHole } from "../../src/application.ts";
import { testDatabase } from "./reusable/mongo.ts";
import { ok } from "./reusable/results.ts";
import { printTrace } from "./trace.ts";

/** GrabbitHole on a fresh database, called through its typed client. With TRACE set, it prints each action. */
export async function startGrabbitHole(observers: OperationalObserver[] = []) {
  const database = await testDatabase();
  const logSink = process.env.TRACE ? printTrace() : undefined;
  const application = assembleGrabbitHole({ database }, { observers, logSink });
  const api = createLocalClient<GrabbitHoleWire>({ invoker: createGateway<GrabbitHoleWire>({ application }) });

  async function register(username: string) {
    return ok(await api.auth.register({ username, password: "correct horse" }));
  }

  return { database, application, api, register };
}
