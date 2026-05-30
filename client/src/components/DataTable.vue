<script setup lang="ts" generic="T extends Record<string, any>">
defineProps<{
  columns: { key: string; label: string; width?: string }[]
  data: T[]
  loading?: boolean
}>()

defineEmits<{
  rowClick: [row: T]
}>()
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" :style="col.width ? { width: col.width } : {}">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" style="text-align:center;padding:40px;color:var(--ink-soft);">
            加载中...
          </td>
        </tr>
        <tr v-else-if="data.length === 0">
          <td :colspan="columns.length" style="text-align:center;padding:40px;color:var(--ink-soft);">
            暂无数据
          </td>
        </tr>
        <tr v-for="(row, idx) in data" :key="idx" @click="$emit('rowClick', row)" style="cursor:pointer;">
          <td v-for="col in columns" :key="col.key">
            <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
