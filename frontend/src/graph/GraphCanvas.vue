<script setup lang="ts">
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { labelOf } from "./labels.ts";
import type { ResearchGraph, SourceId } from "./types.ts";

/**
 * Draws a research graph: each source is a card and each connection an arrow from the page a
 * researcher was on to the page they went to. Follows the color study: a paper-and-ink base, grey
 * links, and a connection that has a note drawn thicker and in ink.
 */
const props = defineProps<{ graph: ResearchGraph; selected: SourceId | null }>();
const emit = defineEmits<{ select: [source: SourceId | null] }>();

const INK = "#1e2833";
const CARD = "#fffdf8";
const BORDER = "#cbbfa8";
const LINK = "#797979";

const container = ref<HTMLElement | null>(null);
let view: Core | undefined;

/** Keeps a long page name to about two lines of a card. */
const clip = (text: string) => (text.length > 46 ? `${text.slice(0, 45).trimEnd()}…` : text);

function elements(): ElementDefinition[] {
  return [
    ...props.graph.sources.map((source) => {
      const { site, page } = labelOf(source.url);
      return {
        data: { id: source.source, label: page === "" ? site : `${clip(page)}\n${site}` },
        classes: source.notes.length > 0 ? "noted" : "",
      };
    }),
    ...props.graph.connections.map((connection) => ({
      data: { id: connection.connection, source: connection.source, target: connection.destination },
      classes: connection.notes.length > 0 ? "noted" : "",
      selectable: false,
    })),
  ];
}

/** Lays the graph out as paths: pages nobody arrived at from another page start each path, and each link leads one step on. */
function draw() {
  if (view === undefined) return;
  view.elements().remove();
  view.add(elements());
  const starts = view.nodes().filter((node) => node.indegree(false) === 0);
  view
    .layout({
      name: "breadthfirst",
      directed: true,
      roots: starts.nonempty() ? starts.map((node) => node.id()) : undefined,
      spacingFactor: 1.05,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
      padding: 40,
      animate: false,
    })
    .run();
  view.fit(undefined, 40);
  if (view.zoom() > 1.15) {
    view.zoom(1.15);
    view.center();
  }
  markSelected();
}

function markSelected() {
  if (view === undefined) return;
  view.nodes().unselect();
  if (props.selected !== null) view.getElementById(props.selected).select();
}

onMounted(() => {
  view = cytoscape({
    container: container.value,
    minZoom: 0.25,
    maxZoom: 2.5,
    style: [
      {
        selector: "node",
        style: {
          shape: "round-rectangle",
          width: 196,
          height: 64,
          "background-color": CARD,
          "border-width": 1.5,
          "border-color": BORDER,
          label: "data(label)",
          color: INK,
          "font-family": "Helvetica, Arial, sans-serif",
          "font-size": 13,
          "font-weight": 600,
          "line-height": 1.25,
          "text-wrap": "wrap",
          "text-max-width": "178px",
          "text-valign": "center",
          "text-halign": "center",
        },
      },
      { selector: "node.noted", style: { "border-style": "double", "border-width": 4, "border-color": INK } },
      { selector: "node:selected", style: { "border-style": "solid", "border-width": 3, "border-color": INK, "background-color": "#f3e2d8" } },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": LINK,
          "target-arrow-color": LINK,
          "target-arrow-shape": "triangle",
          "arrow-scale": 1,
          "curve-style": "bezier",
        },
      },
      { selector: "edge.noted", style: { width: 3, "line-color": INK, "target-arrow-color": INK } },
    ],
  });
  view.on("tap", "node", (event) => emit("select", event.target.id() as SourceId));
  view.on("tap", (event) => {
    if (event.target === view) emit("select", null);
  });
  draw();
});

onBeforeUnmount(() => view?.destroy());

// Redraw only when the graph itself changes; a new selection just moves the highlight.
watch(() => props.graph, draw);
watch(() => props.selected, markSelected);

defineExpose({ fit: () => view?.fit(undefined, 40) });
</script>

<template>
  <div ref="container" class="canvas" role="img" aria-label="Research graph: sources and the connections between them"></div>
</template>

<style scoped>
.canvas {
  flex: 1;
  width: 100%;
  min-height: 0;
}
</style>
