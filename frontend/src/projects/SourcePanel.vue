<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { labelOf, titleOf } from "../graph/labels.ts";
import { copySourceUrl, webAddress } from "../graph/sourceActions.ts";
import Icon from "../reusable/ui/Icon.vue";
import type { GroupId, GroupStyle, Note, ResearchGraph, Source, SourceId } from "../graph/types.ts";

/**
 * Everything recorded about one source: its URL, the notes on it, who contributed it, and the
 * pages it was reached from and led to. Changes are proposals, sent up for the page to submit.
 */
const props = defineProps<{
  graph: ResearchGraph;
  source: Source;
  busy: boolean;
  groups: GroupStyle[];
  group: GroupStyle | null;
  /** The view the graph is in, so the panel can offer the other one. */
  mode: "group" | "path";
  currentUser: string | null;
}>();
const emit = defineEmits<{
  select: [source: SourceId];
  close: [];
  proposeNote: [text: string];
  proposeNoteEdit: [note: Note, text: string];
  proposeNoteRemoval: [note: Note];
  proposeRemoval: [];
  switchView: [];
  setGroup: [group: GroupId | null];
  newGroup: [name: string];
}>();

/** Choosing "New group…" swaps the list for a name box; the new group takes this source. */
const naming = ref(false);
const groupName = ref("");
function pickGroup(event: Event) {
  const select = event.target as HTMLSelectElement;
  if (select.value === "new") {
    naming.value = true;
    select.value = props.group?.group ?? "";
  } else emit("setGroup", select.value === "" ? null : (select.value as GroupId));
}
function makeGroup() {
  if (groupName.value.trim() === "") return;
  emit("newGroup", groupName.value.trim());
  groupName.value = "";
  naming.value = false;
}

const label = computed(() => labelOf(props.source.url));
/** The address to link to; null when the stored URL is not a web page, which is then shown but not linked. */
const href = computed(() => webAddress(props.source.url));

/** Copying the address: the copy icon turns into a check for a moment, or says the copy failed. */
const copyResult = ref<"copied" | "failed" | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | undefined;
async function copyUrl() {
  const copied = await copySourceUrl(props.source.url);
  clearTimeout(copyTimer);
  copyResult.value = copied ? "copied" : "failed";
  copyTimer = setTimeout(() => (copyResult.value = null), copied ? 1500 : 3000);
}
const copyLabel = computed(() => (copyResult.value === "copied" ? "Copied" : copyResult.value === "failed" ? "Couldn't copy" : "Copy URL"));
onBeforeUnmount(() => clearTimeout(copyTimer));
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
const editingNote = ref<string | null>(null);
const editDraft = ref("");

function startEditing(note: Note) {
  editingNote.value = note.note;
  editDraft.value = note.text;
}

function cancelEditing() {
  editingNote.value = null;
  editDraft.value = "";
}


function submitNoteEdit(note: Note) {
  const updated = editDraft.value.trim();

  if (
    updated === "" ||
    updated === note.text
  ) return;

  emit("proposeNoteEdit", note, updated);
  cancelEditing();
}

watch(
  () => props.source.source,
  () => {
    draft.value = "";
    naming.value = false;
    cancelEditing();
    clearTimeout(copyTimer);
    copyResult.value = null;
  },
);
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
    <div class="address">
      <a v-if="href" class="url" :href="href" target="_blank" rel="noopener noreferrer" :title="source.url">
        <span class="url-text">{{ source.url }}</span>
        <span class="open" title="Open website"><Icon name="external" :size="14" /><span class="visually-hidden">(opens in a new tab)</span></span>
      </a>
      <span v-else class="url" :title="source.url"><span class="url-text">{{ source.url }}</span></span>
      <button
        type="button"
        class="icon-button copy"
        :class="copyResult"
        :title="copyLabel"
        :aria-label="copyLabel"
        @click="copyUrl"
      >
        <Icon :name="copyResult === 'copied' ? 'check' : 'copy'" :size="16" />
      </button>
    </div>
    <button type="button" class="button outline other" @click="emit('switchView')">
      {{ mode === "group" ? "See how we got here" : "See it in its group" }}
    </button>

    <section>
      <h3>Group</h3>
      <form v-if="naming" class="grouping" @submit.prevent="makeGroup">
        <input v-model="groupName" type="text" maxlength="40" placeholder="Group name" aria-label="New group name" />
        <button type="submit" class="button outline" :disabled="busy || groupName.trim() === ''">Add</button>
        <button type="button" class="text-button small" @click="naming = false">Cancel</button>
      </form>
      <div v-else class="grouping">
        <span v-if="group" class="dot" :style="{ background: group.color }"></span>
        <select :value="group?.group ?? ''" :disabled="busy" aria-label="Group" @change="pickGroup">
          <option value="">No group</option>
          <option v-for="row in groups" :key="row.group" :value="row.group">{{ row.name }}</option>
          <option value="new">New group…</option>
        </select>
      </div>
    </section>

    <section>
      <h3>Notes</h3>
      <p v-if="source.notes.length === 0" class="quiet">No notes on this source yet.</p>
      
<ul v-else class="notes">
  <li v-for="note in source.notes" :key="note.note">
    <template v-if="editingNote === note.note">
      <form class="add" @submit.prevent="submitNoteEdit(note)">
        <textarea
          v-model="editDraft"
          rows="3"
          maxlength="2000"
          aria-label="Edit note"
        ></textarea>

        <button
          type="submit"
          class="button outline"
          :disabled="busy || editDraft.trim() === '' || editDraft.trim() === note.text"
        >
          Propose edit
        </button>

        <button
          type="button"
          class="text-button small"
          @click="cancelEditing"
        >
          Cancel
        </button>
      </form>
    </template>

    <template v-else>
      <p class="note">{{ note.text }}</p>

      <p class="by">
        <span>{{ note.authorName }}</span>

        <button
          v-if="currentUser !== null && note.author === currentUser"
          type="button"
          class="text-button small"
          :disabled="busy"
          @click="startEditing(note)"
        >
          Edit
        </button>

        <button
          type="button"
          class="text-button small"
          :disabled="busy"
          @click="emit('proposeNoteRemoval', note)"
        >
          Propose removing
        </button>
      </p>
    </template>
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
/* The address, up to two lines and then cut short, with the copy button beside it. */
.address {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
}
.url {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding-top: 7px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.url-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
a.url:hover .url-text {
  color: var(--color-text);
  text-decoration: underline;
}
.open {
  flex: none;
  display: grid;
  margin-top: 1px;
}
.copy {
  width: 32px;
  height: 32px;
}
.copy.copied {
  color: var(--color-accepted);
}
.copy.failed {
  color: var(--color-danger);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
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
.grouping {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.grouping select,
.grouping input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font: inherit;
  color: inherit;
}
.grouping .button {
  min-height: 36px;
}
.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.other {
  align-self: flex-start;
  min-height: 34px;
  font-size: var(--text-sm);
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
