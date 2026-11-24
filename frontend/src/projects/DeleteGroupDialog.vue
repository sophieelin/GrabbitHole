<script setup lang="ts">
import Dialog from "../reusable/ui/Dialog.vue";

/**
 * Asks before deleting a group. Deleting it (Grouping.removeGroup) takes its sources out of it and
 * removes the group; the sources, their connections and their notes stay in the graph.
 */
defineProps<{ name: string; count: number; busy: boolean }>();
const emit = defineEmits<{ confirm: []; close: [] }>();
</script>

<template>
  <Dialog title="Delete group?" @close="emit('close')">
    <div class="delete">
      <p v-if="count === 0">Delete the empty group <strong>{{ name }}</strong>?</p>
      <template v-else>
        <p>Delete <strong>{{ name }}</strong>? Its {{ count === 1 ? "source" : `${count} sources` }} will become ungrouped.</p>
        <p class="quiet">{{ count === 1 ? "It stays" : "They stay" }} in the research graph, with {{ count === 1 ? "its" : "their" }} connections and notes.</p>
      </template>
      <div class="actions">
        <button type="button" class="button outline" @click="emit('close')">Cancel</button>
        <button type="button" class="button danger" :disabled="busy" @click="emit('confirm')">Delete group</button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.delete {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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
