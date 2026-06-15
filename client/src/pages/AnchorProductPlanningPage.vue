<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { anchorsAPI, anchorProductPlanningAPI, liveSessionsAPI, productsAPI } from '../api'

const products = ref<any[]>([])
const anchors = ref<any[]>([])
const sessions = ref<any[]>([])
const fits = ref<any[]>([])
const plan = ref<any | null>(null)
const selectedProductId = ref('')
const selectedAnchorId = ref('')
const selectedLiveId = ref('')
const loading = ref(false)
const error = ref('')

const selectedProduct = computed(() => products.value.find((item) => item.product_id === selectedProductId.value))
const selectedAnchor = computed(() => anchors.value.find((item) => item.anchor_id === selectedAnchorId.value))

const bestFit = computed(() => fits.value[0])
const roleCounts = computed(() => fits.value.reduce((acc: Record<string, number>, item) => {
  acc[item.recommended_role] = (acc[item.recommended_role] || 0) + 1
  return acc
}, {}))

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

async function loadBaseData() {
  const [productRes, anchorRes, liveRes] = await Promise.all([
    productsAPI.list({ pageSize: 80 }),
    anchorsAPI.list({ pageSize: 80 }),
    liveSessionsAPI.list({ pageSize: 80 }),
  ])
  products.value = productRes.data.data || productRes.data
  anchors.value = anchorRes.data.data || anchorRes.data
  sessions.value = liveRes.data.data || liveRes.data
  selectedProductId.value = products.value[0]?.product_id || ''
  selectedAnchorId.value = anchors.value[0]?.anchor_id || ''
  selectedLiveId.value = sessions.value.find((item) => String(item.live_status || '').includes('排期'))?.live_id || sessions.value[0]?.live_id || ''
  await loadFits()
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
  try {
    const { data } = await anchorProductPlanningAPI.generateForProduct(selectedProductId.value)
    fits.value = data
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
  try {
    const { data } = await anchorProductPlanningAPI.generateForAnchor(selectedAnchorId.value)
    fits.value = data
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
  try {
    const { data } = await anchorProductPlanningAPI.createPlan(selectedLiveId.value)
    plan.value = data
    if (data?.anchor_id) selectedAnchorId.value = data.anchor_id
  } catch (e: any) {
    error.value = e.response?.data?.message || '场次计划生成失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadBaseData()
  } catch (e: any) {
    error.value = e.response?.data?.message || '页面数据加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <PageHeader title="主播商品适配" subtitle="主播-商品匹配评分 / 场次带货计划 / 运营决策支持" />

  <div class="page-body planning-page">
    <div v-if="error" class="error-banner">{{ error }}</div>

    <section class="control-band">
      <div class="control-group">
        <label class="form-label">按商品找主播</label>
        <select v-model="selectedProductId" class="form-select">
          <option v-for="product in products" :key="product.product_id" :value="product.product_id">
            {{ product.product_name }}
          </option>
        </select>
        <button class="btn primary" :disabled="loading || !selectedProductId" @click="runProductFit">
          生成商品适配
        </button>
      </div>

      <div class="control-group">
        <label class="form-label">按主播找商品</label>
        <select v-model="selectedAnchorId" class="form-select">
          <option v-for="anchor in anchors" :key="anchor.anchor_id" :value="anchor.anchor_id">
            {{ anchor.anchor_name }} / {{ anchor.specialization }}
          </option>
        </select>
        <button class="btn" :disabled="loading || !selectedAnchorId" @click="runAnchorFit">
          生成主播适配
        </button>
      </div>

      <div class="control-group wide">
        <label class="form-label">按场次生成带货计划</label>
        <select v-model="selectedLiveId" class="form-select">
          <option v-for="session in sessions" :key="session.live_id" :value="session.live_id">
            {{ session.live_title }} / {{ session.live_status }} / {{ formatDate(session.start_time) }}
          </option>
        </select>
        <button class="btn" :disabled="loading || !selectedLiveId" @click="runLivePlan">
          生成场次计划
        </button>
      </div>
    </section>

    <section class="summary-grid">
      <div class="summary-tile">
        <span>分析商品</span>
        <strong>{{ selectedProduct?.product_name || '-' }}</strong>
        <small>{{ selectedProduct?.category || '未选择品类' }}</small>
      </div>
      <div class="summary-tile">
        <span>分析主播</span>
        <strong>{{ selectedAnchor?.anchor_name || '-' }}</strong>
        <small>{{ selectedAnchor?.specialization || '未配置专长' }}</small>
      </div>
      <div class="summary-tile accent">
        <span>最佳适配</span>
        <strong>{{ bestFit ? `${bestFit.fit_score}分` : '-' }}</strong>
        <small>{{ bestFit ? `${bestFit.anchor_name} / ${bestFit.product_name}` : '等待生成' }}</small>
      </div>
      <div class="summary-tile">
        <span>角色结构</span>
        <strong>{{ roleCounts['主推'] || 0 }} / {{ roleCounts['辅推'] || 0 }} / {{ roleCounts['试播'] || 0 }}</strong>
        <small>主推 / 辅推 / 试播</small>
      </div>
    </section>

    <section class="content-grid">
      <div class="panel fit-panel">
        <div class="panel-head">
          <div>
            <h3>主播-商品适配表</h3>
            <p>分数越高越适合作为本场或本品类的优先带货组合。</p>
          </div>
          <button class="btn small" :disabled="loading" @click="loadFits">刷新</button>
        </div>

        <div class="fit-table">
          <div class="fit-row head">
            <span>组合</span>
            <span>评分</span>
            <span>角色</span>
            <span>结论</span>
            <span>风险</span>
          </div>
          <div v-if="!fits.length" class="empty-state">暂无适配结果，请先生成商品或主播适配。</div>
          <div v-for="fit in fits" :key="`${fit.anchor_id}-${fit.product_id}`" class="fit-row">
            <div>
              <strong>{{ fit.anchor_name }}</strong>
              <small>{{ fit.product_name }} / {{ fit.category }}</small>
            </div>
            <div>
              <span class="score">{{ fit.fit_score }}</span>
              <span class="level-pill" :class="levelClass(fit.fit_level)">{{ fit.fit_level }}</span>
            </div>
            <div>
              <span class="role-pill" :class="roleClass(fit.recommended_role)">{{ fit.recommended_role }}</span>
            </div>
            <p>{{ fit.match_reason }}</p>
            <p class="risk">{{ fit.risk_notes }}</p>
          </div>
        </div>
      </div>

      <div class="panel plan-panel">
        <div class="panel-head">
          <div>
            <h3>场次带货计划</h3>
            <p>计划用于安排商品组合与带货重点，具体话术仍由脚本模块承接。</p>
          </div>
        </div>

        <div v-if="!plan" class="plan-placeholder">
          选择直播场次后生成计划，系统会依据主播专长、商品表现、库存与新品风险自动排品。
        </div>

        <template v-else>
          <div class="plan-hero">
            <span>{{ plan.live_status }}</span>
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
                <small>{{ item.category }} / {{ item.suggested_minutes }} 分钟 / {{ formatMoney(item.target_gmv) }}</small>
                <p>{{ item.plan_reason }}</p>
                <p class="risk">{{ item.risk_notes }}</p>
              </div>
              <span class="role-pill" :class="roleClass(item.plan_role)">{{ item.plan_role }}</span>
            </div>
          </div>
        </template>
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

.error-banner {
  border: 1px solid rgba(196, 30, 58, 0.35);
  background: rgba(196, 30, 58, 0.08);
  color: var(--vermillion);
  padding: 12px 14px;
  font-weight: 600;
}

.control-band {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
}

.control-group {
  border: 1px solid var(--rule);
  background: var(--paper-dark);
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.control-group label {
  grid-column: 1 / -1;
}

.control-group.wide {
  grid-column: 1 / -1;
  grid-template-columns: 1fr auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-tile {
  border: 1px solid var(--rule);
  background: var(--paper);
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
  font-size: 28px;
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
  border: 1px solid var(--rule);
  background: var(--paper);
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

.panel-head h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.panel-head p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 13px;
}

.fit-table {
  display: flex;
  flex-direction: column;
}

.fit-row {
  display: grid;
  grid-template-columns: minmax(210px, 1.1fr) 90px 80px minmax(220px, 1fr) minmax(180px, 0.9fr);
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid var(--rule-soft);
  padding: 14px 0;
}

.fit-row.head {
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 12px;
  padding-top: 0;
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

.fit-row p,
.plan-item p {
  margin: 0;
  line-height: 1.55;
  color: var(--ink-mid);
  font-size: 13px;
}

.score {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 900;
  margin-right: 8px;
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

@media (max-width: 1100px) {
  .control-band,
  .summary-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .fit-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .fit-row.head {
    display: none;
  }
}
</style>
