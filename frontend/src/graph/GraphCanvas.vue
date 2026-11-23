<script setup lang="ts">
import dagre from "@dagrejs/dagre";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { shortName } from "./labels.ts";
import type { GroupStyle, ResearchGraph, Source, SourceId } from "./types.ts";

/**
 * Draws a research graph as clusters. Each source is a pill with its name. A group's sources sit
 * together under the group's name, in the group's color, and a line inside a group runs from the
 * page a researcher was on to the page they went to. Links between groups stay hidden until a
 * source is selected; then its links are drawn and everything else fades. A dark pill is a page
 * nobody arrived at from another page: where a session started.
 */
const props = defineProps<{
  graph: ResearchGraph;
  selected: SourceId | null;
  /** The groups in the order they were made. */
  groups: GroupStyle[];
  /** The group each grouped source is in. */
  groupOf: Map<SourceId, GroupStyle>;
}>();
const emit = defineEmits<{ select: [source: SourceId | null] }>();

const INK = "#1e2833";
const GREY = "#8f8a7f";
const FONT = "600 14px Helvetica, Arial, sans-serif";
const PILL_HEIGHT = 32;
const LABEL_HEIGHT = 34;
const COLUMN_ROWS = 5;

interface Pill {
  source: Source;
  name: string;
  width: number;
  /** The center of the pill. */
  x: number;
  y: number;
  color: string | null;
  start: boolean;
}
interface Cluster {
  key: string;
  name: string;
  color: string;
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pills: Pill[];
}

// Pill widths come from measuring each name, so the layout knows every size before drawing.
const measure = document.createElement("canvas").getContext("2d");
function widthOf(name: string): number {
  if (measure === null) return name.length * 8 + 30;
  measure.font = FONT;
  return Math.ceil(measure.measureText(name).width) + 30;
}

const viewport = ref<HTMLElement | null>(null);
/** The room the drawing had when it first appeared. The rows of clusters are chosen to fill it. */
const room = ref({ width: 1100, height: 560 });

const layout = computed(() => {
  const arrivedAt = new Set(props.graph.connections.map(({ destination }) => destination));
  const groupKey = (source: SourceId) => props.groupOf.get(source)?.group ?? "";

  // 1. Inside a cluster, linked sources form small left-to-right trees. Sources with no link
  //    inside the cluster are stacked in short columns beneath them.
  const order = [...props.groups.map(({ group }) => group as string), ""];
  const clusters: Cluster[] = [];
  for (const key of order) {
    const members = props.graph.sources.filter(({ source }) => groupKey(source) === key);
    if (members.length === 0) continue;
    const ids = new Set(members.map(({ source }) => source));
    const inside = props.graph.connections.filter(({ source, destination }) => ids.has(source) && ids.has(destination) && source !== destination);
    const linked = new Set(inside.flatMap(({ source, destination }) => [source, destination]));
    const style = props.groupOf.get(members[0]!.source) ?? null;
    const pills = new Map<SourceId, Pill>();
    for (const source of members) {
      const name = shortName(source.url);
      pills.set(source.source, { source, name, width: widthOf(name), x: 0, y: 0, color: style?.color ?? null, start: !arrivedAt.has(source.source) });
    }

    let width = 0;
    let height = 0;
    if (linked.size > 0) {
      const tree = new dagre.graphlib.Graph();
      tree.setGraph({ rankdir: "LR", nodesep: 10, ranksep: 40, marginx: 0, marginy: 0 });
      tree.setDefaultEdgeLabel(() => ({}));
      for (const id of linked) tree.setNode(id, { width: pills.get(id)!.width, height: PILL_HEIGHT });
      for (const { source, destination } of inside) tree.setEdge(source, destination);
      dagre.layout(tree);
      for (const id of linked) Object.assign(pills.get(id)!, { x: tree.node(id).x, y: tree.node(id).y });
      width = tree.graph().width ?? 0;
      height = tree.graph().height ?? 0;
    }
    // Starting points come first among the sources with no link inside the cluster.
    const loose = members
      .filter(({ source }) => !linked.has(source))
      .map(({ source }) => pills.get(source)!)
      .sort((a, b) => Number(b.start) - Number(a.start));
    let left = 0;
    const top = height === 0 ? 0 : height + 14;
    for (let start = 0; start < loose.length; start += COLUMN_ROWS) {
      const column = loose.slice(start, start + COLUMN_ROWS);
      const columnWidth = Math.max(...column.map((pill) => pill.width));
      column.forEach((pill, row) => Object.assign(pill, { x: left + pill.width / 2, y: top + row * (PILL_HEIGHT + 10) + PILL_HEIGHT / 2 }));
      left += columnWidth + 14;
      height = Math.max(height, top + column.length * (PILL_HEIGHT + 10) - 10);
    }
    width = Math.max(width, left - 14);

    const name = style?.name ?? "Not grouped yet";
    measure && (measure.font = "700 13px Helvetica, Arial, sans-serif");
    const labelWidth = (measure?.measureText(name.toUpperCase()).width ?? 120) * 1.18 + 40;
    clusters.push({
      key,
      name,
      color: style?.color ?? "#5b6470",
      count: members.length,
      x: 0,
      y: 0,
      width: Math.max(width, props.groups.length > 0 ? labelWidth : 0),
      height: height + LABEL_HEIGHT,
      pills: [...pills.values()],
    });
  }

  // 2. Clusters go in rows, like words on a page. Every sensible row width is tried, and the one
  //    that lets the whole drawing appear largest in the room wins. The result depends only on
  //    the data and the room, so the picture does not move between visits.
  const GAP_X = 64;
  const GAP_Y = 46;
  function rows(limit: number) {
    const placed: { cluster: Cluster; x: number; y: number }[] = [];
    const widths: number[] = [];
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    for (const cluster of clusters) {
      if (x > 0 && x + cluster.width > limit) {
        widths.push(x - GAP_X);
        x = 0;
        y += rowHeight + GAP_Y;
        rowHeight = 0;
      }
      placed.push({ cluster, x, y });
      x += cluster.width + GAP_X;
      rowHeight = Math.max(rowHeight, cluster.height);
    }
    widths.push(x - GAP_X);
    return { placed, width: Math.max(...widths, 0), height: y + rowHeight };
  }
  const widest = Math.max(...clusters.map(({ width }) => width), 0);
  const allInOneRow = clusters.reduce((sum, { width }) => sum + width + GAP_X, 0);
  let best = rows(widest);
  let bestScale = 0;
  for (let limit = widest; limit <= allInOneRow + 1; limit += 20) {
    const tried = rows(limit);
    const scale = Math.min(room.value.width / tried.width, room.value.height / tried.height);
    if (scale > bestScale + 0.001) {
      best = tried;
      bestScale = scale;
    }
  }
  for (const { cluster, x, y } of best.placed) {
    cluster.x = x;
    cluster.y = y;
    for (const pill of cluster.pills) {
      pill.x += x;
      pill.y += y + LABEL_HEIGHT;
    }
  }
  const pillOf = new Map(clusters.flatMap(({ pills }) => pills.map((pill) => [pill.source.source, pill] as const)));

  // 3. Links. One inside a cluster is always drawn, in the cluster's color. One between clusters
  //    is drawn only for the selected source.
  const links = props.graph.connections.flatMap((connection) => {
    const from = pillOf.get(connection.source);
    const to = pillOf.get(connection.destination);
    if (!from || !to || from === to) return [];
    const within = groupKey(connection.source) === groupKey(connection.destination);
    const forward = to.x - to.width / 2 > from.x + from.width / 2 + 8;
    return [{ connection, within, color: within ? (from.color ?? GREY) : INK, path: within && forward ? sideways(from, to) : across(from, to) }];
  });
  return { clusters, links, width: best.width, height: best.height, showLabels: props.groups.length > 0 };
});

/** A curve from the right end of one pill to the left end of the next, inside a cluster. */
function sideways(from: Pill, to: Pill): string {
  const x1 = from.x + from.width / 2 + 2;
  const x2 = to.x - to.width / 2 - 4;
  const bend = Math.max(12, (x2 - x1) / 2);
  return `M${x1},${from.y} C${x1 + bend},${from.y} ${x2 - bend},${to.y} ${x2},${to.y}`;
}

/** A gentle arc between the edges of two pills anywhere on the page. */
function across(from: Pill, to: Pill): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Two pills stacked above one another are joined down their left sides, so the line does not run
  // through the pills between them.
  if (Math.abs(dx) < Math.abs(dy) * 0.6) {
    const x1 = from.x - from.width / 2 - 2;
    const x2 = to.x - to.width / 2 - 4;
    const out = Math.min(x1, x2) - Math.min(56, 22 + Math.abs(dy) * 0.12);
    return `M${x1},${from.y} C${out},${from.y} ${out},${to.y} ${x2},${to.y}`;
  }
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const reach = (pill: Pill) => Math.min(ux ? (pill.width / 2 + 3) / Math.abs(ux) : Infinity, uy ? (PILL_HEIGHT / 2 + 3) / Math.abs(uy) : Infinity);
  const x1 = from.x + ux * reach(from);
  const y1 = from.y + uy * reach(from);
  const x2 = to.x - ux * (reach(to) + 3);
  const y2 = to.y - uy * (reach(to) + 3);
  const bow = Math.min(60, distance * 0.16);
  return `M${x1},${y1} Q${(x1 + x2) / 2 - uy * bow},${(y1 + y2) / 2 + ux * bow} ${x2},${y2}`;
}

/** The selected source and every source one link away from it. */
const near = computed(() => {
  const found = new Set<SourceId>();
  if (props.selected === null) return found;
  found.add(props.selected);
  for (const { source, destination } of props.graph.connections) {
    if (source === props.selected) found.add(destination);
    if (destination === props.selected) found.add(source);
  }
  return found;
});
const touches = (connection: { source: SourceId; destination: SourceId }) =>
  props.selected !== null && (connection.source === props.selected || connection.destination === props.selected);
const markerColors = computed(() => [...new Set([GREY, INK, ...props.groups.map(({ color }) => color)])]);
const markerId = (color: string) => `arrow-${color.replace("#", "")}`;

// Moving and zooming the drawing.
const view = reactive({ x: 0, y: 0, scale: 1 });

/** Shows the whole graph when it fits at a readable size; otherwise its top left corner, readable, with the rest a drag away. */
function fit() {
  const box = viewport.value?.getBoundingClientRect();
  if (!box || layout.value.width === 0) return;
  const { width, height } = layout.value;
  const scale = Math.max(0.55, Math.min(1.2, (box.width - 64) / width, (box.height - 96) / height));
  view.scale = scale;
  view.x = Math.max(56, (box.width - width * scale) / 2);
  view.y = Math.max(32, (box.height - 40 - height * scale) / 2);
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
  if ((event.target as HTMLElement).closest(".pill")) return;
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

// The first size decides how the clusters are arranged. Later changes in size, such as the source
// panel opening beside the drawing, keep that arrangement and only fit it to the new room.
let sized = false;
const observer = new ResizeObserver(() => {
  const box = viewport.value;
  if (!box || box.clientWidth === 0) return;
  if (!sized) {
    sized = true;
    room.value = { width: box.clientWidth - 64, height: box.clientHeight - 96 };
  }
  requestAnimationFrame(fit);
});
onMounted(() => viewport.value && observer.observe(viewport.value));
onBeforeUnmount(() => observer.disconnect());
watch(
  () => [layout.value.width, layout.value.height],
  () => fit(),
  { flush: "post" },
);

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
          <marker v-for="color in markerColors" :id="markerId(color)" :key="color" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M1,1.5 L9,5 L1,8.5 Z" :fill="color" />
          </marker>
        </defs>
        <template v-for="link in layout.links" :key="link.connection.connection">
          <path
            v-if="link.within || touches(link.connection)"
            :d="link.path"
            :stroke="touches(link.connection) ? INK : link.color"
            :class="{ hot: touches(link.connection), faded: selected !== null && !touches(link.connection) }"
            :marker-end="selected !== null && !touches(link.connection) ? undefined : `url(#${markerId(touches(link.connection) ? INK : link.color)})`"
          />
        </template>
      </svg>
      <template v-if="layout.showLabels">
        <p
          v-for="cluster in layout.clusters"
          :key="cluster.key"
          class="label"
          :class="{ faded: selected !== null && !cluster.pills.some((pill) => near.has(pill.source.source)) }"
          :style="{ left: `${cluster.x}px`, top: `${cluster.y}px`, color: cluster.color }"
        >
          {{ cluster.name }}<span>{{ cluster.count }}</span>
        </p>
      </template>
      <template v-for="cluster in layout.clusters" :key="cluster.key">
        <button
          v-for="pill in cluster.pills"
          :key="pill.source.source"
          type="button"
          class="pill"
          :class="{
            start: pill.start,
            plain: !pill.start && pill.color === null,
            selected: pill.source.source === selected,
            faded: selected !== null && !near.has(pill.source.source),
          }"
          :style="{
            left: `${pill.x - pill.width / 2}px`,
            top: `${pill.y - PILL_HEIGHT / 2}px`,
            width: `${pill.width}px`,
            height: `${PILL_HEIGHT}px`,
            background: pill.start ? undefined : (pill.color ?? undefined),
          }"
          :aria-pressed="pill.source.source === selected"
          :title="pill.source.url"
          @click="emit('select', pill.source.source)"
        >
          <span v-if="pill.source.notes.length" class="noted" aria-label="Has a note"></span>{{ pill.name }}
        </button>
      </template>
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
.links > path {
  fill: none;
  stroke-width: 2;
  transition: opacity 0.15s;
}
.links > path.hot {
  stroke-width: 2.8;
}
.links > path.faded {
  opacity: 0.14;
}
.label {
  position: absolute;
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.label span {
  margin-left: 7px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.75;
}
.label.faded {
  opacity: 0.25;
}
.pill {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(30, 40, 51, 0.18);
  font: 600 14px Helvetica, Arial, sans-serif;
  white-space: nowrap;
  color: #fff;
  cursor: pointer;
  transition:
    opacity 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}
.pill.start {
  background: var(--color-text);
}
.pill.plain {
  background: var(--color-surface);
  box-shadow: inset 0 0 0 1.5px #b9b1a2;
  color: var(--color-text);
}
.pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(30, 40, 51, 0.22);
}
.pill.plain:hover {
  box-shadow:
    inset 0 0 0 1.5px var(--color-text),
    0 3px 8px rgba(30, 40, 51, 0.12);
}
.pill.selected,
.pill.selected:hover {
  transform: none;
  box-shadow:
    0 0 0 3px var(--graph-bg, #faf6ee),
    0 0 0 6px var(--color-text);
}
.pill.faded {
  opacity: 0.18;
}
.noted {
  flex: none;
  width: 6px;
  height: 6px;
  margin-right: 7px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.85;
}
</style>
