<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { liveReviewsAPI, liveSessionsAPI } from '../api'

const route = useRoute()
const endedSessions = ref<any[]>([])
const reviews = ref<any[]>([])
const selectedLiveId = ref('')
const selectedReview = ref<any>(null)
const loading = ref(false)
const generating = ref(false)
const errorMessage = ref('')

function currency(value: number) {
  const n = Number(value || 0)
  return n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`
}

function pct(value: number) {
  return `${Number(value || 0).toFixed(2).replace(/\.00$/, '')}%`
}

function number(value: number) {
  return Number(value || 0).toLocaleString()
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function ordinal(index: number | string) {
  return Number(index) + 1
}

async function loadSessions() {
  const { data } = await liveSessionsAPI.list({ status: '已结束', pageSize: 100 })
  endedSessions.value = data.data || []
  if (!selectedLiveId.value && endedSessions.value.length > 0) {
    selectedLiveId.value = endedSessions.value[0].live_id
  }
}

async function loadReviews() {
  const { data } = await liveReviewsAPI.list()
  reviews.value = data || []
  const queryLiveId = route.query.liveId as string | undefined
  if (queryLiveId) {
    selectedLiveId.value = queryLiveId
    const matched = reviews.value.find((review) => review.live_id === queryLiveId)
    if (matched) {
      selectedReview.value = matched
      return
    }
  }
  if (!selectedReview.value && reviews.value.length > 0) {
    selectedReview.value = reviews.value[0]
  }
}

async function generateReview() {
  if (!selectedLiveId.value) return
  generating.value = true
  errorMessage.value = ''
  try {
    const { data } = await liveReviewsAPI.generate(selectedLiveId.value)
    selectedReview.value = data
    await loadReviews()
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || '生成复盘失败，请确认后端服务已重启并完成数据库迁移。'
  } finally {
    generating.value = false
  }
}

async function openReview(review: any) {
  errorMessage.value = ''
  try {
    const { data } = await liveReviewsAPI.get(review.review_id)
    selectedReview.value = data
    selectedLiveId.value = data.live_id
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || '读取复盘失败。'
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([loadSessions(), loadReviews()])
  } catch (error: any) {
    errorMessage.value = error.response?.data?.message || error.message || '加载复盘数据失败，请确认后端服务已重启并完成数据库迁移。'
  } finally {
    loading.value = false
  }
}

const kpis = computed(() => {
  const review = selectedReview.value
  if (!review) return []
  return [
    { label: '综合评分', value: `${review.score.value}`, extra: `${review.score.grade}级`, tone: review.score.grade === 'A' ? 'good' : review.score.grade === 'B' ? 'warn' : 'risk' },
    { label: 'GMV达成', value: pct(review.core.gmvAchievement), extra: `${currency(review.core.actualGmv)} / ${currency(review.core.plannedGmv)}`, tone: review.core.gmvAchievement >= 90 ? 'good' : 'warn' },
    { label: '流量达成', value: pct(review.core.trafficAchievement), extra: `${number(review.core.actualPeakOnline)} / ${number(review.core.plannedPeakOnline)}`, tone: review.core.trafficAchievement >= 90 ? 'good' : 'risk' },
    { label: '观看转化', value: pct(review.core.actualConversionRate), extra: `目标 ${pct(review.core.plannedConversionRate)}`, tone: review.core.actualConversionRate >= review.core.plannedConversionRate ? 'good' : 'risk' },
  ]
})

const funnelSteps = computed(() => {
  const funnel = selectedReview.value?.funnel
  if (!funnel) return []
  return [
    { label: '曝光', value: funnel.exposure, rate: 100 },
    { label: '进入直播间', value: funnel.viewers, rate: funnel.viewRate },
    { label: '商品点击', value: funnel.productClicks, rate: funnel.clickRate },
    { label: '订单', value: funnel.orders, rate: funnel.orderConversionRate },
    { label: '购买用户', value: funnel.buyers, rate: funnel.buyerConversionRate },
  ]
})

const topProducts = computed(() => selectedReview.value?.products?.slice(0, 5) || [])
const diagnosis = computed(() => selectedReview.value?.diagnosis || [])
const suggestions = computed(() => selectedReview.value?.suggestions || [])

onMounted(load)
</script>

<template>
  <PageHeader title="直播复盘" subtitle="目标达成 / 转化漏斗 / 货品贡献 / 主播表现 / 改进建议" />
  <div class="page-body">
    <div class="review-shell">
      <aside class="review-aside">
        <div v-if="errorMessage" class="review-error">
          {{ errorMessage }}
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">生成复盘</span>
          </div>
          <div class="card-divider"></div>
          <div class="card-body">
            <label class="form-label">已结束直播</label>
            <select v-model="selectedLiveId" class="form-select">
              <option v-for="session in endedSessions" :key="session.live_id" :value="session.live_id">
                {{ session.live_title }}
              </option>
            </select>
            <button class="btn primary review-generate" :disabled="generating || !selectedLiveId" @click="generateReview">
              {{ generating ? '生成中...' : '生成/刷新复盘' }}
            </button>
            <div class="review-hint">
              复盘会复用直播场次、订单、互动、商品表现、主播表现和用户行为统计，生成结构化决策建议。
            </div>
          </div>
        </div>

        <div class="card review-list">
          <div class="card-header">
            <span class="card-title">历史复盘</span>
            <button class="btn small" @click="load">刷新</button>
          </div>
          <div class="card-divider"></div>
          <div class="card-body">
            <div v-if="loading" class="empty">加载中...</div>
            <button
              v-for="review in reviews"
              :key="review.review_id"
              class="review-list-item"
              :class="{ active: selectedReview?.review_id === review.review_id }"
              @click="openReview(review)"
            >
              <span>{{ review.live_title }}</span>
              <strong>{{ review.score.grade }} / {{ review.score.value }}</strong>
              <em>{{ formatDate(review.generated_time) }}</em>
            </button>
            <div v-if="!loading && reviews.length === 0" class="empty">暂无复盘记录</div>
          </div>
        </div>
      </aside>

      <main v-if="selectedReview" class="review-main">
        <div class="review-title-row">
          <div>
            <h2>{{ selectedReview.live_title }}</h2>
            <span>{{ selectedReview.anchor_name }} · {{ selectedReview.live_category }} · {{ formatDate(selectedReview.generated_time) }}</span>
          </div>
          <div class="score-stamp" :class="`grade-${selectedReview.score.grade}`">
            {{ selectedReview.score.grade }}
          </div>
        </div>

        <div class="kpi-row review-kpis">
          <div v-for="item in kpis" :key="item.label" class="review-kpi" :class="item.tone">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.extra }}</em>
          </div>
        </div>

        <div class="section-grid">
          <section class="card">
            <div class="card-header">
              <span class="card-title">流量与转化漏斗</span>
              <span class="card-extra">从曝光到成交</span>
            </div>
            <div class="card-divider"></div>
            <div class="card-body funnel-body">
              <div v-for="step in funnelSteps" :key="step.label" class="funnel-step">
                <div>
                  <strong>{{ step.label }}</strong>
                  <span>{{ number(step.value) }}</span>
                </div>
                <div class="funnel-track">
                  <i :style="{ width: `${Math.max(5, Math.min(100, step.rate))}%` }"></i>
                </div>
                <em>{{ pct(step.rate) }}</em>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <span class="card-title">复盘结论</span>
            </div>
            <div class="card-divider"></div>
            <div class="card-body">
              <p class="summary">{{ selectedReview.summary }}</p>
              <div class="diagnosis-list">
                <div v-for="item in diagnosis" :key="item.dimension" class="diagnosis-item" :class="item.level">
                  <strong>{{ item.dimension }} · {{ item.level }}</strong>
                  <span>{{ item.conclusion }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="section-grid product-grid">
          <section class="card">
            <div class="card-header">
              <span class="card-title">商品贡献拆解</span>
              <span class="card-extra">GMV贡献 / 转化 / 角色</span>
            </div>
            <div class="card-divider"></div>
            <div class="card-body product-list">
              <div v-for="product in topProducts" :key="product.product_review_id" class="product-row">
                <div class="product-name">
                  <strong>{{ product.product_name }}</strong>
                  <span>{{ product.review_role }} · {{ product.conclusion }}</span>
                </div>
                <div class="product-metrics">
                  <span>{{ currency(product.gmv) }}</span>
                  <em>{{ pct(product.contribution_rate) }}</em>
                  <small>转化 {{ pct(product.conversion_rate) }}</small>
                </div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-header">
              <span class="card-title">主播表现分析</span>
            </div>
            <div class="card-divider"></div>
            <div class="card-body anchor-panel">
              <div class="anchor-score">{{ selectedReview.anchor.performance_score }}</div>
              <div class="anchor-lines">
                <span>转化率 {{ pct(selectedReview.anchor.conversion_rate) }}</span>
                <span>平均停留 {{ number(selectedReview.anchor.average_watch_time) }} 秒</span>
                <span>互动率 {{ pct(selectedReview.anchor.interaction_rate) }}</span>
                <span>脚本执行 {{ number(selectedReview.anchor.script_execution_score) }}</span>
              </div>
              <p>{{ selectedReview.anchor.conclusion }}</p>
            </div>
          </section>
        </div>

        <section class="card">
          <div class="card-header">
            <span class="card-title">行动建议</span>
            <span class="card-extra">形成下一场直播的改进闭环</span>
          </div>
          <div class="card-divider"></div>
          <div class="card-body suggestions">
            <div v-for="(item, index) in suggestions" :key="item" class="suggestion-item">
              <strong>{{ ordinal(index) }}</strong>
              <span>{{ item }}</span>
            </div>
          </div>
        </section>
      </main>

      <main v-else class="review-main empty-board">
        <div class="card">
          <div class="card-body empty">请选择一场已结束直播并生成复盘。</div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.review-shell {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.review-aside {
  display: grid;
  gap: 18px;
}

.review-error {
  border: 1px solid var(--vermillion);
  background: var(--vermillion-soft);
  color: var(--vermillion);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.6;
}

.review-generate {
  width: 100%;
  justify-content: center;
  margin-top: 14px;
}

.review-hint {
  margin-top: 12px;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.7;
}

.review-list .card-body {
  padding: 12px;
}

.review-list-item {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink);
  display: grid;
  gap: 2px;
  text-align: left;
  padding: 12px;
  cursor: pointer;
}

.review-list-item:hover,
.review-list-item.active {
  border-color: var(--ink);
  background: var(--paper);
}

.review-list-item strong {
  font-family: var(--font-mono);
  color: var(--vermillion);
}

.review-list-item em {
  color: var(--ink-soft);
  font-size: 11px;
  font-style: normal;
}

.review-main {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.review-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border: 1px solid var(--rule-soft);
  background: var(--paper-dark);
  padding: 22px 26px;
}

.review-title-row h2 {
  font-family: var(--font-serif);
  font-size: 24px;
  line-height: 1.2;
}

.review-title-row span {
  display: block;
  margin-top: 6px;
  color: var(--ink-soft);
  font-size: 13px;
}

.score-stamp {
  width: 72px;
  height: 72px;
  border: 2px solid var(--ink);
  display: grid;
  place-items: center;
  font-family: var(--font-serif);
  font-size: 38px;
  font-weight: 900;
  background: var(--paper);
  box-shadow: 6px 6px 0 var(--ink);
}

.score-stamp.grade-A { color: var(--success); }
.score-stamp.grade-B { color: var(--warning); }
.score-stamp.grade-C { color: var(--vermillion); }

.review-kpis {
  margin-bottom: 0;
}

.review-kpi {
  border: 1px solid var(--rule-soft);
  background: var(--paper-dark);
  padding: 18px 20px;
  display: grid;
  gap: 6px;
}

.review-kpi span,
.review-kpi em {
  color: var(--ink-soft);
  font-size: 12px;
  font-style: normal;
}

.review-kpi strong {
  font-family: var(--font-serif);
  font-size: 32px;
  line-height: 1;
}

.review-kpi.good { border-left: 4px solid var(--success); }
.review-kpi.warn { border-left: 4px solid var(--warning); }
.review-kpi.risk { border-left: 4px solid var(--vermillion); }

.funnel-body {
  display: grid;
  gap: 14px;
}

.funnel-step {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 60px;
  gap: 14px;
  align-items: center;
}

.funnel-step div:first-child {
  display: grid;
}

.funnel-step span,
.funnel-step em {
  color: var(--ink-soft);
  font-size: 12px;
  font-style: normal;
}

.funnel-track {
  height: 14px;
  background: var(--paper);
  border: 1px solid var(--rule-soft);
}

.funnel-track i {
  display: block;
  height: 100%;
  background: var(--vermillion);
}

.summary {
  line-height: 1.8;
  margin-bottom: 14px;
}

.diagnosis-list {
  display: grid;
  gap: 10px;
}

.diagnosis-item {
  border-left: 3px solid var(--rule);
  padding-left: 12px;
  display: grid;
  gap: 2px;
}

.diagnosis-item span {
  color: var(--ink-mid);
  font-size: 13px;
}

.diagnosis-item.优势 { border-left-color: var(--success); }
.diagnosis-item.关注 { border-left-color: var(--warning); }
.diagnosis-item.风险 { border-left-color: var(--vermillion); }

.product-grid {
  grid-template-columns: 3fr 2fr;
}

.product-list {
  display: grid;
  gap: 12px;
}

.product-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 16px;
  border-bottom: 1px solid var(--rule-soft);
  padding-bottom: 12px;
}

.product-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.product-name {
  display: grid;
  gap: 3px;
}

.product-name span,
.product-metrics small {
  color: var(--ink-soft);
  font-size: 12px;
}

.product-metrics {
  display: grid;
  justify-items: end;
}

.product-metrics span {
  font-family: var(--font-mono);
  font-weight: 700;
}

.product-metrics em {
  color: var(--vermillion);
  font-style: normal;
}

.anchor-panel {
  display: grid;
  gap: 14px;
}

.anchor-score {
  font-family: var(--font-serif);
  font-size: 54px;
  line-height: 1;
  color: var(--vermillion);
}

.anchor-lines {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  color: var(--ink-mid);
  font-size: 13px;
}

.anchor-panel p {
  color: var(--ink-mid);
  line-height: 1.7;
}

.suggestions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.suggestion-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--paper);
  border: 1px solid var(--rule-soft);
  padding: 14px;
}

.suggestion-item strong {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-mono);
}

.empty {
  color: var(--ink-soft);
  text-align: center;
  padding: 24px 0;
}

@media (max-width: 1100px) {
  .review-shell,
  .section-grid,
  .product-grid {
    grid-template-columns: 1fr;
  }
  .suggestions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .funnel-step,
  .product-row,
  .anchor-lines {
    grid-template-columns: 1fr;
  }
}
</style>
