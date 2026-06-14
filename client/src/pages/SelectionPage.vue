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
const selectedProductName = ref('')
const coldStartLoading = ref(false)
const coldStartResult = ref<any>(null)
const coldStartError = ref('')

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
  selectedProductName.value = rankings.value.find((p) => p.product_id === productId)?.product_name || ''
  const { data } = await selectionAPI.recommendations(productId)
  recommendations.value = data
}

async function selectProduct(row: any) {
  await loadRecommendations(row.product_id)
}

async function runColdStart() {
  if (!selectedProductId.value) return
  coldStartLoading.value = true
  coldStartError.value = ''
  try {
    const { data } = await selectionAPI.coldstart(selectedProductId.value)
    coldStartResult.value = data
  } catch (err: any) {
    coldStartError.value = err?.response?.data?.message || err?.message || '新品冷启动评估失败'
  } finally {
    coldStartLoading.value = false
  }
}

async function loadReport() {
  const { data } = await selectionAPI.advisorReport()
  advisorReport.value = data
}

function formatAssessment(value: any) {
  if (!value) return []
  if (typeof value === 'string') return [{ label: '评估结论', value }]
  const labels: Record<string, string> = {
    potential_level: '潜力等级',
    estimated_conversion: '预估转化',
    target_audience: '目标人群',
    selling_angle: '讲解角度',
    risk_notes: '风险提示',
  }
  return Object.entries(value).map(([key, val]) => ({ label: labels[key] || key, value: String(val) }))
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
      <button class="btn btn-primary" :disabled="!selectedProductId || coldStartLoading" @click="runColdStart">
        {{ coldStartLoading ? '评估中...' : '新品冷启动评估' }}
      </button>
      <span v-if="selectedProductName" style="color:var(--ink-soft);font-size:13px;">已选：{{ selectedProductName }}</span>
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
        <DataTable :columns="rankColumns" :data="rankings" :loading="loading" @row-click="selectProduct">
          <template #cell-sale_price="{ value }">¥{{ value }}</template>
          <template #[`cell-scores.composite`]="{ row }">
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

    <!-- Cold Start -->
    <div v-if="coldStartResult || coldStartError" class="card" style="margin-bottom:24px;">
      <div class="card-header"><span class="card-title">新品冷启动评估</span></div>
      <div class="card-divider"></div>
      <div class="card-body">
        <div v-if="coldStartError" style="color:var(--vermillion);font-size:13px;">{{ coldStartError }}</div>
        <div v-else class="cold-grid">
          <div class="cold-metric">
            <span>预估分</span>
            <strong>{{ coldStartResult.estimatedScore }}</strong>
          </div>
          <div class="cold-metric">
            <span>置信度</span>
            <strong>{{ coldStartResult.confidence }}</strong>
          </div>
          <div class="cold-metric">
            <span>探索加权</span>
            <strong>+{{ coldStartResult.explorationBoost }}</strong>
          </div>
          <div class="assessment-panel">
            <div v-for="item in formatAssessment(coldStartResult.llmAssessment)" :key="item.label" class="assessment-row">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>
        <div v-if="coldStartResult?.similarProducts?.length" style="margin-top:16px;">
          <div style="font-weight:600;margin-bottom:8px;">相似商品参照</div>
          <div class="similar-list">
            <div v-for="p in coldStartResult.similarProducts" :key="p.product_id" class="similar-item">
              <span>{{ p.product_name }}</span>
              <strong>{{ (p.similarity * 100).toFixed(1) }}%</strong>
            </div>
          </div>
        </div>
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

<style scoped>
.cold-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 12px;
}

.cold-metric {
  border: 1px solid var(--rule-soft);
  border-radius: 8px;
  padding: 12px;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cold-metric span,
.assessment-row span {
  color: var(--ink-soft);
  font-size: 12px;
}

.cold-metric strong {
  font-family: var(--font-mono);
  font-size: 22px;
}

.assessment-panel {
  grid-column: 1 / -1;
  border: 1px solid var(--rule-soft);
  border-radius: 8px;
  padding: 12px;
}

.assessment-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
}

.similar-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.similar-item {
  border: 1px solid var(--rule-soft);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

@media (max-width: 720px) {
  .cold-grid {
    grid-template-columns: 1fr;
  }

  .assessment-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
