/**
 * useCloudSync — 云同步 Composable
 * 负责：pullCloudData / pushCloudData / queueCloudPush（防抖）
 */
import { ref } from 'vue'
import { api, isLoggedIn, getUsername, removeToken } from '../utils/api'
import type { Group, NavItem, Config } from './useNavData'

export function useCloudSync(
  groups: { value: Group[] },
  items: { value: NavItem[] },
  config: { value: Config }
) {
  const isUserLoggedIn = ref(isLoggedIn())
  const loggedInUser = ref(getUsername())
  const showAuthModal = ref(false)
  const authForm = ref({ username: 'admin', password: '' })
  const authError = ref('')
  const isSyncing = ref(false)
  const syncMessage = ref('')

  // 监听全局 auth 状态变化
  function setupAuthListener() {
    window.addEventListener('artisan-auth-state-changed', () => {
      isUserLoggedIn.value = isLoggedIn()
      loggedInUser.value = getUsername()
    })
  }

  /** 从云端拉取并覆盖本地数据 */
  async function pullCloudData(silent = false) {
    if (!isLoggedIn()) return
    try {
      isSyncing.value = true
      syncMessage.value = '[ SYNC PULL ] fetching cloud state...'
      const cloudData = await api.pull()

      if (cloudData.logo_text) {
        config.value.logoText = cloudData.logo_text
        config.value.backgroundPattern = cloudData.background_pattern as 'dots' | 'grid' | 'none'
        config.value.mangaFontEnabled = cloudData.manga_font_enabled
        if (cloudData.openai_key) config.value.openaiKey = cloudData.openai_key
        if (cloudData.openai_base) config.value.openaiBase = cloudData.openai_base
        if (cloudData.openai_model) config.value.openaiModel = cloudData.openai_model
        if (cloudData.widgets_json) {
          try {
            const parsed = JSON.parse(cloudData.widgets_json)
            if (parsed && parsed.widgets) {
              config.value.widgets = parsed.widgets
              if (parsed.accentColor) config.value.accentColor = parsed.accentColor
              if (parsed.layout) {
                localStorage.setItem('manga_widgets_layout', JSON.stringify(parsed.layout))
                window.dispatchEvent(new Event('manga-widgets-layout-updated'))
              }
            } else {
              config.value.widgets = parsed
            }
          } catch {
            // Keep default
          }
        }
      }

      if (cloudData.groups && cloudData.groups.length > 0) {
        // 适配后端 snake_case group_id -> 前端 camelCase groupId
        groups.value = cloudData.groups.map(g => ({ id: g.id, title: g.title }))
      }
      if (cloudData.items && cloudData.items.length > 0) {
        items.value = cloudData.items.map(i => ({
          id: i.id,
          groupId: (i as unknown as Record<string, string>).group_id ?? '',
          title: i.title,
          url: i.url,
          description: i.description,
          icon: i.icon,
          color: i.color,
          size: i.size
        }))
      }

      if (cloudData.todos) localStorage.setItem('manga_todo_items', JSON.stringify(cloudData.todos))
      if (cloudData.note_content) localStorage.setItem('manga_widget_notes', cloudData.note_content)
      if (cloudData.note_password_hash) localStorage.setItem('manga_widget_notes_pwd', cloudData.note_password_hash)
      if (cloudData.weights) localStorage.setItem('manga_weight_records', JSON.stringify(cloudData.weights))
      if (cloudData.snippets) localStorage.setItem('manga_widget_snippets', JSON.stringify(cloudData.snippets))
      if (cloudData.countdowns) localStorage.setItem('manga_widget_countdowns', JSON.stringify(cloudData.countdowns))

      window.dispatchEvent(new Event('manga-config-updated'))
      window.dispatchEvent(new Event('artisan-cloud-data-pulled'))

      syncMessage.value = 'PULL_OK'
      if (!silent) alert('[ SYNC ] Cloud data merged successfully.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'UNKNOWN_ERR'
      syncMessage.value = 'PULL_FAIL: ' + msg
      if (!silent) alert('[ SYNC ] Pull failed: ' + msg)
    } finally {
      isSyncing.value = false
    }
  }

  /** 构造推送载荷并上传到云端 */
  async function performCloudPush() {
    const payload = {
      logo_text: config.value.logoText,
      background_pattern: config.value.backgroundPattern,
      manga_font_enabled: config.value.mangaFontEnabled,
      openai_key: config.value.openaiKey || '',
      openai_base: config.value.openaiBase || '',
      openai_model: config.value.openaiModel || '',
      widgets_json: JSON.stringify({
        widgets: config.value.widgets,
        accentColor: config.value.accentColor,
        layout: JSON.parse(localStorage.getItem('manga_widgets_layout') || '[]')
      }),
      // 将前端 camelCase groupId 映射回 snake_case group_id
      groups: groups.value,
      items: items.value.map(i => ({
        id: i.id,
        group_id: i.groupId,
        title: i.title,
        url: i.url,
        description: i.description,
        icon: i.icon,
        color: i.color,
        size: i.size || 'normal'
      })),
      todos: JSON.parse(localStorage.getItem('manga_todo_items') || '[]'),
      note_content: localStorage.getItem('manga_widget_notes') || '',
      note_password_hash: localStorage.getItem('manga_widget_notes_pwd') || '',
      weights: JSON.parse(localStorage.getItem('manga_weight_records') || '[]'),
      snippets: JSON.parse(localStorage.getItem('manga_widget_snippets') || '[]'),
      countdowns: JSON.parse(localStorage.getItem('manga_widget_countdowns') || '[]')
    }
    await api.push(payload as Parameters<typeof api.push>[0])
  }

  /** 手动推送到云端（带用户提示） */
  async function pushCloudData() {
    try {
      isSyncing.value = true
      syncMessage.value = '[ SYNC PUSH ] uploading local state...'
      await performCloudPush()
      syncMessage.value = 'PUSH_OK'
      alert('[ SYNC ] Local data pushed to cloud.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'UNKNOWN_ERR'
      syncMessage.value = 'PUSH_FAIL: ' + msg
      alert('[ SYNC ] Push failed: ' + msg)
    } finally {
      isSyncing.value = false
    }
  }

  // 防抖云端推送（2 秒内合并多次变更）
  let pushTimeout: ReturnType<typeof setTimeout> | null = null
  function queueCloudPush() {
    if (!isLoggedIn()) return
    if (pushTimeout) clearTimeout(pushTimeout)
    pushTimeout = setTimeout(async () => {
      try {
        await performCloudPush()
        console.log('--- cloud_sync: silent push OK ---')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'UNKNOWN_ERR'
        console.warn('cloud_sync: silent push failed:', msg)
      }
    }, 2000)
  }

  /** 登录提交 */
  async function handleAuthSubmit() {
    authError.value = ''
    if (!authForm.value.username || !authForm.value.password) {
      authError.value = 'AUTH_EMPTY_FIELDS'
      return
    }
    try {
      isSyncing.value = true
      await api.login(authForm.value.username, authForm.value.password)
      await pullCloudData(true)
      showAuthModal.value = false
      authForm.value.password = ''
    } catch (err: unknown) {
      authError.value = err instanceof Error ? err.message : 'AUTH_FAIL'
    } finally {
      isSyncing.value = false
    }
  }

  /** 退出登录 */
  function handleLogout() {
    if (confirm('[ AUTH ] Logout? Will revert to local-only mode.')) {
      removeToken()
      showAuthModal.value = false
      authForm.value.password = ''
      alert('[ AUTH ] Logged out. Switched to local storage.')
    }
  }

  return {
    isUserLoggedIn,
    loggedInUser,
    showAuthModal,
    authForm,
    authError,
    isSyncing,
    syncMessage,
    setupAuthListener,
    pullCloudData,
    pushCloudData,
    queueCloudPush,
    handleAuthSubmit,
    handleLogout
  }
}
