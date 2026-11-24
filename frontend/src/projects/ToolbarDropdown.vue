<script setup lang="ts">
import Icon from "../reusable/ui/Icon.vue";
import Menu from "../reusable/ui/Menu.vue";

/**
 * A compact dropdown for the selection toolbar: a rounded text button with a chevron that opens
 * the shared Menu. Every dropdown in the toolbar uses this, so they look and behave alike. Put the
 * items inside as buttons with role="menuitem", each holding a `.icon` (an Icon, or a `.dot` in a
 * group's color) and a `.label`, with `<hr>` between sections; `.danger` marks a destructive item.
 * The icon slot has a fixed width, so every label starts at the same place.
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
/*
 * Menu items. These selectors start from the dropdown itself so they take precedence over the shared
 * Menu's own item rules (which align items to the top, lifting a group's dot above its name).
 */
.dropdown :deep(.items [role="menuitem"]) {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 20px;
  color: var(--color-text);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.dropdown :deep(.items [role="menuitem"]:hover),
.dropdown :deep(.items [role="menuitem"]:focus-visible) {
  background: var(--color-page);
  outline: none;
}
.dropdown :deep(.items [role="menuitem"].danger) {
  color: var(--color-danger);
}
.dropdown :deep(.items [role="menuitem"].danger:hover),
.dropdown :deep(.items [role="menuitem"].danger:focus-visible) {
  background: var(--color-danger-soft);
}
/* A fixed-width slot, centered on the label's line, for an icon or a group's dot. */
.dropdown :deep(.items .icon) {
  flex: none;
  display: grid;
  place-items: center;
  width: 18px;
  height: 20px;
  color: var(--color-text-muted);
}
.dropdown :deep(.items .danger .icon) {
  color: var(--color-danger);
}
.dropdown :deep(.items .icon svg) {
  margin: 0;
}
.dropdown :deep(.items .dot) {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dropdown :deep(.items .label) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown :deep(.items hr) {
  margin: 4px 6px;
  border: 0;
  border-top: 1px solid var(--color-line);
}
</style>
