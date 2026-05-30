<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { afterSalesAPI } from '../api'
import type { AfterSale } from '../types'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DataTable from '../components/DataTable.vue'
import Pagination from '../components/Pagination.vue'

const items = ref<(AfterSale & Record<string, any>)[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const statusFilter = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await afterSalesAPI.list({ page: page.value, pageSize, status: statusFilter.value })
    items.value = data.data
    total.value = data.total
  } finally { loading.value = false }
}

async function updateStatus(item: AfterSale, status: string) {
  await afterSalesAPI.update(item.aftersale_id, { process_status: status })
  await load()
}

function changePage(p: number) { page.value = p; load() }

onMounted(() => load())

const columns = [
  { key: 'nickname', label: '用户' },
  { key: 'aftersale_type', label: '售后类型' },
  { key: 'problem_description', label: '问题描述' },
  { key: 'refund_amount', label: '退款金额' },
  { key: 'complaint_level', label: '投诉等级' },
  { key: 'process_status', label: '处理状态' },
  { key: 'create_time', label: '创建时间' },
  { key: 'actions', label: '操作' },
]
</script>

<template>
  <PageHeader title="售后工单" subtitle="售后处理与跟踪" />
  <div class="page-body">
    <div class="toolbar">
      <select v-model="statusFilter" class="form-select" style="width:auto;" @change="load()">
        <option value="">全部状态</option>
        <option value="待处理">待处理</option>
        <option value="处理中">处理中</option>
        <option value="已完成">已完成</option>
        <option value="已关闭">已关闭</option>
      </select>
      <button class="btn" @click="load()">刷新</button>
    </div>

    <DataTable :columns="columns" :data="items" :loading="loading">
      <template #cell-refund_amount="{ value }">{{ value ? '¥' + value : '-' }}</template>
      <template #cell-process_status="{ value }">
        <StatusBadge :status="value" />
      </template>
      <template #cell-create_time="{ value }">{{ value?.split('T')[0] }}</template>
      <template #cell-actions="{ row }">
        <button v-if="row.process_status === '待处理'" class="btn small primary" @click="updateStatus(row, '处理中')">开始处理</button>
        <button v-if="row.process_status === '处理中'" class="btn small primary" @click="updateStatus(row, '已完成')">完成</button>
        <button v-if="row.process_status === '待处理' || row.process_status === '处理中'" class="btn small danger" style="margin-left:8px;" @click="updateStatus(row, '已关闭')">关闭</button>
      </template>
    </DataTable>

    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="changePage" />
  </div>
</template>
