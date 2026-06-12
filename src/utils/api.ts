// 前端云同步原生 fetch API 接口封装

const BASE_URL = 'http://localhost:8000'

// ==================== 完整类型定义 ====================

export interface NavGroup {
  id: string
  user_id?: number
  title: string
}

export interface NavItem {
  id: string
  group_id: string
  user_id?: number
  title: string
  url: string
  description: string
  icon: string
  color: string
  size?: 'normal' | 'wide'
}

export interface TodoItem {
  id: string
  user_id?: number
  text: string
  done: boolean
  created_at?: string
}

export interface WeightRecord {
  id: string
  user_id?: number
  date: string
  weight: number
  body_fat?: number | null
  waist?: number | null
  hip?: number | null
  note?: string | null
}

export interface SnippetItem {
  id: string
  user_id?: number
  title: string
  content: string
  category: string
  color: string
}

export interface CountdownItem {
  id: string
  user_id?: number
  title: string
  target_date: string
  category: string
}

export interface SyncPayload {
  logo_text: string
  background_pattern: string
  manga_font_enabled: boolean
  openai_key?: string
  openai_base?: string
  openai_model?: string
  widgets_json: string
  groups: NavGroup[]
  items: NavItem[]
  todos: TodoItem[]
  note_content: string
  note_password_hash: string
  weights: WeightRecord[]
  snippets: SnippetItem[]
  countdowns: CountdownItem[]
}

// ==================== Token 管理 ====================

// 获取本地存储的 token
export function getToken(): string | null {
  return localStorage.getItem('artisan_cloud_token')
}

// 设定本地 token
export function setToken(token: string) {
  localStorage.setItem('artisan_cloud_token', token)
  window.dispatchEvent(new Event('artisan-auth-state-changed'))
}

// 移除 token (退出登录)
export function removeToken() {
  localStorage.removeItem('artisan_cloud_token')
  localStorage.removeItem('artisan_cloud_username')
  window.dispatchEvent(new Event('artisan-auth-state-changed'))
}

// 获取登录用户名
export function getUsername(): string | null {
  return localStorage.getItem('artisan_cloud_username')
}

export function setUsername(username: string) {
  localStorage.setItem('artisan_cloud_username', username)
}

// 判断是否已登录
export function isLoggedIn(): boolean {
  return !!getToken()
}

// ==================== 请求封装 ====================

// 统一封装请求
async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  })

  if (response.status === 401) {
    removeToken()
    throw new Error('登录凭证已失效，请重新登录')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error((errorData as { detail?: string }).detail || `请求失败，错误代码: ${response.status}`)
  }

  return response.json() as Promise<T>
}

// ==================== API 导出对象 ====================

export const api = {
  // 1. 注册
  async register(username: string, password: string) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  },

  // 2. 登录 (表单请求)
  async login(username: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const data = await request<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    if (data.access_token) {
      setToken(data.access_token)
      setUsername(username)
    }
    return data
  },

  // 3. 获取个人信息
  async getMe() {
    return request<{ id: number; username: string }>('/api/auth/me')
  },

  // 4. 云端拉取
  async pull(): Promise<SyncPayload> {
    return request<SyncPayload>('/api/sync/pull')
  },

  // 5. 推送云端
  async push(payload: SyncPayload) {
    return request('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

// 触发前端事件通知云端同步上传
export function triggerCloudPush() {
  if (isLoggedIn()) {
    // 触发全局推送同步信号，由 App.vue 监听并执行全量防抖覆盖
    window.dispatchEvent(new Event('artisan-request-cloud-push'))
  }
}
