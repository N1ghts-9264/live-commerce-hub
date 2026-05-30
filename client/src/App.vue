<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppSidebar from './components/AppSidebar.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  if (auth.token) {
    await auth.fetchMe()
  }
  if (!auth.token && route.path !== '/login') {
    router.push('/login')
  }
})
</script>

<template>
  <AppSidebar v-if="auth.isLoggedIn && route.path !== '/login'" />
  <main v-if="route.path !== '/login'" class="main">
    <router-view />
  </main>
  <div v-else class="login-full">
    <router-view />
  </div>
</template>

<style scoped>
.login-full {
  width: 100%;
  min-height: 100vh;
}
</style>
