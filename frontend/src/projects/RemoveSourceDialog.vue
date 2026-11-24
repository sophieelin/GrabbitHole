<script setup lang="ts">
import { computed } from "vue";
import { shortName } from "../graph/labels.ts";
import type { ResearchGraph, Source, SourceId } from "../graph/types.ts";
import Dialog from "../reusable/ui/Dialog.vue";

/**
 * Asks before proposing to remove one source or several. It says what accepted removals take with
 * them, as DiscoveryLinking.removeSource does: every connection to or from a removed source, and
 * the notes on the sources and on those connections. A connection between two of the sources is
 * counted once. Only what applies is named, and a source whose removal is already waiting for
 * review is left out.
 */
const props = defineProps<{
  graph: ResearchGraph;
  sources: Source[];
  /** For one source, the name of its group, if any. */
  group: string | null;
  /** Sources whose removal is already waiting for review. */
  alreadyProposed: Set<SourceId>;
  busy: boolean;
}>();
const emit = defineEmits<{ confirm: []; close: [] }>();

const toPropose = computed(() => props.sources.filter(({ source }) => !props.alreadyProposed.has(source)));
const single = computed(() => props.sources.length === 1);
const counted = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The connections that would go, each once, and the notes on them and on the sources. */
const affected = computed(() => {
  const ids = new Set(toPropose.value.map(({ source }) => source));
  const connections = props.graph.connections.filter(({ source, destination }) => ids.has(source) || ids.has(destination));
  const notes = toPropose.value.reduce((sum, { notes }) => sum + notes.length, 0) + connections.reduce((sum, { notes }) => sum + notes.length, 0);
  return { connections: connections.length, notes };
});

/** "Removing this source will also remove its 2 connections and 1 note, and take it out of History." */
const consequence = computed(() => {
  const { connections, notes } = affected.value;
  const removed = [
    connections > 0 ? counted(connections, "connection", "connections") : null,
    notes > 0 ? counted(notes, "note", "notes") : null,
  ].filter((part) => part !== null);
  if (single.value) {
    const parts = [removed.length > 0 ? `remove its ${removed.join(" and ")}` : null, props.group ? `take it out of ${props.group}` : null].filter(
      (part) => part !== null,
    );
    return parts.length > 0 ? `Removing this source will also ${parts.join(", and ")}.` : null;
  }
  return removed.length > 0 ? `Removing these sources will also remove ${removed.join(" and ")}.` : null;
});
const skipped = computed(() => props.sources.length - toPropose.value.length);
</script>

<template>
  <Dialog :title="single ? 'Propose source removal?' : `Propose removing ${sources.length} sources?`" @close="emit('close')">
    <div class="remove">
      <div v-if="single">
        <p class="name">{{ shortName(sources[0]!.url, 80) }}</p>
        <p class="url">{{ sources[0]!.url }}</p>
      </div>
      <ul v-else class="names">
        <li v-for="row in sources" :key="row.source" :class="{ skipped: alreadyProposed.has(row.source) }" :title="row.url">
          {{ shortName(row.url, 60) }} <span v-if="alreadyProposed.has(row.source)" class="tag">already proposed</span>
        </li>
      </ul>
      <p v-if="consequence">{{ consequence }}</p>
      <p class="quiet">Changes take effect only after reviewer approval.</p>
      <p v-if="single && skipped" class="refusal" role="alert">A proposal to remove this source is already waiting for review.</p>
      <p v-else-if="skipped" class="quiet">
        {{ skipped === 1 ? "1 source is" : `${skipped} sources are` }} already waiting for review and won't be proposed again.
      </p>
      <div class="actions">
        <button type="button" class="button outline" @click="emit('close')">Cancel</button>
        <button type="button" class="button danger" :disabled="busy || toPropose.length === 0" @click="emit('confirm')">Propose removal</button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.remove {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.url {
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
.names {
  list-style: none;
  max-height: 180px;
  overflow-y: auto;
  padding: 0;
  border-top: 1px solid var(--color-line);
}
.names li {
  padding: 7px 0;
  border-bottom: 1px solid var(--color-line);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.names li.skipped {
  color: var(--color-text-muted);
  font-weight: 400;
}
.tag {
  margin-left: var(--space-2);
  font-size: var(--text-xs);
}
.quiet {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
</style>
