import { createRouter, createWebHistory } from 'vue-router'
import DashboardScreen from '../features/dashboard/DashboardScreen.vue'
import WakeConfigPage from '../features/config/WakeConfigPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardScreen },
    { path: '/config', name: 'config', component: WakeConfigPage }
  ]
})

export default router
