<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { call } from "../api/call.ts";
import { api } from "../api/client.ts";
import GraphCanvas from "../graph/GraphCanvas.vue";
import { titleOf } from "../graph/labels.ts";
import { copySourceUrls } from "../graph/sourceActions.ts";
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
import Icon from "../reusable/ui/Icon.vue";
import { describeChange } from "./describe.ts";
import GroupsDialog from "./GroupsDialog.vue";
import PeopleDialog from "./PeopleDialog.vue";
import ProposalList, { type ReviewRow } from "./ProposalList.vue";
import RemoveFromGroupsDialog from "./RemoveFromGroupsDialog.vue";
import RemoveSourceDialog from "./RemoveSourceDialog.vue";
import SourcePanel from "./SourcePanel.vue";
import { canSuggestGroups, type Suggestion } from "./suggest.ts";
import SuggestDialog from "./SuggestDialog.vue";
import ToolbarDropdown from "./ToolbarDropdown.vue";

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
/** Which question the drawing answers: what we covered (by group) or how we got there (by path). */
const mode = ref<"group" | "path">("group");
/** Shows a source in the other view, selected, so it is easy to find there. */
function switchView(source: SourceId | null = selectedId.value) {
  selectedId.value = source;
  mode.value = mode.value === "group" ? "path" : "group";
}
const busy = ref(false);
const refusal = ref("");
const notice = ref("");
const pending = ref<PendingProposal[]>([]);
const people = ref<{ owner: UserId; members: Member[]; reviewers: UserId[] } | null>(null);
const showPeople = ref(false);
const groups = ref<Group[]>([]);
const showGroups = ref(false);
const groupRefusal = ref("");
const canSuggest = ref(false);
const showSuggest = ref(false);

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
const noted = computed(() => graph.value?.sources.some(({ notes }) => notes.length > 0) ?? false);
const myId = computed(() => people.value?.members.find(({ username }) => username === me.value?.username)?.user ?? null);
const isOwner = computed(() => myId.value !== null && myId.value === people.value?.owner);
const canReview = computed(() => myId.value !== null && (people.value?.reviewers.includes(myId.value) ?? false));
/** What a stored change says about a source removal: its source and batch, if it is one. */
function removalIn(change: string): { source: string; batch: string | null } | null {
  try {
    const parsed = JSON.parse(change) as { operation?: string; source?: string; batch?: string };
    if (parsed.operation !== "REMOVE_SOURCE" || typeof parsed.source !== "string") return null;
    return { source: parsed.source, batch: typeof parsed.batch === "string" && parsed.batch !== "" ? parsed.batch : null };
  } catch {
    return null;
  }
}
const proposals = computed<ReviewRow[]>(() => {
  if (graph.value === null) return [];
  const urlOf = new Map(graph.value.sources.map(({ source, url }) => [source as string, url]));
  return pending.value.map((row) => {
    const removal = removalIn(row.change);
    const url = removal ? urlOf.get(removal.source) : undefined;
    return {
      ...row,
      summary: describeChange(row.change, graph.value!),
      batch: removal?.batch ?? null,
      sourceName: url === undefined ? null : titleOf(url),
    };
  });
});

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
}
onMounted(() => Promise.all([loadGraph(), loadPending(), loadPeople(), loadGroups(), canSuggestGroups().then((can) => (canSuggest.value = can))]));

/** Sources in no group. Claude is only asked about these, so the button shows only when there are some. */
const ungrouped = computed(() => graph.value?.sources.filter(({ source }) => !groupOf.value.has(source)).length ?? 0);

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
/** Makes the groups Claude suggested that the member kept, and puts each one's sources in it. */
async function applySuggestions(suggestions: Suggestion[]) {
  for (const { name, group, sources } of suggestions) {
    // A new group is made first. If one with that name appeared in the meantime, it is used instead.
    const target = group ?? (await createGroup(name))?.group ?? groups.value.find((row) => row.name.toLowerCase() === name.toLowerCase())?.group;
    if (target === undefined) return;
    groupRefusal.value = "";
    for (const { source } of sources) {
      if ((await changeGroups("/projects/groups/assign", api.projects.groups.assign({ group: target, source }))) === null) return;
    }
  }
  showSuggest.value = false;
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
/*
 * Proposing to remove sources: one from the source panel or the graph's menu, or several picked in
 * selection mode. All ask first, in the same dialog. One source is one REMOVE_SOURCE proposal;
 * several are one REMOVE_SOURCE proposal each, sharing a batch, so reviewers see them together and
 * still decide each one. A source whose removal is already waiting for review is not proposed again.
 */
const removing = ref<SourceId[]>([]);
const removingSources = computed(() => {
  const byId = new Map(graph.value?.sources.map((row) => [row.source, row]) ?? []);
  return removing.value.flatMap((id) => byId.get(id) ?? []);
});
/** Sources whose removal is already waiting for review. */
const removalsPending = computed(() => new Set(pending.value.flatMap(({ change }) => removalIn(change)?.source ?? []) as SourceId[]));
function askRemoval(...sources: SourceId[]) {
  refusal.value = "";
  notice.value = "";
  removing.value = sources;
}
async function confirmRemoval() {
  const sources = removingSources.value.filter(({ source }) => !removalsPending.value.has(source)).map(({ source }) => source);
  const alreadyProposed = removing.value.filter((source) => removalsPending.value.has(source));
  const single = removing.value.length === 1;
  removing.value = [];
  if (sources.length === 0) return;
  if (single) {
    await propose("/projects/contributions/submit-source-removal", api.projects.contributions["submit-source-removal"]({ project, source: sources[0]! }));
    if (refusal.value === "") unpick(sources);
    return;
  }
  busy.value = true;
  refusal.value = "";
  notice.value = "";
  const batch = crypto.randomUUID();
  let failed = 0;
  let reason = "";
  const proposedIds: SourceId[] = [];
  for (const source of sources) {
    const result = await call(
      "/projects/contributions/submit-source-removal-in-batch",
      api.projects.contributions["submit-source-removal-in-batch"]({ project, source, batch }),
    );
    if ("failed" in result) {
      failed += 1;
      reason = result.failed;
    } else proposedIds.push(source);
  }
  busy.value = false;
  // Proposed sources (and ones already waiting for review) leave the selection; failures stay picked to
  // retry, and if nothing could be proposed the selection is kept as it was.
  if (proposedIds.length > 0) unpick([...proposedIds, ...alreadyProposed]);
  await loadPending();
  const proposed = sources.length - failed;
  const message =
    failed > 0
      ? `Proposed removing ${proposed} of ${sources.length} sources. ${reason}`
      : `Proposed removing ${sourcesWord(proposed)}. A reviewer decides each one.`;
  // Shown once: in the selection toolbar while selecting (where the action was taken), otherwise in the bar below the graph.
  if (selecting.value) say(message, failed > 0);
  else if (failed > 0) refusal.value = message;
  else notice.value = message;
}
function proposeRemoval() {
  if (selected.value !== null) askRemoval(selected.value.source);
}

/*
 * Selection mode: clicking sources picks several at once, to copy their addresses or to put them
 * in a group or take them out of one. The picks stay when the view changes, and leave when
 * selection mode ends. Picking replaces the source panel while it lasts.
 */
const selecting = ref(false);
const picked = ref(new Set<SourceId>());
const selectionStatus = ref<{ text: string; failed: boolean } | null>(null);
let statusTimer: ReturnType<typeof setTimeout> | undefined;
function say(text: string, failed = false) {
  clearTimeout(statusTimer);
  selectionStatus.value = { text, failed };
  statusTimer = setTimeout(() => (selectionStatus.value = null), failed ? 6000 : 3000);
}
const sourcesWord = (count: number) => `${count} ${count === 1 ? "source" : "sources"}`;

/** Starts picking, with the source that was selected already picked, so nothing is lost. */
function startSelecting() {
  picked.value = new Set(selectedId.value === null ? [] : [selectedId.value]);
  selectedId.value = null;
  selectionStatus.value = null;
  selecting.value = true;
}
function stopSelecting() {
  selecting.value = false;
  picked.value = new Set();
  selectionStatus.value = null;
}
function togglePick(source: SourceId) {
  const next = new Set(picked.value);
  if (!next.delete(source)) next.add(source);
  picked.value = next;
}
const pickAll = () => (picked.value = new Set(graph.value?.sources.map(({ source }) => source) ?? []));
const clearPicks = () => (picked.value = new Set());
/** Takes sources out of the selection after an action succeeded for them; selection mode stays on. */
function unpick(sources: Iterable<SourceId>) {
  const next = new Set(picked.value);
  for (const source of sources) next.delete(source);
  if (next.size !== picked.value.size) picked.value = next;
}

/** The picked sources, in the order they were picked. */
const pickedSources = computed(() => {
  const byId = new Map(graph.value?.sources.map((row) => [row.source, row]) ?? []);
  return [...picked.value].flatMap((id) => byId.get(id) ?? []);
});
const pickedInAGroup = computed(() => pickedSources.value.filter(({ source }) => groupOf.value.has(source)));

// A source removed from the graph (an accepted removal) is no longer picked.
watch(graph, (now) => {
  if (now === null) return;
  const present = new Set(now.sources.map(({ source }) => source));
  if ([...picked.value].some((id) => !present.has(id))) picked.value = new Set([...picked.value].filter((id) => present.has(id)));
});

// Escape leaves selection mode, unless a dialog or menu (such as the toolbar's Remove menu) is open and takes the key itself.
function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !selecting.value || event.defaultPrevented) return;
  if (document.querySelector("dialog[open]") !== null) return;
  // The Escape that closes an open menu is that menu's. This listens while the event comes down to it (capture), so the menu is still open here.
  if (event.target instanceof Element && event.target.closest(".menu")?.querySelector(".items")) return;
  stopSelecting();
}
document.addEventListener("keydown", onKey, true);
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey, true);
  clearTimeout(statusTimer);
});

async function copyPicked() {
  const urls = pickedSources.value.map(({ url }) => url);
  const copied = await copySourceUrls(urls);
  if (copied) say(`Copied ${urls.length} ${urls.length === 1 ? "URL" : "URLs"}.`);
  else say("Couldn't copy the URLs. Your browser may not allow it here.", true);
}

/**
 * Changes the group of each source in turn, through the same Grouping endpoints and membership
 * checks as one source at a time. A refusal stops nothing: the rest are still tried, and the
 * count that changed is reported.
 */
async function regroup(sources: SourceId[], change: (source: SourceId) => Promise<object>, done: (count: number) => string): Promise<SourceId[]> {
  if (sources.length === 0) {
    say("Nothing to change.");
    return [];
  }
  busy.value = true;
  let reason = "";
  const changed: SourceId[] = [];
  for (const source of sources) {
    const result = await change(source);
    if ("failed" in result) reason = String(result.failed);
    else changed.push(source);
  }
  busy.value = false;
  await loadGroups();
  if (changed.length === sources.length) say(done(sources.length));
  else say(`Changed ${changed.length} of ${sources.length}. ${reason}`, true);
  return changed;
}
/** Puts every picked source in the group, moving those in another group. */
async function assignPicked(group: GroupId, name: string) {
  const alreadyThere = pickedSources.value.filter(({ source }) => groupOf.value.get(source)?.group === group).map(({ source }) => source);
  const moving = pickedSources.value.filter(({ source }) => groupOf.value.get(source)?.group !== group).map(({ source }) => source);
  const moved = await regroup(
    moving,
    (source) => call("/projects/groups/assign", api.projects.groups.assign({ group, source })),
    (count) => `Put ${sourcesWord(count)} in ${name}.`,
  );
  // Sources now in the group (and ones already there) leave the selection; failures stay picked to retry,
  // and if every move failed the selection is kept as it was.
  if (moved.length > 0 || moving.length === 0) unpick([...moved, ...alreadyThere]);
}

/** "Create new group…" in the toolbar's Assign to group menu: the Groups dialog, making a group for the picks. */
function newGroupForPicked() {
  groupRefusal.value = "";
  assigningNewGroup.value = true;
  showGroups.value = true;
}

/**
 * Whether the Groups dialog was opened to make a group for the picked sources. Then making a group
 * there also puts them in it, through the same create and assign endpoints, and closes the dialog.
 * A refused name (one already taken, say) keeps the dialog open with the reason.
 */
const assigningNewGroup = ref(false);
async function createFromGroupsDialog(name: string) {
  const made = await createGroup(name);
  if (!assigningNewGroup.value || made === null) return;
  closeGroupsDialog();
  await assignPicked(made.group, name);
}
function closeGroupsDialog() {
  showGroups.value = false;
  assigningNewGroup.value = false;
  groupRefusal.value = "";
}
/*
 * Taking the picked sources out of their groups. The selection may span several groups, and may
 * include sources in none; each grouped source leaves its own group, the rest are left alone, and
 * no source, connection, note or group is deleted. It asks first, listing each affected group and
 * how many of its sources leave it.
 */
const confirmingUngroup = ref(false);
const ungroupSummary = computed(() =>
  groupStyles.value
    .map((style) => ({ ...style, leaving: pickedInAGroup.value.filter(({ source }) => groupOf.value.get(source)?.group === style.group).length }))
    .filter(({ leaving }) => leaving > 0),
);
async function confirmUngroup() {
  confirmingUngroup.value = false;
  const notGrouped = pickedSources.value.filter(({ source }) => !groupOf.value.has(source)).map(({ source }) => source);
  const ungrouped = await regroup(
    pickedInAGroup.value.map(({ source }) => source),
    (source) => call("/projects/groups/unassign", api.projects.groups.unassign({ project, source })),
    (count) => `${sourcesWord(count)} ungrouped.`,
  );
  // Ungrouped sources (and ones that were in no group) leave the selection, unless nothing worked; failures stay picked.
  unpick(ungrouped.length > 0 ? [...ungrouped, ...notGrouped] : []);
}

/** "Remove from groups" in the Remove menu: asks first, or says there is nothing to do. */
function askUngroup() {
  if (pickedInAGroup.value.length === 0) say("No grouped sources selected.");
  else confirmingUngroup.value = true;
}

/**
 * Whether a proposal is a source removal whose source is already gone. The server refuses to
 * accept one (SOURCE_NOT_IN_GRAPH), so it can only be rejected; batch review does that for it.
 */
function removesMissingSource(proposal: ProposalId) {
  const row = proposals.value.find((candidate) => candidate.proposal === proposal);
  return row !== undefined && removalIn(row.change) !== null && row.sourceName === null;
}

/** Whether a proposal adds a link that is already in the graph; accepting it is refused as a conflict. */
function addsExistingLink(proposal: ProposalId) {
  const row = pending.value.find((candidate) => candidate.proposal === proposal);
  if (!row || graph.value === null) return false;
  try {
    const parsed = JSON.parse(row.change) as { operation?: string; source?: string; destination?: string };
    return (
      parsed.operation === "ADD_CONNECTION" &&
      graph.value.connections.some(({ source, destination }) => source === parsed.source && destination === parsed.destination)
    );
  } catch {
    return false;
  }
}

async function decide(proposal: ProposalId, accepted: boolean, reason = "") {
  busy.value = true;
  refusal.value = "";
  notice.value = "";
  const result = accepted
    ? await call("/projects/contributions/accept", api.projects.contributions.accept({ proposal }))
    : await call("/projects/contributions/reject", api.projects.contributions.reject({ proposal, reason }));
  // A conflict on a link that is already there is not "already reviewed": say what it is.
  if (accepted && "failed" in result && addsExistingLink(proposal)) result.failed = "That link is already in the graph. Reject the proposal instead.";
  busy.value = false;
  if ("failed" in result) refusal.value = result.failed;
  else notice.value = accepted ? "Accepted. The graph is updated." : "Rejected.";
  // An accepted removal also takes the source out of its group.
  await Promise.all([loadPending(), accepted ? loadGraph() : null, accepted ? loadGroups() : null]);
}

/**
 * Decides a batch of removals: accepts the ones the reviewer kept checked and rejects the rest,
 * each through the same endpoints as one proposal. A removal whose source is already gone is
 * rejected, since there is nothing left to remove.
 */
async function decideBatch(accept: ProposalId[], reject: ProposalId[]) {
  busy.value = true;
  refusal.value = "";
  notice.value = "";
  let removed = 0;
  let kept = 0;
  let alreadyReviewed = 0;
  const failures: string[] = [];

  /**
   * Settles one decision. A proposal someone else decided meanwhile (CONFLICT) is counted as
   * already reviewed, and any other refusal is noted; either way the rest of the batch goes on.
   */
  async function settle(path: "/projects/contributions/accept" | "/projects/contributions/reject", answer: object) {
    if ("error" in answer && answer.error === "CONFLICT") {
      alreadyReviewed += 1;
      return false;
    }
    const result = await call(path, Promise.resolve(answer));
    if ("failed" in result) {
      failures.push(result.failed);
      return false;
    }
    return true;
  }
  const rejectAs = async (proposal: ProposalId, reason: string) =>
    settle("/projects/contributions/reject", await api.projects.contributions.reject({ proposal, reason }));

  for (const proposal of accept) {
    // A source gone before the page loaded is rejected straight away. One that went since (another
    // reviewer removed it, say) is refused by the server as NOT_FOUND, and then rejected the same way.
    if (removesMissingSource(proposal)) {
      await rejectAs(proposal, "The source was already removed.");
      continue;
    }
    const answer = await api.projects.contributions.accept({ proposal });
    if ("error" in answer && answer.error === "NOT_FOUND") {
      await rejectAs(proposal, "The source was already removed.");
      continue;
    }
    if (await settle("/projects/contributions/accept", answer)) removed += 1;
  }
  for (const proposal of reject) {
    if (await rejectAs(proposal, "Kept by the reviewer.")) kept += 1;
  }
  busy.value = false;

  const done = [
    removed > 0 ? `removed ${sourcesWord(removed)}` : null,
    kept > 0 ? `kept ${sourcesWord(kept)}` : null,
    alreadyReviewed > 0 ? `${alreadyReviewed} ${alreadyReviewed === 1 ? "was" : "were"} already reviewed` : null,
  ].filter((part) => part !== null);
  const summary = done.length > 0 ? `${done.join(", ").replace(/^./, (first) => first.toUpperCase())}.` : "";
  if (failures.length > 0) refusal.value = `${summary} ${failures.length} could not be decided: ${failures[0]}`.trim();
  else if (summary) notice.value = summary;
  await Promise.all([loadPending(), loadGraph(), loadGroups()]);
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
        <button v-if="canSuggest && ungrouped > 0" type="button" class="button outline" @click="((groupRefusal = ''), (showSuggest = true))">Suggest groups</button>
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
          <GraphCanvas
            ref="canvas"
            :graph="graph"
            :selected="selectedId"
            :groups="groupStyles"
            :group-of="groupOf"
            :mode="mode"
            :selecting="selecting"
            :picked="picked"
            @select="selectedId = $event"
            @switch="switchView"
            @toggle="togglePick"
            @propose-removal="askRemoval"
          />
          <div v-if="selecting" class="selection" role="toolbar" aria-label="Selected sources">
            <span class="count" aria-live="polite">{{ picked.size }} selected</span>
            <button type="button" class="link" :disabled="picked.size === graph.sources.length" @click="pickAll">Select all</button>
            <button type="button" class="link" :disabled="picked.size === 0" @click="clearPicks">Clear</button>
            <template v-if="picked.size > 0">
              <span class="divider" aria-hidden="true"></span>
              <ToolbarDropdown text="Assign to group" label="Assign the selected sources to a group" :disabled="busy">
                <button type="button" role="menuitem" @click="newGroupForPicked">
                  <span class="icon"><Icon name="plus" :size="16" /></span><span class="label">Create new group…</span>
                </button>
                <hr v-if="groupStyles.length" aria-hidden="true" />
                <button v-for="row in groupStyles" :key="row.group" type="button" role="menuitem" @click="assignPicked(row.group, row.name)">
                  <span class="icon"><span class="dot" :style="{ background: row.color }"></span></span><span class="label">{{ row.name }}</span>
                </button>
              </ToolbarDropdown>
              <ToolbarDropdown text="Remove" label="Remove the selected sources" :disabled="busy">
                <button type="button" role="menuitem" @click="askUngroup">
                  <span class="icon"><Icon name="folderMinus" :size="16" /></span><span class="label">Remove from groups</span>
                </button>
                <hr aria-hidden="true" />
                <button type="button" role="menuitem" class="danger" @click="askRemoval(...pickedSources.map(({ source }) => source))">
                  <span class="icon"><Icon name="trash" :size="16" /></span><span class="label">Propose removal from graph</span>
                </button>
              </ToolbarDropdown>
              <button type="button" class="copy" title="Copy URLs" aria-label="Copy URLs" @click="copyPicked"><Icon name="copy" :size="16" /></button>
            </template>
            <span class="divider" aria-hidden="true"></span>
            <button type="button" class="done" @click="stopSelecting">Done</button>
          </div>
          <p v-if="selecting && selectionStatus" class="selection-status" :class="{ failed: selectionStatus.failed }" role="status">{{ selectionStatus.text }}</p>
          <div class="views" role="group" aria-label="View">
            <button type="button" :class="{ on: mode === 'group' }" :aria-pressed="mode === 'group'" @click="mode = 'group'">By group</button>
            <button type="button" :class="{ on: mode === 'path' }" :aria-pressed="mode === 'path'" @click="mode = 'path'">By path</button>
          </div>
          <div class="corner">
          <button
            type="button"
            class="select-mode"
            :class="{ on: selecting }"
            :aria-pressed="selecting"
            :title="selecting ? 'Stop selecting' : 'Select several sources'"
            @click="selecting ? stopSelecting() : startSelecting()"
          >
            <Icon name="select" :size="16" />{{ selecting ? "Selecting" : "Select" }}
          </button>
          <div class="controls">
            <button type="button" aria-label="Zoom out" @click="canvas?.zoom(0.8)">−</button>
            <button type="button" aria-label="Zoom in" @click="canvas?.zoom(1.25)">+</button>
            <button type="button" class="wide" @click="canvas?.fit()">Fit</button>
          </div>
          </div>
          <p v-if="selecting" class="hint">
            <span>Click sources to select them. Drag to move around. Esc to finish.</span>
          </p>
          <p v-else class="hint">
            <span><i class="start"></i>Where a session started</span>
            <span><i class="line"></i>Led to</span>
            <span v-if="noted"><i class="dot"></i>Has a note</span>
            <template v-if="mode === 'path'">
              <span v-for="row in groupStyles" :key="row.group" class="topic" :style="{ color: row.color }"><i class="dot"></i>{{ row.name }}</span>
            </template>
            <span v-else-if="groupStyles.length && selected === null">Click a source to see its links to other groups</span>
          </p>
        </div>
        <SourcePanel
          v-if="selected"
          :graph="graph"
          :source="selected"
          :busy="busy"
          :groups="groupStyles"
          :group="groupOf.get(selected.source) ?? null"
          :mode="mode"
          @switch-view="switchView()"
          @set-group="setGroup"
          @new-group="newGroupForSelected"
          @select="selectedId = $event"
          @close="selectedId = null"
          @propose-note="proposeNote"
          @propose-note-removal="proposeNoteRemoval"
          @propose-removal="proposeRemoval"
        />
      </div>
      <p v-if="groupRefusal && !showGroups && !showSuggest" class="refusal bar" role="alert">{{ groupRefusal }}</p>
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
        @decide-batch="decideBatch"
      />
    </div>
    <GroupsDialog
      v-if="showGroups && graph"
      :name="graph.name"
      :groups="groupStyles"
      :busy="busy"
      :refusal="groupRefusal"
      :assigning="assigningNewGroup ? picked.size : undefined"
      @create="createFromGroupsDialog"
      @rename="renameGroup"
      @remove="removeGroup"
      @close="closeGroupsDialog"
    />
    <SuggestDialog
      v-if="showSuggest && graph"
      :project="project"
      :name="graph.name"
      :applying="busy"
      :refusal="groupRefusal"
      @apply="applySuggestions"
      @close="((showSuggest = false), (groupRefusal = ''))"
    />
    <RemoveFromGroupsDialog
      v-if="confirmingUngroup"
      :groups="ungroupSummary"
      :busy="busy"
      @confirm="confirmUngroup"
      @close="confirmingUngroup = false"
    />
    <RemoveSourceDialog
      v-if="removingSources.length && graph"
      :graph="graph"
      :sources="removingSources"
      :group="removingSources.length === 1 ? (groupOf.get(removingSources[0]!.source)?.name ?? null) : null"
      :already-proposed="removalsPending"
      :busy="busy"
      @confirm="confirmRemoval"
      @close="removing = []"
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
  background: #faf6ee;
}
.views {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
}
.views button {
  height: 28px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: none;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}
.views button.on {
  background: var(--color-text);
  color: #fff;
}
/* The bottom right corner: the selection mode switch, then zoom. */
.corner {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.select-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}
.select-mode:hover {
  color: var(--color-text);
  background: var(--color-page);
}
.select-mode.on,
.select-mode.on:hover {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}
/* The toolbar for the picked sources, top left of the drawing while selection mode is on. */
.selection {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  right: 220px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  width: max-content;
  max-width: calc(100% - 220px);
  padding: 6px 8px 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  box-shadow: var(--shadow-popover);
  font-size: var(--text-sm);
}
.selection .count {
  font-weight: 700;
  color: var(--color-accent-strong);
  font-variant-numeric: tabular-nums;
}
.selection > button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}
.selection > button:disabled {
  opacity: 0.45;
  cursor: default;
}
.selection .link {
  padding: 0;
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: underline;
}
.selection .copy {
  justify-content: center;
  width: 30px;
  border-radius: 50%;
  color: var(--color-text-muted);
}
.selection .copy:hover {
  color: var(--color-text);
  background: var(--color-page);
}
.selection .divider {
  align-self: stretch;
  width: 1px;
  margin: 4px 0;
  background: var(--color-line);
}
.selection .done {
  padding: 0 14px;
  border-radius: 999px;
  background: var(--color-text);
  color: #fff;
}
.selection-status {
  position: absolute;
  top: 66px;
  left: var(--space-3);
  margin: 0;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: 600;
}
.selection-status.failed {
  background: var(--color-danger);
}
.controls {
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
  right: 230px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px var(--space-5);
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  pointer-events: none;
}
.hint span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.hint .start {
  width: 24px;
  height: 13px;
  border-radius: 999px;
  background: var(--color-text);
}
.hint .line {
  width: 24px;
  border-top: 2px solid #8f8a7f;
}
.hint .topic {
  font-weight: 700;
}
.hint .topic .dot {
  background: currentColor;
}
.hint .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-text-muted);
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
