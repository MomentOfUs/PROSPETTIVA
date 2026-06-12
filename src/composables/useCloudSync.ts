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
      syncMessage.value = '正在对齐云端天盘数据...'
      const cloudData = await api.pull()

      if (cloudData.logo_text) {
        config.value.logoText = cloudData.logo_text
        config.value.backgroundPattern = cloudData.background_pattern as 'dots' | 'grid' | 'none'
        config.value.mangaFontEnabled = cloudData.manga_font_enabled
        if (cloudData.openai_key) config.value.openaiKey = cloudData.openai_key
        if (cloudData.openai_base) config.value.openaiBase = cloudData.openai_base
        if (cloudData.openai_model) config.value.openaiModel = cloudData.openai_model
        if (cloudData.widgets_json) {
          config.value.widgets = JSON.parse(cloudData.widgets_json)
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

      syncMessage.value = '天盘数据对齐成功！'
      if (!silent) alert('天盘数据拉取并合并成功！')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误'
      syncMessage.value = '同步失败：' + msg
      if (!silent) alert('同步失败: ' + msg)
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
      widgets_json: JSON.stringify(config.value.widgets),
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
      syncMessage.value = '正在将本地星谱上传至天盘...'
      await performCloudPush()
      syncMessage.value = '上传同步成功！'
      alert('本地星谱已成功推送至云端天盘！')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误'
      syncMessage.value = '上传失败：' + msg
      alert('上传本地数据至云端失败: ' + msg)
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
        console.log('--- 乾坤云端静默上传成功 ---')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知错误'
        console.warn('云端静默上传失败：', msg)
      }
    }, 2000)
  }

  /** 登录提交 */
  async function handleAuthSubmit() {
    authError.value = ''
    if (!authForm.value.username || !authForm.value.password) {
      authError.value = '用户名与密码不能为空'
      return
    }
    try {
      isSyncing.value = true
      await api.login(authForm.value.username, authForm.value.password)
      await pullCloudData(true)
      showAuthModal.value = false
      authForm.value.password = ''
    } catch (err: unknown) {
      authError.value = err instanceof Error ? err.message : '登录失败'
    } finally {
      isSyncing.value = false
    }
  }

  /** 退出登录 */
  function handleLogout() {
    if (confirm('确认退出当前天盘账号登录吗？退出后将切换回本地模式。')) {
      removeToken()
      showAuthModal.value = false
      authForm.value.password = ''
      alert('已成功退出登录，已切回本地 LocalStorage 运行模态。')
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
