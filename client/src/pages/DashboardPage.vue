<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { dashboardAPI } from '../api'
import type { DashboardSummary } from '../types'
import PageHeader from '../components/PageHeader.vue'
import KpiCard from '../components/KpiCard.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)

const summary = ref<DashboardSummary | null>(null)
const trend = ref<any[]>([])
const topAnchors = ref<any[]>([])
const loading = ref(true)
const dashboardDays = 30

onMounted(async () => {
  try {
    const [s, t, a] = await Promise.all([
      dashboardAPI.summary(),
      dashboardAPI.trend(dashboardDays),
      dashboardAPI.topAnchors(5, dashboardDays),
    ])
    summary.value = s.data
    trend.value = t.data
    topAnchors.value = a.data
  } catch (e) {
    console.error('Failed to load dashboard:', e)
  } finally {
    loading.value = false
  }
})

function formatCurrency(v: number) {
  if (v >= 10000) return '¥' + (v / 10000).toFixed(1) + '万'
  return '¥' + v.toLocaleString()
}

function formatNumber(v: number) {
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return v.toLocaleString()
}

const chartData = computed(() => ({
  labels: trend.value.map((t: any) => {
    const d = new Date(t.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }),
  datasets: [
    {
      label: 'GMV',
      data: trend.value.map((t: any) => t.gmv),
      borderColor: '#C41E3A',
      backgroundColor: 'rgba(196, 30, 58, 0.06)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: '#C41E3A',
      borderWidth: 2,
      yAxisID: 'y',
    },
    {
      label: '订单数',
      data: trend.value.map((t: any) => t.orders),
      borderColor: '#3A3A3A',
      backgroundColor: 'rgba(58, 58, 58, 0.04)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: '#3A3A3A',
      borderWidth: 1.5,
      borderDash: [4, 3],
      yAxisID: 'y1',
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        boxWidth: 12,
        boxHeight: 3,
        padding: 20,
        font: { family: "'Noto Sans SC', sans-serif", size: 12 },
        color: '#3A3A3A',
      },
    },
    tooltip: {
      backgroundColor: '#111111',
      titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
      bodyFont: { family: "'Noto Sans SC', sans-serif", size: 13 },
      padding: 12,
      cornerRadius: 2,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "'JetBrains Mono', monospace", size: 10 },
        color: '#6A6A64',
        maxTicksLimit: 14,
      },
    },
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      grid: { color: '#DDD8C7' },
      ticks: {
        font: { family: "'JetBrains Mono', monospace", size: 10 },
        color: '#6A6A64',
        callback: (v: any) => v >= 10000 ? (v / 10000).toFixed(0) + '万' : v,
      },
      beginAtZero: true,
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      grid: { drawOnChartArea: false },
      ticks: {
        font: { family: "'JetBrains Mono', monospace", size: 10 },
        color: '#6A6A64',
      },
      beginAtZero: true,
    },
  },
}))

function getLevelClass(level: string) {
  return `level-${level}`
}

const periodText = computed(() => {
  if (!summary.value?.period) return `近${dashboardDays}天`
  return `${summary.value.period.label} · ${summary.value.period.startDate} 至 ${summary.value.period.endDate}`
})
</script>

<template>
  <PageHeader title="运营数据总览" subtitle="直播电商业务全景" />
  <div class="page-body">
    <div class="period-banner" v-if="summary">
      <div>
        <span class="period-label">统计周期</span>
        <strong>{{ periodText }}</strong>
      </div>
      <div>
        <span class="period-label">对比口径</span>
        <strong>{{ summary.period?.compareLabel || '较前30天' }}</strong>
      </div>
      <div>
        <span class="period-label">库存口径</span>
        <strong>{{ summary.period?.stockSnapshotLabel || '当前快照' }}</strong>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="kpi-row" v-if="summary">
      <KpiCard label="GMV 总销售额" :value="formatCurrency(summary.totalGmv)" :change="`${summary.gmvChange > 0 ? '+' : ''}${summary.gmvChange}% 环比`" :change-type="summary.gmvChange >= 0 ? 'up' : 'down'" />
      <KpiCard label="总订单数" :value="formatNumber(summary.totalOrders)" :change="`${summary.ordersChange > 0 ? '+' : ''}${summary.ordersChange}% 环比`" :change-type="summary.ordersChange >= 0 ? 'up' : 'down'" />
      <KpiCard label="平均转化率" :value="summary.avgConversionRate?.toFixed(1) + '%'" :change="`${summary.conversionChange > 0 ? '+' : ''}${summary.conversionChange}% 环比`" :change-type="summary.conversionChange >= 0 ? 'up' : 'down'" />
      <KpiCard label="库存告警 SKU" :value="summary.stockAlertCount" :change="'需及时补货'" change-type="neutral" />
    </div>

    <!-- Charts Section -->
    <div class="section-grid">
      <div class="card">
        <div class="card-header">
          <span class="card-title">销售趋势（近30天）</span>
          <span class="card-extra">{{ periodText }} · GMV / 订单数</span>
        </div>
        <div class="card-divider"></div>
        <div class="card-body">
          <div class="chart-wrap" v-if="trend.length">
            <Line :data="chartData" :options="chartOptions" />
          </div>
          <div v-else style="padding:20px;color:var(--ink-soft);">暂无趋势数据</div>
        </div>
      </div>

      <!-- Top Anchors -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">主播排名 TOP5</span>
          <span class="card-extra">近30天 GMV</span>
        </div>
        <div class="card-divider"></div>
        <div class="card-body">
          <div v-if="topAnchors.length">
            <div class="anchor-item" v-for="(a, idx) in topAnchors" :key="a.anchor_id">
              <span class="anchor-rank" :class="{ t1: idx === 0 }">{{ idx + 1 }}</span>
              <div class="anchor-avatar">{{ a.anchor_name?.charAt(0) }}</div>
              <div class="anchor-info">
                <div class="anchor-name">{{ a.anchor_name }}</div>
                <div class="anchor-meta">
                  <span :class="getLevelClass(a.anchor_level)">{{ a.anchor_level }}</span>
                  {{ a.specialization }}
                </div>
              </div>
              <div class="anchor-gmv">{{ formatCurrency(a.total_gmv || 0) }}</div>
            </div>
          </div>
          <div v-else style="padding:20px;color:var(--ink-soft);">暂无数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.period-banner {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
  margin-bottom: var(--space-lg);
  padding: 14px 18px;
  border: 1px solid var(--rule-soft);
  background: var(--paper-dark);
}

.period-banner div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.period-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
  letter-spacing: 0.06em;
}

.period-banner strong {
  font-size: 14px;
  color: var(--ink);
}

.chart-wrap {
  width: 100%;
  height: 300px;
  position: relative;
}
.chart-wrap canvas {
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 900px) {
  .period-banner {
    grid-template-columns: 1fr;
  }
}
</style>
