<script setup lang="ts">
import dagre from "@dagrejs/dagre";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { shortName } from "./labels.ts";
import { copySourceUrl, openSource, webAddress } from "./sourceActions.ts";
import Icon from "../reusable/ui/Icon.vue";
import type { GroupId, GroupStyle, ResearchGraph, Source, SourceId } from "./types.ts";

/**
 * Draws a research graph in one of two views. Each source is a pill with its name, in its group's
 * color, and a dark pill is a page nobody arrived at from another page: where a session started.
 *
 * The group view answers "what did we cover": a group's sources sit together under its name, with
 * arrows for the links inside the group. Links between groups stay hidden until a source is
 * selected; then its links are drawn and everything else fades.
 *
 * The path view answers "how did we get there": every source is laid out along the links, left to
 * right from where a session started, and every link is drawn as an arrow from the page a
 * researcher was on to the page they went to.
 *
 * Double-clicking a source, or choosing "Show in path view" or "Show in group view" from the menu
 * that right-clicking it opens, asks to see it in the other view. The same menu opens the source's
 * page in a new tab, copies its address, or proposes removing it. When the view changes, the
 * selected source is brought to the middle and briefly pulses, so it is easy to find.
 *
 * In the group view, right-clicking a group's heading, or its "…" button (shown on hover or focus),
 * opens the same kind of menu for the group: rename it, select all its sources, or delete it.
 *
 * In selection mode, clicking a source picks it or puts it back instead of selecting it, so
 * several can be acted on together. Double-clicking and the menu are off then, and every source
 * shows a round mark that fills in when it is picked.
 */
const props = defineProps<{
  graph: ResearchGraph;
  selected: SourceId | null;
  /** The groups in the order they were made. */
  groups: GroupStyle[];
  /** The group each grouped source is in. */
  groupOf: Map<SourceId, GroupStyle>;
  /**
   * What decides where sources sit. "group" puts each group's sources together and draws links
   * between groups only for the selected source. "path" lays every source out along the links, left
   * to right from where a session started, and draws every link.
   */
  mode: "group" | "path";
  /** Whether clicking a source picks it for a bulk action instead of selecting it. */
  selecting: boolean;
  /** The sources picked in selection mode. */
  picked: Set<SourceId>;
}>();
const emit = defineEmits<{
  select: [source: SourceId | null];
  switch: [source: SourceId];
  /** Pick a source, or put it back, in selection mode. */
  toggle: [source: SourceId];
  /** Ask, from the menu, to propose removing a source. */
  proposeRemoval: [source: SourceId];
  /** From a group's menu: rename it, pick all its sources, or delete it. */
  renameGroup: [group: GroupId];
  selectGroup: [group: GroupId];
  deleteGroup: [group: GroupId];
}>();

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

const layout = computed(() => (props.mode === "path" ? pathLayout() : groupLayout()));

/**
 * The path view: one left-to-right drawing of every source and every link. Pages where a session
 * started are in the first column, and each link leads one or more columns to the right. A pill
 * keeps its group's color, so the groups can still be told apart.
 */
function pathLayout() {
  const arrivedAt = new Set(props.graph.connections.map(({ destination }) => destination));
  const pills = new Map<SourceId, Pill>();
  for (const source of props.graph.sources) {
    const name = shortName(source.url);
    pills.set(source.source, { source, name, width: widthOf(name), x: 0, y: 0, color: props.groupOf.get(source.source)?.color ?? null, start: !arrivedAt.has(source.source) });
  }
  const followed = props.graph.connections.filter(({ source, destination }) => source !== destination && pills.has(source) && pills.has(destination));
  const trail = new dagre.graphlib.Graph();
  trail.setGraph({ rankdir: "LR", nodesep: 12, ranksep: 56, edgesep: 20, marginx: 0, marginy: 0 });
  trail.setDefaultEdgeLabel(() => ({}));
  for (const [id, pill] of pills) trail.setNode(id, { width: pill.width, height: PILL_HEIGHT });
  for (const { source, destination } of followed) trail.setEdge(source, destination);
  // An invisible first node linked to every starting point keeps all of them in the first column.
  const BEFORE_START = "before every starting point";
  trail.setNode(BEFORE_START, { width: 0, height: 0 });
  for (const [id, pill] of pills) if (pill.start) trail.setEdge(BEFORE_START, id);
  dagre.layout(trail);
  const left = Math.min(...[...pills.entries()].map(([id, pill]) => trail.node(id).x - pill.width / 2), 0);
  for (const [id, pill] of pills) Object.assign(pill, { x: trail.node(id).x - left, y: trail.node(id).y });

  const links = followed.map((connection) => {
    const from = pills.get(connection.source)!;
    const to = pills.get(connection.destination)!;
    const forward = to.x - to.width / 2 > from.x + from.width / 2 + 8;
    // A link between two sources of the same group takes the group's color; any other is grey.
    const shared = from.color !== null && from.color === to.color ? from.color : GREY;
    return { connection, within: true, color: shared, path: forward ? sideways(from, to) : across(from, to) };
  });
  const cluster: Cluster = { key: "", name: "", color: GREY, count: pills.size, x: 0, y: 0, width: 0, height: 0, pills: [...pills.values()] };
  return { clusters: [cluster], links, width: (trail.graph().width ?? 0) - left, height: trail.graph().height ?? 0, showLabels: false };
}

/** The group view: each group's sources together under its name. */
function groupLayout() {
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
}

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
  const scale = Math.max(0.55, Math.min(1.2, (box.width - 112) / width, (box.height - 96) / height));
  view.scale = scale;
  view.x = Math.max(56, (box.width - width * scale) / 2);
  view.y = Math.max(32, (box.height - 40 - height * scale) / 2);
  reveal();
}

/** The pill drawn for a source in the current view, if there is one. */
function pillFor(source: SourceId | null): Pill | undefined {
  if (source === null) return undefined;
  return layout.value.clusters.flatMap(({ pills }) => pills).find((pill) => pill.source.source === source);
}

/** Moves the drawing so the pill is in the middle of the frame. */
function center(pill: Pill, box: DOMRect) {
  view.x = box.width / 2 - pill.x * view.scale;
  view.y = box.height / 2 - pill.y * view.scale;
}

/** If the selected source is outside the drawing's frame, moves the drawing to bring it to the middle. */
function reveal() {
  const box = viewport.value?.getBoundingClientRect();
  const pill = pillFor(props.selected);
  if (!box || !pill) return;
  const x = view.x + pill.x * view.scale;
  const y = view.y + pill.y * view.scale;
  const edge = pill.width / 2 + 24;
  if (x < edge || x > box.width - edge || y < 40 || y > box.height - 70) center(pill, box);
}

/** The source that just arrived in this view from the other one; it pulses for a moment. */
const arrived = ref<SourceId | null>(null);
let arrivedTimer: ReturnType<typeof setTimeout> | undefined;

/** After the view changes, brings the selected source to the middle and makes it pulse. */
function keepArrivedCentered() {
  const box = viewport.value?.getBoundingClientRect();
  const pill = arrived.value === null ? undefined : pillFor(arrived.value);
  if (box && pill) center(pill, box);
}

function arrive() {
  const box = viewport.value?.getBoundingClientRect();
  const pill = pillFor(props.selected);
  if (!box || !pill) return;
  center(pill, box);
  clearTimeout(arrivedTimer);
  arrived.value = pill.source.source;
  arrivedTimer = setTimeout(() => (arrived.value = null), 1600);
}

/*
 * The menu that right-clicking a source opens: show the source in the other view, then open its
 * page or copy its address. It is placed in the frame's own coordinates, outside the zoomed stage,
 * so it stays a normal size.
 */
type SourceMenu = { kind: "source"; source: SourceId; url: string; x: number; y: number };
type GroupMenu = { kind: "group"; group: GroupId; name: string; count: number; x: number; y: number };
const menu = ref<SourceMenu | GroupMenu | null>(null);
const menuElement = ref<HTMLElement | null>(null);
/**
 * The pill the menu was opened from. When the menu was opened from the keyboard, the focus goes
 * back to it when the menu is dismissed. After a right-click it does not, so no focus ring is left
 * on a source the pointer only pointed at.
 */
let menuOpener: HTMLElement | null = null;
let menuFromKeyboard = false;
function giveFocusBack() {
  if (menuFromKeyboard) menuOpener?.focus();
}
/**
 * The item a press started on. A mouse choice counts only when the press started on that same item,
 * so a release or a stray click carried over from opening the menu chooses nothing. Choosing from
 * the keyboard (Enter or Space, which report no clicks) always counts.
 */
let pressedItem: Element | null = null;

const otherView = computed(() => (props.mode === "group" ? "Show in path view" : "Show in group view"));

/*
 * Clicking, double-clicking and right-clicking a source do three different things, and must never
 * run together:
 * - a click selects the source;
 * - a double-click shows it in the other view;
 * - a right-click (also Control-click, or a two-finger click on a Mac trackpad) opens the menu.
 *   It leaves the selection alone: the menu has its own target, which is outlined while it is open.
 * Only the main button's own clicks count as a click or a double-click. A double-click that comes
 * while the menu is open, or just after it was asked for, is part of opening the menu, not a
 * request to switch.
 */
let menuAskedAt = -Infinity;
const MENU_GRACE_MS = 600;

function onPillClick(event: MouseEvent, source: SourceId) {
  if (event.button !== 0 || event.ctrlKey) return;
  if (props.selecting) emit("toggle", source);
  else emit("select", source);
}

function onPillDoubleClick(event: MouseEvent, source: SourceId) {
  if (event.button !== 0 || event.ctrlKey || props.selecting) return;
  if (menu.value !== null || performance.now() - menuAskedAt < MENU_GRACE_MS) return;
  emit("switch", source);
}

async function openMenu(event: MouseEvent, { source, url }: Source) {
  // In selection mode the menu is off; the selection toolbar holds the actions.
  if (props.selecting) return;
  menuAskedAt = performance.now();
  pressedItem = null;
  const box = viewport.value?.getBoundingClientRect();
  if (!box) return;
  menuOpener = event.currentTarget as HTMLElement;
  // From the keyboard (the menu key, or shift + F10) there is no pointer, so the menu opens under the pill.
  const fromKeyboard = event.clientX === 0 && event.clientY === 0;
  menuFromKeyboard = fromKeyboard;
  const pillBox = menuOpener.getBoundingClientRect();
  // A few pixels off the pointer, so the release that ends the right-click cannot land on an item.
  const x = (fromKeyboard ? pillBox.left : event.clientX + 4) - box.left;
  const y = (fromKeyboard ? pillBox.bottom + 4 : event.clientY + 4) - box.top;
  menu.value = { kind: "source", source, url, x, y };
  await showMenu(box);
}

/**
 * Opens a group's menu: from a right-click on its heading, at the pointer; from its "…" button or
 * the keyboard, just under the heading. "Not grouped yet" is not a group and has no menu.
 */
async function openGroupMenu(event: MouseEvent, cluster: Cluster) {
  if (cluster.key === "") return;
  menuAskedAt = performance.now();
  pressedItem = null;
  const box = viewport.value?.getBoundingClientRect();
  if (!box) return;
  const target = event.currentTarget as HTMLElement;
  const fromButton = event.type === "click";
  menuFromKeyboard = fromButton ? event.detail === 0 : event.clientX === 0 && event.clientY === 0;
  menuOpener = fromButton ? target : (target.querySelector<HTMLElement>(".group-more") ?? target);
  const heading = (fromButton ? (target.closest(".label") ?? target) : target).getBoundingClientRect();
  const underHeading = fromButton || menuFromKeyboard;
  const x = (underHeading ? heading.left : event.clientX + 4) - box.left;
  const y = (underHeading ? heading.bottom + 4 : event.clientY + 4) - box.top;
  menu.value = { kind: "group", group: cluster.key as GroupId, name: cluster.name, count: cluster.count, x, y };
  await showMenu(box);
}

/** Shows the open menu: listens for what dismisses it, keeps it inside the frame, and focuses its first item. */
async function showMenu(box: DOMRect) {
  document.addEventListener("pointerdown", dismissIfOutside, true);
  document.addEventListener("keydown", escapeMenu);
  window.addEventListener("blur", closeMenu);
  await nextTick();
  // Keep the whole menu inside the frame.
  const size = menuElement.value?.getBoundingClientRect();
  if (menu.value && size) {
    menu.value.x = Math.max(8, Math.min(menu.value.x, box.width - size.width - 8));
    menu.value.y = Math.max(8, Math.min(menu.value.y, box.height - size.height - 8));
  }
  menuItems()[0]?.focus();
}

/** The menu's items that can be chosen, in order. */
function menuItems(): HTMLButtonElement[] {
  return [...(menuElement.value?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
}

/** The up and down arrows (and Home and End) move between the menu's items. */
function moveInMenu(event: KeyboardEvent) {
  const items = menuItems();
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === "ArrowDown" ? (at + 1) % items.length
    : event.key === "ArrowUp" ? (at - 1 + items.length) % items.length
    : event.key === "Home" ? 0
    : event.key === "End" ? items.length - 1
    : null;
  if (next === null) return;
  event.preventDefault();
  items[next]!.focus();
}

function closeMenu() {
  menu.value = null;
  document.removeEventListener("pointerdown", dismissIfOutside, true);
  document.removeEventListener("keydown", escapeMenu);
  window.removeEventListener("blur", closeMenu);
}

function dismissIfOutside(event: PointerEvent) {
  if (!menuElement.value?.contains(event.target as Node)) closeMenu();
}

function escapeMenu(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  closeMenu();
  giveFocusBack();
}

function onMenuPointerDown(event: PointerEvent) {
  pressedItem = (event.target as Element).closest("[role=menuitem]");
}

/** Runs one of the menu's items, then the menu is closed by the action itself. */
function choose(event: MouseEvent, action: "switch" | "open" | "copy" | "remove") {
  const chosen = menu.value;
  if (chosen === null || chosen.kind !== "source") return;
  if (event.detail > 0 && pressedItem !== event.currentTarget) return;
  pressedItem = null;
  if (action === "switch") showInOtherView(chosen.source);
  else if (action === "open") openFromMenu(chosen.url);
  else if (action === "remove") {
    closeMenu();
    emit("proposeRemoval", chosen.source);
  } else void copyFromMenu(chosen.url);
}

/** Runs one of a group's menu items; the page does the work (a dialog, or picking its sources). */
function chooseForGroup(event: MouseEvent, action: "rename" | "select" | "delete") {
  const chosen = menu.value;
  if (chosen === null || chosen.kind !== "group") return;
  if (event.detail > 0 && pressedItem !== event.currentTarget) return;
  pressedItem = null;
  closeMenu();
  if (action === "rename") emit("renameGroup", chosen.group);
  else if (action === "select") emit("selectGroup", chosen.group);
  else emit("deleteGroup", chosen.group);
}

/** Asks to see a source in the other view. */
function showInOtherView(source: SourceId) {
  closeMenu();
  emit("switch", source);
}

/** Opens the source's page in a new tab; the graph, its view, and the selection stay as they are. */
function openFromMenu(url: string) {
  closeMenu();
  openSource(url);
}

/** A short line at the foot of the drawing saying whether the address was copied. */
const copyStatus = ref<{ copied: boolean } | null>(null);
let copyStatusTimer: ReturnType<typeof setTimeout> | undefined;

async function copyFromMenu(url: string) {
  closeMenu();
  giveFocusBack();
  const copied = await copySourceUrl(url);
  clearTimeout(copyStatusTimer);
  copyStatus.value = { copied };
  copyStatusTimer = setTimeout(() => (copyStatus.value = null), copied ? 1800 : 3500);
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
  closeMenu();
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
  const target = event.target as HTMLElement;
  if (target.closest(".pill, .context-menu, .group-more")) return;
  // A right-click on a group's heading opens its menu; it does not drag or clear the selection.
  if (event.button !== 0 && target.closest(".label")) return;
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
  requestAnimationFrame(() => {
    fit();
    // A source that just arrived from the other view stays in the middle when the source panel
    // opens with it and narrows the drawing.
    keepArrivedCentered();
  });
});
onMounted(() => viewport.value && observer.observe(viewport.value));
onBeforeUnmount(() => {
  observer.disconnect();
  closeMenu();
  clearTimeout(arrivedTimer);
  clearTimeout(copyStatusTimer);
});
watch(
  () => [layout.value.width, layout.value.height, props.mode] as const,
  (now, before) => {
    fit();
    // A new view: the menu was about the old one, and the selected source is brought into sight.
    if (before !== undefined && now[2] !== before[2]) {
      closeMenu();
      arrive();
    }
  },
  { flush: "post" },
);
watch(() => props.selected, reveal, { flush: "post" });
watch(() => props.selecting, closeMenu);

defineExpose({ fit, zoom });
</script>

<template>
  <div
    ref="viewport"
    class="viewport"
    :class="{ dragging, selecting }"
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
          :class="{ faded: selected !== null && !cluster.pills.some((pill) => near.has(pill.source.source)), grouped: cluster.key !== '' }"
          @contextmenu.prevent="openGroupMenu($event, cluster)"
          :style="{ left: `${cluster.x}px`, top: `${cluster.y}px`, color: cluster.color }"
        >
          {{ cluster.name }}<span>{{ cluster.count }}</span>
          <button
            v-if="cluster.key !== ''"
            type="button"
            class="group-more"
            :class="{ open: menu?.kind === 'group' && menu.group === cluster.key }"
            :aria-label="`Actions for ${cluster.name}`"
            aria-haspopup="menu"
            @click.stop="openGroupMenu($event, cluster)"
          >
            <Icon name="more" :size="14" />
          </button>
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
            arrived: pill.source.source === arrived,
            targeted: menu?.kind === 'source' && pill.source.source === menu.source,
            picked: selecting && picked.has(pill.source.source),
            faded: selected !== null && !near.has(pill.source.source),
          }"
          :style="{
            left: `${pill.x - pill.width / 2}px`,
            top: `${pill.y - PILL_HEIGHT / 2}px`,
            width: `${pill.width}px`,
            height: `${PILL_HEIGHT}px`,
            background: pill.start ? undefined : (pill.color ?? undefined),
          }"
          :aria-pressed="selecting ? picked.has(pill.source.source) : pill.source.source === selected"
          :title="pill.source.url"
          @click="onPillClick($event, pill.source.source)"
          @dblclick="onPillDoubleClick($event, pill.source.source)"
          @contextmenu.prevent="openMenu($event, pill.source)"
        >
          <span v-if="selecting" class="tick" :class="{ on: picked.has(pill.source.source) }" aria-hidden="true">
            <Icon v-if="picked.has(pill.source.source)" name="check" :size="12" />
          </span>
          <span v-if="pill.source.notes.length" class="noted" aria-label="Has a note"></span>{{ pill.name }}
        </button>
      </template>
    </div>
    <div
      v-if="menu?.kind === 'group'"
      ref="menuElement"
      class="context-menu"
      role="menu"
      :aria-label="`Actions for ${menu.name}`"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @contextmenu.prevent
      @keydown="moveInMenu"
      @pointerdown="onMenuPointerDown"
    >
      <button type="button" role="menuitem" @click="chooseForGroup($event, 'rename')"><Icon name="pencil" :size="16" />Rename group</button>
      <button type="button" role="menuitem" :disabled="menu.count === 0" @click="chooseForGroup($event, 'select')">
        <Icon name="select" :size="16" />Select all sources
      </button>
      <hr role="separator" />
      <button type="button" role="menuitem" class="danger" @click="chooseForGroup($event, 'delete')"><Icon name="trash" :size="16" />Delete group</button>
    </div>
    <div
      v-else-if="menu?.kind === 'source'"
      ref="menuElement"
      class="context-menu"
      role="menu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @contextmenu.prevent
      @keydown="moveInMenu"
      @pointerdown="onMenuPointerDown"
    >
      <button type="button" role="menuitem" @click="choose($event, 'switch')">{{ otherView }}</button>
      <hr role="separator" />
      <button type="button" role="menuitem" :disabled="webAddress(menu.url) === null" @click="choose($event, 'open')">
        <Icon name="external" :size="16" />Open original website
      </button>
      <button type="button" role="menuitem" @click="choose($event, 'copy')"><Icon name="copy" :size="16" />Copy source URL</button>
      <hr role="separator" />
      <button type="button" role="menuitem" class="danger" @click="choose($event, 'remove')"><Icon name="trash" :size="16" />Propose removal</button>
    </div>
    <p class="copy-status" :class="{ shown: copyStatus, failed: copyStatus && !copyStatus.copied }" role="status">
      <template v-if="copyStatus?.copied"><Icon name="check" :size="15" />URL copied</template>
      <template v-else-if="copyStatus">Couldn't copy the URL. Your browser may not allow it here.</template>
    </p>
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
.label.grouped {
  display: flex;
  align-items: center;
}
/* The "…" beside a group's heading: hidden until the heading is hovered or the button has focus. */
.group-more {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-left: 6px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.label:hover .group-more,
.group-more:focus-visible,
.group-more.open {
  opacity: 1;
}
.group-more:hover,
.group-more:focus-visible,
.group-more.open {
  background: var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-border);
  outline: none;
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
/* Selection mode: a thin rust frame around the drawing says clicks now pick sources. */
.viewport.selecting {
  box-shadow: inset 0 0 0 2px var(--color-accent);
  cursor: default;
}
/*
 * The round mark on every source in selection mode, on the pill's top left corner so it never
 * covers the name; it fills in rust with a check when the source is picked.
 */
.tick {
  position: absolute;
  top: -7px;
  left: -5px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--color-text-muted);
  border-radius: 50%;
  background: var(--color-surface);
  color: #fff;
  box-shadow: 0 1px 2px rgba(30, 40, 51, 0.18);
}
.tick.on {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
  opacity: 1;
}
/*
 * A picked source: a thin rust outline right at its edge, with the check mark on its corner. An
 * outline takes no room, so the pill keeps its size, its place, and its own border and shadow.
 */
.pill.picked {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}
/* The source the open menu is about, which need not be the selected one. */
.pill.targeted {
  opacity: 1;
  outline: 2px dashed var(--color-text-muted);
  outline-offset: 3px;
}
/* The selected source's own menu: the dashes go outside its solid ring, so both can be seen. */
.pill.selected.targeted {
  outline-offset: 9px;
}
/* A source that just arrived from the other view: a ring in the accent color spreads out from it twice. */
.pill.arrived {
  animation: arrive 0.8s ease-out 2;
}
@keyframes arrive {
  from {
    box-shadow:
      0 0 0 3px var(--graph-bg, #faf6ee),
      0 0 0 6px var(--color-text),
      0 0 0 6px var(--color-accent);
  }
  to {
    box-shadow:
      0 0 0 3px var(--graph-bg, #faf6ee),
      0 0 0 6px var(--color-text),
      0 0 0 22px transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pill.arrived {
    animation: none;
  }
}
.context-menu {
  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: max-content;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-popover);
  cursor: default;
}
.context-menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.context-menu button svg {
  flex: none;
  color: var(--color-text-muted);
}
.context-menu button:hover:not(:disabled),
.context-menu button:focus-visible {
  background: var(--color-page);
  outline: none;
}
.context-menu button.danger,
.context-menu button.danger svg {
  color: var(--color-danger);
}
.context-menu button.danger:hover,
.context-menu button.danger:focus-visible {
  background: var(--color-danger-soft);
}
.context-menu button:disabled {
  opacity: 0.5;
  cursor: default;
}
.context-menu hr {
  margin: 4px 6px;
  border: 0;
  border-top: 1px solid var(--color-line);
}
/* "URL copied": a quiet note at the foot of the drawing that fades away. */
.copy-status {
  position: absolute;
  left: 50%;
  bottom: 52px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: var(--text-sm);
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 4px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.copy-status.shown {
  opacity: 1;
  transform: translate(-50%, 0);
}
.copy-status.failed {
  background: var(--color-danger);
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
