<script setup lang="ts">
import { onMounted } from "vue";
import ProjectList from "./projects/ProjectList.vue";
import ProjectPage from "./projects/ProjectPage.vue";
import PasswordForm from "./reusable/PasswordForm.vue";
import SignIn from "./reusable/SignIn.vue";
import { useSession } from "./reusable/session.ts";
import Avatar from "./reusable/ui/Avatar.vue";
import Icon from "./reusable/ui/Icon.vue";
import Menu from "./reusable/ui/Menu.vue";
import { route } from "./router.ts";

const { me, checked, load, signOut } = useSession();
onMounted(load);

</script>

<template>
  <header v-if="me" class="topbar">
    <a class="brand" href="#/"><span class="logo"><Icon name="search" :size="20" /></span>GrabbitHole</a>
    <Menu label="Account">
      <template #button><Avatar :username="me.username" :size="36" /></template>
      <p class="signed-in">Signed in as <strong>{{ me.username }}</strong></p>
      <button type="button" @click="signOut">Sign out</button>
    </Menu>
  </header>
  <main v-if="checked" class="content">
    <template v-if="me">
      <ProjectPage v-if="route.page === 'project'" :key="route.project" :project="route.project" />
      <ProjectList v-else />
    </template>
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
  color: var(--color-text);
  text-decoration: none;
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
