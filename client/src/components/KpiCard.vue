<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: string
}>()
</script>

<template>
  <div class="kpi-card">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value">{{ value }}</div>
    <div v-if="change" class="kpi-change" :class="changeType">
      <span class="arrow" v-if="changeType === 'up'">&#9650;</span>
      <span class="arrow" v-else-if="changeType === 'down'">&#9660;</span>
      {{ change }}
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  background: var(--paper-dark);
  border: 1px solid var(--rule-soft);
  border-radius: 2px;
  padding: 24px 28px 20px;
  transition: all var(--duration-normal) var(--ease-expo);
}
.kpi-card:hover {
  border-color: var(--rule);
  background: var(--paper);
}
.kpi-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}
.kpi-value {
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -0.03em;
  line-height: 1.05;
}
.kpi-change {
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}
.kpi-change.up { color: var(--success); }
.kpi-change.down { color: var(--vermillion); }
.kpi-change.neutral { color: var(--ink-soft); }
.kpi-change .arrow { font-size: 10px; }
</style>
