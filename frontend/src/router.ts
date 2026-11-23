import { computed, ref } from "vue";

/**
 * A small hash router: `#/` is the project list and `#/projects/<id>` is one project's research
 * graph. Hash links need nothing from the server and survive a reload.
 */
export type Route = { page: "projects" } | { page: "project"; project: string };

function parse(hash: string): Route {
  const [, kind, id] = hash.replace(/^#/, "").split("/");
  if (kind === "projects" && id) return { page: "project", project: decodeURIComponent(id) };
  return { page: "projects" };
}

const hash = ref(window.location.hash);
window.addEventListener("hashchange", () => (hash.value = window.location.hash));

export const route = computed(() => parse(hash.value));
export const projectLink = (project: string) => `#/projects/${encodeURIComponent(project)}`;
