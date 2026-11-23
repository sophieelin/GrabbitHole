<script setup lang="ts">
import dagre from "@dagrejs/dagre";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { labelOf } from "./labels.ts";
import type { GroupId, GroupStyle, ResearchGraph, SourceId } from "./types.ts";

/**
 * Draws a research graph as a trail read left to right: each source is a card, and each followed
 * link is a curve from the page a researcher was on to the page they went to. Pages nobody arrived
 * at from another page sit in the first column. Drag the background to move and scroll to zoom.
 */
const props = defineProps<{
  graph: ResearchGraph;
  selected: SourceId | null;
  /** The group each grouped source is in. A grouped card carries its group's color on its left edge. */
  groupOf?: Map<SourceId, GroupStyle>;
  /** When set, sources outside this group are faded. */
  focus?: GroupId | null;
}>();
const emit = defineEmits<{ select: [source: SourceId | null] }>();

const CARD = { width: 224, height: 56 };
const PADDING = 32;

/** Positions from a layered layout, which keeps links pointing one way and crossings few. */
const layout = computed(() => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 16, ranksep: 72, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const { source } of props.graph.sources) g.setNode(source, { ...CARD });
  for (const { connection, source, destination } of props.graph.connections) {
    if (g.hasNode(source) && g.hasNode(destination)) g.setEdge(source, destination, { id: connection });
  }
  dagre.layout(g);
  const cards = props.graph.sources.map((source) => {
    const { x, y } = g.node(source.source);
    return { source, ...labelOf(source.url), left: x - CARD.width / 2, top: y - CARD.height / 2 };
  });
  const links = props.graph.connections.flatMap((connection) => {
    const edge = g.edge(connection.source, connection.destination) as { points?: { x: number; y: number }[] } | undefined;
    if (!edge?.points) return [];
    const from = g.node(connection.source);
    const to = g.node(connection.destination);
    const start = { x: from.x + CARD.width / 2, y: from.y };
    const end = { x: to.x - CARD.width / 2, y: to.y };
    // A link to the next column leaves the right edge and arrives at the left edge as one S-curve.
    // Longer or backward links follow the layout's own route around the cards between.
    const bend = (end.x - start.x) / 2;
    const direct = end.x > start.x && end.x - start.x < 100;
    const path = direct
      ? `M${start.x},${start.y} C${start.x + bend},${start.y} ${end.x - bend},${end.y} ${end.x},${end.y}`
      : smooth(edge.points);
    return [{ connection, path }];
  });
  const size = g.graph();
  return { cards, links, width: size.width ?? 0, height: size.height ?? 0 };
});

/** A smooth curve through the layout's points. */
function smooth(points: { x: number; y: number }[]): string {
  const [first, ...rest] = points;
  if (first === undefined) return "";
  let path = `M${first.x},${first.y}`;
  for (let i = 0; i < rest.length; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    path += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return path;
}

const touchesSelected = (connection: { source: SourceId; destination: SourceId }) =>
  props.selected !== null && (connection.source === props.selected || connection.destination === props.selected);

// Moving and zooming the drawing.
const viewport = ref<HTMLElement | null>(null);
const view = reactive({ x: 0, y: 0, scale: 1 });

/** Shows the whole graph when it fits at a readable size; otherwise shows its start, readable, and the rest is a drag away. */
function fit() {
  const box = viewport.value?.getBoundingClientRect();
  if (!box || layout.value.width === 0) return;
  const { width, height } = layout.value;
  const scale = Math.max(0.6, Math.min(1, (box.width - PADDING * 2) / width, (box.height - PADDING * 2) / height));
  view.scale = scale;
  view.x = Math.max(PADDING, (box.width - width * scale) / 2);
  view.y = Math.max(PADDING, (box.height - height * scale) / 2);
}

function zoom(factor: number, at?: { x: number; y: number }) {
  const box = viewport.value?.getBoundingClientRect();
  if (!box) return;
  const point = at ?? { x: box.width / 2, y: box.height / 2 };
  const scale = Math.min(2, Math.max(0.3, view.scale * factor));
  view.x = point.x - ((point.x - view.x) * scale) / view.scale;
  view.y = point.y - ((point.y - view.y) * scale) / view.scale;
  view.scale = scale;
}

function onWheel(event: WheelEvent) {
  const box = viewport.value!.getBoundingClientRect();
  // Pinching (or ctrl + scroll) zooms; plain scrolling moves the drawing, as on a map.
  if (event.ctrlKey || event.metaKey) {
    zoom(Math.exp(-event.deltaY * 0.01), { x: event.clientX - box.left, y: event.clientY - box.top });
  } else {
    view.x -= event.deltaX;
    view.y -= event.deltaY;
  }
}

let drag: { x: number; y: number; moved: boolean } | null = null;
const dragging = ref(false);
function onPointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement).closest(".card")) return;
  drag = { x: event.clientX, y: event.clientY, moved: false };
  viewport.value?.setPointerCapture(event.pointerId);
}
function onPointerMove(event: PointerEvent) {
  if (drag === null) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
  drag = { x: event.clientX, y: event.clientY, moved: true };
  dragging.value = true;
  view.x += dx;
  view.y += dy;
}
function onPointerUp() {
  // A click on the background, without a drag, clears the selection.
  if (drag !== null && !drag.moved) emit("select", null);
  drag = null;
  dragging.value = false;
}

const observer = new ResizeObserver(() => {
  // Fit once the drawing has a size; after that the user's own view is kept.
  if (!fitted && viewport.value && viewport.value.clientWidth > 0) {
    fitted = true;
    fit();
  }
});
let fitted = false;
onMounted(() => viewport.value && observer.observe(viewport.value));
onBeforeUnmount(() => observer.disconnect());
watch(() => props.graph.sources.length, fit, { flush: "post" });

defineExpose({ fit, zoom });
</script>

<template>
  <div
    ref="viewport"
    class="viewport"
    :class="{ dragging }"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div class="stage" :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, width: `${layout.width}px`, height: `${layout.height}px` }">
      <svg class="links" :width="layout.width" :height="layout.height" aria-hidden="true">
        <defs>
          <marker v-for="tone in ['grey', 'ink']" :id="`arrow-${tone}`" :key="tone" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0.5,1 L7,4 L0.5,7" fill="none" :stroke="tone === 'ink' ? '#1e2833' : '#a9a294'" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </marker>
        </defs>
        <path
          v-for="link in layout.links"
          :key="link.connection.connection"
          :d="link.path"
          :class="{ noted: link.connection.notes.length > 0, active: touchesSelected(link.connection), faded: selected !== null && !touchesSelected(link.connection) }"
          :marker-end="`url(#arrow-${link.connection.notes.length > 0 || touchesSelected(link.connection) ? 'ink' : 'grey'})`"
        />
      </svg>
      <button
        v-for="card in layout.cards"
        :key="card.source.source"
        type="button"
        class="card"
        :class="{
          selected: card.source.source === selected,
          grouped: groupOf?.has(card.source.source),
          faded: focus != null && card.source.source !== selected && groupOf?.get(card.source.source)?.group !== focus,
        }"
        :style="{
          left: `${card.left}px`,
          top: `${card.top}px`,
          width: `${CARD.width}px`,
          height: `${CARD.height}px`,
          '--group': groupOf?.get(card.source.source)?.color,
        }"
        :aria-pressed="card.source.source === selected"
        :title="groupOf?.has(card.source.source) ? `${groupOf.get(card.source.source)!.name} · ${card.source.url}` : card.source.url"
        @click="emit('select', card.source.source)"
      >
        <span class="title">{{ card.page || card.site }}</span>
        <span class="meta">
          <span class="site">{{ card.site }}</span>
          <span v-if="card.source.notes.length" class="notes">
            {{ card.source.notes.length }} {{ card.source.notes.length === 1 ? "note" : "notes" }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.viewport.dragging {
  cursor: grabbing;
}
.stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}
.links {
  position: absolute;
  inset: 0;
  overflow: visible;
}
.links path {
  fill: none;
  stroke: #a9a294;
  stroke-width: 1.5;
  transition: opacity 0.12s;
}
.links path.noted {
  stroke: var(--color-text);
  stroke-width: 2.5;
}
.links path.active {
  stroke: var(--color-text);
}
.links path.faded {
  opacity: 0.4;
}
.card {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: 0 1px 2px rgba(30, 40, 51, 0.06);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.12s,
    box-shadow 0.12s,
    opacity 0.12s;
}
.card.selected:not(.grouped) {
  border-left-color: var(--color-text);
}
.card:hover:not(.grouped):not(.selected) {
  border-left-color: var(--color-text-muted);
}
.card.grouped {
  padding-left: 10px;
  border-left: 5px solid var(--group);
}
.card.faded {
  opacity: 0.35;
}
.card:hover {
  border-top-color: var(--color-text-muted);
  border-right-color: var(--color-text-muted);
  border-bottom-color: var(--color-text-muted);
  box-shadow: 0 2px 8px rgba(30, 40, 51, 0.1);
}
.card.selected {
  border-top-color: var(--color-text);
  border-right-color: var(--color-text);
  border-bottom-color: var(--color-text);
  box-shadow:
    0 0 0 1px var(--color-text),
    0 4px 14px rgba(30, 40, 51, 0.14);
}
.title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title::first-letter {
  text-transform: uppercase;
}
.meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.site {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notes {
  flex: none;
  font-family: var(--font-title);
  font-style: italic;
  font-size: 0.8125rem;
  color: var(--color-text);
}
</style>
