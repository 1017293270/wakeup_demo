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

export interface ChatSession {
  id: string
  title: string
  created_at: string
  message_count: number
}

export interface ChatMessage {
  id: string
  role: string
  text: string
  timestamp: string
}

export function getSessions() {
  return request<ChatSession[]>('/api/v1/chat/sessions')
}

export function getMessages(sessionId: string) {
  return request<ChatMessage[]>(`/api/v1/chat/sessions/${sessionId}/messages`)
}

export function sendMessage(text: string, sessionId: string) {
  return request<{
    user_message: ChatMessage
    assistant_message: ChatMessage
  }>('/api/v1/chat/send', {
    method: 'POST',
    body: JSON.stringify({ text, session_id: sessionId }),
  })
}

export function deleteSession(sessionId: string) {
  return request<{ deleted: boolean }>(`/api/v1/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}
