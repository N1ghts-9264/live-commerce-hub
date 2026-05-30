<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reportsAPI } from '../api'
import type { OperationReport } from '../types'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'

const reports = ref<(OperationReport & Record<string, any>)[]>([])
const typeFilter = ref('')
const viewing = ref<OperationReport | null>(null)

async function load() {
  const { data } = await reportsAPI.list({ type: typeFilter.value })
  reports.value = data
}

async function viewReport(report: OperationReport) {
  const { data } = await reportsAPI.get(report.report_id)
  viewing.value = data
}

function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }

onMounted(() => load())

const columns = [
  { key: 'report_title', label: '报告标题' },
  { key: 'report_type', label: '类型' },
  { key: 'statistical_period', label: '统计周期' },
  { key: 'creator_name', label: '创建人' },
  { key: 'create_time', label: '创建时间' },
]
</script>

<template>
  <PageHeader title="运营报告" subtitle="数据分析报告" />
  <div class="page-body">
    <div class="toolbar">
      <select v-model="typeFilter" class="form-select" style="width:auto;" @change="load()">
        <option value="">全部类型</option>
        <option value="周报">周报</option>
        <option value="月报">月报</option>
        <option value="季报">季报</option>
        <option value="专项分析">专项分析</option>
      </select>
      <button class="btn" @click="load()">刷新</button>
    </div>

    <DataTable :columns="columns" :data="reports">
      <template #cell-create_time="{ value }">{{ formatDate(value) }}</template>
      <template #cell-report_title="{ row }">
        <a style="cursor:pointer;text-decoration:underline;" @click="viewReport(row)">{{ row.report_title }}</a>
      </template>
    </DataTable>

    <!-- Report Viewer -->
    <div v-if="viewing" class="card" style="margin-top:24px;">
      <div class="card-header">
        <span class="card-title">{{ viewing.report_title }}</span>
        <button class="btn small" @click="viewing = null">关闭</button>
      </div>
      <div class="card-divider"></div>
      <div class="card-body">
        <div style="white-space:pre-wrap;line-height:1.8;">{{ viewing.report_content }}</div>
      </div>
    </div>
  </div>
</template>
