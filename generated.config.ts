import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { MongoClient } from "mongodb";
import { assembleGrabbitHole } from "./src/application.ts";
import { grabbitHolePolicy } from "./src/host/http.ts";

// `sync-engine check` reads only the assembly's shape and calls no concept, so this client never connects.
const database = new MongoClient("mongodb://localhost").db("grabbithole");

export default {
  assemble: () => assembleGrabbitHole({ database }),
  title: "GrabbitHole",
  wireName: "GrabbitHoleWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/reusable/accounts.md", import.meta.url),
      new URL("./design/compositions/reusable/passwords.md", import.meta.url),
      new URL("./design/compositions/sessioning.md", import.meta.url),
      new URL("./design/compositions/session-projects.md", import.meta.url),
      new URL("./design/compositions/project-graphs.md", import.meta.url),
      new URL("./design/compositions/project-contributions.md", import.meta.url),
      new URL("./design/compositions/project-members.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy: grabbitHolePolicy("http://localhost:3000"), name: "GrabbitHoleWireHttp" })],
};
