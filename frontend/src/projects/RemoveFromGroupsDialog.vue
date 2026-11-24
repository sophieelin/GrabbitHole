<script setup lang="ts">
import { computed } from "vue";
import type { GroupStyle } from "../graph/types.ts";
import Dialog from "../reusable/ui/Dialog.vue";

/**
 * Asks before taking the selected sources out of their groups. The selection may span several
 * groups; each affected group is listed with how many of its sources leave it. Selected sources in
 * no group are not counted. Nothing is deleted: the sources stay in the graph and the groups stay.
 */
const props = defineProps<{
  /** Each affected group, with how many selected sources leave it. */
  groups: (GroupStyle & { leaving: number })[];
  busy: boolean;
}>();
const emit = defineEmits<{ confirm: []; close: [] }>();
const sources = (count: number) => `${count} ${count === 1 ? "source" : "sources"}`;
const total = computed(() => props.groups.reduce((sum, { leaving }) => sum + leaving, 0));
const oneGroup = computed(() => props.groups.length === 1);
</script>

<template>
  <Dialog :title="oneGroup ? 'Remove from group?' : 'Remove from groups?'" @close="emit('close')">
    <div class="ungroup">
      <p v-if="oneGroup">Remove {{ sources(total) }} from <strong>{{ groups[0]!.name }}</strong>?</p>
      <template v-else>
        <p>Remove {{ total }} selected sources from their respective groups?</p>
        <ul>
          <li v-for="group in groups" :key="group.group">
            <span class="dot" :style="{ background: group.color }"></span>
            <span class="name">{{ group.name }}</span> <span class="count">· {{ sources(group.leaving) }}</span>
          </li>
        </ul>
      </template>
      <p class="quiet">{{ total === 1 ? "This source" : "These sources" }} will remain in the research graph.</p>
      <div class="actions">
        <button type="button" class="button outline" @click="emit('close')">Cancel</button>
        <button type="button" class="button primary" :disabled="busy" @click="emit('confirm')">
          {{ oneGroup ? "Remove from group" : "Remove from groups" }}
        </button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.ungroup {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
ul {
  list-style: none;
  padding: 0;
}
li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 0;
}
.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.count {
  flex: none;
  color: var(--color-text-muted);
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
