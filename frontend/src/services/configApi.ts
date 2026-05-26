import type { WakeConfig } from '../features/config/configSchema'

interface ApiResponse<T> {
  success: boolean
  data: T
  error: { message: string } | null
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(url, {
    headers,
    ...init
  })
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

export function getConfig() {
  return request<WakeConfig>('/api/v1/config')
}

export function saveConfig(config: WakeConfig) {
  return request<WakeConfig>('/api/v1/config', {
    method: 'PUT',
    body: JSON.stringify(config)
  })
}

export function reloadConfig() {
  return request<WakeConfig>('/api/v1/config/reload', {
    method: 'POST'
  })
}

export function getHistory(keyword = '') {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  return request<Array<Record<string, unknown>>>(`/api/v1/history?${params.toString()}`)
}

export function clearHistory() {
  return request<{ cleared: boolean }>('/api/v1/history', {
    method: 'DELETE'
  })
}
