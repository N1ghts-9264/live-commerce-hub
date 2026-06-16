<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  type?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'
}>()

const badgeClass = computed(() => {
  if (props.type) return `badge badge-${props.type}`
  const s = props.status
  if (['进行中'].includes(s)) return 'badge badge-danger'
  if (['已排期', '待审核', '待处理', '处理中', '已发货'].includes(s)) return 'badge badge-info'
  if (['待安排'].includes(s)) return 'badge badge-warning'
  if (['已结束', '在售', '在岗', '已完成', '已支付', '合作中', '正常', '成功'].includes(s)) return 'badge badge-success'
  if (['不足', '告警', '紧急', '重大', '已退货'].includes(s)) return 'badge badge-danger'
  if (['下架', '已取消', '已关闭', '暂停合作'].includes(s)) return 'badge badge-warning'
  return 'badge badge-default'
})
</script>

<template>
  <span :class="badgeClass">{{ status }}</span>
</template>
