import { useAuthStore } from '../stores/authStore'

interface ApiResponse<T> {
  success: boolean
  data: T
  error: { code: string; message: string; details?: Record<string, unknown> } | null
  requestId: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const authStore = useAuthStore()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`
  }
  const response = await fetch(url, { headers, ...init })
  const rawBody = await response.text()
  let body: ApiResponse<T>
  try {
    body = JSON.parse(rawBody) as ApiResponse<T>
  } catch {
    throw new Error(rawBody || `请求失败 (${response.status})`)
  }

  if (!response.ok || !body.success) {
    throw new Error(body.error?.message || '请求失败')
  }

  return body.data
}

export function getCaptcha() {
  return request<{ captcha_token: string; captcha_image: string; captcha_text?: string }>(
    '/api/v1/auth/captcha',
  )
}

export function login(phone: string, password: string, captchaCode: string, captchaToken: string) {
  return request<{
    token: string
    user: { id: string; phone: string; name: string; created_at: string }
  }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      password,
      captcha_code: captchaCode,
      captcha_token: captchaToken,
    }),
  })
}

export function register(
  phone: string,
  password: string,
  captchaCode: string,
  captchaToken: string,
  name?: string,
) {
  return request<{
    token: string
    user: { id: string; phone: string; name: string; created_at: string }
  }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      password,
      name,
      captcha_code: captchaCode,
      captcha_token: captchaToken,
    }),
  })
}

export function getMe() {
  return request<{ id: string; phone: string; name: string; created_at: string }>('/api/v1/auth/me')
}

export function logout() {
  return request<{ success: boolean }>('/api/v1/auth/logout', { method: 'POST' })
}
