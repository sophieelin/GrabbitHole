<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import Icon from "../reusable/ui/Icon.vue";
import { labelOf, sourceName } from "./labels.ts";
import type { GroupStyle, Source, SourceId } from "./types.ts";

/**
 * Finds a source in the graph by its name, its domain, or any part of its URL, ignoring case. It
 * only reads the graph the page already has, so typing never redraws the graph; choosing a result
 * hands its source to the page, which selects it and brings it into view.
 */
const props = defineProps<{ sources: Source[]; groupOf: Map<SourceId, GroupStyle> }>();
const emit = defineEmits<{ choose: [source: SourceId] }>();

const query = ref("");
const open = ref(false);
const active = ref(-1);
const root = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const listId = useId();

interface Result {
  source: SourceId;
  name: string;
  domain: string;
  group: GroupStyle | null;
  rank: number;
}

/**
 * The matches, best first: a name that starts with the query, then one that contains it, then the
 * domain, then anywhere else in the URL.
 */
const results = computed<Result[]>(() => {
  const needle = query.value.trim().toLowerCase();
  if (needle === "") return [];
  const found: Result[] = [];
  for (const source of props.sources) {
    const name = sourceName(source, 80);
    const { site, page } = labelOf(source.url);
    const lowerName = name.toLowerCase();
    const rank = lowerName.startsWith(needle)
      ? 0
      : lowerName.includes(needle) || page.toLowerCase().includes(needle)
        ? 1
        : site.toLowerCase().includes(needle)
          ? 2
          : source.url.toLowerCase().includes(needle)
            ? 3
            : -1;
    if (rank >= 0) found.push({ source: source.source, name, domain: site, group: props.groupOf.get(source.source) ?? null, rank });
  }
  return found.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
});

// A new query starts again from no highlighted result; results that change under it keep it in range.
watch(query, () => {
  active.value = -1;
  open.value = query.value.trim() !== "";
});
watch(results, (now) => {
  if (active.value >= now.length) active.value = now.length - 1;
});

function choose(result: Result) {
  open.value = false;
  emit("choose", result.source);
  input.value?.blur();
}

async function move(by: number) {
  if (!open.value) open.value = query.value.trim() !== "";
  const count = results.value.length;
  if (count === 0) return;
  active.value = active.value < 0 ? (by > 0 ? 0 : count - 1) : (active.value + by + count) % count;
  await nextTick();
  list.value?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
}

/** The search's own keys; each one handled here goes no further, so the graph and page never see it. */
function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") void move(1);
  else if (event.key === "ArrowUp") void move(-1);
  else if (event.key === "Enter") {
    const pick = results.value[active.value >= 0 ? active.value : 0];
    if (open.value && pick) choose(pick);
  } else if (event.key === "Escape") {
    if (open.value) open.value = false;
    else if (query.value !== "") query.value = "";
    else input.value?.blur();
  } else return;
  event.preventDefault();
  event.stopPropagation();
}

function clear() {
  query.value = "";
  input.value?.focus();
}

// A click anywhere outside the search closes its results.
function closeIfOutside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false;
}
watch(open, (now) => {
  if (now) document.addEventListener("pointerdown", closeIfOutside, true);
  else document.removeEventListener("pointerdown", closeIfOutside, true);
});
onBeforeUnmount(() => document.removeEventListener("pointerdown", closeIfOutside, true));
</script>

<template>
  <div ref="root" class="search">
    <div class="searchbox">
      <Icon name="search" :size="16" />
      <input
        ref="input"
        v-model="query"
        type="search"
        placeholder="Search sources…"
        aria-label="Search sources"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="open && active >= 0 ? `${listId}-${active}` : undefined"
        @focus="open = query.trim() !== ''"
        @keydown="onKeydown"
      />
      <button v-if="query" type="button" class="clear" aria-label="Clear search" @click="clear"><Icon name="close" :size="14" /></button>
    </div>
    <ul v-if="open" :id="listId" ref="list" class="results" role="listbox" aria-label="Matching sources">
      <li v-if="results.length === 0" class="none" role="option" aria-disabled="true">No matching sources</li>
      <li
        v-for="(result, index) in results"
        :id="`${listId}-${index}`"
        :key="result.source"
        :data-index="index"
        role="option"
        :aria-selected="index === active"
        :class="{ active: index === active }"
        @pointerdown.prevent
        @click="choose(result)"
        @pointermove="active = index"
      >
        <span class="name">{{ result.name }}</span>
        <span class="meta">
          <span class="domain">{{ result.domain }}</span>
          <span v-if="result.group" class="group" :style="{ color: result.group.color }"><i class="dot"></i>{{ result.group.name }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  z-index: 11;
  width: 280px;
  max-width: calc(100% - 220px);
  min-width: 160px;
}
/* Not ".field": that class is the app's labelled text box, laid out as a column. */
.searchbox {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 6px 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-muted);
}
.searchbox:focus-within {
  border-color: var(--color-text);
}
.searchbox svg {
  flex: none;
}
input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
  outline: none;
}
/* The browser's own clear button; the search has its own. */
input::-webkit-search-cancel-button {
  display: none;
}
.clear {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.clear:hover {
  color: var(--color-text);
  background: var(--color-page);
}
.results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: max(100%, 300px);
  max-width: min(360px, calc(100vw - 32px));
  max-height: 320px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-popover);
}
.results li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.results li.active {
  background: var(--color-page);
}
.results li.none {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  cursor: default;
}
.name {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.domain {
  overflow: hidden;
  font-family: var(--font-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
/* A narrow drawing (a small window, or the source panel beside it) has no room beside the view toggle,
   so the search takes its own row under it. */
@container (max-width: 440px) {
  .search {
    top: calc(var(--space-3) + 44px);
    right: var(--space-3);
    width: auto;
    max-width: none;
    min-width: 0;
  }
}
</style>
