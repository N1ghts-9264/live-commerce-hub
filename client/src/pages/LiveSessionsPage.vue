<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { liveSessionsAPI, anchorsAPI } from '../api'
import type { LiveSession, Anchor } from '../types'
import PageHeader from '../components/PageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import DataTable from '../components/DataTable.vue'
import Pagination from '../components/Pagination.vue'

const router = useRouter()
const sessions = ref<(LiveSession & Record<string, any>)[]>([])
const anchors = ref<Anchor[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const statusFilter = ref('')
const loading = ref(false)

const showModal = ref(false)
const form = ref({
  anchor_id: '', live_title: '', platform: '抖音',
  live_category: '女装', start_time: '', live_status: '已排期',
})

async function load() {
  loading.value = true
  try {
    const { data } = await liveSessionsAPI.list({ page: page.value, pageSize, status: statusFilter.value })
    sessions.value = data.data
    total.value = data.total
  } finally { loading.value = false }
}

async function loadAnchors() {
  const { data } = await anchorsAPI.list({ pageSize: 50 })
  anchors.value = data.data
}

function openCreate() {
  const now = new Date()
  form.value = {
    anchor_id: anchors.value[0]?.anchor_id || '',
    live_title: '', platform: '抖音', live_category: '女装',
    start_time: new Date(now.getTime() + 3600000).toISOString().slice(0, 16),
    live_status: '已排期',
  }
  showModal.value = true
}

async function save() {
  try {
    await liveSessionsAPI.create(form.value)
    showModal.value = false
    await load()
  } catch (e: any) { alert(e.response?.data?.message || '保存失败') }
}

function goMonitor(session: LiveSession) {
  if (session.live_status === '\u5df2\u7ed3\u675f') {
    router.push(`/live-reviews?liveId=${session.live_id}`)
    return
  }
  router.push(`/monitor?id=${session.live_id}`)
}

const statusMeta: Record<string, { label: string; hint: string; className: string }> = {
  '进行中': { label: '进行中', hint: '可进入实时监控', className: 'live' },
  '已排期': { label: '已排期', hint: '等待开播', className: 'scheduled' },
  '已结束': { label: '已结束', hint: '可查看复盘数据', className: 'ended' },
}

const statusCards = computed(() => ['进行中', '已排期', '已结束'].map((status) => ({
  status,
  count: sessions.value.filter((item) => item.live_status === status).length,
  ...statusMeta[status],
})))

function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }
function formatPrice(v: number) { return v ? '¥' + v.toLocaleString() : '-' }
function getSessionRowClass(row: LiveSession) {
  return `session-row status-${statusMeta[row.live_status]?.className || 'default'}`
}

function changePage(p: number) { page.value = p; load() }

onMounted(() => { load(); loadAnchors() })

const columns = [
  { key: 'live_title', label: '直播标题' },
  { key: 'anchor_name', label: '主播' },
  { key: 'platform', label: '平台' },
  { key: 'live_category', label: '品类' },
  { key: 'start_time', label: '开始时间' },
  { key: 'live_status', label: '状态' },
  { key: 'online_peak', label: '峰值在线' },
  { key: 'total_sales', label: '销售额' },
  { key: 'actions', label: '操作', sortable: false },
]

const categories = ['女装', '美妆', '箱包', '运动户外', '零食', '家居用品', '母婴', '数码', '食品饮料']
</script>

<template>
  <PageHeader title="直播场次" subtitle="场次安排与管理" />
  <div class="page-body">
    <div class="toolbar">
      <select v-model="statusFilter" class="form-select" style="width:auto;" @change="load()">
        <option value="">全部状态</option>
        <option value="已排期">已排期</option>
        <option value="进行中">进行中</option>
        <option value="已结束">已结束</option>
      </select>
      <button class="btn primary" @click="openCreate">+ 新增场次</button>
      <button class="btn" @click="load()">刷新</button>
    </div>

    <div class="status-strip">
      <button
        v-for="card in statusCards"
        :key="card.status"
        class="status-card"
        :class="[card.className, { active: statusFilter === card.status }]"
        type="button"
        @click="statusFilter = statusFilter === card.status ? '' : card.status; load()"
      >
        <span class="status-card-label">{{ card.label }}</span>
        <strong>{{ card.count }}</strong>
        <span>{{ card.hint }}</span>
      </button>
    </div>

    <DataTable :columns="columns" :data="sessions" :loading="loading" :row-class="getSessionRowClass" @row-click="goMonitor">
      <template #cell-start_time="{ value }">{{ formatDate(value) }}</template>
      <template #cell-live_status="{ value }">
        <StatusBadge :status="value" />
      </template>
      <template #cell-online_peak="{ value }">{{ value?.toLocaleString() || '-' }}</template>
      <template #cell-total_sales="{ value }">{{ formatPrice(value) }}</template>
      <template #cell-actions="{ row }">
        <button v-if="row.live_status === '已排期' || row.live_status === '进行中'" class="btn small primary" @click.stop="goMonitor(row)">
          {{ row.live_status === '进行中' ? '监控中' : '开启直播' }}
        </button>
        <button v-else class="btn small" @click.stop="goMonitor(row)">查看复盘</button>
      </template>
    </DataTable>

    <Pagination v-if="total > pageSize" :page="page" :total="total" :page-size="pageSize" @change="changePage" />

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-title">新增直播场次</div>
        <div class="form-group">
          <label class="form-label">主播</label>
          <select v-model="form.anchor_id" class="form-select">
            <option v-for="a in anchors" :key="a.anchor_id" :value="a.anchor_id">{{ a.anchor_name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">直播标题</label>
          <input v-model="form.live_title" class="form-input" placeholder="例如：春季女装满减专场" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="form-group">
            <label class="form-label">平台</label>
            <select v-model="form.platform" class="form-select">
              <option value="抖音">抖音</option>
              <option value="快手">快手</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">品类</label>
            <select v-model="form.live_category" class="form-select">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">计划开始时间</label>
          <input v-model="form.start_time" type="datetime-local" class="form-input" />
        </div>
        <div class="form-actions">
          <button class="btn" @click="showModal = false">取消</button>
          <button class="btn primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.status-card {
  border: 1px solid var(--rule-soft);
  background: var(--paper-dark);
  color: var(--ink);
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  align-items: end;
}

.status-card strong {
  font-family: var(--font-serif);
  font-size: 28px;
  line-height: 1;
}

.status-card span:last-child {
  color: var(--ink-soft);
  font-size: 12px;
}

.status-card-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
}

.status-card.live,
.status-card.live.active {
  border-left: 4px solid var(--vermillion);
}

.status-card.scheduled,
.status-card.scheduled.active {
  border-left: 4px solid var(--info);
}

.status-card.ended,
.status-card.ended.active {
  border-left: 4px solid var(--success);
}

.status-card.active {
  box-shadow: 4px 4px 0 var(--ink);
}

:deep(.session-row td:first-child) {
  border-left: 4px solid transparent;
}

:deep(.session-row.status-live td:first-child) {
  border-left-color: var(--vermillion);
}

:deep(.session-row.status-scheduled td:first-child) {
  border-left-color: var(--info);
}

:deep(.session-row.status-ended td:first-child) {
  border-left-color: var(--success);
}

:deep(.session-row.status-live td) {
  background: rgba(196, 30, 58, 0.035);
}

@media (max-width: 900px) {
  .status-strip {
    grid-template-columns: 1fr;
  }
}
</style>
