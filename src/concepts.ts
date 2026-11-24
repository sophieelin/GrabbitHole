import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { discoveryLinking } from "./concepts/DiscoveryLinking/registry.ts";
import { registering } from "./concepts/Registering/registry.ts";
import { signIn } from "./concepts/SignIn/registry.ts";
import { collaborating } from "./concepts/Collaborating/registry.ts";
import { contributing } from "./concepts/Contributing/registry.ts";
import { sessioning } from "./concepts/Sessioning/registry.ts";
import { grouping } from "./concepts/Grouping/registry.ts";

/**
 * Every concept in GrabbitHole. To add yours: write `design/concepts/<Name>.md` and
 * `src/concepts/<Name>/` with a `registry.ts`, add it here and to `design/types.md`,
 * then run `bun run generate` and `bun run check`.
 */
export const applicationConceptSet = conceptSet(
  {
    Registering: registering,
    Authenticating: authenticating,
    SignIn: signIn,
    DiscoveryLinking: discoveryLinking,
    Collaborating: collaborating,
    Contributing: contributing,
    Sessioning: sessioning,
    Grouping: grouping,
  },
  {
    makeMergeGraphChange: ({ other }: { other: string }) =>
      JSON.stringify({
        operation: "MERGE_GRAPH",
        other,
      }),


    

      makeEditNoteChange: ({
          note,
          text,
        }: {
          note: string;
          text: string;
        }) =>
          JSON.stringify({
            operation: "EDIT_NOTE",
            note,
            text,
          }),





decodeChange: ({ change }: { change: string }): {
  operation: string;
  other: string | null;
  note: string | null;
  text: string | null;
  source: string | null;
  destination: string | null;
  contributor: string | null;
  connection: string | null;
  author: string | null;
} => {
  const parsed: unknown = JSON.parse(change);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("operation" in parsed)
  ) {
    throw new Error("Invalid proposed change.");
  }

  if (
    parsed.operation === "MERGE_GRAPH" &&
    "other" in parsed &&
    typeof parsed.other === "string" &&
    parsed.other.length > 0
  ) {
    return {
      operation: "MERGE_GRAPH",
      other: parsed.other,
      note: null,
      text: null,
      source: null,
      destination: null,
      contributor: null,
      connection: null,
      author: null,
    };
  }

  if (
    parsed.operation === "EDIT_NOTE" &&
    "note" in parsed &&
    typeof parsed.note === "string" &&
    parsed.note.length > 0 &&
    "text" in parsed &&
    typeof parsed.text === "string"
  ) {
    return {
      operation: "EDIT_NOTE",
      other: null,
      note: parsed.note,
      text: parsed.text,
      source: null,
      destination: null,
      contributor: null,
      connection: null,
      author: null,
    };
  }


if (
  parsed.operation === "REMOVE_SOURCE" &&
  "source" in parsed &&
  typeof parsed.source === "string" &&
  parsed.source.length > 0
) {
  return {
    operation: "REMOVE_SOURCE",
    other: null,
    note: null,
    text: null,
    source: parsed.source,
    destination: null,
    contributor: null,
    connection: null,
    author: null,
  };


}


if (
  parsed.operation === "ADD_CONNECTION" &&
  "source" in parsed &&
  typeof parsed.source === "string" &&
  parsed.source.length > 0 &&
  "destination" in parsed &&
  typeof parsed.destination === "string" &&
  parsed.destination.length > 0 &&
  "contributor" in parsed &&
  typeof parsed.contributor === "string" &&
  parsed.contributor.length > 0
) {
  return {
    operation: "ADD_CONNECTION",
    other: null,
    note: null,
    text: null,
    source: parsed.source,
    destination: parsed.destination,
    contributor: parsed.contributor,
    connection: null,
    author: null,
  };
}


if (
  parsed.operation === "REMOVE_CONNECTION" &&
  "connection" in parsed &&
  typeof parsed.connection === "string" &&
  parsed.connection.length > 0
) {
  return {
    operation: "REMOVE_CONNECTION",
    other: null,
    note: null,
    text: null,
    source: null,
    destination: null,
    contributor: null,
    connection: parsed.connection,
    author: null,
  };
}


if (
  parsed.operation === "ADD_SOURCE_NOTE" &&
  "source" in parsed &&
  typeof parsed.source === "string" &&
  parsed.source.length > 0 &&
  "text" in parsed &&
  typeof parsed.text === "string" &&
  "author" in parsed &&
  typeof parsed.author === "string" &&
  parsed.author.length > 0
) {
  return {
    operation: "ADD_SOURCE_NOTE",
    other: null,
    note: null,
    text: parsed.text,
    source: parsed.source,
    destination: null,
    contributor: null,
    connection: null,
    author: parsed.author,
  };
}


if (
  parsed.operation === "ADD_CONNECTION_NOTE" &&
  "connection" in parsed &&
  typeof parsed.connection === "string" &&
  parsed.connection.length > 0 &&
  "text" in parsed &&
  typeof parsed.text === "string" &&
  "author" in parsed &&
  typeof parsed.author === "string" &&
  parsed.author.length > 0
) {
  return {
    operation: "ADD_CONNECTION_NOTE",
    other: null,
    note: null,
    text: parsed.text,
    source: null,
    destination: null,
    contributor: null,
    connection: parsed.connection,
    author: parsed.author,
  };
}



if (
  parsed.operation === "REMOVE_NOTE" &&
  "note" in parsed &&
  typeof parsed.note === "string" &&
  parsed.note.length > 0
) {
  return {
    operation: "REMOVE_NOTE",
    other: null,
    note: parsed.note,
    text: null,
    source: null,
    destination: null,
    contributor: null,
    connection: null,
    author: null,
  };
}






  throw new Error("Unsupported or invalid proposed change.");
},


makeRemoveSourceChange: ({
  source,
}: {
  source: string;
}): string =>
  JSON.stringify({
    operation: "REMOVE_SOURCE",
    source,
  }),


makeAddConnectionChange: ({
  source,
  destination,
  contributor,
}: {
  source: string;
  destination: string;
  contributor: string;
}): string =>
  JSON.stringify({
    operation: "ADD_CONNECTION",
    source,
    destination,
    contributor,
  }),



makeRemoveConnectionChange: ({
  connection,
}: {
  connection: string;
}): string =>
  JSON.stringify({
    operation: "REMOVE_CONNECTION",
    connection,
  }),



makeAddSourceNoteChange: ({
  source,
  text,
  author,
}: {
  source: string;
  text: string;
  author: string;
}): string =>
  JSON.stringify({
    operation: "ADD_SOURCE_NOTE",
    source,
    text,
    author,
  }),



makeAddConnectionNoteChange: ({
  connection,
  text,
  author,
}: {
  connection: string;
  text: string;
  author: string;
}): string =>
  JSON.stringify({
    operation: "ADD_CONNECTION_NOTE",
    connection,
    text,
    author,
  }),



/**
 * A REMOVE_SOURCE change that also names the batch it was proposed in, so reviewers can see the
 * removals proposed together as one group. Accepting reads only the operation and the source, so
 * each removal in a batch is still accepted or rejected on its own.
 */
makeBatchedRemoveSourceChange: ({
  source,
  batch,
}: {
  source: string;
  batch: string;
}): string =>
  JSON.stringify({
    operation: "REMOVE_SOURCE",
    source,
    batch,
  }),

makeRemoveNoteChange: ({
  note,
}: {
  note: string;
}): string =>
  JSON.stringify({
    operation: "REMOVE_NOTE",
    note,
  }),







  },


  

  
);

export const { concepts, computations } = applicationConceptSet;
