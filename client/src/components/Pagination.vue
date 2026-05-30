<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  page: number
  total: number
  pageSize: number
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

const jumpInput = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function goTo(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    emit('change', p)
  }
}

function doJump() {
  const p = parseInt(jumpInput.value)
  if (!isNaN(p) && p >= 1 && p <= totalPages.value) {
    emit('change', p)
    jumpInput.value = ''
  }
}
</script>

<template>
  <div class="pagination">
    <button :disabled="page <= 1" @click="goTo(page - 1)">上一页</button>
    <span>第 {{ page }} 页 / 共 {{ totalPages }} 页 ({{ total }} 条)</span>
    <button :disabled="page >= totalPages" @click="goTo(page + 1)">下一页</button>
    <span class="jump-label">跳至</span>
    <input
      v-model="jumpInput"
      class="page-jump"
      @keyup.enter="doJump"
    />
    <button class="page-go" @click="doJump" :disabled="!jumpInput">GO</button>
  </div>
</template>

<style scoped>
.jump-label {
  margin-left: 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ink-soft);
}
.page-jump {
  width: 44px;
  padding: 5px 4px;
  border: 1px solid var(--rule);
  background: var(--paper);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ink);
  text-align: center;
  user-select: text;
  -webkit-user-select: text;
}
.page-jump:focus {
  outline: none;
  border-color: var(--ink);
}
.page-go {
  padding: 5px 10px;
  border: 1px solid var(--rule);
  background: var(--paper);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
  cursor: pointer;
  letter-spacing: 0.06em;
  transition: all var(--duration-fast);
}
.page-go:hover:not(:disabled) {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.page-go:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
