<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { anchorsAPI, anchorProductPlanningAPI, liveSessionsAPI, productsAPI } from '../api'

const route = useRoute()
const products = ref<any[]>([])
const anchors = ref<any[]>([])
const sessions = ref<any[]>([])
const fits = ref<any[]>([])
const plan = ref<any | null>(null)
const selectedProductId = ref('')
const selectedAnchorId = ref('')
const selectedLiveId = ref('')
const loading = ref(false)
const confirming = ref(false)
const error = ref('')
const message = ref('')

const plannableSessions = computed(() => sessions.value.filter((item) => {
  const status = String(item.live_status || '')
  return !status.includes('进行中') && !status.includes('已结束')
}))
const selectedSession = computed(() => sessions.value.find((item) => item.live_id === selectedLiveId.value))
const selectedAnchor = computed(() => anchors.value.find((item) => item.anchor_id === (plan.value?.anchor_id || selectedSession.value?.anchor_id || selectedAnchorId.value)))
const bestFit = computed(() => fits.value[0])
const roleCounts = computed(() => {
  const source = plan.value?.items?.length ? plan.value.items.map((item: any) => ({ recommended_role: item.plan_role })) : fits.value
  return source.reduce((acc: Record<string, number>, item: any) => {
    acc[item.recommended_role] = (acc[item.recommended_role] || 0) + 1
    return acc
  }, {})
})
const planReady = computed(() => plan.value && plan.value.items?.length)
const canConfirmPlan = computed(() => planReady.value && plan.value.plan_status !== '已确认')

function formatMoney(value: number) {
  return `¥${Number(value || 0).toLocaleString()}`
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function levelClass(level: string) {
  return `level-${String(level || 'C').toLowerCase()}`
}

function roleClass(role: string) {
  if (role === '主推') return 'role-main'
  if (role === '辅推') return 'role-support'
  if (role === '试播') return 'role-test'
  return 'role-hold'
}

function statusClass(status: string) {
  if (status === '已确认') return 'status-confirmed'
  if (status === '草案') return 'status-draft'
  return 'status-default'
}

async function loadBaseData() {
  const [productRes, anchorRes, liveRes] = await Promise.all([
    productsAPI.list({ pageSize: 100 }),
    anchorsAPI.list({ pageSize: 80 }),
    liveSessionsAPI.list({ pageSize: 200 }),
  ])
  products.value = productRes.data.data || productRes.data
  anchors.value = anchorRes.data.data || anchorRes.data
  sessions.value = liveRes.data.data || liveRes.data
  selectedProductId.value = products.value[0]?.product_id || ''
  selectedAnchorId.value = anchors.value[0]?.anchor_id || ''
  const requestedLiveId = String(route.query.liveId || '')
  const requestedSession = plannableSessions.value.find((item) => item.live_id === requestedLiveId)
  const firstPendingSession = plannableSessions.value.find((item) => item.live_status === '待安排')
  selectedLiveId.value = requestedSession?.live_id || firstPendingSession?.live_id || plannableSessions.value[0]?.live_id || sessions.value[0]?.live_id || ''
}

async function loadPlanForSelectedSession() {
  plan.value = null
  if (!selectedLiveId.value) return
  try {
    const { data } = await anchorProductPlanningAPI.getPlan(selectedLiveId.value)
    plan.value = data
    if (data?.anchor_id) selectedAnchorId.value = data.anchor_id
  } catch (e: any) {
    if (e.response?.status !== 404) error.value = e.response?.data?.message || '计划加载失败'
  }
}

async function loadFits() {
  error.value = ''
  const { data } = await anchorProductPlanningAPI.fits({
    productId: selectedProductId.value || undefined,
    anchorId: selectedAnchorId.value || undefined,
    limit: 30,
  })
  fits.value = data
}

async function runProductFit() {
  if (!selectedProductId.value) return
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await anchorProductPlanningAPI.generateForProduct(selectedProductId.value)
    fits.value = data
    message.value = '商品适配已刷新，可作为场次排品参考。'
  } catch (e: any) {
    error.value = e.response?.data?.message || '商品适配生成失败'
  } finally {
    loading.value = false
  }
}

async function runAnchorFit() {
  if (!selectedAnchorId.value) return
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await anchorProductPlanningAPI.generateForAnchor(selectedAnchorId.value)
    fits.value = data
    message.value = '主播适配已刷新，可用于检查备选商品。'
  } catch (e: any) {
    error.value = e.response?.data?.message || '主播适配生成失败'
  } finally {
    loading.value = false
  }
}

async function runLivePlan() {
  if (!selectedLiveId.value) return
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await anchorProductPlanningAPI.createPlan(selectedLiveId.value)
    plan.value = data
    if (data?.anchor_id) selectedAnchorId.value = data.anchor_id
    message.value = '场次排品草案已生成，请审查商品顺序、推荐时长、目标和风险后确认。'
    await loadFits()
  } catch (e: any) {
    error.value = e.response?.data?.message || '场次计划生成失败'
  } finally {
    loading.value = false
  }
}

async function confirmPlan() {
  if (!plan.value?.plan_id) return
  confirming.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await anchorProductPlanningAPI.confirmPlan(plan.value.plan_id)
    plan.value = data
    const liveRes = await liveSessionsAPI.list({ pageSize: 200 })
    sessions.value = liveRes.data.data || liveRes.data
    message.value = '计划已确认，直播场次已更新为已排期。'
  } catch (e: any) {
    error.value = e.response?.data?.message || '确认计划失败'
  } finally {
    confirming.value = false
  }
}

watch(selectedLiveId, async () => {
  error.value = ''
  message.value = ''
  await loadPlanForSelectedSession()
})

onMounted(async () => {
  loading.value = true
  try {
    await loadBaseData()
    await Promise.all([loadPlanForSelectedSession(), loadFits()])
  } catch (e: any) {
    error.value = e.response?.data?.message || '页面数据加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PageHeader title="场次安排" subtitle="未开播场次排品 / 主播商品适配 / 计划确认入排期" />

  <div class="page-body planning-page">
    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="message" class="message-banner">{{ message }}</div>

    <section class="schedule-band">
      <div class="session-picker">
        <div class="field-title">未开播场次</div>
        <select v-model="selectedLiveId" class="form-select">
          <option v-for="session in plannableSessions" :key="session.live_id" :value="session.live_id">
            {{ session.live_title }} / {{ session.live_status }} / {{ formatDate(session.start_time) }}
          </option>
        </select>
        <div class="session-meta">
          <span>{{ selectedSession?.anchor_name || selectedAnchor?.anchor_name || '-' }}</span>
          <span>{{ selectedSession?.live_category || '-' }}</span>
          <span>{{ selectedSession?.platform || '-' }}</span>
        </div>
      </div>

      <div class="workflow-card">
        <span>1</span>
        <strong>生成排品草案</strong>
        <small>依据主播专长、商品适配、库存与新品风险生成商品顺序和带货要素。</small>
      </div>
      <div class="workflow-card">
        <span>2</span>
        <strong>人工审查</strong>
        <small>核对主推/辅推/试播、推荐时间、GMV 目标、订单目标和风险提示。</small>
      </div>
      <div class="workflow-card">
        <span>3</span>
        <strong>确认排期</strong>
        <small>确认后计划状态固化，直播场次进入已排期，可用于后续开播执行。</small>
      </div>
    </section>

    <section class="action-bar">
      <button class="btn primary" :disabled="loading || !selectedLiveId" @click="runLivePlan">
        一键生成场次带货计划
      </button>
      <button class="btn" :disabled="confirming || !canConfirmPlan" @click="confirmPlan">
        确认无误并设为已排期
      </button>
      <span v-if="plan" class="plan-status" :class="statusClass(plan.plan_status)">
        {{ plan.plan_status }} / {{ plan.live_status }}
      </span>
    </section>

    <section class="summary-grid">
      <div class="summary-tile">
        <span>计划场次</span>
        <strong>{{ selectedSession?.live_title || '-' }}</strong>
        <small>{{ formatDate(selectedSession?.start_time) }}</small>
      </div>
      <div class="summary-tile">
        <span>主播与品类</span>
        <strong>{{ selectedAnchor?.anchor_name || selectedSession?.anchor_name || '-' }}</strong>
        <small>{{ selectedSession?.live_category || selectedAnchor?.specialization || '-' }}</small>
      </div>
      <div class="summary-tile accent">
        <span>计划目标 GMV</span>
        <strong>{{ plan ? formatMoney(plan.target_gmv) : '-' }}</strong>
        <small>{{ plan ? `${plan.target_orders} 单 / ${plan.total_planned_minutes} 分钟` : '等待生成' }}</small>
      </div>
      <div class="summary-tile">
        <span>商品角色结构</span>
        <strong>{{ roleCounts['主推'] || 0 }} / {{ roleCounts['辅推'] || 0 }} / {{ roleCounts['试播'] || 0 }}</strong>
        <small>主推 / 辅推 / 试播</small>
      </div>
    </section>

    <section class="content-grid">
      <div class="panel plan-panel">
        <div class="panel-head">
          <div>
            <h3>场次带货计划</h3>
            <p>系统生成的是可审查草案，确认后用于直播执行；具体话术仍由脚本模块承接。</p>
          </div>
        </div>

        <div v-if="!plan" class="plan-placeholder">
          选择未开播场次后点击“一键生成场次带货计划”，系统会自动选择适配商品并给出推荐时间、目标和风险。
        </div>

        <template v-else>
          <div class="plan-hero">
            <span>{{ plan.plan_status }} / {{ plan.live_status }}</span>
            <strong>{{ plan.live_title }}</strong>
            <small>{{ plan.anchor_name }} / {{ plan.live_category }} / {{ formatDate(plan.start_time) }}</small>
          </div>

          <div class="plan-metrics">
            <div>
              <span>目标 GMV</span>
              <strong>{{ formatMoney(plan.target_gmv) }}</strong>
            </div>
            <div>
              <span>目标订单</span>
              <strong>{{ plan.target_orders }}</strong>
            </div>
            <div>
              <span>规划时长</span>
              <strong>{{ plan.total_planned_minutes }} 分钟</strong>
            </div>
          </div>

          <p class="plan-goal">{{ plan.plan_goal }}</p>

          <div class="plan-items">
            <div v-for="item in plan.items" :key="item.item_id" class="plan-item">
              <div class="order">{{ item.sort_order }}</div>
              <div>
                <strong>{{ item.product_name }}</strong>
                <small>
                  {{ item.category }} / {{ item.suggested_minutes }} 分钟 /
                  {{ formatMoney(item.target_gmv) }} / {{ item.target_orders }} 单
                </small>
                <p>{{ item.plan_reason }}</p>
                <p v-if="item.script_title" class="script-line">脚本参考：{{ item.script_title }}</p>
                <p class="risk">{{ item.risk_notes }}</p>
              </div>
              <span class="role-pill" :class="roleClass(item.plan_role)">{{ item.plan_role }}</span>
            </div>
          </div>
        </template>
      </div>

      <div class="panel fit-panel">
        <div class="panel-head compact">
          <div>
            <h3>适配依据</h3>
            <p>用于解释为什么系统选择这些商品和主播组合。</p>
          </div>
        </div>

        <div class="control-stack">
          <label class="form-label">按商品找主播</label>
          <select v-model="selectedProductId" class="form-select">
            <option v-for="product in products" :key="product.product_id" :value="product.product_id">
              {{ product.product_name }}
            </option>
          </select>
          <button class="btn small" :disabled="loading || !selectedProductId" @click="runProductFit">刷新商品适配</button>

          <label class="form-label">按主播找商品</label>
          <select v-model="selectedAnchorId" class="form-select">
            <option v-for="anchor in anchors" :key="anchor.anchor_id" :value="anchor.anchor_id">
              {{ anchor.anchor_name }} / {{ anchor.specialization }}
            </option>
          </select>
          <button class="btn small" :disabled="loading || !selectedAnchorId" @click="runAnchorFit">刷新主播适配</button>
        </div>

        <div class="best-fit">
          <span>当前最高适配</span>
          <strong>{{ bestFit ? `${bestFit.fit_score}分` : '-' }}</strong>
          <small>{{ bestFit ? `${bestFit.anchor_name} / ${bestFit.product_name}` : '暂无适配结果' }}</small>
        </div>

        <div class="fit-table">
          <div v-if="!fits.length" class="empty-state">暂无适配结果。</div>
          <div v-for="fit in fits.slice(0, 8)" :key="`${fit.anchor_id}-${fit.product_id}`" class="fit-row">
            <div>
              <strong>{{ fit.product_name }}</strong>
              <small>{{ fit.anchor_name }} / {{ fit.category }}</small>
            </div>
            <span class="score">{{ fit.fit_score }}</span>
            <span class="level-pill" :class="levelClass(fit.fit_level)">{{ fit.fit_level }}</span>
            <span class="role-pill" :class="roleClass(fit.recommended_role)">{{ fit.recommended_role }}</span>
            <p>{{ fit.match_reason }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.planning-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-banner,
.message-banner {
  border: 1px solid rgba(196, 30, 58, 0.35);
  background: rgba(196, 30, 58, 0.08);
  color: var(--vermillion);
  padding: 12px 14px;
  font-weight: 600;
}

.message-banner {
  border-color: rgba(20, 105, 78, 0.28);
  background: rgba(20, 105, 78, 0.08);
  color: var(--success);
}

.schedule-band {
  display: grid;
  grid-template-columns: minmax(320px, 1.2fr) repeat(3, minmax(160px, 0.8fr));
  gap: 14px;
}

.session-picker,
.workflow-card,
.summary-tile,
.panel {
  border: 1px solid var(--rule);
  background: var(--paper);
}

.session-picker {
  padding: 16px;
  background: var(--paper-dark);
}

.field-title {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-soft);
  margin-bottom: 8px;
}

.session-meta {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  color: var(--ink-soft);
  font-size: 12px;
}

.workflow-card {
  padding: 14px;
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 4px 10px;
  align-items: start;
}

.workflow-card span {
  grid-row: 1 / 3;
  width: 28px;
  height: 28px;
  background: var(--ink);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 12px;
}

.workflow-card strong {
  line-height: 1.2;
}

.workflow-card small {
  color: var(--ink-soft);
  line-height: 1.45;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.plan-status {
  border: 1px solid var(--rule);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
}

.status-confirmed {
  background: rgba(20, 105, 78, 0.1);
  color: var(--success);
}

.status-draft {
  background: rgba(188, 125, 43, 0.12);
  color: var(--warning);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-tile {
  padding: 18px 20px;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.summary-tile span,
.summary-tile small {
  color: var(--ink-soft);
  font-size: 12px;
}

.summary-tile strong {
  font-family: var(--font-serif);
  font-size: 25px;
  line-height: 1.15;
}

.summary-tile.accent {
  border-left: 4px solid var(--vermillion);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.85fr);
  gap: 20px;
  align-items: start;
}

.panel {
  padding: 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 14px;
  margin-bottom: 16px;
}

.panel-head.compact {
  margin-bottom: 12px;
}

.panel-head h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.panel-head p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 13px;
}

.control-stack {
  display: grid;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--rule-soft);
}

.best-fit {
  padding: 14px 0;
  border-bottom: 1px solid var(--rule-soft);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.best-fit span,
.best-fit small {
  color: var(--ink-soft);
  font-size: 12px;
}

.best-fit strong {
  font-family: var(--font-serif);
  font-size: 30px;
}

.fit-table {
  display: flex;
  flex-direction: column;
}

.fit-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
  border-bottom: 1px solid var(--rule-soft);
  padding: 12px 0;
}

.fit-row p {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--ink-mid);
  font-size: 13px;
}

.fit-row strong,
.plan-item strong {
  display: block;
  font-weight: 700;
}

.fit-row small,
.plan-item small {
  display: block;
  color: var(--ink-soft);
  margin-top: 4px;
}

.score {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 900;
}

.level-pill,
.role-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 24px;
  border: 1px solid var(--rule);
  font-size: 12px;
  font-weight: 700;
}

.level-a,
.role-main {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.level-b,
.role-support {
  background: rgba(20, 105, 78, 0.12);
  color: var(--success);
  border-color: rgba(20, 105, 78, 0.28);
}

.level-c,
.role-test {
  background: rgba(188, 125, 43, 0.12);
  color: var(--warning);
  border-color: rgba(188, 125, 43, 0.3);
}

.role-hold {
  background: var(--paper-dark);
  color: var(--ink-soft);
}

.risk {
  color: var(--vermillion) !important;
}

.script-line {
  color: var(--info) !important;
}

.empty-state,
.plan-placeholder {
  padding: 34px 20px;
  color: var(--ink-soft);
  background: var(--paper-dark);
  border: 1px dashed var(--rule);
}

.plan-hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--paper-dark);
  border-left: 4px solid var(--ink);
}

.plan-hero span {
  color: var(--vermillion);
  font-size: 12px;
  font-weight: 700;
}

.plan-hero strong {
  font-family: var(--font-serif);
  font-size: 24px;
  line-height: 1.2;
}

.plan-hero small,
.plan-goal {
  color: var(--ink-soft);
}

.plan-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0;
}

.plan-metrics div {
  border: 1px solid var(--rule-soft);
  padding: 12px;
}

.plan-metrics span {
  display: block;
  color: var(--ink-soft);
  font-size: 12px;
  margin-bottom: 6px;
}

.plan-metrics strong {
  font-size: 18px;
}

.plan-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.plan-item {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 12px;
  border-top: 1px solid var(--rule-soft);
  padding-top: 14px;
}

.plan-item p {
  margin: 6px 0 0;
  line-height: 1.55;
  color: var(--ink-mid);
  font-size: 13px;
}

.order {
  width: 28px;
  height: 28px;
  background: var(--ink);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 12px;
}

@media (max-width: 1200px) {
  .schedule-band,
  .summary-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
