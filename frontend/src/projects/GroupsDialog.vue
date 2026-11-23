<script setup lang="ts">
import { ref } from "vue";
import type { GroupId, GroupStyle } from "../graph/types.ts";
import Dialog from "../reusable/ui/Dialog.vue";

/** The project's topic groups: add one, rename one, or remove one (its sources become ungrouped). */
defineProps<{ name: string; groups: GroupStyle[]; busy: boolean; refusal: string }>();
const emit = defineEmits<{ close: []; create: [name: string]; rename: [group: GroupId, name: string]; remove: [group: GroupId] }>();

const fresh = ref("");
function create() {
  if (fresh.value.trim() === "") return;
  emit("create", fresh.value.trim());
  fresh.value = "";
}
function rename(group: GroupStyle, event: Event) {
  const input = event.target as HTMLInputElement;
  const name = input.value.trim();
  if (name === "" || name === group.name) input.value = group.name;
  else emit("rename", group.group, name);
}
</script>

<template>
  <Dialog title="Groups" :subtitle="name" @close="emit('close')">
    <div class="groups">
      <p v-if="groups.length === 0" class="quiet">No groups yet. Make one for each topic in your research, then put sources in it from the source panel.</p>
      <ul v-else>
        <li v-for="group in groups" :key="group.group">
          <span class="dot" :style="{ background: group.color }"></span>
          <input :value="group.name" type="text" maxlength="40" :aria-label="`Name of ${group.name}`" @change="rename(group, $event)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span class="count">{{ group.count }} {{ group.count === 1 ? "source" : "sources" }}</span>
          <button type="button" class="text-button" :disabled="busy" @click="emit('remove', group.group)">Remove</button>
        </li>
      </ul>
      <form class="add" @submit.prevent="create">
        <label class="field">
          New group
          <input v-model="fresh" type="text" maxlength="40" autocomplete="off" placeholder="A topic, like Chemistry" />
        </label>
        <button type="submit" class="button primary" :disabled="busy || fresh.trim() === ''">Add group</button>
      </form>
      <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
    </div>
  </Dialog>
</template>

<style scoped>
.groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
ul {
  list-style: none;
  padding: 0;
}
li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-line);
}
.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
li input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 8px;
  border: 1.5px solid transparent;
  border-radius: 8px;
  background: none;
  font-weight: 600;
}
li input:hover,
li input:focus {
  outline: none;
  border-color: var(--color-border);
  background: var(--color-surface);
}
.count {
  flex: none;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.text-button {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-danger);
  text-decoration: underline;
}
.add {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}
.add .field {
  flex: 1;
}
.add .button {
  min-height: 44px;
}
.quiet {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
