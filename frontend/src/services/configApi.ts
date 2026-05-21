import type { WakeConfig } from '../features/config/configSchema'

interface ApiResponse<T> {
  success: boolean
  data: T
  error: { message: string } | null
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
  const body = (await response.json()) as ApiResponse<T>

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
