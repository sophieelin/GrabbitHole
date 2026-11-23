<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { labelOf, titleOf } from "../graph/labels.ts";
import type { Note, ResearchGraph, Source, SourceId } from "../graph/types.ts";

/**
 * Everything recorded about one source: its URL, the notes on it, who contributed it, and the
 * pages it was reached from and led to. Changes are proposals, sent up for the page to submit.
 */
const props = defineProps<{ graph: ResearchGraph; source: Source; busy: boolean }>();
const emit = defineEmits<{
  select: [source: SourceId];
  close: [];
  proposeNote: [text: string];
  proposeNoteRemoval: [note: Note];
  proposeRemoval: [];
}>();

const label = computed(() => labelOf(props.source.url));
const urlOf = computed(() => new Map(props.graph.sources.map(({ source, url }) => [source, url])));

function neighbours(end: "source" | "destination") {
  const other = end === "source" ? "destination" : "source";
  return props.graph.connections
    .filter((connection) => connection[end] === props.source.source)
    .map((connection) => ({ connection, id: connection[other], url: urlOf.value.get(connection[other]) ?? "" }));
}
const reachedFrom = computed(() => neighbours("destination"));
const ledTo = computed(() => neighbours("source"));

const draft = ref("");
watch(() => props.source.source, () => (draft.value = ""));
function submitNote() {
  if (draft.value.trim() === "") return;
  emit("proposeNote", draft.value.trim());
  draft.value = "";
}
</script>

<template>
  <aside class="panel" aria-label="Selected source">
    <header>
      <p class="eyebrow">Source</p>
      <button type="button" class="text-button close" @click="emit('close')">Close</button>
    </header>
    <h2>{{ label.page || label.site }}</h2>
    <a class="url" :href="source.url" target="_blank" rel="noreferrer">{{ source.url }}</a>

    <section>
      <h3>Notes</h3>
      <p v-if="source.notes.length === 0" class="quiet">No notes on this source yet.</p>
      <ul v-else class="notes">
        <li v-for="note in source.notes" :key="note.note">
          <p class="note">{{ note.text }}</p>
          <p class="by">
            {{ note.authorName }}
            <button type="button" class="text-button small" :disabled="busy" @click="emit('proposeNoteRemoval', note)">Propose removing</button>
          </p>
        </li>
      </ul>
      <form class="add" @submit.prevent="submitNote">
        <textarea v-model="draft" rows="3" maxlength="2000" placeholder="Why does this source matter?" aria-label="New note"></textarea>
        <button type="submit" class="button outline" :disabled="busy || draft.trim() === ''">Propose note</button>
      </form>
    </section>

    <section v-if="reachedFrom.length">
      <h3>Reached from</h3>
      <ul class="links">
        <li v-for="row in reachedFrom" :key="row.connection.connection">
          <button type="button" class="text-button link" @click="emit('select', row.id)">{{ titleOf(row.url) }}</button>
          <p v-for="note in row.connection.notes" :key="note.note" class="note">{{ note.text }}</p>
        </li>
      </ul>
    </section>

    <section v-if="ledTo.length">
      <h3>Led to</h3>
      <ul class="links">
        <li v-for="row in ledTo" :key="row.connection.connection">
          <button type="button" class="text-button link" @click="emit('select', row.id)">{{ titleOf(row.url) }}</button>
          <p v-for="note in row.connection.notes" :key="note.note" class="note">{{ note.text }}</p>
        </li>
      </ul>
    </section>

    <section v-if="source.contributors.length">
      <h3>Contributed by</h3>
      <p>{{ source.contributors.map(({ username }) => username).join(", ") }}</p>
    </section>

    <button type="button" class="text-button remove" :disabled="busy" @click="emit('proposeRemoval')">Propose removing this source</button>
  </aside>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 340px;
  flex: none;
  padding: var(--space-5);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow-y: auto;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.eyebrow,
h3 {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
h2 {
  font-family: var(--font-title);
  font-size: var(--text-2xl);
  overflow-wrap: anywhere;
}
.url {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-line);
}
ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.note {
  font-family: var(--font-title);
  font-style: italic;
  font-size: var(--text-lg);
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.by {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.text-button {
  color: var(--color-text);
  text-align: left;
}
.text-button.small,
.close {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: underline;
}
.link {
  overflow-wrap: anywhere;
}
.add {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}
textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font: inherit;
  color: inherit;
  resize: vertical;
}
textarea:focus {
  outline: none;
  border-color: var(--color-text);
}
.remove {
  margin-top: auto;
  padding-top: var(--space-4);
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-danger);
}
@media (max-width: 800px) {
  .panel {
    width: 100%;
    border-left: 0;
    border-top: 1px solid var(--color-border);
    overflow-y: visible;
  }
}
</style>
