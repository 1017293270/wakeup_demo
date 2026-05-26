import { defineStore } from 'pinia'

interface UserInfo {
  id: string
  phone: string
  name: string
  created_at: string
}

interface AuthState {
  token: string
  user: UserInfo | null
  initialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('auth_token') || '',
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
    initialized: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token && !!state.user,
    currentUser: (state) => state.user,
  },
  actions: {
    setAuth(token: string, user: UserInfo) {
      this.token = token
      this.user = user
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(user))
    },
    clearAuth() {
      this.token = ''
      this.user = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    },
    async initialize() {
      if (this.token) {
        try {
          const { getMe } = await import('../services/authApi')
          const user = await getMe()
          this.user = user
        } catch {
          this.clearAuth()
        }
      }
      this.initialized = true
    },
  },
})
