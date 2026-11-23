<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { call } from "../api/call.ts";
import { api } from "../api/client.ts";
import GraphCanvas from "../graph/GraphCanvas.vue";
import type {
  Group,
  GroupId,
  GroupStyle,
  Member,
  Note,
  PendingProposal,
  ProjectId,
  ProposalId,
  ResearchGraph,
  SourceId,
  UserId,
} from "../graph/types.ts";
import { useSession } from "../reusable/session.ts";
import { describeChange } from "./describe.ts";
import GroupsDialog from "./GroupsDialog.vue";
import PeopleDialog from "./PeopleDialog.vue";
import ProposalList from "./ProposalList.vue";
import SourcePanel from "./SourcePanel.vue";

/**
 * One project's research graph: the drawing, the selected source's details, the proposals waiting
 * for review, and the project's people. Every change to the graph is a proposal a reviewer decides.
 */
const props = defineProps<{ project: string }>();
const project = props.project as ProjectId;
const { me } = useSession();

const graph = ref<ResearchGraph | null>(null);
const loadRefusal = ref("");
const selectedId = ref<SourceId | null>(null);
const busy = ref(false);
const refusal = ref("");
const notice = ref("");
const pending = ref<PendingProposal[]>([]);
const people = ref<{ owner: UserId; members: Member[]; reviewers: UserId[] } | null>(null);
const showPeople = ref(false);
const groups = ref<Group[]>([]);
const showGroups = ref(false);
const groupRefusal = ref("");
const focus = ref<GroupId | null>(null);

/** Topic colors from the color study, given to groups in the order they were made. */
const TOPIC_COLORS = ["#3e6a9a", "#286f6a", "#7b4f86", "#85601a", "#a84c6e"];
const groupStyles = computed<GroupStyle[]>(() =>
  groups.value.map(({ group, name, sources }, index) => ({
    group,
    name,
    color: TOPIC_COLORS[index % TOPIC_COLORS.length]!,
    count: sources.length,
  })),
);
const groupOf = computed(() => {
  const found = new Map<SourceId, GroupStyle>();
  groups.value.forEach(({ sources }, index) => sources.forEach(({ source }) => found.set(source, groupStyles.value[index]!)));
  return found;
});
const canvas = ref<InstanceType<typeof GraphCanvas> | null>(null);

const selected = computed(() => graph.value?.sources.find(({ source }) => source === selectedId.value) ?? null);
const annotated = computed(() => graph.value?.connections.some(({ notes }) => notes.length > 0) ?? false);
const myId = computed(() => people.value?.members.find(({ username }) => username === me.value?.username)?.user ?? null);
const isOwner = computed(() => myId.value !== null && myId.value === people.value?.owner);
const canReview = computed(() => myId.value !== null && (people.value?.reviewers.includes(myId.value) ?? false));
const proposals = computed(() =>
  graph.value === null ? [] : pending.value.map((row) => ({ ...row, summary: describeChange(row.change, graph.value!) })),
);

async function loadGraph() {
  const result = await call("/projects/graph", api.projects.graph({ project }));
  if ("failed" in result) loadRefusal.value = result.failed;
  else graph.value = result.graph;
}
async function loadPending() {
  const result = await call("/projects/contributions/pending", api.projects.contributions.pending({ project }));
  if (!("failed" in result)) pending.value = result.proposals;
}
async function loadPeople() {
  const result = await call("/projects/members", api.projects.members({ project }));
  if (!("failed" in result)) {
    people.value = { owner: result.owner, members: result.members, reviewers: result.reviewers.map(({ user }) => user) };
  }
}
async function loadGroups() {
  const result = await call("/projects/groups", api.projects.groups({ project }));
  if ("failed" in result) return;
  groups.value = result.groups;
  if (!result.groups.some(({ group }) => group === focus.value)) focus.value = null;
}
onMounted(() => Promise.all([loadGraph(), loadPending(), loadPeople(), loadGroups()]));

/** Runs one change to the groups, then reloads them. Returns what the endpoint answered, or null if it refused. */
async function changeGroups<T extends object>(path: string, request: Promise<T>) {
  busy.value = true;
  groupRefusal.value = "";
  const result = await call(path, request);
  busy.value = false;
  if ("failed" in result) groupRefusal.value = result.failed;
  await loadGroups();
  return "failed" in result ? null : result;
}
const createGroup = (name: string) => changeGroups("/projects/groups/create", api.projects.groups.create({ project, name }));
const renameGroup = (group: GroupId, name: string) =>
  changeGroups("/projects/groups/rename", api.projects.groups.rename({ group, name }));
const removeGroup = (group: GroupId) => changeGroups("/projects/groups/remove", api.projects.groups.remove({ group }));

function setGroup(group: GroupId | null) {
  if (selected.value === null) return;
  const { source } = selected.value;
  void (group === null
    ? changeGroups("/projects/groups/unassign", api.projects.groups.unassign({ project, source }))
    : changeGroups("/projects/groups/assign", api.projects.groups.assign({ group, source })));
}
/** Makes a group and puts the selected source in it. */
async function newGroupForSelected(name: string) {
  const source = selected.value?.source;
  const made = await createGroup(name);
  if (made && source) await changeGroups("/projects/groups/assign", api.projects.groups.assign({ group: made.group, source }));
}

/** Submits one proposal, then shows it in the list waiting for review. */
async function propose(path: string, request: Promise<{ proposal: ProposalId } | { error: string }>) {
  busy.value = true;
  refusal.value = "";
  notice.value = "";
  const result = await call(path, request);
  busy.value = false;
  if ("failed" in result) refusal.value = result.failed;
  else {
    notice.value = "Proposed. A reviewer decides whether it goes into the graph.";
    await loadPending();
  }
}

function proposeNote(text: string) {
  if (selected.value === null) return;
  const { source } = selected.value;
  void propose("/projects/contributions/submit-source-note", api.projects.contributions["submit-source-note"]({ project, source, text }));
}
function proposeNoteRemoval(note: Note) {
  void propose("/projects/contributions/submit-note-removal", api.projects.contributions["submit-note-removal"]({ project, note: note.note }));
}
function proposeRemoval() {
  if (selected.value === null) return;
  const { source } = selected.value;
  void propose("/projects/contributions/submit-source-removal", api.projects.contributions["submit-source-removal"]({ project, source }));
}

async function decide(proposal: ProposalId, accepted: boolean, reason = "") {
  busy.value = true;
  refusal.value = "";
  notice.value = "";
  const result = accepted
    ? await call("/projects/contributions/accept", api.projects.contributions.accept({ proposal }))
    : await call("/projects/contributions/reject", api.projects.contributions.reject({ proposal, reason }));
  busy.value = false;
  if ("failed" in result) refusal.value = result.failed;
  else notice.value = accepted ? "Accepted. The graph is updated." : "Rejected.";
  // An accepted removal also takes the source out of its group.
  await Promise.all([loadPending(), accepted ? loadGraph() : null, accepted ? loadGroups() : null]);
}
</script>

<template>
  <section class="page">
    <header class="heading">
      <div>
        <a class="back" href="#/">← All projects</a>
        <h1>{{ graph?.name ?? "Project" }}</h1>
      </div>
      <div v-if="graph" class="tools">
        <p class="counts">
          {{ graph.sources.length }} {{ graph.sources.length === 1 ? "source" : "sources" }} ·
          {{ graph.connections.length }} {{ graph.connections.length === 1 ? "connection" : "connections" }}
        </p>
        <button type="button" class="button outline" @click="showGroups = true">Groups · {{ groups.length }}</button>
        <button v-if="people" type="button" class="button outline" @click="showPeople = true">
          People · {{ people.members.length }}
        </button>
      </div>
    </header>

    <p v-if="loadRefusal" class="refusal" role="alert">{{ loadRefusal }}</p>
    <p v-else-if="graph === null" class="quiet">Loading the graph…</p>

    <div v-else class="frame">
      <div class="workspace">
        <div v-if="graph.sources.length === 0" class="empty">
          <h2>No sources yet</h2>
          <p>Record a browsing session with the GrabbitHole extension, stop it, and add it to this project from the extension. The pages you visited and the links you followed will show up here.</p>
        </div>
        <div v-else class="drawing">
          <GraphCanvas ref="canvas" :graph="graph" :selected="selectedId" :group-of="groupOf" :focus="focus" @select="selectedId = $event" />
          <ul v-if="groupStyles.length" class="key" aria-label="Groups">
            <li v-for="row in groupStyles" :key="row.group">
              <button
                type="button"
                :class="{ on: focus === row.group }"
                :style="{ color: row.color }"
                :aria-pressed="focus === row.group"
                :title="focus === row.group ? 'Show all sources' : `Show only ${row.name}`"
                @click="focus = focus === row.group ? null : row.group"
              >
                <span class="dot" :style="{ background: row.color }"></span>{{ row.name }} · {{ row.count }}
              </button>
            </li>
          </ul>
          <div class="controls">
            <button type="button" aria-label="Zoom out" @click="canvas?.zoom(0.8)">−</button>
            <button type="button" aria-label="Zoom in" @click="canvas?.zoom(1.25)">+</button>
            <button type="button" class="wide" @click="canvas?.fit()">Fit</button>
          </div>
          <p class="hint">
            {{ selected === null ? "Select a source to see its notes and where it led." : "" }}
            <span v-if="annotated">A thick link has a note.</span>
          </p>
        </div>
        <SourcePanel
          v-if="selected"
          :graph="graph"
          :source="selected"
          :busy="busy"
          :groups="groupStyles"
          :group="groupOf.get(selected.source) ?? null"
          @set-group="setGroup"
          @new-group="newGroupForSelected"
          @select="selectedId = $event"
          @close="selectedId = null"
          @propose-note="proposeNote"
          @propose-note-removal="proposeNoteRemoval"
          @propose-removal="proposeRemoval"
        />
      </div>
      <p v-if="groupRefusal && !showGroups" class="refusal bar" role="alert">{{ groupRefusal }}</p>
      <p v-else-if="refusal && proposals.length === 0" class="refusal bar" role="alert">{{ refusal }}</p>
      <p v-else-if="notice" class="notice bar" role="status">{{ notice }}</p>
      <ProposalList
        v-if="proposals.length"
        :proposals="proposals"
        :can-review="canReview"
        :busy="busy"
        :refusal="refusal"
        @accept="decide($event, true)"
        @reject="(proposal, reason) => decide(proposal, false, reason)"
      />
    </div>
    <GroupsDialog
      v-if="showGroups && graph"
      :name="graph.name"
      :groups="groupStyles"
      :busy="busy"
      :refusal="groupRefusal"
      @create="createGroup"
      @rename="renameGroup"
      @remove="removeGroup"
      @close="((showGroups = false), (groupRefusal = ''))"
    />
    <PeopleDialog
      v-if="showPeople && people && graph"
      :project="project"
      :name="graph.name"
      :owner="people.owner"
      :members="people.members"
      :reviewers="people.reviewers"
      :is-owner="isOwner"
      @changed="loadPeople"
      @close="showPeople = false"
    />
  </section>
</template>

<style scoped>
.page {
  max-width: 1168px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  height: calc(100vh - 110px);
  min-height: 480px;
}
.heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.back {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-decoration: none;
}
.back:hover {
  text-decoration: underline;
}
h1 {
  font-size: 2.25rem;
  overflow-wrap: anywhere;
}
.tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.tools .button {
  min-height: 34px;
  font-size: var(--text-sm);
}
.counts {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.quiet {
  color: var(--color-text-muted);
}
.frame {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.workspace {
  flex: 1;
  min-height: 0;
  display: flex;
}
.drawing {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  background: #f8f3e9;
}
.key {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  right: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}
.key button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: none;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: auto;
}
.key button:hover,
.key button.on {
  border-color: currentColor;
  background: var(--color-surface);
}
.key .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.controls {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  overflow: hidden;
}
.controls button {
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-left: 1px solid var(--color-line);
  background: none;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.controls button:first-child {
  border-left: 0;
}
.controls button:hover {
  color: var(--color-text);
  background: var(--color-page);
}
.hint {
  position: absolute;
  bottom: var(--space-3);
  left: var(--space-4);
  pointer-events: none;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.empty {
  margin: auto;
  max-width: 440px;
  padding: var(--space-6);
  text-align: center;
  color: var(--color-text-muted);
}
.empty h2 {
  font-family: var(--font-title);
  color: var(--color-text);
  margin-bottom: var(--space-2);
}
.notice {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.bar {
  padding: var(--space-2) var(--space-5);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}
@media (max-width: 800px) {
  .page {
    height: auto;
  }
  .heading {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }
  .workspace {
    flex-direction: column;
  }
  .drawing {
    flex: none;
    height: 420px;
  }
}
</style>
