<script setup lang="ts">
import { onMounted, ref } from "vue";
import { call } from "../api/call.ts";
import { api } from "../api/client.ts";
import type { Invitation, Project } from "../graph/types.ts";
import { projectLink } from "../router.ts";

/** The signed-in user's research projects, and a form to start a new one. */
const projects = ref<Project[] | null>(null);
const refusal = ref("");
const name = ref("");
const creating = ref(false);

async function load() {
  const result = await call("/projects/mine", api.projects.mine({}));
  if ("failed" in result) refusal.value = result.failed;
  else projects.value = [...result.projects].sort((a, b) => a.name.localeCompare(b.name));
}

/** Invitations to other people's projects that this user has not answered. */
const invitations = ref<Invitation[]>([]);
async function loadInvitations() {
  const result = await call("/invitations/mine", api.invitations.mine({}));
  if (!("failed" in result)) invitations.value = result.invitations;
}
async function answer({ invitation }: Invitation, accept: boolean) {
  refusal.value = "";
  const result = accept
    ? await call("/invitations/accept", api.invitations.accept({ invitation }))
    : await call("/invitations/decline", api.invitations.decline({ invitation }));
  if ("failed" in result) refusal.value = result.failed;
  await Promise.all([loadInvitations(), load()]);
}
onMounted(() => Promise.all([load(), loadInvitations()]));

async function create() {
  if (name.value.trim() === "" || creating.value) return;
  creating.value = true;
  refusal.value = "";
  const result = await call("/projects/create", api.projects.create({ name: name.value.trim() }));
  creating.value = false;
  if ("failed" in result) {
    refusal.value = result.failed;
    return;
  }
  name.value = "";
  window.location.hash = projectLink(result.project);
}
</script>

<template>
  <section class="page">
    <header class="heading">
      <p class="eyebrow">Research projects</p>
      <h1>Your projects</h1>
    </header>

    <ul v-if="invitations.length" class="invitations" aria-label="Invitations">
      <li v-for="row in invitations" :key="row.invitation">
        <span>You're invited to <strong>{{ row.name }}</strong></span>
        <span class="answers">
          <button type="button" class="button outline" @click="answer(row, true)">Join</button>
          <button type="button" class="text-button" @click="answer(row, false)">Decline</button>
        </span>
      </li>
    </ul>

    <form class="create" @submit.prevent="create">
      <label class="field">
        New project
        <input v-model="name" type="text" maxlength="80" placeholder="What are you researching?" autocomplete="off" />
      </label>
      <button type="submit" class="button primary" :disabled="creating || name.trim() === ''">
        {{ creating ? "Creating…" : "Create project" }}
      </button>
    </form>
    <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>

    <p v-if="projects === null && !refusal" class="quiet">Loading your projects…</p>
    <p v-else-if="projects?.length === 0" class="quiet">
      No projects yet. Name one above, or record a browsing session with the extension and add it to a new project from there.
    </p>
    <ul v-else-if="projects" class="list">
      <li v-for="row in projects" :key="row.project">
        <a class="project" :href="projectLink(row.project)">
          <span class="name">{{ row.name }}</span>
          <span class="open">Open graph →</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: var(--space-8) auto 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.eyebrow {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.heading h1 {
  font-size: 2.25rem;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.create {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}
.create .field {
  flex: 1;
}
.create .button {
  min-height: 44px;
}
.invitations {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.invitations li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border: 1px dashed var(--color-pending);
  border-radius: var(--radius-md);
}
.answers {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.answers .button {
  min-height: 34px;
}
.answers .text-button {
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: underline;
}
.quiet {
  color: var(--color-text-muted);
}
.list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.project {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
}
.project:hover {
  border-color: var(--color-text);
}
.name {
  font-family: var(--font-title);
  font-size: var(--text-xl);
  font-weight: 700;
  overflow-wrap: anywhere;
}
.open {
  flex: none;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
@media (max-width: 600px) {
  .create {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
