<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const employeeId = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!employeeId.value || !password.value) {
    error.value = '请输入员工编号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.login(employeeId.value, password.value)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.message || '登录失败，请检查员工编号和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        直播电商中台
        <span>LIVE COMMERCE HUB</span>
      </div>
      <div class="login-divider"></div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">员工编号</label>
          <input
            v-model="employeeId"
            type="text"
            class="form-input"
            placeholder="输入员工编号"
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="输入密码 (默认: 123456)"
            autocomplete="current-password"
          />
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button type="submit" class="btn primary" style="width:100%;justify-content:center;" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
      <div class="login-hint">
        测试账号: EMP001 ~ EMP006 / 密码: 123456
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: var(--paper);
}
.login-card {
  width: 400px; padding: 48px 40px;
  background: var(--paper-dark);
  border: 1px solid var(--rule-soft);
  border-radius: 2px;
}
.login-brand {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 24px; font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 4px;
}
.login-brand span {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px; font-weight: 400;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
  margin-top: 4px;
}
.login-divider {
  width: 40px; height: 2px; background: var(--ink);
  margin: 24px auto 32px;
}
.login-error {
  padding: 8px 12px; margin-bottom: 16px;
  background: var(--vermillion-soft);
  color: var(--vermillion);
  font-size: 13px; border-radius: 2px;
}
.login-hint {
  margin-top: 24px; text-align: center;
  font-size: 12px; color: var(--ink-soft);
  font-family: var(--font-mono);
}
</style>
