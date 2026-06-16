import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { title: '数据总览' },
    },
    {
      path: '/monitor',
      name: 'Monitor',
      component: () => import('../pages/MonitorPage.vue'),
      meta: { title: '直播监控' },
    },
    {
      path: '/products',
      name: 'Products',
      component: () => import('../pages/ProductsPage.vue'),
      meta: { title: '商品管理' },
    },
    {
      path: '/anchors',
      name: 'Anchors',
      component: () => import('../pages/AnchorsPage.vue'),
      meta: { title: '主播管理' },
    },
    {
      path: '/purchasing',
      name: 'Purchasing',
      component: () => import('../pages/PurchasingPage.vue'),
      meta: { title: '采购管理' },
    },
    {
      path: '/inventory',
      name: 'Inventory',
      component: () => import('../pages/InventoryPage.vue'),
      meta: { title: '库存管理' },
    },
    {
      path: '/scripts',
      name: 'Scripts',
      component: () => import('../pages/ScriptsPage.vue'),
      meta: { title: '脚本管理' },
    },
    {
      path: '/selection',
      name: 'Selection',
      component: () => import('../pages/SelectionPage.vue'),
      meta: { title: '选品分析' },
    },
    {
      path: '/anchor-product-planning',
      alias: '/live-planning',
      name: 'AnchorProductPlanning',
      component: () => import('../pages/AnchorProductPlanningPage.vue'),
      meta: { title: '场次安排' },
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('../pages/ReportsPage.vue'),
      meta: { title: '运营报告' },
    },
    {
      path: '/live-reviews',
      name: 'LiveReviews',
      component: () => import('../pages/LiveReviewPage.vue'),
      meta: { title: '\u76f4\u64ad\u590d\u76d8' },
    },
    {
      path: '/after-sales',
      name: 'AfterSales',
      component: () => import('../pages/AfterSalePage.vue'),
      meta: { title: '售后工单' },
    },
    {
      path: '/live-sessions',
      name: 'LiveSessions',
      component: () => import('../pages/LiveSessionsPage.vue'),
      meta: { title: '直播场次' },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.guest) {
    next()
    return
  }
  if (!auth.token) {
    next('/login')
    return
  }
  next()
})

export default router
