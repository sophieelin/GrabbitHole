import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { GrabbitHoleWireHttp } from "../../../generated/wire.ts";

/** A typed client for every endpoint, built from `generated/wire.ts`. Always calls `/api`, never a full address, so it works the same locally and deployed. */
export const api = createHttpClient<GrabbitHoleWireHttp>({ baseUrl: "/api" });
