import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'
import '../styles/theme.css'
import '../styles/dashboard.css'
import '../styles/auth.css'
import '../styles/chat.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(Antd)

import { useAuthStore } from '../stores/authStore'
const authStore = useAuthStore()
authStore.initialize().finally(() => {
  app.mount('#app')
})
