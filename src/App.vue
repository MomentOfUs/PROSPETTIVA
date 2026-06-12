<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, h } from 'vue'
import { 
  Settings as SettingsIcon, 
  Plus as PlusIcon, 
  Edit2 as EditIcon, 
  Trash2 as TrashIcon, 
  FolderPlus as FolderPlusIcon, 
  Link2 as LinkIcon, 
  ExternalLink as ExternalLinkIcon,
  Home as HomeIcon,
  Search as SearchIcon
} from '@lucide/vue'

import MangaCard from './components/MangaCard.vue'
import MangaButton from './components/MangaButton.vue'
import MangaModal from './components/MangaModal.vue'
import { availableWidgets } from './components/WidgetRegistry'
import { api, removeToken, getUsername, isLoggedIn, triggerCloudPush } from './utils/api'

// Custom inline SVG icons for brands (Github & Tv/Bilibili)
const GithubIcon = () => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  class: 'w-6 h-6'
}, [
  h('path', { d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' }),
  h('path', { d: 'M9 18c-4.51 2-5-2-7-2' })
])

const TvIcon = () => h('svg', {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  class: 'w-6 h-6'
}, [
  h('rect', { width: '20', height: '15', x: '2', y: '7', rx: '2', ry: '2' }),
  h('path', { d: 'm17 2-5 5-5-5' })
])

// Icon mapping helper
const iconMap: Record<string, any> = {
  Home: HomeIcon,
  Github: GithubIcon,
  Search: SearchIcon,
  Tv: TvIcon,
  Link: LinkIcon
}

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || LinkIcon
}

// Interfaces
interface Group {
  id: string
  title: string
}

interface NavItem {
  id: string
  groupId: string
  title: string
  url: string
  description: string
  icon: string
  color: string
  size?: 'normal' | 'wide'
}

interface Config {
  logoText: string
  backgroundPattern: 'dots' | 'grid' | 'none'
  mangaFontEnabled: boolean
  widgets: Record<string, boolean>
  openaiKey?: string
  openaiBase?: string
  openaiModel?: string
}

// State
const groups = ref<Group[]>([])
const items = ref<NavItem[]>([])

// ── Drag & Drop State ──
const dragItemId = ref<string | null>(null)
const dragOverItemId = ref<string | null>(null)

// ── Item Drag Handlers ──
function handleItemDragStart(id: string, e: DragEvent) {
  dragItemId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}
function handleItemDragOver(id: string, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverItemId.value = id
}
function handleItemDrop(targetId: string, e: DragEvent) {
  e.preventDefault()
  const sourceId = dragItemId.value
  if (sourceId && sourceId !== targetId) {
    const srcIdx = items.value.findIndex(i => i.id === sourceId)
    const tgtIdx = items.value.findIndex(i => i.id === targetId)
    if (srcIdx !== -1 && tgtIdx !== -1) {
      const [moved] = items.value.splice(srcIdx, 1)
      items.value.splice(tgtIdx, 0, moved)
    }
  }
  dragItemId.value = null
  dragOverItemId.value = null
}
function handleDragEnd() {
  dragItemId.value = null
  dragOverItemId.value = null
}
const config = ref<Config>({
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
    weight: true
  },
  openaiKey: '',
  openaiBase: 'https://api.deepseek.com',
  openaiModel: 'deepseek-chat'
})

// Cloud Sync State
const isUserLoggedIn = ref(isLoggedIn())
const loggedInUser = ref(getUsername())
const showAuthModal = ref(false)
const authForm = ref({ username: 'admin', password: 'admin123' })
const authError = ref('')
const isSyncing = ref(false)
const syncMessage = ref('')

// Modal states
const showSettings = ref(false)
const showItemModal = ref(false)
const showGroupModal = ref(false)

// Forms state
const editingItem = ref<NavItem | null>(null)
const itemForm = ref({
  id: '',
  groupId: '',
  title: '',
  url: '',
  description: '',
  icon: 'Link',
  color: '#2b2b2e',
  size: 'normal' as 'normal' | 'wide'
})

const editingGroup = ref<Group | null>(null)
const groupForm = ref({
  id: '',
  title: ''
})

// Initial default state if localStorage is empty
const loadDefaults = () => {
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
    { id: 'i5', groupId: 'g2', title: 'Stable Diffusion', url: 'https://stability.ai', description: '本地或云端自由度极高的开源AI制图', icon: 'Link', color: '#6e5020' },
    { id: 'i6', groupId: 'g3', title: 'GitHub', url: 'https://github.com', description: '全球最大的开源软件托管与协作平台', icon: 'Github', color: '#2b2b2e', size: 'wide' }
  ]
  config.value = {
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
      weight: true
    },
    openaiKey: '',
    openaiBase: 'https://api.deepseek.com',
    openaiModel: 'deepseek-chat'
  }
}

// Global Cloud Pull Sync
async function pullCloudData(silent = false) {
  if (!isLoggedIn()) return
  try {
    isSyncing.value = true
    syncMessage.value = '正在对齐云端天盘数据...'
    const cloudData = await api.pull()
    
    // 覆盖本地 LocalStorage 与 ref 状态
    if (cloudData.logo_text) {
      config.value.logoText = cloudData.logo_text
      config.value.backgroundPattern = cloudData.background_pattern as any
      config.value.mangaFontEnabled = cloudData.manga_font_enabled
      if (cloudData.openai_key) config.value.openaiKey = cloudData.openai_key
      if (cloudData.openai_base) config.value.openaiBase = cloudData.openai_base
      if (cloudData.openai_model) config.value.openaiModel = cloudData.openai_model
      if (cloudData.widgets_json) {
        config.value.widgets = JSON.parse(cloudData.widgets_json)
      }
    }
    
    if (cloudData.groups && cloudData.groups.length > 0) {
      groups.value = cloudData.groups
    }
    if (cloudData.items && cloudData.items.length > 0) {
      items.value = cloudData.items
    }
    
    // 写入其他小工具的 LocalStorage
    if (cloudData.todos) {
      localStorage.setItem('manga_todo_items', JSON.stringify(cloudData.todos))
    }
    if (cloudData.note_content) {
      localStorage.setItem('manga_widget_notes', cloudData.note_content)
    }
    if (cloudData.note_password_hash) {
      localStorage.setItem('manga_widget_notes_pwd', cloudData.note_password_hash)
    }
    if (cloudData.weights) {
      localStorage.setItem('manga_weight_records', JSON.stringify(cloudData.weights))
    }
    
    // 发送全局配置更新与各小工具数据刷新事件
    window.dispatchEvent(new Event('manga-config-updated'))
    window.dispatchEvent(new Event('artisan-cloud-data-pulled'))
    
    syncMessage.value = '天盘数据对齐成功！'
    if (!silent) {
      alert('天盘数据拉取并合并成功！')
    }
  } catch (err: any) {
    syncMessage.value = '同步失败：' + err.message
    if (!silent) {
      alert('同步失败: ' + err.message)
    }
  } finally {
    isSyncing.value = false
  }
}

// Global Cloud Push Sync
async function pushCloudData() {
  try {
    isSyncing.value = true
    syncMessage.value = '正在将本地星谱上传至天盘...'
    await performCloudPush()
    syncMessage.value = '上传同步成功！'
    alert('本地星谱已成功推送至云端天盘！')
  } catch (err: any) {
    syncMessage.value = '上传失败：' + err.message
    alert('上传本地数据至云端失败: ' + err.message)
  } finally {
    isSyncing.value = false
  }
}

async function performCloudPush() {
  const payload = {
    logo_text: config.value.logoText,
    background_pattern: config.value.backgroundPattern,
    manga_font_enabled: config.value.mangaFontEnabled,
    openai_key: config.value.openaiKey || '',
    openai_base: config.value.openaiBase || '',
    openai_model: config.value.openaiModel || '',
    widgets_json: JSON.stringify(config.value.widgets),
    groups: groups.value,
    items: items.value,
    todos: JSON.parse(localStorage.getItem('manga_todo_items') || '[]'),
    note_content: localStorage.getItem('manga_widget_notes') || '',
    note_password_hash: localStorage.getItem('manga_widget_notes_pwd') || '',
    weights: JSON.parse(localStorage.getItem('manga_weight_records') || '[]')
  }
  await api.push(payload)
}

// Debounce push trigger
let pushTimeout: any = null
function queueCloudPush() {
  if (!isLoggedIn()) return
  if (pushTimeout) clearTimeout(pushTimeout)
  pushTimeout = setTimeout(async () => {
    try {
      await performCloudPush()
      console.log('--- 乾坤云端静默上传成功 ---')
    } catch (err: any) {
      console.warn('云端静默上传失败：', err.message)
    }
  }, 2000)
}

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
    authForm.value.username = 'admin'
    authForm.value.password = 'admin123'
  } catch (err: any) {
    authError.value = err.message
  } finally {
    isSyncing.value = false
  }
}

function handleLogout() {
  if (confirm('确认退出当前天盘账号登录吗？退出后将切换回本地模式。')) {
    removeToken()
    showAuthModal.value = false
    authForm.value.username = 'admin'
    authForm.value.password = 'admin123'
    alert('已成功退出登录，已切回本地 LocalStorage 运行模态。')
  }
}

// LocalStorage Persistence & Cloud Init
onMounted(() => {
  const storedGroups = localStorage.getItem('manga_groups')
  const storedItems = localStorage.getItem('manga_items')
  const storedConfig = localStorage.getItem('manga_config')

  if (storedGroups && storedItems && storedConfig) {
    try {
      groups.value = JSON.parse(storedGroups)
      const parsedItems = JSON.parse(storedItems) as NavItem[]
      
      // Upgrade pastel color mapping to high-contrast oil shades
      const legacyColorMap: Record<string, string> = {
        '#ffd6a5': '#4a161b', // orange -> Medici Crimson
        '#caffbf': '#152e24', // green -> Botticelli Green
        '#a0c4ff': '#18283b', // blue -> Sistine Azure
        '#bdb2ff': '#6e5020', // purple -> Rutland Amber
        '#ffc6ff': '#3b232c', // pink -> Dark Rose
        '#fdffb6': '#2e1f18', // yellow -> Da Vinci Walnut
        '#221f1c': '#2b2b2e'  // dark charcoal -> Venetian Ash
      }
      items.value = parsedItems.map(item => {
        const lowerColor = item.color.toLowerCase()
        if (legacyColorMap[lowerColor]) {
          item.color = legacyColorMap[lowerColor]
        }
        return item
      })

      config.value = JSON.parse(storedConfig)
      if (config.value.logoText === 'MANGA NAV' || config.value.logoText === 'MANGA DASH' || config.value.logoText === 'ARTISAN NAV') {
        config.value.logoText = 'PROSPETTIVA'
      }
    } catch {
      loadDefaults()
    }
  } else {
    loadDefaults()
  }

  // Auth State Listener
  window.addEventListener('artisan-auth-state-changed', () => {
    isUserLoggedIn.value = isLoggedIn()
    loggedInUser.value = getUsername()
  })

  // Synchronizer Event Listener
  window.addEventListener('artisan-request-cloud-push', queueCloudPush)

  // Auto-pull from cloud on startup
  if (isUserLoggedIn.value) {
    pullCloudData(true)
  }
})

watch([groups, items, config], () => {
  localStorage.setItem('manga_groups', JSON.stringify(groups.value))
  localStorage.setItem('manga_items', JSON.stringify(items.value))
  localStorage.setItem('manga_config', JSON.stringify(config.value))
  window.dispatchEvent(new Event('manga-config-updated'))
  triggerCloudPush()
}, { deep: true })

// Ensure at least one group exists before adding items
function ensureGroup(): string {
  if (groups.value.length === 0) {
    const newGroup = { id: Date.now().toString(), title: '我的导航' }
    groups.value.push(newGroup)
    return newGroup.id
  }
  return groups.value[0].id
}

// Item operations
const openAddItem = (groupId?: string) => {
  if (!groupId) groupId = ensureGroup()
  editingItem.value = null
  itemForm.value = {
    id: '',
    groupId,
    title: '',
    url: '',
    description: '',
    icon: 'Link',
    color: '#221f1c',
    size: 'normal'
  }
  showItemModal.value = true
}

const openEditItem = (item: NavItem) => {
  editingItem.value = item
  itemForm.value = {
    ...item,
    size: item.size || 'normal'
  }
  showItemModal.value = true
}

const saveItem = () => {
  if (!itemForm.value.title || !itemForm.value.url) return

  if (editingItem.value) {
    // Edit
    const idx = items.value.findIndex(i => i.id === editingItem.value!.id)
    if (idx !== -1) {
      items.value[idx] = { ...itemForm.value }
    }
  } else {
    // Add
    items.value.push({
      ...itemForm.value,
      id: Date.now().toString()
    })
  }
  showItemModal.value = false
}

const deleteItem = (id: string) => {
  if (confirm('确认删除此导航项目吗？')) {
    items.value = items.value.filter(i => i.id !== id)
  }
}

// Group operations
const openAddGroup = () => {
  editingGroup.value = null
  groupForm.value = { id: '', title: '' }
  showGroupModal.value = true
}

const openEditGroup = (group: Group) => {
  editingGroup.value = group
  groupForm.value = { ...group }
  showGroupModal.value = true
}

const saveGroup = () => {
  if (!groupForm.value.title) return

  if (editingGroup.value) {
    const idx = groups.value.findIndex(g => g.id === editingGroup.value!.id)
    if (idx !== -1) {
      groups.value[idx].title = groupForm.value.title
    }
  } else {
    groups.value.push({
      id: Date.now().toString(),
      title: groupForm.value.title
    })
  }
  showGroupModal.value = false
}

const deleteGroup = (id: string) => {
  if (confirm('删除分组将同时删除该分组下的所有导航，确定要删除吗？')) {
    groups.value = groups.value.filter(g => g.id !== id)
    items.value = items.value.filter(i => i.groupId !== id)
  }
}

// Reset Configuration
const resetAll = () => {
  if (confirm('确定要重置所有配置和导航数据吗？该操作不可逆！')) {
    localStorage.clear()
    loadDefaults()
    showSettings.value = false
  }
}

// Filter items by group
const getGroupItems = (groupId: string) => {
  return items.value.filter(i => i.groupId === groupId)
}

// Available classical woodblock shades for cards
const colorOptions = [
  { label: '美第奇红', value: '#4a161b' },
  { label: '波提切利绿', value: '#152e24' },
  { label: '西斯廷蓝', value: '#18283b' },
  { label: '拉特兰金', value: '#6e5020' },
  { label: '达芬奇褐', value: '#2e1f18' },
  { label: '威尼斯灰', value: '#2b2b2e' }
]

// Canvas background animation for automatically exploring gold ink lines
const bgCanvas = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

// Generated paper background texture
const paperBgUrl = ref('')

function generatePaperTexture(): string {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // 1. Fill base paper color (deep charcoal walnut tone)
  ctx.fillStyle = '#1a1510'
  ctx.fillRect(0, 0, size, size)

  // 2. Add fine noise
  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise))
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise))
  }
  ctx.putImageData(imgData, 0, 0)

  // 3. Add faint paper fibers (slender golden strokes)
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.035)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20,
      x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20,
      x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30
    )
    ctx.stroke()
  }

  // 4. Add dark fibers
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + (Math.random() - 0.5) * 15, y + (Math.random() - 0.5) * 15,
      x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20
    )
    ctx.stroke()
  }

  return canvas.toDataURL()
}

/* ═══════════════════════════════════════════════════════════
   TRUE MATHEMATICAL FRACTALS — Self-similar at every scale
   ═══════════════════════════════════════════════════════════ */

interface LineSeg {
  x1: number; y1: number; x2: number; y2: number
}

interface FractalSketch {
  id: string
  segments: LineSeg[]
  totalSegs: number
  progress: number
  drawSpeed: number
  alpha: number
  maxAlpha: number
  state: 'drawing' | 'completed'
  lineWidth: number
  color: string
}

const activeSketches: FractalSketch[] = []
let framesSinceLastSpawn = 0

// ── 1. Fractal Tree (self-similar branching) ──
function generateFractalTree(x: number, y: number, len: number, angle: number, depth: number, maxDepth: number, segs: LineSeg[]) {
  if (depth > maxDepth) return
  const ex = x + len * Math.cos(angle)
  const ey = y + len * Math.sin(angle)
  segs.push({ x1: x, y1: y, x2: ex, y2: ey })
  if (depth < maxDepth) {
    const s = 0.62 + Math.random() * 0.08
    const spread = 0.35 + Math.random() * 0.15
    generateFractalTree(ex, ey, len * s, angle - spread, depth + 1, maxDepth, segs)
    generateFractalTree(ex, ey, len * s, angle + spread, depth + 1, maxDepth, segs)
    if (Math.random() > 0.55)
      generateFractalTree(ex, ey, len * s * 0.75, angle + (Math.random() - 0.5) * 0.3, depth + 1, maxDepth, segs)
  }
}

// ── 2. Golden-Spiral fractal (golden angle ~137.5°) ──
function generateGoldenSpiral(cx: number, cy: number, count: number): LineSeg[] {
  const segs: LineSeg[] = []
  let x = cx, y = cy
  let r = 1.5
  let a = 0
  for (let i = 0; i < count; i++) {
    const nx = cx + r * Math.cos(a)
    const ny = cy + r * Math.sin(a)
    segs.push({ x1: x, y1: y, x2: nx, y2: ny })
    x = nx; y = ny
    r *= Math.cbrt(1.618)
    a += Math.PI / 2.618
  }
  return segs
}

// ── 3. Sierpinski-type triangular fractal ──
function generateSierpinski(x: number, y: number, size: number, depth: number, maxDepth: number, segs: LineSeg[]) {
  if (depth > maxDepth) return
  const h = size * Math.sqrt(3) / 2
  segs.push({ x1: x, y1: y, x2: x + size, y2: y })
  segs.push({ x1: x + size, y1: y, x2: x + size / 2, y2: y + h })
  segs.push({ x1: x + size / 2, y1: y + h, x2: x, y2: y })
  if (depth < maxDepth) {
    const s = size / 2
    generateSierpinski(x, y, s, depth + 1, maxDepth, segs)
    generateSierpinski(x + s, y, s, depth + 1, maxDepth, segs)
    generateSierpinski(x + s / 2, y + h / 2, s, depth + 1, maxDepth, segs)
  }
}

// ── Spawn a random fractal ──
function spawnFractal(w: number, h: number): FractalSketch {
  const type = Math.floor(Math.random() * 3)
  let segs: LineSeg[] = []

  if (type === 0) {
    const side = Math.floor(Math.random() * 2)
    const x = side === 0 ? Math.random() * w * 0.8 + w * 0.1 : (Math.random() > 0.5 ? w * 0.1 : w * 0.9)
    const y = side === 0 ? h * (0.08 + Math.random() * 0.12) : Math.random() * h * 0.6 + h * 0.2
    const len = 30 + Math.random() * 50
    const angle = side === 0 ? -Math.PI / 2 + (Math.random() - 0.5) * 0.5 : (Math.random() > 0.5 ? -0.3 : Math.PI + 0.3)
    const depth = 5 + Math.floor(Math.random() * 3)
    generateFractalTree(x, y, len, angle, 0, depth, segs)
  } else if (type === 1) {
    const cx = w * (0.15 + Math.random() * 0.7)
    const cy = h * (0.15 + Math.random() * 0.7)
    segs = generateGoldenSpiral(cx, cy, 80 + Math.floor(Math.random() * 60))
  } else {
    const x = w * (0.1 + Math.random() * 0.6)
    const y = h * (0.1 + Math.random() * 0.6)
    const size = 40 + Math.random() * 60
    generateSierpinski(x, y, size, 0, 3 + Math.floor(Math.random() * 2), segs)
  }

  return {
    id: Math.random().toString(),
    segments: segs,
    totalSegs: segs.length,
    progress: 0,
    drawSpeed: 0.6 + Math.random() * 0.4,
    alpha: 0,
    maxAlpha: type === 0 ? 0.18 + Math.random() * 0.12 : 0.12 + Math.random() * 0.10,
    state: 'drawing',
    lineWidth: type === 0 ? 0.6 + Math.random() * 0.3 : type === 1 ? 0.5 + Math.random() * 0.2 : 0.4 + Math.random() * 0.2,
    color: type === 2 ? 'rgba(200, 165, 50' : 'rgba(212, 175, 55'
  }
}

onMounted(() => {
  paperBgUrl.value = generatePaperTexture()

  const canvas = bgCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = (canvas.width = window.innerWidth)
  let height = (canvas.height = window.innerHeight)

  activeSketches.length = 0
  activeSketches.push(spawnFractal(width, height))
  framesSinceLastSpawn = 0

  const handleResize = () => {
    if (canvas) {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      activeSketches.length = 0
      activeSketches.push(spawnFractal(width, height))
      framesSinceLastSpawn = 0
    }
  }
  window.addEventListener('resize', handleResize)

  function draw() {
    if (!canvas || !ctx) return

    // ── NEVER clear — fractals accumulate permanently ──

    // Spawn new fractals continuously
    framesSinceLastSpawn++
    if (framesSinceLastSpawn > 60 + Math.random() * 60) {
      activeSketches.push(spawnFractal(width, height))
      framesSinceLastSpawn = 0
    }

    // Draw active fractal sketches incrementally
    for (let i = activeSketches.length - 1; i >= 0; i--) {
      const s = activeSketches[i]

      if (s.state === 'drawing') {
        const from = s.progress
        s.progress += s.drawSpeed
        s.alpha = Math.min(s.maxAlpha, (s.progress / Math.max(1, s.totalSegs * 0.15)) * s.maxAlpha)

        if (s.progress >= s.totalSegs) {
          s.progress = s.totalSegs
          s.state = 'completed'
        }

        // Draw newly advanced segments (incremental)
        if (s.alpha > 0 && s.progress > from) {
          const fSeg = Math.floor(from)
          const tSeg = Math.floor(s.progress)

          ctx.lineWidth = s.lineWidth
          ctx.strokeStyle = `${s.color}, ${s.alpha})`
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          for (let j = fSeg; j <= Math.min(tSeg, s.totalSegs - 1); j++) {
            const seg = s.segments[j]
            ctx.beginPath()
            ctx.moveTo(seg.x1, seg.y1)
            ctx.lineTo(seg.x2, seg.y2)
            ctx.stroke()
          }
        }

        if (s.state === 'completed') {
          activeSketches.splice(i, 1)
        }
      }
    }

    animationFrameId = requestAnimationFrame(draw)
  }

  draw()

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>
<template>
  <div 
    class="min-h-screen text-[#f5f2eb] pb-16 transition-all duration-300 relative overflow-x-hidden"
    :class="[
      config.mangaFontEnabled ? 'font-manga' : 'font-sans',
      config.backgroundPattern === 'dots' ? 'pattern-dots' : config.backgroundPattern === 'grid' ? 'pattern-grid' : ''
    ]"
    :style="{
      backgroundColor: '#120e0c',
      backgroundImage: paperBgUrl ? `radial-gradient(circle at center, rgba(32, 26, 23, 0.22) 0%, rgba(15, 12, 10, 0.96) 100%), url(${paperBgUrl})` : 'none',
      backgroundSize: 'auto, auto',
      backgroundRepeat: 'no-repeat, repeat'
    }"
  >
    <!-- Dynamic generative exploring gold ink canvas -->
    <canvas ref="bgCanvas" class="fixed inset-0 pointer-events-none z-0 opacity-100"></canvas>
    <!-- Header -->
    <header class="max-w-7xl mx-auto px-4 pt-3 flex flex-row items-center gap-2.5 relative z-20">
      <!-- Logo -->
      <div class="border border-gold/60 bg-bg-surface px-3 py-1 rounded shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(212,175,55,0.12)] shrink-0">
        <h1 class="text-base md:text-lg font-bold tracking-widest text-gold select-none font-serif uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          {{ config.logoText }}
        </h1>
      </div>

      <!-- Spacer -->
      <div class="flex-1 min-w-0"></div>

      <!-- Widgets & Control area -->
      <div class="flex items-center gap-2">
        <!-- Compact Header Clock -->
        <component
          v-if="config.widgets.clock"
          :is="availableWidgets.find(w => w.id === 'clock')?.component"
          :compact="true"
        />

        <!-- Cloud Sync Button -->
        <MangaButton
          @click="showAuthModal = true"
          bg-class="bg-btn-base border-gold/40 text-parchment hover:bg-btn-hover hover:text-gold"
          class="h-7 md:h-8 px-2.5 rounded flex items-center justify-center gap-1 text-[10px] md:text-xs font-serif font-bold shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
          :title="isUserLoggedIn ? '已连接云同步: ' + loggedInUser : '登天盘启同步'"
        >
          <span>{{ isUserLoggedIn ? '🏛️ ' + loggedInUser : '☁️' }}</span>
          <span class="hidden sm:inline">乾坤天盘</span>
        </MangaButton>

        <!-- Settings Button -->
        <MangaButton
          @click="showSettings = true"
          bg-class="bg-btn-base border-gold/40 text-parchment hover:bg-btn-hover hover:text-gold"
          class="h-7 md:h-8 w-7 md:w-8 rounded flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
          title="系统设置"
        >
          <SettingsIcon class="w-4 h-4" />
        </MangaButton>
      </div>
    </header>

    <!-- Search Section -->
    <section
      v-if="config.widgets.search"
      class="max-w-7xl mx-auto px-6 mt-5 flex justify-center"
    >
      <component :is="availableWidgets.find(w => w.id === 'search')?.component" />
    </section>

    <!-- Dashboard Widgets -->
    <section class="max-w-7xl mx-auto px-6 mt-6 flex flex-wrap justify-center gap-5 relative z-10">
      <template v-for="widget in availableWidgets" :key="widget.id">
        <component 
          v-if="config.widgets[widget.id] && widget.id !== 'clock' && widget.id !== 'search'"
          :is="widget.component" 
        />
      </template>
    </section>

    <!-- Main Navigation (App Launcher Grid) -->
    <main class="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-6 relative z-10">

      <!-- App Launcher Grid (Mobile-style icon grid) -->
      <div v-if="items.length === 0" class="text-center py-10 bg-bg-base/30 border border-dashed border-gold/30 rounded p-6 shadow-lg">
        <p class="text-base font-medium mb-4 font-serif text-parchment/80">当前暂无任何导航链接，请添加一个</p>
        <MangaButton @click="openAddItem(groups[0]?.id || 'g1')" bg-class="bg-btn-base hover:bg-btn-hover border-gold/40">
          <PlusIcon class="w-4 h-4" /> 新增导航
        </MangaButton>
      </div>

      <div v-else>
        <!-- Add Item Button (top) -->
        <div class="flex justify-end mb-4">
          <MangaButton @click="openAddItem(groups[0]?.id || 'g1')" bg-class="bg-btn-base hover:bg-btn-hover border-gold/40" size="sm">
            <PlusIcon class="w-3.5 h-3.5" /> 新增导航
          </MangaButton>
        </div>

        <!-- Icon Grid (Mobile App Launcher Style) -->
        <div class="flex flex-wrap justify-center gap-6 md:gap-8">
          <a
            v-for="(item, ii) in items"
            :key="item.id"
            :href="item.url"
            target="_blank"
            :draggable="true"
            @dragstart="handleItemDragStart(item.id, $event)"
            @dragover="handleItemDragOver(item.id, $event)"
            @drop="handleItemDrop(item.id, $event)"
            @dragend="handleDragEnd"
            class="flex flex-col items-center gap-1.5 group/card relative select-none"
            :class="[dragOverItemId === item.id ? 'opacity-60 scale-95' : '']"
            :title="item.description || item.title"
          >
            <!-- Edit/Delete hover buttons -->
            <div class="absolute -top-2 -right-2 flex gap-1 z-[60] opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-200">
              <button @click.prevent.stop="openEditItem(item)" class="bg-bg-modal border border-gold/60 p-1 rounded hover:bg-card-walnut text-parchment hover:text-gold transition-all cursor-pointer shadow-md" title="编辑">
                <EditIcon class="w-3 h-3" />
              </button>
              <button @click.prevent.stop="deleteItem(item.id)" class="bg-bg-modal border border-delete/60 p-1 rounded hover:bg-delete text-delete hover:text-status-bad transition-all cursor-pointer shadow-md" title="删除">
                <TrashIcon class="w-3 h-3" />
              </button>
            </div>

            <!-- App Icon Tile -->
            <div
              class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-gold/25 transition-all duration-300 group-hover/card:scale-110 group-hover/card:shadow-[0_12px_32px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(212,175,55,0.45)] group-hover/card:border-gold/80 group-focus-within/card:scale-110 group-focus-within/card:shadow-[0_12px_32px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(212,175,55,0.45)] group-focus-within/card:border-gold/80 active:scale-95 cursor-grab active:cursor-grabbing"
              :style="{ backgroundColor: item.color }"
            >
              <div class="text-gold/90 group-hover/card:text-white group-focus-within/card:text-white transition-colors">
                <component :is="getIconComponent(item.icon)" class="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
            </div>

            <!-- Label -->
            <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-parchment/85 group-hover/card:text-gold group-focus-within/card:text-gold transition-colors truncate max-w-[72px] sm:max-w-[88px] font-serif">
              {{ item.title }}
            </span>

            <!-- Hover Tooltip Popup -->
            <div
              class="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50 w-52
                     opacity-0 scale-90 origin-bottom
                     group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto
                     group-focus-within/card:opacity-100 group-focus-within/card:scale-100 group-focus-within/card:pointer-events-auto
                     transition-all duration-200 ease-out"
            >
              <div
                class="relative border border-gold/55 rounded text-cream shadow-[0_16px_40px_rgba(0,0,0,0.9)] overflow-hidden p-3"
                :style="{ backgroundColor: item.color }"
              >
                <div class="flex items-center gap-2">
                  <div class="border border-gold/40 bg-bg-base/90 p-1.5 rounded flex items-center justify-center text-gold shrink-0">
                    <component :is="getIconComponent(item.icon)" class="w-4 h-4" />
                  </div>
                  <h3 class="text-xs font-bold tracking-wider text-cream font-serif">{{ item.title }}</h3>
                </div>
                <p class="text-[9px] text-parchment/85 line-clamp-2 mt-1.5 leading-relaxed font-serif">{{ item.description || '暂无描述信息' }}</p>
                <div class="flex items-center gap-1 mt-1.5 text-[8px] text-gold/65 font-serif border-t border-gold/15 pt-1.5">
                  <ExternalLinkIcon class="w-2 h-2 text-gold/75 shrink-0" />
                  <span class="truncate">{{ item.url.replace(/^https?:\/\//i, '') }}</span>
                </div>
              </div>
              <div
                class="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r border-gold/55"
                :style="{ backgroundColor: item.color }"
              ></div>
            </div>
          </a>

          <!-- Quick Add Tile -->
          <div
            @click="openAddItem(groups[0]?.id || 'g1')"
            class="flex flex-col items-center gap-1.5 group/card cursor-pointer select-none"
          >
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-gold/30 flex items-center justify-center bg-bg-base/40 hover:bg-gold/5 hover:border-gold/60 hover:scale-110 active:scale-95 transition-all shadow-[0_6px_15px_rgba(0,0,0,0.5)]">
              <PlusIcon class="w-6 h-6 sm:w-8 sm:h-8 text-gold/60 group-hover/card:text-gold" />
            </div>
            <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-gold/60 group-hover/card:text-gold transition-colors font-serif">
              新增
            </span>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="text-center mt-24 text-xs font-semibold text-[#d4af37]/40 select-none font-serif tracking-widest uppercase">
      <p>Prospettiva 透视法 © 2026 Yibo. All Rights Reserved.</p>
    </footer>

    <!-- Settings Modal -->
    <MangaModal v-model:show="showSettings" title="⚙️ 系统配置中心">
      <div class="flex flex-col gap-5 font-bold">
        <!-- Logo Text -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm">主页LOGO文本</label>
          <input 
            v-model="config.logoText" 
            type="text" 
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif" 
          />
        </div>

        <!-- Pattern selector -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm">主页背景图样</label>
          <select 
            v-model="config.backgroundPattern"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif"
          >
            <option value="dots">文艺复兴锦缎 (Damask)</option>
            <option value="grid">编织十字纹理 (Crosshatch)</option>
            <option value="none">纯净暗黑背景 (None)</option>
          </select>
        </div>

        <!-- Font toggle -->
        <div class="flex justify-between items-center border-b border-[#d4af37]/20 pb-4">
          <span class="text-sm">启用文艺复兴衬线体</span>
          <button 
            @click="config.mangaFontEnabled = !config.mangaFontEnabled"
            class="border border-[#d4af37]/40 px-4 py-1.5 rounded text-xs cursor-pointer bg-transparent text-[#ebdcb9] font-serif transition-all"
            :class="[config.mangaFontEnabled ? 'bg-[#6e5020] text-[#f5f2eb] border-[#d4af37]' : '']"
          >
            {{ config.mangaFontEnabled ? '已开启' : '已关闭' }}
          </button>
        </div>

        <!-- Widget controls -->
        <div class="flex flex-col gap-3">
          <span class="text-sm">启用小工具 (Widgets)</span>
          <div class="grid grid-cols-2 gap-3">
            <div 
              v-for="widget in availableWidgets" 
              :key="widget.id"
              class="border border-[#d4af37]/30 p-2.5 rounded bg-[#1a1613] flex items-center justify-between text-[#ebdcb9]"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-xs">{{ widget.name }}</span>
              </div>
              <input 
                type="checkbox" 
                v-model="config.widgets[widget.id]"
                class="accent-[#d4af37] w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <!-- AI API Configuration -->
        <div class="border-t border-[#d4af37]/20 pt-4 flex flex-col gap-3">
          <span class="text-sm">🤖 对话姬 API 配置 (支持 DeepSeek / OpenAI)</span>
          <div class="flex flex-col gap-2 bg-[#120e0c] border border-[#d4af37]/35 p-3 rounded shadow-lg">
            <div class="flex flex-col gap-1 text-xs">
              <label>API Key</label>
              <input 
                v-model="config.openaiKey" 
                type="password" 
                placeholder="sk-..."
                class="border border-[#d4af37]/30 p-1.5 rounded bg-[#1a1512] text-[#f5f2eb] font-mono outline-none focus:border-[#d4af37]"
              />
            </div>
            <div class="flex flex-col gap-1 text-xs mt-1">
              <label>API 接口地址</label>
              <input 
                v-model="config.openaiBase" 
                type="text" 
                placeholder="https://api.deepseek.com"
                class="border border-[#d4af37]/30 p-1.5 rounded bg-[#1a1512] text-[#f5f2eb] font-mono outline-none focus:border-[#d4af37]"
              />
            </div>
            <div class="flex flex-col gap-1 text-xs mt-1">
              <label>模型名称</label>
              <input 
                v-model="config.openaiModel" 
                type="text" 
                placeholder="deepseek-chat"
                class="border border-[#d4af37]/30 p-1.5 rounded bg-[#1a1512] text-[#f5f2eb] font-mono outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>
        </div>

        <!-- Danger zone -->
        <div class="border-t border-[#d4af37]/20 pt-4 flex justify-between gap-4">
          <MangaButton 
            @click="resetAll"
            bg-class="bg-reset text-cream hover:bg-reset-hover border-gold/40"
            size="sm"
          >
            重置所有数据
          </MangaButton>
          <MangaButton 
            @click="showSettings = false"
            bg-class="bg-btn-base hover:bg-btn-hover border-[#d4af37]/40"
            size="sm"
          >
            保存并关闭
          </MangaButton>
        </div>
      </div>
    </MangaModal>

    <!-- Cloud Sync Modal -->
    <MangaModal v-model:show="showAuthModal" :title="isUserLoggedIn ? '🏛️ 乾坤天盘云同步' : '☁️ 登天盘 · 启云同步'">
      <div class="flex flex-col gap-4 font-bold text-sm font-serif">
        
        <!-- 1. Logged In View -->
        <div v-if="isUserLoggedIn" class="flex flex-col gap-4 py-2">
          <div class="border border-[#d4af37]/30 bg-[#120e0c]/90 p-3.5 rounded shadow-lg text-center flex flex-col gap-1.5">
            <span class="text-[10px] text-[#d4af37]/60 tracking-widest uppercase">✦ 云端经纬对齐状态 ✦</span>
            <p class="text-base text-[#f5f2eb]">已连结云天盘账号：<span class="text-[#d4af37] font-bold">{{ loggedInUser }}</span></p>
            <p class="text-[10px] text-[#ebdcb9]/60 leading-relaxed mt-1">
              ※ 当前处于云端联动模态，您所有的日常修改都将在后台自动静默推送至云端 SQLite 数据库。
            </p>
          </div>
          
          <div class="grid grid-cols-2 gap-3 mt-1">
            <button 
              @click="pullCloudData(false)"
              :disabled="isSyncing"
              class="border border-[#d4af37]/45 py-2 rounded text-xs bg-[#120e0c] text-[#ebdcb9] hover:bg-[#1a1512] transition-colors cursor-pointer text-center font-bold"
            >
              📥 拉取云数据覆盖本地
            </button>
            <button 
              @click="pushCloudData"
              :disabled="isSyncing"
              class="border border-[#d4af37]/45 py-2 rounded text-xs bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] transition-colors cursor-pointer text-center font-bold"
            >
              📤 推送本地数据覆盖云端
            </button>
          </div>

          <p v-if="syncMessage" class="text-[9.5px] text-[#d4af37] text-center font-mono animate-pulse mt-0.5">
            {{ syncMessage }}
          </p>

          <div class="border-t border-[#d4af37]/20 pt-4 flex justify-between gap-4 mt-2">
            <MangaButton 
              @click="handleLogout"
              bg-class="bg-reset text-cream hover:bg-reset-hover border-gold/40"
              size="sm"
            >
              退出天盘登录
            </MangaButton>
            <MangaButton 
              @click="showAuthModal = false"
              bg-class="bg-btn-base hover:bg-btn-hover border-[#d4af37]/40"
              size="sm"
            >
              关闭
            </MangaButton>
          </div>
        </div>

        <!-- 2. Auth Login Form (Registration Disabled) -->
        <div v-else class="flex flex-col gap-3">
          <div class="border border-[#d4af37]/20 bg-[#1a1512]/60 p-3 rounded text-center">
            <span class="text-[10px] text-[#d4af37]/60 tracking-widest uppercase block mb-1">✦ 演示免签登录 ✦</span>
            <p class="text-xs text-[#ebdcb9]/80 leading-relaxed font-serif">
              注册功能已关闭。已为您预填默认账户，请直接点击“确证登入”连结乾坤云端天盘。
            </p>
          </div>

          <!-- Username -->
          <div class="flex flex-col gap-1.5">
            <label>天盘账户名称</label>
            <input 
              v-model="authForm.username" 
              type="text" 
              placeholder="请输入用户名..."
              class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif" 
            />
          </div>

          <!-- Password -->
          <div class="flex flex-col gap-1.5">
            <label>天盘鉴权密匙</label>
            <input 
              v-model="authForm.password" 
              type="password" 
              placeholder="请输入密码..."
              class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-mono" 
            />
          </div>

          <p v-if="authError" class="text-[10px] text-status-bad text-center tracking-wider mt-1 font-serif">
            ※ {{ authError }}
          </p>

          <p v-if="syncMessage" class="text-[9.5px] text-[#d4af37] text-center font-mono animate-pulse mt-0.5">
            {{ syncMessage }}
          </p>

          <!-- Footer -->
          <div class="border-t border-[#d4af37]/20 pt-4 flex justify-end gap-3 mt-2">
            <MangaButton @click="showAuthModal = false" bg-class="bg-[#120e0c] border-[#d4af37]/30 text-[#ebdcb9] hover:bg-[#1a1512]" size="sm">关闭</MangaButton>
            <MangaButton 
              @click="handleAuthSubmit" 
              :disabled="isSyncing"
              bg-class="bg-btn-base hover:bg-btn-hover border-[#d4af37]/40" 
              size="sm"
            >
              确证登入
            </MangaButton>
          </div>
        </div>

      </div>
    </MangaModal>

    <!-- Nav Item Add/Edit Modal -->
    <MangaModal v-model:show="showItemModal" :title="editingItem ? '✏️ 修改导航链接' : '➕ 新增导航链接'">
      <div class="flex flex-col gap-4 font-bold text-sm font-serif">
        <!-- Group -->
        <div class="flex flex-col gap-1.5">
          <label>所属分组</label>
          <select 
            v-model="itemForm.groupId"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37]"
          >
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.title }}
            </option>
          </select>
        </div>

        <!-- Title -->
        <div class="flex flex-col gap-1.5">
          <label>项目名称</label>
          <input 
            v-model="itemForm.title" 
            type="text" 
            placeholder="例如: GitHub"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif" 
          />
        </div>

        <!-- URL -->
        <div class="flex flex-col gap-1.5">
          <label>链接地址</label>
          <input 
            v-model="itemForm.url" 
            type="text" 
            placeholder="https://..."
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif" 
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label>描述信息</label>
          <input 
            v-model="itemForm.description" 
            type="text" 
            placeholder="例如: 优质代码托管平台"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif" 
          />
        </div>

        <!-- Icon -->
        <div class="flex flex-col gap-1.5">
          <label>项目图标</label>
          <select 
            v-model="itemForm.icon"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37]"
          >
            <option value="Link">默认链接 (Link)</option>
            <option value="Home">主页 (Home)</option>
            <option value="Github">GitHub</option>
            <option value="Tv">视频/电视 (Tv)</option>
            <option value="Search">搜索 (Search)</option>
          </select>
        </div>

        <!-- Size Selection (Wide / Normal) -->
        <div class="flex flex-col gap-1.5">
          <label>卡片尺寸</label>
          <select 
            v-model="itemForm.size"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37]"
          >
            <option value="normal">常规卡片 (1列)</option>
            <option value="wide">宽大卡片 (跨2列)</option>
          </select>
        </div>

        <!-- Color Selector -->
        <div class="flex flex-col gap-1.5">
          <label>卡片底色</label>
          <div class="flex gap-3 mt-1 flex-wrap">
            <button 
              v-for="color in colorOptions"
              :key="color.value"
              @click="itemForm.color = color.value"
              class="w-6 h-6 rounded-full border-2 border-white/80 shadow-md cursor-pointer transition-transform"
              :style="{ backgroundColor: color.value }"
              :class="[itemForm.color === color.value ? 'scale-125 ring-2 ring-[#d4af37]' : '']"
              :title="color.label"
            ></button>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-[#d4af37]/20 pt-4 flex justify-end gap-3 mt-2">
          <MangaButton @click="showItemModal = false" bg-class="bg-[#120e0c] border-[#d4af37]/30 text-[#ebdcb9] hover:bg-[#1a1512]" size="sm">取消</MangaButton>
          <MangaButton @click="saveItem" bg-class="bg-btn-base hover:bg-btn-hover border-[#d4af37]/40" size="sm">保存链接</MangaButton>
        </div>
      </div>
    </MangaModal>

    <!-- Group Add/Edit Modal -->
    <MangaModal v-model:show="showGroupModal" :title="editingGroup ? '✏️ 修改导航分组' : '➕ 新增导航分组'">
      <div class="flex flex-col gap-4 font-bold text-sm font-serif">
        <!-- Title -->
        <div class="flex flex-col gap-1.5">
          <label>分组名称</label>
          <input 
            v-model="groupForm.title" 
            type="text" 
            placeholder="例如: 工作软件"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif" 
          />
        </div>

        <!-- Footer -->
        <div class="border-t border-[#d4af37]/20 pt-4 flex justify-end gap-3 mt-2">
          <MangaButton @click="showGroupModal = false" bg-class="bg-[#120e0c] border-[#d4af37]/30 text-[#ebdcb9] hover:bg-[#1a1512]" size="sm">取消</MangaButton>
          <MangaButton @click="saveGroup" bg-class="bg-btn-base hover:bg-btn-hover border-[#d4af37]/40" size="sm">保存分组</MangaButton>
        </div>
      </div>
    </MangaModal>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800;900&family=Noto+Serif+SC:wght@500;700;900&display=swap');

.min-h-screen {
  background-color: #120e0c;
  background-size: cover;
}

.font-manga {
  font-family: 'Cinzel', 'Noto Serif SC', 'Georgia', serif !important;
}

.pattern-dots {
  /* Continuous Renaissance Damask / Mandala motif */
  background-image:
    /* Large overlapping medallions (continuous) */
    radial-gradient(ellipse at 15% 20%, rgba(212, 175, 55, 0.018) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 30%, rgba(212, 175, 55, 0.018) 0%, transparent 55%),
    radial-gradient(ellipse at 50% 70%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 80%, rgba(212, 175, 55, 0.012) 0%, transparent 45%),
    radial-gradient(ellipse at 70% 15%, rgba(212, 175, 55, 0.012) 0%, transparent 45%),
    /* Dense dot field for continuous texture */
    radial-gradient(rgba(212, 175, 55, 0.025) 0.8px, transparent 0.8px),
    radial-gradient(rgba(212, 175, 55, 0.015) 0.5px, transparent 0.5px),
    radial-gradient(rgba(212, 175, 55, 0.035) 1.2px, transparent 1.2px);
  background-size:
    180px 180px, 180px 180px, 160px 160px,
    140px 140px, 140px 140px,
    10px 10px, 6px 6px, 24px 24px;
  background-position:
    0% 0%, 0% 0%, 0% 0%,
    0% 0%, 0% 0%,
    0% 0%, 3px 3px, 1px 1px;
}

.pattern-grid {
  /* Fine Renaissance crosshatch / woven parchment texture (continuous) */
  background-image:
    /* Primary grid lines */
    linear-gradient(rgba(212, 175, 55, 0.018) 0.5px, transparent 0.5px),
    linear-gradient(90deg, rgba(212, 175, 55, 0.018) 0.5px, transparent 0.5px),
    /* Secondary offset grid for crosshatch */
    linear-gradient(rgba(212, 175, 55, 0.01) 0.3px, transparent 0.3px),
    linear-gradient(90deg, rgba(212, 175, 55, 0.01) 0.3px, transparent 0.3px),
    /* Diagonal crosshatch */
    linear-gradient(45deg, rgba(212, 175, 55, 0.008) 0.3px, transparent 0.3px),
    linear-gradient(-45deg, rgba(212, 175, 55, 0.008) 0.3px, transparent 0.3px),
    /* Finest overlay for fabric-like texture */
    linear-gradient(rgba(212, 175, 55, 0.006) 0.2px, transparent 0.2px),
    linear-gradient(90deg, rgba(212, 175, 55, 0.006) 0.2px, transparent 0.2px);
  background-size:
    24px 24px, 24px 24px,
    12px 12px, 12px 12px,
    48px 48px, 48px 48px,
    6px 6px, 6px 6px;
}
</style>
