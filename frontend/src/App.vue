<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { api } from "./api/client.ts";
import PasswordForm from "./reusable/PasswordForm.vue";
import SignIn from "./reusable/SignIn.vue";
import { useSession } from "./reusable/session.ts";
import Avatar from "./reusable/ui/Avatar.vue";
import Icon from "./reusable/ui/Icon.vue";
import Menu from "./reusable/ui/Menu.vue";

const { me, checked, load, signOut } = useSession();
onMounted(load);

// Temporary: the signed-in user's projects, and the links in one, until the project pages exist.
type Projects = Exclude<Awaited<ReturnType<typeof api.projects.mine>>, { error: unknown }>["projects"];
const projects = ref<Projects>([]);
watch(me, async (signedIn) => {
  const result = signedIn ? await api.projects.mine({}) : null;
  projects.value = result && !("error" in result) ? result.projects : [];
});

const open = ref<{ name: string; urls: string[]; connections: string[] } | null>(null);
async function openProject({ project, name }: Projects[number]) {
  const result = await api.projects.graph({ project });
  if ("error" in result) return;
  const { sources, connections } = result.graph;
  const urlOf = new Map(sources.map(({ source, url }) => [source, url]));
  open.value = {
    name,
    urls: sources.map(({ url }) => url),
    connections: connections.map(({ source, destination }) => `${urlOf.get(source)} → ${urlOf.get(destination)}`),
  };
}
</script>

<template>
  <header v-if="me" class="topbar">
    <span class="brand"><span class="logo"><Icon name="search" :size="20" /></span>GrabbitHole</span>
    <Menu label="Account">
      <template #button><Avatar :username="me.username" :size="36" /></template>
      <p class="signed-in">Signed in as <strong>{{ me.username }}</strong></p>
      <button type="button" @click="signOut">Sign out</button>
    </Menu>
  </header>
  <main v-if="checked" class="content">
    <!-- Placeholder: the project list and graph pages go here. -->
    <section v-if="me" class="card form-card">
      <h1>Your research projects</h1>
      <ul v-if="projects.length" class="lead">
        <li v-for="row in projects" :key="row.project">
          <button type="button" class="text-button" @click="openProject(row)">{{ row.name }}</button>
        </li>
      </ul>
      <p v-else class="lead">No projects yet.</p>
      <div v-if="open" class="lead">
        <h2>{{ open.name }}</h2>
        <p v-if="!open.urls.length">No links yet.</p>
        <ul>
          <li v-for="url in open.urls" :key="url"><a :href="url" target="_blank" rel="noreferrer">{{ url }}</a></li>
        </ul>
        <h3 v-if="open.connections.length">Connections</h3>
        <ul>
          <li v-for="text in open.connections" :key="text">{{ text }}</li>
        </ul>
      </div>
    </section>
    <SignIn v-else icon="search" lead="Save, share, and build on your paths of research.">
      <PasswordForm />
    </SignIn>
  </main>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  max-width: 1168px;
  margin: 0 auto;
  padding: 18px 24px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-lg);
  font-family: var(--font-title);
  font-weight: 700;
}
.logo {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: #ffffff;
}
.signed-in {
  padding: 8px 10px;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.signed-in strong {
  color: var(--color-text);
}
.lead {
  margin-top: 6px;
  color: var(--color-text-muted);
}
.content {
  padding: var(--space-2) var(--space-6) var(--space-12);
}
@media (max-width: 600px) {
  .topbar {
    padding: 14px 16px;
  }
  .content {
    padding: var(--space-1) var(--space-4) var(--space-8);
  }
}
</style>
