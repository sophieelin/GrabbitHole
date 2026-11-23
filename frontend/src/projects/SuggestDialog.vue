<script setup lang="ts">
import { onMounted, ref } from "vue";
import { shortName } from "../graph/labels.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { suggestGroups, type Suggestion } from "./suggest.ts";

/**
 * Asks Claude to sort the project's ungrouped sources into groups and shows what it suggests.
 * Nothing changes until the member chooses which suggestions to keep and applies them.
 */
const props = defineProps<{ project: string; name: string; applying: boolean; refusal: string }>();
const emit = defineEmits<{ close: []; apply: [suggestions: Suggestion[]] }>();

const suggestions = ref<Suggestion[] | null>(null);
const kept = ref<boolean[]>([]);
const failed = ref("");

async function ask() {
  suggestions.value = null;
  failed.value = "";
  const result = await suggestGroups(props.project);
  if ("failed" in result) failed.value = result.failed;
  else {
    suggestions.value = result.suggestions;
    kept.value = result.suggestions.map(() => true);
  }
}
onMounted(ask);

const apply = () => emit("apply", (suggestions.value ?? []).filter((_, index) => kept.value[index]));
</script>

<template>
  <Dialog title="Suggested groups" :subtitle="name" @close="emit('close')">
    <div class="suggest">
      <p v-if="failed" class="refusal" role="alert">{{ failed }}</p>
      <p v-else-if="suggestions === null" class="quiet" role="status">Asking Claude to sort the sources that aren't in a group yet…</p>
      <p v-else-if="suggestions.length === 0" class="quiet">Claude found nothing to group. Every source is already in a group, or the rest don't share a topic.</p>
      <template v-else>
        <p class="quiet">Claude only sees each page's address, not its content. Untick anything that looks wrong, and you can move sources afterwards.</p>
        <ul>
          <li v-for="(row, index) in suggestions" :key="row.name">
            <label>
              <input v-model="kept[index]" type="checkbox" />
              <span class="group">{{ row.name }}</span>
              <span class="kind">{{ row.group ? "add to this group" : "new group" }} · {{ row.sources.length }}</span>
            </label>
            <p class="sources">{{ row.sources.map(({ url }) => shortName(url, 40)).join(" · ") }}</p>
          </li>
        </ul>
      </template>
      <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
      <div class="actions">
        <button v-if="failed" type="button" class="button outline" @click="ask">Try again</button>
        <button v-if="suggestions?.length" type="button" class="button primary" :disabled="applying || !kept.some(Boolean)" @click="apply">
          {{ applying ? "Applying…" : "Apply" }}
        </button>
        <button type="button" class="text-button" @click="emit('close')">{{ suggestions?.length ? "Cancel" : "Close" }}</button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.suggest {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.quiet {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
ul {
  list-style: none;
  padding: 0;
  max-height: 46vh;
  overflow-y: auto;
}
li {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-line);
}
label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  cursor: pointer;
}
.group {
  font-weight: 700;
}
.kind {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.sources {
  margin: 4px 0 0 24px;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.text-button {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: underline;
}
</style>
