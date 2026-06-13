/**
 * useNavData — 导航数据管理 Composable
 * 负责：groups/items CRUD、LocalStorage 持久化、loadDefaults
 */
import { ref, watch } from 'vue'
import { triggerCloudPush } from '../utils/api'
import { availableWidgets } from '../components/WidgetRegistry'

export interface Group {
  id: string
  title: string
}

export interface NavItem {
  id: string
  groupId: string
  title: string
  url: string
  description: string
  icon: string
  color: string
  size?: 'normal' | 'wide'
}

export interface Config {
  logoText: string
  backgroundPattern: 'dots' | 'grid' | 'none'
  mangaFontEnabled: boolean
  widgets: Record<string, boolean>
  openaiKey?: string
  openaiBase?: string
  openaiModel?: string
  gridRows: number
  gridCols: number
  accentColor?: 'orange' | 'green' | 'yellow' | 'blue' | 'purple'
}

const DEFAULT_CONFIG: Config = {
  logoText: 'PROSPETTIVA',
  backgroundPattern: 'dots',
  mangaFontEnabled: true,
  widgets: {
    clock: true,
    search: true,
    sysinfo: true,
    weather: true,
    hitokoto: true,
    ipcard: true,
    aichat: true,
    todo: false,
    notes: false,
    weight: true,
    snippet: true,
    devtools: true,
    countdown: true
  },
  openaiKey: '',
  openaiBase: 'https://api.deepseek.com',
  openaiModel: 'deepseek-chat',
  gridRows: 5,
  gridCols: 10,
  accentColor: 'orange'
}

// 旧版颜色兼容映射（pastel → 高对比油画色调）
const LEGACY_COLOR_MAP: Record<string, string> = {
  '#ffd6a5': '#4a161b',
  '#caffbf': '#152e24',
  '#a0c4ff': '#18283b',
  '#bdb2ff': '#6e5020',
  '#ffc6ff': '#3b232c',
  '#fdffb6': '#2e1f18',
  '#221f1c': '#2b2b2e'
}

export function useNavData() {
  const groups = ref<Group[]>([])
  const items = ref<NavItem[]>([])
  const config = ref<Config>({ ...DEFAULT_CONFIG, widgets: { ...DEFAULT_CONFIG.widgets } })

  // 加载默认示例数据
  function loadDefaults() {
    groups.value = [
      { id: 'g1', title: '🤖 AI 智脑对话' },
      { id: 'g2', title: '🎨 AI 画师绘画' },
      { id: 'g3', title: '🛠️ 学习与开发工具' }
    ]
    items.value = [
      { id: 'i1', groupId: 'g1', title: 'DeepSeek', url: 'https://www.deepseek.com', description: '国内最强开源大模型，极速推理体验', icon: 'Link', color: '#18283b', size: 'wide' },
      { id: 'i2', groupId: 'g1', title: 'ChatGPT', url: 'https://chatgpt.com', description: 'OpenAI 官方聊天对话智能助手', icon: 'Link', color: '#4a161b' },
      { id: 'i3', groupId: 'g1', title: 'Kimi Chat', url: 'https://kimi.moonshot.cn', description: '支持超长文本、文件和网页解析的国产AI', icon: 'Link', color: '#152e24' },
      { id: 'i4', groupId: 'g2', title: 'Midjourney', url: 'https://www.midjourney.com', description: '全球顶尖的高清AI图像艺术生成器', icon: 'Link', color: '#2e1f18' },
      { id: 'i5', groupId: 'g2', title: 'Stable Diffusion', url: 'https://stability.ai', description: '本地或云端自由度极高的开源AI制图', icon: 'Link', color: '#3b232c' },
      { id: 'i6', groupId: 'g3', title: 'GitHub', url: 'https://github.com', description: '全球最大的开源软件托管与协作平台', icon: 'Github', color: '#2b2b2e', size: 'wide' }
    ]
    config.value = { ...DEFAULT_CONFIG, widgets: { ...DEFAULT_CONFIG.widgets } }
  }

  // 从 LocalStorage 加载数据
  function loadFromStorage() {
    const storedGroups = localStorage.getItem('manga_groups')
    const storedItems = localStorage.getItem('manga_items')
    const storedConfig = localStorage.getItem('manga_config')

    if (storedGroups && storedItems && storedConfig) {
      try {
        groups.value = JSON.parse(storedGroups)
        const parsedItems = JSON.parse(storedItems) as NavItem[]

        // 升级旧版 pastel 颜色到高对比油画色调
        items.value = parsedItems.map(item => {
          const lowerColor = item.color.toLowerCase()
          if (LEGACY_COLOR_MAP[lowerColor]) {
            item.color = LEGACY_COLOR_MAP[lowerColor]
          }
          return item
        })

	        // Sync widget item titles with Registry
	        items.value.forEach(item => {
	          if (item.url && item.url.startsWith('#widget:')) {
	            const widgetId = item.url.replace('#widget:', '')
	            const def = availableWidgets.find(w => w.id === widgetId)
	            if (def) item.title = def.name
	          }
	        })

        const parsedConfig = JSON.parse(storedConfig)
        if (!parsedConfig.widgets) {
          parsedConfig.widgets = {}
        }
        for (const key of Object.keys(DEFAULT_CONFIG.widgets)) {
          if (parsedConfig.widgets[key] === undefined) {
            parsedConfig.widgets[key] = DEFAULT_CONFIG.widgets[key]
          }
        }
        config.value = parsedConfig

        // 兼容旧版：补齐 gridRows/gridCols 默认值
        if (!config.value.gridRows) config.value.gridRows = DEFAULT_CONFIG.gridRows
        if (!config.value.gridCols) config.value.gridCols = DEFAULT_CONFIG.gridCols
        if (!config.value.accentColor) config.value.accentColor = DEFAULT_CONFIG.accentColor

        // 修正旧版 logoText
        if (['MANGA NAV', 'MANGA DASH', 'ARTISAN NAV'].includes(config.value.logoText)) {
          config.value.logoText = 'PROSPETTIVA'
        }
        return true
      } catch {
        loadDefaults()
        return false
      }
    } else {
      loadDefaults()
      return false
    }
  }

  // 持久化监听
  function setupPersistence() {
    watch([groups, items, config], () => {
      localStorage.setItem('manga_groups', JSON.stringify(groups.value))
      localStorage.setItem('manga_items', JSON.stringify(items.value))
      localStorage.setItem('manga_config', JSON.stringify(config.value))
      window.dispatchEvent(new Event('manga-config-updated'))
      triggerCloudPush()
    }, { deep: true })
  }

  // 重置所有数据
  function resetAll() {
    if (confirm('确定要重置所有配置和导航数据吗？该操作不可逆！')) {
      localStorage.clear()
      loadDefaults()
      return true
    }
    return false
  }

  // 获取分组下的导航项
  function getGroupItems(groupId: string) {
    return items.value.filter(i => i.groupId === groupId)
  }

  // ==================== 导航项 CRUD ====================
  function addItem(item: Omit<NavItem, 'id'>) {
    items.value.push({ ...item, id: Date.now().toString() })
  }

  function updateItem(id: string, data: NavItem) {
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = { ...data }
  }

  function deleteItem(id: string) {
    if (confirm('确认删除此导航项目吗？')) {
      items.value = items.value.filter(i => i.id !== id)
    }
  }

  // ==================== 分组 CRUD ====================
  function addGroup(title: string) {
    groups.value.push({ id: Date.now().toString(), title })
  }

  function updateGroup(id: string, title: string) {
    const idx = groups.value.findIndex(g => g.id === id)
    if (idx !== -1) groups.value[idx].title = title
  }

  function deleteGroup(id: string) {
    if (confirm('删除分组将同时删除该分组下的所有导航，确定要删除吗？')) {
      groups.value = groups.value.filter(g => g.id !== id)
      items.value = items.value.filter(i => i.groupId !== id)
    }
  }

  // ==================== 导入 / 导出 ====================

  /** 导出全量数据为 JSON 文件下载 */
  function exportData() {
    const exportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      groups: groups.value,
      items: items.value,
      config: config.value,
      todos: JSON.parse(localStorage.getItem('manga_todo_items') || '[]'),
      noteContent: localStorage.getItem('manga_widget_notes') || '',
      notePasswordHash: localStorage.getItem('manga_widget_notes_pwd') || '',
      weights: JSON.parse(localStorage.getItem('manga_weight_records') || '[]')
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `manga-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 从 JSON 文件导入数据 */
  function importData(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const raw = e.target?.result as string
          const data = JSON.parse(raw)

          // 基本格式验证
          if (!data.version || !Array.isArray(data.groups) || !Array.isArray(data.items)) {
            throw new Error('文件格式不正确，请确认是由本系统导出的备份文件')
          }

          if (!confirm(`确认要导入备份吗？当前所有本地数据将被覆盖！\n（备份时间：${data.exportedAt || '未知'}）`)) {
            resolve()
            return
          }

          groups.value = data.groups || []
          items.value = data.items || []
          if (data.config) config.value = data.config

          if (data.todos) localStorage.setItem('manga_todo_items', JSON.stringify(data.todos))
          if (data.noteContent !== undefined) localStorage.setItem('manga_widget_notes', data.noteContent)
          if (data.notePasswordHash) localStorage.setItem('manga_widget_notes_pwd', data.notePasswordHash)
          if (data.weights) localStorage.setItem('manga_weight_records', JSON.stringify(data.weights))

          window.dispatchEvent(new Event('artisan-cloud-data-pulled'))
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  // Keep config.widgets and items in sync (only for 'dashboard' widgets)
  watch(() => config.value.widgets, (newWidgets) => {
    if (!newWidgets) return
    const dashboardWidgets = availableWidgets.filter(w => w.position === 'dashboard')
    
    dashboardWidgets.forEach(w => {
      const isEnabled = !!newWidgets[w.id]
      const itemIdx = items.value.findIndex(i => i.url === `#widget:${w.id}`)
      
      if (isEnabled && itemIdx === -1) {
        items.value.push({
          id: `widget_${w.id}`,
          groupId: groups.value[0]?.id || 'g1',
          title: w.name,
          url: `#widget:${w.id}`,
          description: w.description,
          icon: w.icon,
          color: '#6e5020',
          size: 'normal'
        })
	      } else if (isEnabled && itemIdx !== -1) {
	        // Sync title with Registry
	        if (items.value[itemIdx].title !== w.name) {
	          items.value[itemIdx].title = w.name
	        }
      } else if (!isEnabled && itemIdx !== -1) {
        items.value.splice(itemIdx, 1)
      }
    })
  }, { deep: true, immediate: true })

  return {
    groups,
    items,
    config,
    loadDefaults,
    loadFromStorage,
    setupPersistence,
    resetAll,
    getGroupItems,
    addItem,
    updateItem,
    deleteItem,
    addGroup,
    updateGroup,
    deleteGroup,
    exportData,
    importData
  }
}
