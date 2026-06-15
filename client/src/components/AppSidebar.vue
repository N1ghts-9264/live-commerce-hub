<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const menuItems = computed(() => {
  const allItems = [
    { path: '/dashboard', label: '数据总览', icon: 'layout-dashboard', roles: ['管理层', '运营人员', '采购人员', '仓储人员', '主播', '系统管理员'] },
    { path: '/live-sessions', label: '直播场次', icon: 'video', roles: ['运营人员', '管理层', '系统管理员'] },
    { path: '/live-reviews', label: '\u76f4\u64ad\u590d\u76d8', icon: 'clipboard-check', roles: ['运营人员', '管理层', '主播', '系统管理员'] },
    { path: '/selection', label: '选品分析', icon: 'target', roles: ['运营人员', '管理层', '采购人员', '系统管理员'] },
    { path: '/products', label: '商品管理', icon: 'package', roles: ['运营人员', '管理层', '采购人员', '系统管理员'] },
    { path: '/anchors', label: '主播管理', icon: 'users', roles: ['运营人员', '管理层', '系统管理员'] },
    { path: '/inventory', label: '库存管理', icon: 'warehouse', roles: ['仓储人员', '管理层', '采购人员', '系统管理员'] },
    { path: '/purchasing', label: '采购管理', icon: 'truck', roles: ['采购人员', '管理层', '系统管理员'] },
    { path: '/scripts', label: '脚本管理', icon: 'file-text', roles: ['运营人员', '主播', '管理层', '系统管理员'] },
    { path: '/reports', label: '运营报告', icon: 'bar-chart-3', roles: ['管理层', '运营人员', '系统管理员'] },
    { path: '/after-sales', label: '售后工单', icon: 'headphones', roles: ['运营人员', '管理层', '系统管理员'] },
  ]
  return allItems.filter(item => item.roles.includes(auth.userRole))
})

function navigate(path: string) {
  router.push(path)
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const roleLabels: Record<string, string> = {
  '管理层': '管理层',
  '运营人员': '运营',
  '采购人员': '采购',
  '仓储人员': '仓储',
  '主播': '主播',
  '系统管理员': '管理员',
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      直播电商中台
      <span>LIVE COMMERCE HUB</span>
    </div>
    <nav class="sidebar-nav">
      <a
        v-for="item in menuItems"
        :key="item.path"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
      >
        {{ item.label }}
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="avatar">
        {{ auth.employee?.employee_name?.charAt(0) || 'U' }}
      </div>
      <div>
        <div style="font-weight:600;color:var(--ink);font-size:13px;">
          {{ auth.employee?.employee_name || '用户' }}
        </div>
        <div style="font-size:11px;">
          {{ roleLabels[auth.userRole] || auth.userRole }}
        </div>
      </div>
      <button class="btn small" style="margin-left:auto;" @click="auth.logout(); router.push('/login')">
        退出
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: var(--sidebar-width);
  background: var(--paper);
  border-right: 1px solid var(--rule);
  display: flex; flex-direction: column;
  z-index: 100; overflow-y: auto;
}
.sidebar-brand {
  padding: 28px 24px 20px;
  font-family: var(--font-serif);
  font-size: 20px; font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--ink);
  border-bottom: 1px solid var(--rule);
}
.sidebar-brand span {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 400;
  letter-spacing: 0.1em;
  color: var(--ink-soft);
  margin-top: 2px;
}
.sidebar-nav { flex: 1; padding: 12px 0; }
.sidebar-nav a {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 24px;
  font-size: 14px; font-weight: 500;
  color: var(--ink-mid); text-decoration: none;
  border-left: 3px solid transparent;
  transition: all var(--duration-fast) ease;
  cursor: pointer;
}
.sidebar-nav a:hover { background: var(--paper-dark); color: var(--ink); }
.sidebar-nav a.active {
  color: var(--ink);
  border-left-color: var(--vermillion);
  background: var(--vermillion-soft);
}
.sidebar-footer {
  padding: 16px 24px; border-top: 1px solid var(--rule);
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--ink-soft);
}
.avatar {
  width: 32px; height: 32px; border-radius: 2px;
  background: var(--ink); color: var(--paper);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  flex-shrink: 0;
}
</style>
