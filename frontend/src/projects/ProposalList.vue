<script setup lang="ts">
import { ref } from "vue";
import type { PendingProposal, ProposalId } from "../graph/types.ts";

/** The proposals waiting for review on a project. A reviewer accepts or rejects each one. */
defineProps<{
  proposals: (PendingProposal & { summary: string })[];
  canReview: boolean;
  busy: boolean;
  refusal: string;
}>();
const emit = defineEmits<{ accept: [proposal: ProposalId]; reject: [proposal: ProposalId, reason: string] }>();

const rejecting = ref<ProposalId | null>(null);
const reason = ref("");
function reject(proposal: ProposalId) {
  emit("reject", proposal, reason.value.trim());
  rejecting.value = null;
  reason.value = "";
}
</script>

<template>
  <section class="proposals" aria-label="Proposals waiting for review">
    <h3>Waiting for review · {{ proposals.length }}</h3>
    <p v-if="refusal" class="refusal" role="alert">{{ refusal }}</p>
    <ul>
      <li v-for="row in proposals" :key="row.proposal">
        <span class="status">Pending</span>
        <span class="summary">{{ row.summary }} <span class="by">from {{ row.proposerName }}</span></span>
        <template v-if="canReview">
          <form v-if="rejecting === row.proposal" class="reason" @submit.prevent="reject(row.proposal)">
            <input v-model="reason" type="text" maxlength="300" placeholder="Reason (optional)" aria-label="Reason for rejecting" />
            <button type="submit" class="button outline" :disabled="busy">Reject</button>
            <button type="button" class="text-button" @click="rejecting = null">Cancel</button>
          </form>
          <span v-else class="actions">
            <button type="button" class="button outline" :disabled="busy" @click="emit('accept', row.proposal)">Accept</button>
            <button type="button" class="text-button" :disabled="busy" @click="rejecting = row.proposal">Reject</button>
          </span>
        </template>
        <span v-else class="by">A reviewer decides</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.proposals {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  max-height: 190px;
  overflow-y: auto;
}
h3 {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--text-sm);
}
.status {
  flex: none;
  width: 70px;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-pending);
}
.summary {
  flex: 1;
  min-width: 200px;
  overflow-wrap: anywhere;
}
.by {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.actions,
.reason {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.button {
  min-height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}
.text-button {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: underline;
}
.reason input {
  min-height: 32px;
  padding: 0 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}
@media (max-width: 800px) {
  .proposals {
    max-height: none;
  }
}
</style>
