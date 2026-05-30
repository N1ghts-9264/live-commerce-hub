<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { inventoryAPI } from '../api'
import type { Inventory } from '../types'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DataTable from '../components/DataTable.vue'
import Pagination from '../components/Pagination.vue'

const router = useRouter()
const items = ref<(Inventory & Record<string, any>)[]>([])
const alerts = ref<(Inventory & Record<string, any>)[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const statusFilter = ref('')
const loading = ref(false)
const showAlerts = ref(false)

const alertTotal = ref(0)
const alertPage = ref(1)
const alertPageSize = 20

async function load() {
  loading.value = true
  try {
    const { data } = await inventoryAPI.list({ page: page.value, pageSize, status: statusFilter.value })
    items.value = data.data
    total.value = data.total
  } finally { loading.value = false }
}

async function loadAlerts() {
  showAlerts.value = !showAlerts.value
  if (showAlerts.value) {
    alertPage.value = 1
    await fetchAlerts()
  }
}

async function fetchAlerts() {
  const { data } = await inventoryAPI.alerts({ page: alertPage.value, pageSize: alertPageSize })
  alerts.value = data.data
  alertTotal.value = data.total
}

function changePage(p: number) { page.value = p; load() }
function changeAlertPage(p: number) { alertPage.value = p; fetchAlerts() }

function goToPurchase(row: any) {
  router.push({ path: '/purchasing', query: { sku_id: row.sku_id, product_name: row.product_name } })
}

onMounted(() => load())

const columns = [
  { key: 'product_name', label: '商品名称' },
  { key: 'sku_name', label: 'SKU' },
  { key: 'warehouse_name', label: '仓库' },
  { key: 'current_stock', label: '当前库存' },
  { key: 'safety_stock', label: '安全库存' },
  { key: 'inventory_status', label: '状态' },
]

const alertColumns = [
  { key: 'product_name', label: '商品' },
  { key: 'sku_name', label: 'SKU' },
  { key: 'warehouse_name', label: '仓库' },
  { key: 'current_stock', label: '当前库存' },
  { key: 'safety_stock', label: '安全库存' },
  { key: 'warning_threshold', label: '预警值' },
  { key: 'inventory_status', label: '状态' },
]
</script>

<template>
  <PageHeader title="库存管理" subtitle="库存预警与仓库管理" />
  <div class="page-body">
    <div class="toolbar">
      <select v-model="statusFilter" class="form-select" style="width:auto;" @change="load()">
        <option value="">全部状态</option>
        <option value="正常">正常</option>
        <option value="不足">不足</option>
      </select>
      <button class="btn" :class="{ primary: showAlerts }" @click="loadAlerts">
        {{ showAlerts ? '隐藏预警' : '库存预警' }}
      </button>
      <button class="btn" @click="load()">刷新</button>
    </div>

    <!-- Alert Section -->
    <div v-if="showAlerts" class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <span class="card-title">库存预警清单 ({{ alertTotal }} 项)</span>
      </div>
      <div class="card-divider"></div>
      <div class="card-body">
        <DataTable :columns="alertColumns" :data="alerts" @row-click="goToPurchase">
          <template #cell-current_stock="{ value }">
            <span style="color:var(--vermillion);font-weight:600;">{{ value }}</span>
          </template>
          <template #cell-inventory_status="{ row }">
            <StatusBadge :status="row.current_stock <= row.safety_stock ? '不足' : '正常'" type="danger" />
          </template>
        </DataTable>
        <div v-if="alerts.length === 0" style="padding:20px;color:var(--success);">所有库存正常</div>
        <Pagination v-if="alertTotal > alertPageSize" :page="alertPage" :total="alertTotal" :page-size="alertPageSize" @change="changeAlertPage" />
      </div>
    </div>

    <!-- Main Inventory Table -->
    <DataTable :columns="columns" :data="items" :loading="loading">
      <template #cell-current_stock="{ row }">
        <span :style="{ color: row.current_stock <= row.safety_stock ? 'var(--vermillion)' : 'var(--ink)', fontWeight: row.current_stock <= row.safety_stock ? '600' : '400' }">
          {{ row.current_stock }}
        </span>
      </template>
      <template #cell-inventory_status="{ row }">
        <StatusBadge :status="row.current_stock <= row.safety_stock ? '不足' : '正常'" :type="row.current_stock <= row.safety_stock ? 'danger' : 'success'" />
      </template>
    </DataTable>

    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="changePage" />
  </div>
</template>
