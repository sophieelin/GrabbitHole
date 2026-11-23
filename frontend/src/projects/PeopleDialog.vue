<script setup lang="ts">
import { ref } from "vue";
import { call } from "../api/call.ts";
import { api } from "../api/client.ts";
import type { Member, ProjectId, UserId } from "../graph/types.ts";
import Dialog from "../reusable/ui/Dialog.vue";

/**
 * Who is in a project. Everyone sees the members and their roles; the owner also invites people
 * by username, chooses who reviews proposals, and removes members.
 */
const props = defineProps<{
  project: ProjectId;
  name: string;
  owner: UserId;
  members: Member[];
  reviewers: UserId[];
  isOwner: boolean;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();

const username = ref("");
const busy = ref(false);
const refusal = ref("");
const notice = ref("");

const roleOf = (user: UserId) => (user === props.owner ? "Owner" : props.reviewers.includes(user) ? "Reviewer" : "Member");

async function run(path: string, request: Promise<object>, done: string) {
  busy.value = true;
  refusal.value = "";
  notice.value = "";
  const result = await call(path, request);
  busy.value = false;
  if ("failed" in result) {
    refusal.value = result.failed;
    return false;
  }
  notice.value = done;
  emit("changed");
  return true;
}

async function invite() {
  const invited = username.value.trim();
  if (invited === "") return;
  const sent = await run(
    "/projects/invite",
    api.projects.invite({ project: props.project, username: invited }),
    `Invited ${invited}. They join once they accept from their projects page.`,
  );
  if (sent) username.value = "";
}
const grant = ({ user, username: who }: Member) =>
  run("/projects/reviewers/grant", api.projects.reviewers.grant({ project: props.project, member: user }), `${who} can now review proposals.`);
const revoke = ({ user, username: who }: Member) =>
  run("/projects/reviewers/revoke", api.projects.reviewers.revoke({ project: props.project, member: user }), `${who} no longer reviews proposals.`);
const remove = ({ user, username: who }: Member) =>
  run("/projects/members/remove", api.projects.members.remove({ project: props.project, member: user }), `Removed ${who}.`);
</script>

<template>
  <Dialog title="People" :subtitle="name" @close="emit('close')">
    <div class="people">
      <ul>
        <li v-for="member in members" :key="member.user">
          <span class="who">{{ member.username }}</span>
          <span class="role">{{ roleOf(member.user) }}</span>
          <span v-if="isOwner && member.user !== owner" class="actions">
            <button v-if="reviewers.includes(member.user)" type="button" class="text-button" :disabled="busy" @click="revoke(member)">Stop reviewing</button>
            <button v-else type="button" class="text-button" :disabled="busy" @click="grant(member)">Make reviewer</button>
            <button type="button" class="text-button danger" :disabled="busy" @click="remove(member)">Remove</button>
          </span>
        </li>
      </ul>

      <form v-if="isOwner" class="invite" @submit.prevent="invite">
        <label class="field">
          Invite by username
          <input v-model="username" type="text" maxlength="40" autocomplete="off" placeholder="Their GrabbitHole username" />
        </label>
        <button type="submit" class="button primary" :disabled="busy || username.trim() === ''">Invite</button>
      </form>
      <p v-else class="quiet">Only the owner can invite people and choose reviewers.</p>

      <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
      <p v-else-if="notice" class="quiet" role="status">{{ notice }}</p>
    </div>
  </Dialog>
</template>

<style scoped>
.people {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
ul {
  list-style: none;
  padding: 0;
}
li {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-line);
}
.who {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.role {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-3);
}
.text-button {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text);
  text-decoration: underline;
}
.text-button.danger {
  color: var(--color-danger);
}
.invite {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}
.invite .field {
  flex: 1;
}
.invite .button {
  min-height: 44px;
}
.quiet {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
