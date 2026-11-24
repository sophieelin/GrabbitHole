<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { PendingProposal, ProposalId } from "../graph/types.ts";

/** A pending proposal as the list shows it. Removals proposed together share a batch. */
export type ReviewRow = PendingProposal & {
  summary: string;
  /** The batch a source removal was proposed in, or null. */
  batch: string | null;
  /** For a source removal: the source's name, or null when it is no longer in the graph. */
  sourceName: string | null;
};

/**
 * The proposals waiting for review on a project. A reviewer accepts or rejects each one. Source
 * removals proposed together by one person are shown as one batch: a checkbox per source, checked
 * to remove it and unchecked to keep it, then one Apply that accepts and rejects each proposal on
 * its own.
 */
const props = defineProps<{
  proposals: ReviewRow[];
  canReview: boolean;
  busy: boolean;
  refusal: string;
}>();
const emit = defineEmits<{
  accept: [proposal: ProposalId];
  reject: [proposal: ProposalId, reason: string];
  decideBatch: [accept: ProposalId[], reject: ProposalId[]];
}>();

type Entry = { kind: "one"; row: ReviewRow } | { kind: "batch"; key: string; proposerName: string; rows: ReviewRow[] };
const entries = computed<Entry[]>(() => {
  const entries: Entry[] = [];
  const batches = new Map<string, Extract<Entry, { kind: "batch" }>>();
  for (const row of props.proposals) {
    if (row.batch === null) {
      entries.push({ kind: "one", row });
      continue;
    }
    const key = `${row.proposer}:${row.batch}`;
    let entry = batches.get(key);
    if (!entry) {
      entry = { kind: "batch", key, proposerName: row.proposerName, rows: [] };
      batches.set(key, entry);
      entries.push(entry);
    }
    entry.rows.push(row);
  }
  // A batch with only one removal left reads as an ordinary proposal.
  return entries.map((entry) => (entry.kind === "batch" && entry.rows.length === 1 ? { kind: "one", row: entry.rows[0]! } : entry));
});

/** Which removals in a batch the reviewer keeps checked (to remove). Every one starts checked. */
const kept = reactive(new Set<ProposalId>());
const removes = (row: ReviewRow) => row.sourceName !== null && !kept.has(row.proposal);
function toggle(row: ReviewRow) {
  if (kept.has(row.proposal)) kept.delete(row.proposal);
  else kept.add(row.proposal);
}
function apply(rows: ReviewRow[]) {
  emit(
    "decideBatch",
    rows.filter(removes).map(({ proposal }) => proposal),
    rows.filter((row) => !removes(row)).map(({ proposal }) => proposal),
  );
}
function applyLabel(rows: ReviewRow[]) {
  const removing = rows.filter(removes).length;
  const keeping = rows.length - removing;
  if (keeping === 0) return `Remove all ${removing}`;
  if (removing === 0) return `Keep all ${keeping}`;
  return `Remove ${removing}, keep ${keeping}`;
}

const rejecting = ref<ProposalId | null>(null);
const reason = ref("");
function reject(proposal: ProposalId) {
  emit("reject", proposal, reason.value.trim());
  rejecting.value = null;
  reason.value = "";
}
</script>

<template>
  <section class="proposals" aria-label="Proposals waiting for review">
    <h3>Waiting for review · {{ proposals.length }}</h3>
    <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
    <ul>
      <template v-for="entry in entries" :key="entry.kind === 'one' ? entry.row.proposal : entry.key">
        <li v-if="entry.kind === 'one'">
          <span class="status">Pending</span>
          <span class="summary">{{ entry.row.summary }} <span class="by">from {{ entry.row.proposerName }}</span></span>
          <template v-if="canReview">
            <form v-if="rejecting === entry.row.proposal" class="reason" @submit.prevent="reject(entry.row.proposal)">
              <input v-model="reason" type="text" maxlength="300" placeholder="Reason (optional)" aria-label="Reason for rejecting" />
              <button type="submit" class="button outline" :disabled="busy">Reject</button>
              <button type="button" class="text-button" @click="rejecting = null">Cancel</button>
            </form>
            <span v-else class="actions">
              <button type="button" class="button outline" :disabled="busy" @click="emit('accept', entry.row.proposal)">Accept</button>
              <button type="button" class="text-button" :disabled="busy" @click="rejecting = entry.row.proposal">Reject</button>
            </span>
          </template>
          <span v-else class="by">A reviewer decides</span>
        </li>
        <li v-else class="batch">
          <div class="head">
            <span class="status">Pending</span>
            <span class="summary">Remove {{ entry.rows.length }} sources <span class="by">from {{ entry.proposerName }}</span></span>
            <span v-if="canReview" class="actions">
              <button type="button" class="button outline" :disabled="busy" @click="apply(entry.rows)">{{ applyLabel(entry.rows) }}</button>
            </span>
            <span v-else class="by">A reviewer decides each one</span>
          </div>
          <p v-if="canReview" class="hint">Checked sources are removed; unchecked ones are kept.</p>
          <ul class="sources">
            <li v-for="row in entry.rows" :key="row.proposal">
              <label v-if="canReview" :class="{ gone: row.sourceName === null }">
                <input type="checkbox" :checked="removes(row)" :disabled="busy || row.sourceName === null" @change="toggle(row)" />
                <span>{{ row.sourceName ?? "A source no longer in the graph" }}</span>
              </label>
              <span v-else :class="{ gone: row.sourceName === null }">{{ row.sourceName ?? "A source no longer in the graph" }}</span>
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </section>
</template>

<style scoped>
.proposals {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  max-height: 240px;
  overflow-y: auto;
}
h3 {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-sm);
}
.batch {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
}
.batch .head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.hint {
  margin-left: calc(70px + var(--space-3));
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.sources {
  gap: 2px;
  margin-left: calc(70px + var(--space-3));
}
.sources label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}
.sources input {
  accent-color: var(--color-danger);
}
.gone {
  color: var(--color-text-muted);
  font-style: italic;
}
.status {
  flex: none;
  width: 70px;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-pending);
}
.summary {
  flex: 1;
  min-width: 200px;
  overflow-wrap: anywhere;
}
.by {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.actions,
.reason {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.button {
  min-height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}
.text-button {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: underline;
}
.reason input {
  min-height: 32px;
  padding: 0 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
@media (max-width: 800px) {
  .proposals {
    max-height: none;
  }
}
</style>
