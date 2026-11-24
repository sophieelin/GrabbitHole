<script setup lang="ts">
import { onMounted, ref } from "vue";
import Dialog from "../reusable/ui/Dialog.vue";

/** Renames a group from its menu on the graph, through the same Grouping endpoint as the Groups dialog. */
const props = defineProps<{ name: string; busy: boolean; refusal: string }>();
const emit = defineEmits<{ rename: [name: string]; close: [] }>();

const draft = ref(props.name);
const input = ref<HTMLInputElement | null>(null);
onMounted(() => input.value?.select());
function save() {
  const name = draft.value.trim();
  if (name === "" || name === props.name) return;
  emit("rename", name);
}
</script>

<template>
  <Dialog title="Rename group" @close="emit('close')">
    <form class="rename" @submit.prevent="save">
      <label class="field">
        Name
        <input ref="input" v-model="draft" type="text" maxlength="40" autocomplete="off" />
      </label>
      <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
      <div class="actions">
        <button type="button" class="button outline" @click="emit('close')">Cancel</button>
        <button type="submit" class="button primary" :disabled="busy || draft.trim() === '' || draft.trim() === name">Rename</button>
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.rename {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
</style>
