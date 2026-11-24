<script setup lang="ts">
import Icon from "../reusable/ui/Icon.vue";
import Menu from "../reusable/ui/Menu.vue";

/**
 * A compact dropdown for the selection toolbar: a rounded text button with a chevron that opens
 * the shared Menu. Every dropdown in the toolbar uses this, so they look and behave alike. Put the
 * items inside as buttons with role="menuitem", with `<hr>` between sections; an item may hold a
 * `.dot` (a group's color) and a `.detail` line, and `.danger` marks a destructive one.
 */
defineProps<{ text: string; label: string; disabled?: boolean }>();
</script>

<template>
  <Menu class="dropdown" :class="{ disabled }" :label="label">
    <template #button>
      <span class="trigger">{{ text }}<Icon name="chevron" :size="14" /></span>
    </template>
    <slot />
  </Menu>
</template>

<style scoped>
.dropdown :deep(.icon-button) {
  width: auto;
  height: 30px;
  padding: 0 10px 0 12px;
  border: 1.5px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text);
}
.dropdown :deep(.icon-button:hover),
.dropdown :deep(.icon-button[aria-expanded="true"]) {
  border-color: var(--color-text);
  background: var(--color-surface);
}
.dropdown.disabled {
  opacity: 0.45;
  pointer-events: none;
}
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
}
.trigger svg {
  color: var(--color-text-muted);
}
.dropdown :deep(.items) {
  left: 0;
  right: auto;
  max-height: 320px;
  overflow-y: auto;
}
:slotted([role="menuitem"]) {
  align-items: center;
  width: 100%;
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}
:slotted([role="menuitem"]:disabled) {
  opacity: 0.45;
  cursor: default;
}
:slotted([role="menuitem"].danger),
:slotted([role="menuitem"].danger svg) {
  color: var(--color-danger);
}
:slotted([role="menuitem"].danger:hover:not(:disabled)) {
  background: var(--color-danger-soft);
}
:slotted(.dot) {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
:slotted(hr) {
  margin: 4px 6px;
  border: 0;
  border-top: 1px solid var(--color-line);
}
</style>
