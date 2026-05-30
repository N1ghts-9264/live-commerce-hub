<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { selectionAPI } from '../api'
import PageHeader from '../components/PageHeader.vue'
import DataTable from '../components/DataTable.vue'

const rankings = ref<any[]>([])
const recommendations = ref<any[]>([])
const advisorReport = ref<any>(null)
const loading = ref(false)
const categoryFilter = ref('')
const sortBy = ref('')
const selectedProductId = ref('')

const categories = ['女装', '美妆', '箱包', '运动户外', '零食', '家居用品', '母婴', '数码', '食品饮料']

async function load() {
  loading.value = true
  try {
    const { data } = await selectionAPI.rankings({ category: categoryFilter.value, sort: sortBy.value })
    rankings.value = data
  } finally { loading.value = false }
}

async function loadRecommendations(productId: string) {
  selectedProductId.value = productId
  const { data } = await selectionAPI.recommendations(productId)
  recommendations.value = data
}

async function loadReport() {
  const { data } = await selectionAPI.advisorReport()
  advisorReport.value = data
}

onMounted(() => { load(); loadReport() })

const rankColumns = [
  { key: 'product_name', label: '商品名称' },
  { key: 'category', label: '品类' },
  { key: 'sale_price', label: '售价' },
  { key: 'scores.conversion', label: '转化力' },
  { key: 'scores.profitability', label: '盈利力' },
  { key: 'scores.heat', label: '热度' },
  { key: 'scores.trend', label: '趋势' },
  { key: 'scores.quality', label: '售后' },
  { key: 'scores.composite', label: '综合' },
  { key: 'trendLabel', label: '走势' },
]

const recColumns = [
  { key: 'product_name', label: '商品名称' },
  { key: 'category', label: '品类' },
  { key: 'sale_price', label: '售价' },
  { key: 'co_count', label: '共同购买' },
  { key: 'jaccard', label: '关联度' },
]
</script>

<template>
  <PageHeader title="选品分析" subtitle="智能推荐引擎 / 数字顾问 / 品类关联" />
  <div class="page-body">
    <div class="toolbar">
      <select v-model="categoryFilter" class="form-select" style="width:auto;" @change="load()">
        <option value="">全部分类</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="sortBy" class="form-select" style="width:auto;" @change="load()">
        <option value="">综合排名</option>
        <option value="conversion">转化力</option>
        <option value="profitability">盈利力</option>
        <option value="heat">热度</option>
      </select>
      <button class="btn" @click="load()">刷新</button>
      <button class="btn" @click="loadReport()">顾问报告</button>
    </div>

    <!-- Advisor Report -->
    <div v-if="advisorReport" class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">数字顾问报告</span></div>
      <div class="card-divider"></div>
      <div class="card-body">
        <div v-if="advisorReport.topRecommendations?.length">
          <div style="font-weight:600;margin-bottom:8px;">Top 推荐商品</div>
          <div v-for="p in advisorReport.topRecommendations.slice(0, 5)" :key="p.product_name" style="padding:6px 0;border-bottom:1px solid var(--rule-soft);font-size:13px;">
            <span style="font-weight:600;">{{ p.product_name }}</span>
            <span class="badge badge-gold" style="margin-left:8px;">{{ p.score }}分</span>
            <span style="color:var(--ink-soft);margin-left:8px;font-size:12px;">{{ p.reason }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Rankings -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">智能选品排名 (五维评分)</span></div>
      <div class="card-divider"></div>
      <div class="card-body">
        <DataTable :columns="rankColumns" :data="rankings" :loading="loading">
          <template #cell-sale_price="{ value }">¥{{ value }}</template>
          <template #cell-['scores.composite']="{ row }">
            <span style="font-weight:700;font-family:var(--font-mono);">{{ row.scores?.composite }}</span>
          </template>
          <template #cell-trendLabel="{ value }">
            <span :style="{ color: value?.includes('上升') ? 'var(--success)' : value?.includes('下降') ? 'var(--vermillion)' : 'var(--ink-soft)' }">
              {{ value }}
            </span>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Association Recommendations -->
    <div v-if="recommendations.length" class="card">
      <div class="card-header"><span class="card-title">关联推荐 (买了该商品的人也买了...)</span></div>
      <div class="card-divider"></div>
      <div class="card-body">
        <DataTable :columns="recColumns" :data="recommendations">
          <template #cell-sale_price="{ value }">¥{{ value }}</template>
          <template #cell-jaccard="{ value }">{{ (value * 100).toFixed(1) }}%</template>
        </DataTable>
      </div>
    </div>
    <div v-else style="margin-top:16px;color:var(--ink-soft);font-size:13px;">
      点击排名表中的商品可查看关联推荐。
    </div>
  </div>
</template>
