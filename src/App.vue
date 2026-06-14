<script setup lang="ts">
import { ref, onMounted, onUnmounted, h, computed, watch } from 'vue'
import { 
  Settings as SettingsIcon, 
  Plus as PlusIcon, 
  Edit2 as EditIcon, 
  Trash2 as TrashIcon, 
  Link2 as LinkIcon, 
  ExternalLink as ExternalLinkIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Clock as ClockIcon,
  Cpu as CpuIcon,
  CloudRain as CloudRainIcon,
  MessageSquare as MessageSquareIcon,
  Globe as GlobeIcon,
  Bot as BotIcon,
  CheckSquare as CheckSquareIcon,
  FileText as FileTextIcon,
  Activity as ActivityIcon,
  FileCode as FileCodeIcon,
  Wrench as WrenchIcon,
  Hourglass as HourglassIcon,
  Sun as SunIcon,
  Cloud as CloudIcon,
  CloudSnow as CloudSnowIcon,
  CloudLightning as CloudLightningIcon,
  CloudFog as CloudFogIcon
} from '@lucide/vue'

import MangaButton from './components/MangaButton.vue'
import MangaModal from './components/MangaModal.vue'
import MangaLogo from './components/MangaLogo.vue'
import { availableWidgets } from './components/WidgetRegistry'
import { useNavData } from './composables/useNavData'
import { useCloudSync } from './composables/useCloudSync'
import { useCanvasAnimation } from './composables/useCanvasAnimation'
import { isLoggedIn } from './utils/api'
import { useI18n, t } from './i18n'

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

const iconMap: Record<string, any> = {
  Home: HomeIcon, Github: GithubIcon, Search: SearchIcon, Tv: TvIcon,
  Link: LinkIcon, Clock: ClockIcon, Cpu: CpuIcon, CloudRain: CloudRainIcon,
  MessageSquare: MessageSquareIcon, Globe: GlobeIcon, Bot: BotIcon,
  CheckSquare: CheckSquareIcon, FileText: FileTextIcon, Activity: ActivityIcon,
  FileCode: FileCodeIcon, Wrench: WrenchIcon, Hourglass: HourglassIcon,
  Sun: SunIcon, Cloud: CloudIcon, CloudSnow: CloudSnowIcon,
  CloudLightning: CloudLightningIcon, CloudFog: CloudFogIcon
}

const getIconComponent = (iconName: string) => iconMap[iconName] || LinkIcon

const colorOptions = [
  { label: 'BLACK', value: '#0a0a0a' },
  { label: 'DARK', value: '#1a1a1a' },
  { label: 'CHARCOAL', value: '#262626' },
  { label: 'DIM', value: '#111111' },
  { label: 'INK', value: '#0d0d0d' },
  { label: 'STONE', value: '#1f1f1f' }
]

const { 
  groups, items, config, loadFromStorage, setupPersistence, resetAll, 
  addItem, updateItem, deleteItem: deleteNavItem, addGroup, updateGroup,
  deleteGroup, exportData, importData 
} = useNavData()

const { locale, toggleLocale } = useI18n()
const showWidgetModal = ref(false)
const openedWidget = ref<any>(null)
const faviconErrors = ref<Record<string, boolean>>({})

function handleFaviconError(itemId: string) { faviconErrors.value[itemId] = true }

function hasChinese(text: string): boolean {
  return /[一-鿿㐀-䶿]/.test(text)
}

function getItemTitle(item: any): string {
  if (item.url && item.url.startsWith('#widget:')) {
    const widgetId = item.url.replace('#widget:', '')
    const translated = t('widget.' + widgetId)
    return translated.startsWith('widget.') ? item.title : translated
  }
  return item.title
}

function getWidgetModalTitle(widget: any): string {
  if (!widget) return ''
  const translated = t('widget.' + widget.id)
  if (translated && !translated.startsWith('widget.')) {
    return translated.replace(/[\[\]]/g, '').trim()
  }
  return widget.name
}

// Compute a lighter tint from a hex color (keeps same hue, raises lightness)
function lightenColor(hex: string, factor: number = 0.55): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const mix = (v: number) => Math.round(v + (255 - v) * factor)
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function getIconColor(bgHex: string): string {
  return lightenColor(bgHex, 0.55)
}

function getFaviconUrl(urlStr: string): string {
  if (!urlStr) return ''
  if (urlStr.startsWith('#widget:')) return ''
  try {
    const url = new URL(urlStr)
    return `https://www.google.com/s2/favicons?sz=128&domain=${url.hostname}`
  } catch {
    try {
      const url = new URL('https://' + urlStr)
      return `https://www.google.com/s2/favicons?sz=128&domain=${url.hostname}`
    } catch { return '' }
  }
}

const accentThemesList = [
  { id: 'orange', name: 'AMBER', color: '#FF5F1F', dim: 'rgba(255, 95, 31, 0.2)' },
  { id: 'green', name: 'GEEK', color: '#00FF66', dim: 'rgba(0, 255, 102, 0.2)' },
  { id: 'yellow', name: 'RETRO', color: '#FFB300', dim: 'rgba(255, 179, 0, 0.2)' },
  { id: 'blue', name: 'ICE', color: '#00E5FF', dim: 'rgba(0, 229, 255, 0.2)' },
  { id: 'purple', name: 'EVA', color: '#D500F9', dim: 'rgba(213, 0, 249, 0.2)' }
]

function applyAccentTheme(themeId: string) {
  const theme = accentThemesList.find(t => t.id === themeId) || accentThemesList[0]
  const root = document.documentElement
  root.style.setProperty('--color-accent', theme.color)
  root.style.setProperty('--color-accent-dim', theme.dim)
  root.style.setProperty('--color-line-accent', theme.color)
}

const filterQuery = ref('')
const filterInputRef = ref<HTMLInputElement | null>(null)

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault()
    filterInputRef.value?.focus()
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
    e.preventDefault()
    showStickyDrawer.value = !showStickyDrawer.value
  }
}

const activeGroupId = ref<string>('')
const showCategorySidebar = ref(false)
const currentPage = ref(0)
const pageSize = computed(() => (config.value.gridRows ?? 5) * 12)
const filteredItems = computed(() => {
  let list = !activeGroupId.value ? items.value : items.value.filter(i => i.groupId === activeGroupId.value)
  if (filterQuery.value.trim()) {
    const q = filterQuery.value.toLowerCase().trim()
    list = list.filter(i => 
      i.title.toLowerCase().includes(q) || 
      (i.description && i.description.toLowerCase().includes(q)) ||
      (i.url && i.url.toLowerCase().includes(q))
    )
  }
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)))
const paginatedItems = computed(() => filteredItems.value.slice(currentPage.value * pageSize.value, currentPage.value * pageSize.value + pageSize.value))

watch(activeGroupId, () => { currentPage.value = 0 })
watch(pageSize, () => { currentPage.value = 0 })
watch(filterQuery, () => { currentPage.value = 0 })

const dragItemId = ref<string | null>(null)
const dragOverItemId = ref<string | null>(null)
let pageSwitchTimer: number | null = null
let edgeSwitchTimer: number | null = null
let sidebarOpenTimer: number | null = null

function clearAllDragTimers() {
  if (pageSwitchTimer) { clearTimeout(pageSwitchTimer); pageSwitchTimer = null }
  if (edgeSwitchTimer) { clearTimeout(edgeSwitchTimer); edgeSwitchTimer = null }
  if (sidebarOpenTimer) { clearTimeout(sidebarOpenTimer); sidebarOpenTimer = null }
}

function handleItemDragStart(id: string, e: DragEvent) {
  dragItemId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    
    // Set custom drag image as the icon block only (like phone drag)
    const cardEl = e.currentTarget as HTMLElement
    if (cardEl) {
      const iconTile = cardEl.querySelector('.icon-tile') as HTMLElement
      if (iconTile) {
        const width = iconTile.offsetWidth || 64
        const height = iconTile.offsetHeight || 64
        e.dataTransfer.setDragImage(iconTile, width / 2, height / 2)
      }
    }
  }
}

function handleItemDragOver(targetId: string, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const sourceId = dragItemId.value
  if (sourceId && sourceId !== targetId) {
    const srcIdx = items.value.findIndex(i => i.id === sourceId)
    const tgtIdx = items.value.findIndex(i => i.id === targetId)
    if (srcIdx !== -1 && tgtIdx !== -1) {
      const [moved] = items.value.splice(srcIdx, 1)
      items.value.splice(tgtIdx, 0, moved)
    }
  }
  dragOverItemId.value = targetId
}

function handleItemDrop(targetId: string, e: DragEvent) {
  e.preventDefault()
  dragItemId.value = null; dragOverItemId.value = null; clearAllDragTimers()
}

function handleDragEnd() {
  dragItemId.value = null; dragOverItemId.value = null; clearAllDragTimers()
}

function moveDragItemToPage(targetPageIndex: number) {
  const sourceId = dragItemId.value
  if (!sourceId) return
  const srcIdx = items.value.findIndex(i => i.id === sourceId)
  if (srcIdx === -1) return
  const [moved] = items.value.splice(srcIdx, 1)
  const targetPageItems = filteredItems.value.slice(targetPageIndex * pageSize.value, (targetPageIndex + 1) * pageSize.value)
  let globalInsertIdx = items.value.length
  if (targetPageItems.length > 0) {
    const targetFirstItemId = targetPageItems[0].id
    globalInsertIdx = items.value.findIndex(i => i.id === targetFirstItemId)
  }
  if (globalInsertIdx !== -1) { items.value.splice(globalInsertIdx, 0, moved) }
  else { items.value.push(moved) }
  currentPage.value = targetPageIndex
}

function handlePageDragEnter(pageIndex: number) {
  if (pageSwitchTimer) clearTimeout(pageSwitchTimer)
  pageSwitchTimer = window.setTimeout(() => {
    if (dragItemId.value && currentPage.value !== pageIndex) moveDragItemToPage(pageIndex)
  }, 600)
}

function handlePageDragLeave() { if (pageSwitchTimer) { clearTimeout(pageSwitchTimer); pageSwitchTimer = null } }

function handleEdgeDragEnter(direction: 'prev' | 'next') {
  if (edgeSwitchTimer) clearTimeout(edgeSwitchTimer)
  edgeSwitchTimer = window.setTimeout(() => {
    if (!dragItemId.value) return
    if (direction === 'prev' && currentPage.value > 0) moveDragItemToPage(currentPage.value - 1)
    else if (direction === 'next' && currentPage.value < totalPages.value - 1) moveDragItemToPage(currentPage.value + 1)
  }, 800)
}

function handleEdgeDragLeave() { if (edgeSwitchTimer) { clearTimeout(edgeSwitchTimer); edgeSwitchTimer = null } }

function handleSidebarDragEnter() {
  if (sidebarOpenTimer) clearTimeout(sidebarOpenTimer)
  sidebarOpenTimer = window.setTimeout(() => { if (dragItemId.value) showCategorySidebar.value = true }, 500)
}

function handleSidebarDragLeave() { if (sidebarOpenTimer) { clearTimeout(sidebarOpenTimer); sidebarOpenTimer = null } }

function handleDropOnPage(pageIndex: number, e: DragEvent) {
  e.preventDefault()
  if (dragItemId.value) moveDragItemToPage(pageIndex)
  dragItemId.value = null; dragOverItemId.value = null; clearAllDragTimers()
}

function handleAddCategory() {
  const title = prompt(t('prompt.new_category'))
  if (title && title.trim()) addGroup(title.trim())
}

function handleRenameCategory(group: any) {
  const newTitle = prompt(t('prompt.rename_to'), group.title)
  if (newTitle && newTitle.trim()) updateGroup(group.id, newTitle.trim())
}

function handleDeleteCategory(groupId: string) {
  deleteGroup(groupId)
  if (activeGroupId.value === groupId) activeGroupId.value = ''
}

function handleDropOnCategory(groupId: string, e: DragEvent) {
  e.preventDefault()
  const itemId = dragItemId.value
  if (itemId) {
    const item = items.value.find(i => i.id === itemId)
    if (item) item.groupId = groupId
  }
  dragItemId.value = null; dragOverItemId.value = null; clearAllDragTimers()
}

function getWidgetModalWidth(widgetId: string): string {
  if (!widgetId) return 'max-w-md'
  if (widgetId === 'weight') return 'max-w-[90rem]'
  return 'max-w-5xl'
}

function isWidgetItem(item: any): boolean { return item.url && item.url.startsWith('#widget:') }
function getWidgetIdFromUrl(url: string): string { return url.replace('#widget:', '') }

function handleItemClick(item: any, e: MouseEvent) {
  if (isWidgetItem(item)) {
    e.preventDefault()
    const widgetId = getWidgetIdFromUrl(item.url)
    const widget = availableWidgets.find(w => w.id === widgetId)
    if (widget) { openedWidget.value = widget; showWidgetModal.value = true }
  }
}

function handleDeleteItem(item: any) {
  const isWidget = isWidgetItem(item)
  const confirmMsg = `${t('confirm.destroy_item')} "${getItemTitle(item)}" ?`
  if (confirm(confirmMsg)) {
    if (isWidget) { const widgetId = getWidgetIdFromUrl(item.url); config.value.widgets[widgetId] = false }
    else { deleteNavItem(item.id) }
  }
}

const { 
  isUserLoggedIn, loggedInUser, showAuthModal, authForm, authError, isSyncing,
  syncMessage, setupAuthListener, pullCloudData, pushCloudData, queueCloudPush,
  handleAuthSubmit, handleLogout 
} = useCloudSync(groups, items, config)

const bgCanvas = ref<HTMLCanvasElement | null>(null)
const { paperBgUrl, initCanvas, destroyCanvas } = useCanvasAnimation(bgCanvas)

const isAppLoading = ref(true)
const showSettings = ref(false)
const showItemModal = ref(false)
const editingItem = ref<any>(null)
const itemForm = ref({
  id: '', groupId: '', title: '', url: '', description: '',
  icon: 'Link', color: '#0a0a0a', size: 'normal' as 'normal' | 'wide' | 'tall' | 'large'
})
const importFileRef = ref<HTMLInputElement | null>(null)

function ensureGroup(): string {
  if (groups.value.length === 0) addGroup('NAV_ROOT')
  return groups.value[0]?.id || 'g1'
}

const openAddItem = (groupId?: string) => {
  if (!groupId) groupId = ensureGroup()
  editingItem.value = null
  itemForm.value = { id: '', groupId, title: '', url: '', description: '', icon: 'Link', color: '#0a0a0a', size: 'normal' }
  showItemModal.value = true
}

const openEditItem = (item: any) => {
  editingItem.value = item
  itemForm.value = { ...item, size: item.size || 'normal' }
  showItemModal.value = true
}

const saveItem = () => {
  if (!itemForm.value.title || !itemForm.value.url) return
  if (editingItem.value) updateItem(editingItem.value.id, { ...itemForm.value } as any)
  else addItem({ ...itemForm.value } as any)
  showItemModal.value = false
}

function triggerImportClick() { importFileRef.value?.click() }

async function handleImport(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try { await importData(file); alert('[OK] ' + t('alert.import_complete')); location.reload() }
  catch (err: any) { alert('[ERROR] ' + t('alert.parse_fail') + ': ' + (err.message || '')) }
  finally { target.value = '' }
}

// ── AI 机器人可爱动态表情 (0=开心, 1=思考, 2=惊讶, 3=眯眼, 4=害羞) ──
const aiExpressionIndex = ref(0)
const AI_EXPRESSION_COUNT = 5
let expressionIntervalId: any = null

function startExpressionCycle() {
  expressionIntervalId = setInterval(() => {
    aiExpressionIndex.value = Math.floor(Math.random() * AI_EXPRESSION_COUNT)
  }, 2800)
}

// ── 天气小组件动态图标绑定 ──
const weatherCondition = ref('clear')

function updateWeatherIconFromCache() {
  const cached = sessionStorage.getItem('manga_weather_cache')
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed.condition) {
        const condKey = parsed.condition
        if (condKey.includes('rain') || condKey.includes('drizzle') || condKey.includes('showers')) {
          weatherCondition.value = 'rain'
        } else if (condKey.includes('cloudy') || condKey.includes('overcast')) {
          weatherCondition.value = 'cloud'
        } else if (condKey.includes('snow')) {
          weatherCondition.value = 'snow'
        } else if (condKey.includes('storm') || condKey.includes('thunderstorm')) {
          weatherCondition.value = 'storm'
        } else if (condKey.includes('fog')) {
          weatherCondition.value = 'fog'
        } else {
          weatherCondition.value = 'clear'
        }
        return
      }
    } catch {}
  }
  weatherCondition.value = 'clear'
}

function getWeatherIconComponent() {
  switch (weatherCondition.value) {
    case 'rain': return CloudRainIcon
    case 'cloud': return CloudIcon
    case 'snow': return CloudSnowIcon
    case 'storm': return CloudLightningIcon
    case 'fog': return CloudFogIcon
    default: return SunIcon
  }
}

function getWeatherIconClass() {
  switch (weatherCondition.value) {
    case 'clear': return 'animate-[spin_16s_linear_infinite] text-amber-500' // slow spinning sun
    case 'rain': return 'animate-[bounce_2s_infinite] text-sky-400' // bouncing rain cloud
    case 'storm': return 'animate-pulse text-yellow-300' // flashing lightning storm
    case 'cloud': return 'animate-[pulse_4.5s_infinite] text-neutral-400' // gently floating cloud
    case 'snow': return 'animate-[bounce_3s_infinite] text-blue-200' // slow drifting snow
    default: return ''
  }
}

// ── 自动箴言弹窗 (Inactivity Idle Prompt) ──
const showIdleMotto = ref(false)
const idleMottoStep = ref<'thinking' | 'bubble'>('thinking')
const idleQuote = ref('心之所向，素履以往。')
const idleAuthor = ref('佚名')
const idleSource = ref('')

const isHitokotoRendered = computed(() => {
  return paginatedItems.value.some(item => isWidgetItem(item) && getWidgetIdFromUrl(item.url) === 'hitokoto')
})

let idleTimeoutId: any = null
let cycleTimeoutId: any = null
const IDLE_TIME_THRESHOLD = 30000 // 30秒无操作触发

function resetIdleTimer() {
  if (idleTimeoutId) clearTimeout(idleTimeoutId)
  if (showIdleMotto.value) {
    showIdleMotto.value = false
    if (cycleTimeoutId) {
      clearTimeout(cycleTimeoutId)
      cycleTimeoutId = null
    }
  }
  idleTimeoutId = setTimeout(triggerIdleMotto, IDLE_TIME_THRESHOLD)
}

async function triggerIdleMotto() {
  showIdleMotto.value = true
  await loadNextMottoCycle()
}

async function loadNextMottoCycle() {
  if (!showIdleMotto.value) return
  idleMottoStep.value = 'thinking'
  
  const fetchPromise = fetchIdleQuote()
  const delayPromise = new Promise(resolve => setTimeout(resolve, 1500))
  
  await Promise.all([fetchPromise, delayPromise])
  if (!showIdleMotto.value) return
  
  idleMottoStep.value = 'bubble'
  
  // 10秒后自动过渡并拉取下一句
  if (cycleTimeoutId) clearTimeout(cycleTimeoutId)
  cycleTimeoutId = setTimeout(loadNextMottoCycle, 10000)
}

async function fetchIdleQuote() {
  const cats = ['i', 'k', 'd', 'h', 'a', 'e']
  const cat = cats[Math.floor(Math.random() * cats.length)]
  try {
    const res = await fetch(`https://v1.hitokoto.cn/?c=${cat}`)
    const data = await res.json()
    if (data && data.hitokoto) {
      idleQuote.value = data.hitokoto
      idleAuthor.value = data.from_who || '佚名'
      idleSource.value = data.from || ''
    }
  } catch {
    idleQuote.value = '山有木兮木有枝，心悦君兮君不知。'
    idleAuthor.value = '佚名'
    idleSource.value = '越人歌'
  }
}

function closeIdleMotto() {
  showIdleMotto.value = false
  if (cycleTimeoutId) {
    clearTimeout(cycleTimeoutId)
    cycleTimeoutId = null
  }
  resetIdleTimer()
}

function copyIdleQuote() {
  const fullText = `"${idleQuote.value}"\n—— ${idleAuthor.value} · 《${idleSource.value.replace(/^《|》$/g, '')}》`
  navigator.clipboard.writeText(fullText)
}

const currentSystemTime = ref(new Date().toISOString().replace('T',' ').slice(0,19))
let systemTimeInterval: any = null

function updateSystemTime() {
  currentSystemTime.value = new Date().toISOString().replace('T',' ').slice(0,19)
}

const activeWidgetsCount = computed(() => {
  if (!config.value || !config.value.widgets) return 0
  return Object.values(config.value.widgets).filter(Boolean).length
})



onMounted(async () => {
  loadFromStorage(); setupPersistence(); setupAuthListener()
  stickyJot.value = localStorage.getItem('manga_sticky_jot') || ''
  window.addEventListener('artisan-request-cloud-push', queueCloudPush)
  window.addEventListener('manga-widgets-layout-updated', loadFromStorage)
  
  // 注册无操作监听器
  window.addEventListener('mousemove', resetIdleTimer)
  window.addEventListener('keydown', resetIdleTimer)
  window.addEventListener('click', resetIdleTimer)
  window.addEventListener('scroll', resetIdleTimer)
  window.addEventListener('touchstart', resetIdleTimer)
  resetIdleTimer()

  // 注册机器人表情和天气监听器
  startExpressionCycle()
  window.addEventListener('manga-weather-updated', updateWeatherIconFromCache)
  updateWeatherIconFromCache()
  
  // Apply initial accent theme
  applyAccentTheme(config.value.accentColor || 'orange')
  
  // Watch accentColor and apply it dynamically
  watch(() => config.value.accentColor, (newVal) => {
    applyAccentTheme(newVal || 'orange')
  }, { immediate: true })

  if (isLoggedIn()) await pullCloudData(true)
  isAppLoading.value = false; initCanvas()
  systemTimeInterval = setInterval(updateSystemTime, 1000)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('manga-close-widget-modal', handleCloseWidgetModal)
})

const handleCloseWidgetModal = () => {
  showWidgetModal.value = false
}

onUnmounted(() => {
  window.removeEventListener('manga-close-widget-modal', handleCloseWidgetModal)
  destroyCanvas()
  if (systemTimeInterval) clearInterval(systemTimeInterval)
  window.removeEventListener('artisan-request-cloud-push', queueCloudPush)
  window.removeEventListener('manga-widgets-layout-updated', loadFromStorage)
  
  // 注销无操作监听器
  window.removeEventListener('mousemove', resetIdleTimer)
  window.removeEventListener('keydown', resetIdleTimer)
  window.removeEventListener('click', resetIdleTimer)
  window.removeEventListener('scroll', resetIdleTimer)
  window.removeEventListener('touchstart', resetIdleTimer)
  if (idleTimeoutId) clearTimeout(idleTimeoutId)
  if (cycleTimeoutId) clearTimeout(cycleTimeoutId)

  // 清除表情和天气定时器及监听
  if (expressionIntervalId) clearInterval(expressionIntervalId)
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
  window.removeEventListener('manga-weather-updated', updateWeatherIconFromCache)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousemove', handleResizeMove)
  window.removeEventListener('mouseup', handleResizeEnd)
  document.body.classList.remove('is-resizing')
})

// ── 右侧侧边滑出抽屉逻辑 ──
const showStickyDrawer = ref(false)
const stickyJot = ref('')
const drawerSnippets = ref<any[]>([])
const copiedSnippetId = ref<string | null>(null)

function loadDrawerSnippets() {
  const stored = localStorage.getItem('manga_widget_snippets')
  if (stored) {
    try {
      drawerSnippets.value = JSON.parse(stored)
    } catch {
      drawerSnippets.value = []
    }
  } else {
    drawerSnippets.value = [
      { id: 's1', title: 'Git Commit All', content: 'git add . && git commit -m "update" && git push', category: 'DEV', color: '#0A0A0A' },
      { id: 's2', title: 'Weekly Report', content: '[PROGRESS]\n1. \n2. \n[NEXT_WEEK]\n1. \n2. \n[NEEDS]\nNone', category: 'WORK', color: '#111111' },
      { id: 's3', title: 'Get Local IP', content: 'curl ipinfo.io', category: 'DEV', color: '#1A1A1A' },
      { id: 's4', title: 'Daily Check-in', content: 'Check-in complete. All systems nominal.', category: 'GENERAL', color: '#1F1F1F' }
    ]
  }
}

function copySnippet(content: string, id: string) {
  navigator.clipboard.writeText(content)
  copiedSnippetId.value = id
  setTimeout(() => {
    if (copiedSnippetId.value === id) {
      copiedSnippetId.value = null
    }
  }, 1500)
}

watch(showStickyDrawer, (newVal) => {
  if (newVal) {
    loadDrawerSnippets()
  }
})

watch(stickyJot, (newVal) => {
  localStorage.setItem('manga_sticky_jot', newVal)
})

// ── 命令行控制中心逻辑 ──
const commandFeedback = ref('')
const commandFeedbackType = ref<'success' | 'error'>('success')
let feedbackTimeout: any = null

function showFeedback(text: string, type: 'success' | 'error' = 'success') {
  commandFeedback.value = text
  commandFeedbackType.value = type
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
  feedbackTimeout = setTimeout(() => {
    commandFeedback.value = ''
  }, 3000)
}

function handleCommandSubmit() {
  const query = filterQuery.value.trim()
  if (!query.startsWith('/')) {
    return // Not a command, do normal filter
  }

  // Parse command
  const spaceIndex = query.indexOf(' ')
  const cmd = spaceIndex === -1 ? query : query.slice(0, spaceIndex)
  const arg = spaceIndex === -1 ? '' : query.slice(spaceIndex + 1).trim()

  const commandName = cmd.slice(1).toLowerCase() // remove leading slash

  if (commandName === 'todo') {
    if (!arg) {
      showFeedback('ERROR: TODO CONTENT REQUIRED', 'error')
      return
    }
    // Add todo
    let currentTodos: any[] = []
    const stored = localStorage.getItem('manga_widget_todos')
    if (stored) {
      try {
        currentTodos = JSON.parse(stored)
      } catch {
        currentTodos = []
      }
    }
    const newTodo = {
      id: 't' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      text: arg,
      completed: false,
      category: 'inbox'
    }
    currentTodos.push(newTodo)
    localStorage.setItem('manga_widget_todos', JSON.stringify(currentTodos))
    window.dispatchEvent(new CustomEvent('manga-todo-updated'))
    
    // Auto-enable todo widget if disabled so they see it
    config.value.widgets.todo = true
    
    showFeedback(`[SUCCESS]: TODO_ADDED: "${arg.slice(0, 15)}${arg.length > 15 ? '...' : ''}"`)
    filterQuery.value = ''
  } 
  else if (commandName === 'pomo') {
    const mins = parseInt(arg, 10)
    const finalMins = isNaN(mins) ? 25 : mins
    config.value.widgets.clock = true // ensure clock is visible
    window.dispatchEvent(new CustomEvent('manga-trigger-pomo', { detail: { minutes: finalMins } }))
    showFeedback(`[SUCCESS]: POMO_STARTED: ${finalMins} MINS`)
    filterQuery.value = ''
  } 
  else if (commandName === 'chat') {
    // Open AI chat modal
    config.value.widgets.aichat = true // ensure AI chat is enabled
    const widget = availableWidgets.find(w => w.id === 'aichat')
    if (widget) {
      openedWidget.value = widget
      showWidgetModal.value = true
    }
    if (arg) {
      // Small delay to let modal mount and listen
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('manga-trigger-aichat', { detail: { prompt: arg } }))
      }, 300)
    }
    showFeedback(`[SUCCESS]: AI_CHAT_TRIGGERED`)
    filterQuery.value = ''
  } 
  else if (commandName === 'theme') {
    const themeName = arg.toLowerCase().trim()
    const validThemes = ['orange', 'green', 'yellow', 'blue', 'purple']
    if (validThemes.includes(themeName)) {
      config.value.accentColor = themeName
      showFeedback(`[SUCCESS]: ACCENT_THEME_UPDATED: ${themeName.toUpperCase()}`)
      filterQuery.value = ''
    } else {
      showFeedback(`ERROR: INVALID_THEME. USE: ORANGE | GREEN | YELLOW | BLUE | PURPLE`, 'error')
    }
  } 
  else {
    showFeedback(`ERROR: UNKNOWN_COMMAND: /${commandName}`, 'error')
  }
}

// ── 磁贴自由拉伸缩放逻辑 ──
const activeResizingItem = ref<any>(null)
let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let cellUnitWidth = 100
let cellUnitHeight = 110
let resizingCardEl: HTMLElement | null = null
let startSize: 'normal' | 'wide' | 'tall' | 'large' = 'normal'

function startResizeItem(item: any, e: MouseEvent) {
  activeResizingItem.value = item
  startX = e.clientX
  startY = e.clientY
  startSize = item.size || 'normal'
  
  // 查找当前卡片 DOM 节点
  const handleEl = e.currentTarget as HTMLElement
  resizingCardEl = handleEl.closest('.group\\/card') as HTMLElement
  if (resizingCardEl) {
    startWidth = resizingCardEl.offsetWidth
    startHeight = resizingCardEl.offsetHeight
    
    // 动态计算网格单格基本宽度和高度，规避不同分辨率导致的固定像素误差
    const gap = 1
    cellUnitWidth = startWidth
    cellUnitHeight = startHeight
    if (startSize === 'wide') {
      cellUnitWidth = (startWidth - gap) / 2
    } else if (startSize === 'tall') {
      cellUnitHeight = (startHeight - gap) / 2
    } else if (startSize === 'large') {
      cellUnitWidth = (startWidth - gap) / 2
      cellUnitHeight = (startHeight - gap) / 2
    }
  }
  
  document.body.classList.add('is-resizing')
  window.addEventListener('mousemove', handleResizeMove)
  window.addEventListener('mouseup', handleResizeEnd)
}

function handleResizeMove(e: MouseEvent) {
  if (!activeResizingItem.value || !resizingCardEl) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  
  // 限制卡片最小尺寸，防止缩没
  const currentWidth = Math.max(80, startWidth + dx)
  const currentHeight = Math.max(80, startHeight + dy)
  
  // 实时设置 inline style，保证拖动时卡片是平滑、线性变大的
  resizingCardEl.style.width = currentWidth + 'px'
  resizingCardEl.style.height = currentHeight + 'px'
  resizingCardEl.style.zIndex = '50'
  resizingCardEl.style.position = 'relative'
  
  // 计算当前尺寸应吸附的列数和行数 (超过单格的1.4倍则判定进入下一档)
  const cols = currentWidth > cellUnitWidth * 1.4 ? 2 : 1
  const rows = currentHeight > cellUnitHeight * 1.4 ? 2 : 1
  
  let newSize: 'normal' | 'wide' | 'tall' | 'large' = 'normal'
  if (cols === 2 && rows === 2) newSize = 'large'
  else if (cols === 2 && rows === 1) newSize = 'wide'
  else if (cols === 1 && rows === 2) newSize = 'tall'
  else newSize = 'normal'
  
  if (activeResizingItem.value.size !== newSize) {
    activeResizingItem.value.size = newSize
    updateItem(activeResizingItem.value.id, { ...activeResizingItem.value, size: newSize })
  }
}

function handleResizeEnd() {
  if (resizingCardEl) {
    resizingCardEl.style.width = ''
    resizingCardEl.style.height = ''
    resizingCardEl.style.zIndex = ''
    resizingCardEl.style.position = ''
    resizingCardEl = null
  }
  
  activeResizingItem.value = null
  document.body.classList.remove('is-resizing')
  window.removeEventListener('mousemove', handleResizeMove)
  window.removeEventListener('mouseup', handleResizeEnd)
}
</script>

<template>
  <div class="min-h-screen text-neutral-300 pb-16 relative overflow-x-hidden bg-base scanlines">

    <!-- Loading Screen -->
    <div v-if="isAppLoading" class="fixed inset-0 z-[9999] bg-base flex flex-col items-center justify-center">
      <div class="border border-accent bg-base px-8 py-6 flex flex-col items-center gap-4" style="min-width:320px">
        <div class="text-[10px] text-neutral-600 tracking-widest mb-1">{{ $t('system.boot') }}</div>
        <MangaLogo class="w-10 h-10 text-accent animate-pulse" />
        <h1 class="text-xl font-bold tracking-[0.25em] text-accent select-none uppercase mt-1">
          {{ config.logoText || 'NEXUS' }}
        </h1>
        <div class="w-full border-t border-line"></div>
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 bg-accent cursor-blink-accent"></span>
          <p class="text-[11px] text-accent tracking-[0.2em]">{{ $t('system.initializing') }}</p>
        </div>
        <div class="text-[9px] text-neutral-700 tracking-widest">PLEASE_WAIT &gt;&gt;</div>
      </div>
    </div>

    <!-- Canvas -->
    <canvas ref="bgCanvas" class="fixed inset-0 pointer-events-none z-0 opacity-10"></canvas>

    <!-- Header -->
    <header class="border-b border-line relative z-20 bg-surface">
      <!-- Top strip -->
      <div class="border-b border-line px-4 py-1 flex items-center gap-3">
        <span class="text-[9px] text-accent tracking-widest font-mono select-none">
          &gt; NEXUS://SYS  GROUPS: [{{ groups.length }}] | LINKS: [{{ items.length }}] | WIDGETS: [{{ activeWidgetsCount }}/15]
        </span>
        <div class="ml-auto flex items-center gap-3">
          <!-- Theme Quick Selector -->
          <div class="flex items-center gap-1 bg-base border border-line px-1.5 py-0.5 select-none">
            <span class="text-[8px] text-neutral-500 font-mono tracking-widest mr-1 hidden sm:inline">THEME:</span>
            <button 
              v-for="color in ['orange', 'green', 'yellow', 'blue', 'purple']" 
              :key="color"
              @click="config.accentColor = color"
              class="w-2 h-2 border border-neutral-700 cursor-pointer transition-transform hover:scale-110"
              :style="{
                backgroundColor: color === 'orange' ? '#ff5f1f' : color === 'green' ? '#00ff66' : color === 'yellow' ? '#ffff00' : color === 'blue' ? '#00e5ff' : '#bd00ff'
              }"
              :class="{
                'border-neutral-200 scale-110': config.accentColor === color
              }"
              :title="color.toUpperCase()"
            ></button>
          </div>
          <!-- Language Selector inside top strip -->
          <button
            @click="toggleLocale"
            class="border border-line bg-base text-neutral-500 hover:text-accent px-1.5 py-0.5 text-[8px] font-bold tracking-widest cursor-pointer font-mono uppercase transition-colors"
            title="LANG"
          >
            LANG: {{ locale === 'zh' ? 'ZH' : 'EN' }}
          </button>
          <!-- Colored Status Squares -->
          <div class="flex gap-1">
            <span class="w-1.5 h-1.5 bg-neutral-600 inline-block"></span>
            <span class="w-1.5 h-1.5 bg-accent inline-block"></span>
            <span class="w-1.5 h-1.5 bg-white inline-block"></span>
          </div>
        </div>
      </div>
      <!-- Main header row -->
      <div class="max-w-[90rem] mx-auto px-4 py-2 flex flex-row items-center gap-3">
        <!-- Logo & Brand Name -->
        <div class="flex items-center gap-2 select-none flex-shrink-0">
          <MangaLogo class="w-5 h-5 text-accent" />
          <span class="text-sm font-black tracking-widest text-neutral-200 uppercase hover:text-accent transition-colors">
            {{ config.logoText || 'NEXUS' }}
          </span>
        </div>
        <span class="text-line text-sm hidden sm:inline">/</span>
        <component
          v-if="config.widgets.clock"
          :is="availableWidgets.find(w => w.id === 'clock')?.component"
          :compact="true"
          class="flex-shrink-0"
        />
        <!-- Global Fuzzy Search Filter -->
        <div class="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-4 relative hidden sm:block select-none">
          <div class="flex items-center border border-line bg-base px-2 py-1">
            <span class="text-neutral-500 font-mono text-[9px] mr-1.5 select-none">&gt;</span>
            <input 
              ref="filterInputRef"
              v-model="filterQuery"
              type="text"
              placeholder="快速过滤... (Ctrl+/)"
              @keydown.enter="handleCommandSubmit"
              class="bg-transparent border-none outline-none text-neutral-200 font-mono text-[10px] w-full placeholder-neutral-600"
            />
            <button 
              v-if="filterQuery" 
              @click="filterQuery = ''"
              class="text-[8px] text-neutral-600 hover:text-accent font-bold cursor-pointer font-mono select-none ml-1.5"
            >
              ESC
            </button>
          </div>
          <!-- Command Feedback Toast -->
          <Transition name="fade">
            <div 
              v-if="commandFeedback" 
              class="absolute top-full left-0 right-0 mt-1 border border-accent bg-base px-2 py-1 text-[9px] font-mono select-none z-[9999]"
              :class="commandFeedbackType === 'success' ? 'text-accent shadow-[2px_2px_0px_var(--color-accent)]' : 'text-rose-500 shadow-[2px_2px_0px_#f43f5e]'"
            >
              {{ commandFeedback }}
            </div>
          </Transition>
        </div>
        <div class="flex-1 min-w-0 sm:hidden"></div>
        <!-- Widgets Quick Switch Toggle bar -->
        <div class="hidden lg:flex items-center gap-1 border border-line bg-base px-2 py-0.5 select-none mr-1">
          <span class="text-[8px] text-neutral-500 font-mono tracking-widest mr-1">WIDGETS:</span>
          <button 
            @click="config.widgets.clock = !config.widgets.clock"
            class="p-0.5 border border-transparent hover:border-line cursor-pointer flex items-center justify-center transition-colors"
            :class="config.widgets.clock ? 'text-accent' : 'text-neutral-600'"
            title="Clock / 时钟"
          >
            <ClockIcon class="w-3.5 h-3.5" />
          </button>
          <button 
            @click="config.widgets.weather = !config.widgets.weather"
            class="p-0.5 border border-transparent hover:border-line cursor-pointer flex items-center justify-center transition-colors"
            :class="config.widgets.weather ? 'text-accent' : 'text-neutral-600'"
            title="Weather / 天气"
          >
            <CloudRainIcon class="w-3.5 h-3.5" />
          </button>
          <button 
            @click="config.widgets.todo = !config.widgets.todo"
            class="p-0.5 border border-transparent hover:border-line cursor-pointer flex items-center justify-center transition-colors"
            :class="config.widgets.todo ? 'text-accent' : 'text-neutral-600'"
            title="Todo / 待办"
          >
            <CheckSquareIcon class="w-3.5 h-3.5" />
          </button>
          <button 
            @click="config.widgets.notes = !config.widgets.notes"
            class="p-0.5 border border-transparent hover:border-line cursor-pointer flex items-center justify-center transition-colors"
            :class="config.widgets.notes ? 'text-accent' : 'text-neutral-600'"
            title="Notes / 便签"
          >
            <FileTextIcon class="w-3.5 h-3.5" />
          </button>
          <button 
            @click="config.widgets.aichat = !config.widgets.aichat"
            class="p-0.5 border border-transparent hover:border-line cursor-pointer flex items-center justify-center transition-colors"
            :class="config.widgets.aichat ? 'text-accent' : 'text-neutral-600'"
            title="AI Chat / 智脑"
          >
            <BotIcon class="w-3.5 h-3.5" />
          </button>
        </div>
        <!-- Cloud Sync Button -->
        <button
          @click="showAuthModal = true"
          class="border border-line bg-btn-base text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 px-3 py-1.5 text-[10px] font-bold tracking-widest cursor-pointer transition-none flex items-center gap-1.5 glitch-on-click flex-shrink-0"
          :title="isUserLoggedIn ? $t('sync.connected') + ' — ' + loggedInUser : $t('sync.offline')"
        >
          <span class="w-1.5 h-1.5 inline-block" :class="isUserLoggedIn ? 'bg-white' : 'bg-neutral-700'"></span>
          <span>{{ isUserLoggedIn ? loggedInUser.toUpperCase() : $t('sync') }}</span>
        </button>
        <!-- Drawer Button -->
        <button
          @click="showStickyDrawer = !showStickyDrawer"
          class="border border-line bg-btn-base text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 w-8 h-8 flex items-center justify-center cursor-pointer transition-none glitch-on-click flex-shrink-0"
          :class="{ 'border-accent text-accent bg-accent/5': showStickyDrawer }"
          :title="locale === 'zh' ? '便签与剪贴抽屉 (Ctrl+I)' : 'Notes & Snippets Drawer (Ctrl+I)'"
        >
          <FileTextIcon class="w-4 h-4" />
        </button>
        <!-- Settings Button -->
        <button
          @click="showSettings = true"
          class="border border-line bg-btn-base text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 w-8 h-8 flex items-center justify-center cursor-pointer transition-none glitch-on-click flex-shrink-0"
          :title="$t('settings')"
        >
          <SettingsIcon class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Search Section -->
    <section v-if="config.widgets.search" class="max-w-[90rem] mx-auto px-4 mt-4 flex justify-center">
      <component :is="availableWidgets.find(w => w.id === 'search')?.component" />
    </section>

    <!-- Main Navigation -->
    <main class="max-w-[90rem] mx-auto px-4 mt-4 flex flex-col gap-0">

      <!-- Empty State -->
      <div v-if="items.length === 0" class="text-center py-12 border border-dashed border-line p-6">
        <p class="text-sm mb-4 text-neutral-400">{{ $t('empty.grid') }}</p>
        <MangaButton @click="openAddItem(groups[0]?.id || 'g1')">
          <PlusIcon class="w-4 h-4" /> {{ $t('countdown.add') }}
        </MangaButton>
      </div>

      <!-- Sidebar Backdrop -->
      <Transition name="fade">
        <div v-if="showCategorySidebar" @click="showCategorySidebar = false" class="fixed inset-0 bg-black/70 z-[85]"></div>
      </Transition>

      <!-- Left Sidebar Drawer -->
      <Transition name="slide-drawer">
        <aside
          v-if="showCategorySidebar"
          class="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-surface border-r border-accent p-5 z-[90] flex flex-col gap-4 select-none"
        >
          <div class="flex items-center justify-between border-b border-line pb-3">
            <span class="text-xs uppercase tracking-widest text-accent font-bold">
              <template v-if="hasChinese($t('hitokoto.categories'))">
                <span class="text-neutral-600 font-normal mr-1">[</span>
                {{ $t('hitokoto.categories') }}
                <span class="text-neutral-600 font-normal ml-1">]</span>
              </template>
              <template v-else>
                {{ $t('hitokoto.categories') }}
              </template>
            </span>
            <div class="flex items-center gap-3">
              <button @click="handleAddCategory" class="text-[10px] text-accent hover:text-white transition-none cursor-pointer bg-transparent border-0 outline-none font-bold">
                <template v-if="hasChinese($t('add.category'))">
                  <span class="text-neutral-600 font-normal mr-0.5">[</span>
                  {{ $t('add.category') }}
                  <span class="text-neutral-600 font-normal ml-0.5">]</span>
                </template>
                <template v-else>
                  {{ $t('add.category') }}
                </template>
              </button>
              <button @click="showCategorySidebar = false" class="text-sm text-neutral-400 hover:text-white transition-none cursor-pointer bg-transparent border-0 outline-none font-bold">✕</button>
            </div>
          </div>

          <div class="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 select-none">
            <div
              @click="activeGroupId = ''"
              @dragover.prevent
              @drop="handleDropOnCategory('', $event)"
              class="flex items-center justify-between px-3 py-2.5 border text-xs cursor-pointer transition-none shrink-0 w-full"
              :class="[activeGroupId === '' ? 'bg-accent/10 border-accent text-accent' : 'border-line text-neutral-400 hover:bg-surface hover:text-neutral-200']"
            >
              <span class="truncate uppercase tracking-widest">
                <template v-if="hasChinese($t('all'))">
                  <span class="text-neutral-600 font-normal mr-1">[</span>
                  {{ $t('all') }}
                  <span class="text-neutral-600 font-normal ml-1">]</span>
                </template>
                <template v-else>
                  {{ $t('all') }}
                </template>
              </span>
              <span class="text-[10px] opacity-75">({{ items.length }})</span>
            </div>

            <div
              v-for="g in groups" :key="g.id"
              @click="activeGroupId = g.id"
              @dragover.prevent
              @drop="handleDropOnCategory(g.id, $event)"
              class="flex items-center justify-between px-3 py-2.5 border text-xs cursor-pointer transition-none shrink-0 w-full group/tab relative"
              :class="[activeGroupId === g.id ? 'bg-accent/10 border-accent text-accent' : 'border-line text-neutral-400 hover:bg-surface hover:text-neutral-200']"
            >
              <span class="truncate pr-4 uppercase tracking-wider">
                <template v-if="hasChinese(g.title)">
                  <span class="text-neutral-600 font-normal mr-1">[</span>
                  {{ g.title }}
                  <span class="text-neutral-600 font-normal ml-1">]</span>
                </template>
                <template v-else>
                  {{ g.title }}
                </template>
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] opacity-75">({{ items.filter(i => i.groupId === g.id).length }})</span>
                <div class="hidden group-hover/tab:flex items-center gap-1.5 ml-1">
                    <button @click.stop="handleRenameCategory(g)" class="text-[10px] text-neutral-500 hover:text-white transition-none bg-transparent border-0 outline-none" title="RENAME">✎</button>
                  <button @click.stop="handleDeleteCategory(g.id)" class="text-[11px] text-neutral-500 hover:text-white transition-none bg-transparent border-0 outline-none font-bold" title="[ DESTROY ]">×</button>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-line pt-3">
            <p class="text-[9px] text-neutral-500 leading-relaxed">{{ $t('drag.hint') }}</p>
          </div>
        </aside>
      </Transition>

      <!-- Right Side Helper Drawer Backdrop -->
      <Transition name="fade">
        <div v-if="showStickyDrawer" @click="showStickyDrawer = false" class="fixed inset-0 bg-black/70 z-[85]"></div>
      </Transition>

      <!-- Right Side Helper Drawer -->
      <Transition name="slide-right-drawer">
        <aside
          v-if="showStickyDrawer"
          class="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-surface border-l border-accent p-5 z-[90] flex flex-col gap-5 select-none"
        >
          <!-- Title & Close button -->
          <div class="flex items-center justify-between border-b border-line pb-3">
            <span class="text-xs uppercase tracking-widest text-accent font-bold">
              // HELPER_DRAWER
            </span>
            <button @click="showStickyDrawer = false" class="text-sm text-neutral-400 hover:text-white transition-none cursor-pointer bg-transparent border-0 outline-none font-bold">✕</button>
          </div>

          <!-- Jotting Pad -->
          <div class="flex flex-col gap-2 flex-1 min-h-0">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-neutral-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
                <FileTextIcon class="w-3.5 h-3.5" />
                {{ locale === 'zh' ? '灵感速记' : 'JOTTINGS' }}
              </span>
              <span class="text-[8px] text-neutral-600 font-mono">AUTOSAVE</span>
            </div>
            <textarea
              v-model="stickyJot"
              placeholder="Start typing your quick thoughts here... (Syncs instantly)"
              class="flex-1 w-full bg-base border border-line p-3 text-neutral-300 font-mono text-[11px] outline-none focus:border-accent resize-none placeholder-neutral-700"
            ></textarea>
          </div>

          <!-- Code Snippets -->
          <div class="flex flex-col gap-2 flex-1 min-h-0">
            <div class="flex items-center justify-between border-t border-line pt-3">
              <span class="text-[10px] text-neutral-500 font-mono tracking-widest uppercase flex items-center gap-1.5">
                <FileCodeIcon class="w-3.5 h-3.5" />
                {{ locale === 'zh' ? '代码剪贴' : 'SNIPPETS' }}
              </span>
            </div>
            <div class="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              <div v-if="drawerSnippets.length === 0" class="text-center py-6 border border-dashed border-line text-neutral-600 text-[10px] uppercase font-mono">
                No snippets found
              </div>
              <div
                v-for="snip in drawerSnippets"
                :key="snip.id"
                class="border border-line bg-base p-2.5 flex flex-col gap-1.5"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-neutral-300 tracking-wider truncate mr-2">{{ snip.title }}</span>
                  <span v-if="snip.category" class="text-[8px] border border-neutral-800 text-neutral-600 px-1 font-mono uppercase">{{ snip.category }}</span>
                </div>
                <pre class="bg-surface border border-neutral-900 p-1.5 text-[9px] font-mono text-neutral-400 overflow-x-auto break-all select-text leading-relaxed whitespace-pre-wrap max-h-20">{{ snip.content }}</pre>
                <button
                  @click="copySnippet(snip.content, snip.id)"
                  class="w-full text-center border border-line hover:border-accent hover:text-accent bg-surface hover:bg-accent/5 text-[9px] font-mono py-1 cursor-pointer transition-colors"
                >
                  {{ copiedSnippetId === snip.id ? '[ COPIED_SUCCESS ]' : '[ COPY_TO_CLIPBOARD ]' }}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </Transition>

      <!-- Main Content -->
      <div v-if="items.length > 0" class="flex flex-col gap-4 w-full">
        <!-- Top bar -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <button
              @click="showCategorySidebar = true"
              @dragenter="handleSidebarDragEnter"
              @dragleave="handleSidebarDragLeave"
              @dragover.prevent
              class="text-xs bg-surface hover:bg-neutral-300 hover:text-accent border border-line hover:border-neutral-300 text-neutral-400 px-3 py-1.5 cursor-pointer transition-none flex items-center gap-1.5 font-bold uppercase tracking-widest"
            >
              <span>
                <template v-if="hasChinese($t('hitokoto.categories'))">
                  <span class="text-neutral-600 font-normal mr-1">[</span>
                  {{ $t('hitokoto.categories') }}
                  <span class="text-neutral-600 font-normal ml-1">]</span>
                </template>
                <template v-else>
                  {{ $t('hitokoto.categories') }}
                </template>
              </span>
              <span class="text-[10px] opacity-75 font-normal">
                (
                <template v-if="activeGroupId">
                  <template v-if="hasChinese(groups.find(g => g.id === activeGroupId)?.title || '')">
                    <span class="text-neutral-600 font-normal mr-0.5">[</span>
                    {{ groups.find(g => g.id === activeGroupId)?.title }}
                    <span class="text-neutral-600 font-normal ml-0.5">]</span>
                  </template>
                  <template v-else>
                    {{ groups.find(g => g.id === activeGroupId)?.title }}
                  </template>
                </template>
                <template v-else>
                  <template v-if="hasChinese($t('all'))">
                    <span class="text-neutral-600 font-normal mr-0.5">[</span>
                    {{ $t('all') }}
                    <span class="text-neutral-600 font-normal ml-0.5">]</span>
                  </template>
                  <template v-else>
                    {{ $t('all') }}
                  </template>
                </template>
                )
              </span>
            </button>
          </div>
          <MangaButton @click="openAddItem(activeGroupId || groups[0]?.id)" size="sm">
            <PlusIcon class="w-3.5 h-3.5" /> {{ $t('countdown.add') }}
          </MangaButton>
        </div>

        <!-- Right Side Content -->
        <div class="flex flex-col gap-4">
          <!-- Empty {{ $t('bg.pattern.grid') }} -->
          <div v-if="filteredItems.length === 0" class="text-center py-16 border border-dashed border-line p-6">
            <p class="text-sm mb-3 text-neutral-400">{{ $t('empty.category') }}</p>
            <MangaButton @click="openAddItem(activeGroupId)" size="sm">
              <PlusIcon class="w-3.5 h-3.5" /> {{ $t('countdown.add') }}
            </MangaButton>
          </div>

          <!-- Icon {{ $t('bg.pattern.grid') }} -->
          <div v-else class="flex flex-col gap-4 min-h-[220px]">
            <div
              class="grid bg-neutral-800 gap-px p-4"
              style="grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); grid-auto-rows: minmax(110px, auto);"
            >
              <a v-for="item in paginatedItems" :key="item.id"
                :href="isWidgetItem(item) ? 'javascript:void(0)' : item.url"
                :target="isWidgetItem(item) ? '_self' : '_blank'"
                @click="handleItemClick(item, $event)"
                :draggable="!activeResizingItem"
                @dragstart="handleItemDragStart(item.id, $event)"
                @dragover="handleItemDragOver(item.id, $event)"
                @drop="handleItemDrop(item.id, $event)"
                @dragend="handleDragEnd"
                class="flex flex-col items-center gap-2 group/card relative select-none bg-surface px-1.5 py-2.5 w-full h-full justify-between"
                :class="[
                  item.size === 'wide' ? 'col-span-2 row-span-1' : '',
                  item.size === 'tall' ? 'col-span-1 row-span-2' : '',
                  item.size === 'large' ? 'col-span-2 row-span-2' : '',
                  dragOverItemId === item.id ? 'opacity-50' : ''
                ]"
                :title="item.description || getItemTitle(item)"
              >
                <!-- Edit/Delete hover buttons -->
                <div class="absolute -top-2 -right-2 flex gap-1 z-[60] opacity-0 group-hover/card:opacity-100 transition-none">
                  <button @click.prevent.stop="openEditItem(item)" class="bg-base border border-line p-1 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 text-neutral-500 transition-none cursor-pointer" :title="$t('countdown.edit')">
                    <EditIcon class="w-3 h-3" />
                  </button>
                  <button @click.prevent.stop="handleDeleteItem(item)" class="bg-base border border-line p-1 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 text-neutral-500 transition-none cursor-pointer" title="[ DESTROY ]">
                    <TrashIcon class="w-3 h-3" />
                  </button>
                </div>

                <div
                  class="icon-tile flex items-center justify-center transition-none group-hover/card:border-accent active:scale-95 cursor-grab active:cursor-grabbing overflow-hidden border border-line shrink-0"
                  :class="[
                    (item.size === 'wide' || item.size === 'large') ? 'w-full h-16 sm:h-20' : 'w-16 h-16 sm:w-20 sm:h-20'
                  ]"
                  :style="{ backgroundColor: item.color }"
                >
                  <!-- 自定义图标: 身体数据心跳、AI机器人动态表情、动态天气或常规组件图标 -->
                  <div v-if="isWidgetItem(item) || (item.icon !== 'Link' && item.icon !== 'Letter')" class="group-hover/card:text-accent transition-none flex items-center justify-center w-full h-full"
                    :style="{ color: getIconColor(item.color) }">
                    
                    <!-- 1. 身体数据: 心电图 SVG 扫掠波形动画 -->
                    <svg v-if="isWidgetItem(item) && getWidgetIdFromUrl(item.url) === 'weight'"
                      viewBox="0 0 48 32"
                      class="w-10 h-7 sm:w-12 sm:h-8 ecg-glow"
                      :style="{ color: getIconColor(item.color) }"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <!-- EKG 静止基线 -->
                      <line x1="0" y1="16" x2="8" y2="16" stroke="currentColor" stroke-width="1.2" opacity="0.25" />
                      <line x1="38" y1="16" x2="48" y2="16" stroke="currentColor" stroke-width="1.2" opacity="0.25" />
                      <!-- EKG 心电波形 (P-QRS-T 典型波形) -->
                      <polyline
                        class="ecg-path"
                        points="0,16 5,16 7,13 9,16 11,16 13,16 15,22 17,2 19,28 21,16 23,16 25,16 28,12 31,16 35,16 38,16 40,16"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        fill="none"
                      />
                    </svg>

                    <!-- 2. AI 对话: 可爱圆润机器人 SVG，5种表情循环 -->
                    <!-- 2. AI 对话: 极简双眼张望与眨眼动效机器人 SVG (支持5种可爱表情切换与呼吸荧光) -->
                    <svg v-else-if="isWidgetItem(item) && getWidgetIdFromUrl(item.url) === 'aichat'"
                      viewBox="0 0 44 44"
                      class="w-9 h-9 sm:w-11 sm:h-11"
                      :style="{ color: getIconColor(item.color) }"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g class="animate-ai-float" style="transform-origin: 22px 22px;">
                        <!-- 天线竖杆 -->
                        <line x1="22" y1="2" x2="22" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <!-- 天线球 (可爱圆头) -->
                        <circle cx="22" cy="2" r="2" fill="currentColor"/>
                        <!-- 圆角头部 -->
                        <rect x="5" y="9" width="34" height="26" rx="7" stroke="currentColor" stroke-width="1.6" fill="none"/>
                        
                        <!-- 左耳 (半圆) -->
                        <path d="M5 16 Q1 22 5 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                        <!-- 右耳 (半圆) -->
                        <path d="M39 16 Q43 22 39 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>

                        <!-- 呼吸荧光层 -->
                        <g class="animate-ai-glow">
                          <!-- === 表情0: 极简双眼张望与自然眨眼 === -->
                          <g class="transition-opacity duration-300 ease-in-out" :class="aiExpressionIndex === 0 ? 'opacity-100' : 'opacity-0'">
                            <g class="animate-ai-look">
                              <!-- 左眼 -->
                              <g class="animate-ai-blink-left">
                                <circle cx="15" cy="19" r="3.5" fill="currentColor"/>
                                <circle cx="16.2" cy="17.8" r="1.1" fill="white" opacity="0.85"/>
                              </g>
                              <!-- 右眼 -->
                              <g class="animate-ai-blink-right">
                                <circle cx="29" cy="19" r="3.5" fill="currentColor"/>
                                <circle cx="30.2" cy="17.8" r="1.1" fill="white" opacity="0.85"/>
                              </g>
                            </g>
                          </g>

                          <!-- === 表情1: 眯眼笑 ^^ (带弹跳动效) === -->
                          <g class="transition-opacity duration-300 ease-in-out" :class="aiExpressionIndex === 1 ? 'opacity-100' : 'opacity-0'">
                            <g class="animate-ai-happy-bounce" style="transform-origin: 22px 19px;">
                              <path d="M11.5 20.5 Q15 16.5 18.5 20.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                              <path d="M25.5 20.5 Q29 16.5 32.5 20.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                            </g>
                          </g>

                          <!-- === 表情2: 震惊 O O (带颤动与放大) === -->
                          <g class="transition-opacity duration-300 ease-in-out" :class="aiExpressionIndex === 2 ? 'opacity-100' : 'opacity-0'">
                            <g class="animate-ai-shock-shake" style="transform-origin: 22px 19px;">
                              <circle cx="15" cy="19" r="4.8" fill="currentColor"/>
                              <circle cx="16.5" cy="17.2" r="1.4" fill="white" opacity="0.9"/>
                              <circle cx="29" cy="19" r="4.8" fill="currentColor"/>
                              <circle cx="30.5" cy="17.2" r="1.4" fill="white" opacity="0.9"/>
                            </g>
                          </g>

                          <!-- === 表情3: 委屈/难过 > < === -->
                          <g class="transition-opacity duration-300 ease-in-out" :class="aiExpressionIndex === 3 ? 'opacity-100' : 'opacity-0'">
                            <path d="M12 16.5 L17 19.5 L12 22.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            <path d="M32 16.5 L27 19.5 L32 22.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                          </g>

                          <!-- === 表情4: 爱心眼 ♥ ♥ (带呼吸缩放) === -->
                          <g class="transition-opacity duration-300 ease-in-out" :class="aiExpressionIndex === 4 ? 'opacity-100' : 'opacity-0'">
                            <!-- 左心 -->
                            <path d="M 15 21.2 C 11 18 10 15 13.5 15 C 15 15 15 16.5 15 16.5 C 15 16.5 15 15 16.5 15 C 20 15 19 18 15 21.2 Z" 
                              fill="currentColor" 
                              class="animate-ai-love-pulse-left"
                            />
                            <!-- 右心 -->
                            <path d="M 29 21.2 C 25 18 24 15 27.5 15 C 29 15 29 16.5 29 16.5 C 29 16.5 29 15 30.5 15 C 34 15 33 18 29 21.2 Z" 
                              fill="currentColor" 
                              class="animate-ai-love-pulse-right"
                            />
                          </g>
                        </g>
                      </g>
                    </svg>


                    <!-- 3. 天气状况: 内联 SVG 随天气条件变化（与其他图标风格一致，带精美 CSS 微动效） -->
                    <svg v-else-if="isWidgetItem(item) && getWidgetIdFromUrl(item.url) === 'weather'"
                      viewBox="0 0 40 40"
                      class="w-9 h-9 sm:w-11 sm:h-11"
                      :style="{ color: getIconColor(item.color) }"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <!-- 晴天: 太阳 -->
                      <template v-if="weatherCondition === 'clear'">
                        <g class="animate-weather-sun">
                          <circle cx="20" cy="20" r="6" stroke="currentColor" stroke-width="1.8" fill="none"/>
                          <line x1="20" y1="4" x2="20" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="20" y1="32" x2="20" y2="36" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="4" y1="20" x2="8" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="32" y1="20" x2="36" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="8.1" y1="8.1" x2="11" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="29" y1="29" x2="31.9" y2="31.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="31.9" y1="8.1" x2="29" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                          <line x1="11" y1="29" x2="8.1" y2="31.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                        </g>
                      </template>
                      <!-- 阴天: 云朵 -->
                      <template v-else-if="weatherCondition === 'cloud'">
                        <g class="animate-weather-cloud">
                          <path d="M8 28 Q8 20 16 20 Q16 13 24 13 Q32 13 32 21 Q37 21 37 27 Q37 33 31 33 L10 33 Q4 33 4 27 Q4 21 8 21 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </g>
                      </template>
                      <!-- 雨天: 云+雨 -->
                      <template v-else-if="weatherCondition === 'rain'">
                        <g class="animate-weather-cloud">
                          <path d="M7 22 Q7 16 14 16 Q14 10 21 10 Q28 10 28 17 Q33 17 33 22 Q33 27 27 27 L8 27 Q3 27 3 22 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </g>
                        <g class="animate-weather-rain-1">
                          <line x1="11" y1="31" x2="9" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-rain-2">
                          <line x1="18" y1="31" x2="16" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-rain-3">
                          <line x1="25" y1="31" x2="23" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                        </g>
                      </template>
                      <!-- 雪天: 云+雪花 -->
                      <template v-else-if="weatherCondition === 'snow'">
                        <g class="animate-weather-cloud">
                          <path d="M7 22 Q7 16 14 16 Q14 10 21 10 Q28 10 28 17 Q33 17 33 22 Q33 27 27 27 L8 27 Q3 27 3 22 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </g>
                        <g class="animate-weather-snow-1">
                          <line x1="11" y1="32" x2="11" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                          <line x1="8" y1="35" x2="14" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-snow-2">
                          <line x1="19" y1="32" x2="19" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                          <line x1="16" y1="35" x2="22" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-snow-3">
                          <line x1="27" y1="32" x2="27" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                          <line x1="24" y1="35" x2="30" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                        </g>
                      </template>
                      <!-- 雷暴: 云+闪电 -->
                      <template v-else-if="weatherCondition === 'storm'">
                        <g class="animate-weather-cloud-storm">
                          <path d="M7 20 Q7 14 14 14 Q14 8 21 8 Q28 8 28 15 Q33 15 33 20 Q33 25 27 25 L8 25 Q3 25 3 20 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </g>
                        <g class="animate-weather-lightning">
                          <polyline points="22,28 16,35 20,35 14,43" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" fill="none"/>
                        </g>
                      </template>
                      <!-- 雾天: 横线 -->
                      <template v-else>
                        <g class="animate-weather-fog-1">
                          <line x1="6" y1="14" x2="34" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-fog-2">
                          <line x1="10" y1="20" x2="34" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-fog-3">
                          <line x1="6" y1="26" x2="30" y2="26" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                        </g>
                        <g class="animate-weather-fog-4">
                          <line x1="10" y1="32" x2="34" y2="32" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                        </g>
                      </template>
                    </svg>

                    <!-- 4. 默认组件图标 -->
                    <component v-else :is="getIconComponent(item.icon)" class="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div v-else-if="item.icon === 'Link'" class="w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <img v-if="getFaviconUrl(item.url) && !faviconErrors[item.id]"
                      :src="getFaviconUrl(item.url)"
                      @error="handleFaviconError(item.id)"
                      class="w-8 h-8 sm:w-10 sm:h-10 object-contain transition-none"
                      alt=""
                    />
                    <div v-else class="group-hover/card:text-accent text-2xl sm:text-3xl font-black tracking-tighter select-none"
                      :style="{ color: getIconColor(item.color) }">
                      {{ getItemTitle(item).trim().charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div v-else-if="item.icon === 'Letter'" class="w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <div class="group-hover/card:text-accent text-2xl sm:text-3xl font-black tracking-tighter select-none"
                      :style="{ color: getIconColor(item.color) }">
                      {{ getItemTitle(item).trim().charAt(0).toUpperCase() }}
                    </div>
                  </div>
                </div>

                <!-- Label -->
                <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-neutral-400 group-hover/card:text-accent transition-none block uppercase mt-1 break-all">
                  <template v-if="isWidgetItem(item) || hasChinese(getItemTitle(item))">
                    <span class="text-neutral-600 group-hover/card:text-accent font-normal mr-0.5">[</span>
                    {{ getItemTitle(item) }}
                    <span class="text-neutral-600 group-hover/card:text-accent font-normal ml-0.5">]</span>
                  </template>
                  <template v-else>
                    {{ getItemTitle(item) }}
                  </template>
                </span>

                <!-- Hover Tooltip -->
                <div
                  class="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-[9999]
                         opacity-0 origin-bottom bg-surface border border-line p-3
                         group-hover/card:opacity-100 group-hover/card:pointer-events-auto
                         group-focus-within/card:opacity-100 group-focus-within/card:pointer-events-auto"
                  :class="[isWidgetItem(item) ? 'w-72' : 'w-52']"
                >
                  <div class="relative">
                    <div v-if="isWidgetItem(item)" class="flex flex-col gap-2">
                      <div class="flex items-center gap-2 border-b border-line pb-1.5 mb-1">
                        <div class="border border-line bg-base p-1 flex items-center justify-center text-accent shrink-0">
                          <component :is="getIconComponent(item.icon)" class="w-3.5 h-3.5" />
                        </div>
                        <h3 class="text-xs font-bold tracking-wider text-neutral-200 uppercase">{{ getItemTitle(item) }}</h3>
                      </div>
                      <component :is="availableWidgets.find(w => w.id === getWidgetIdFromUrl(item.url))?.component" :preview="true" />
                      <div class="text-[8px] text-neutral-500 border-t border-line pt-1.5 text-center mt-1 uppercase tracking-widest">{{ $t('click.to.open') }}</div>
                    </div>
                    <div v-else>
                      <div class="flex items-center gap-2">
                        <div class="border border-line bg-base p-1 flex items-center justify-center text-accent shrink-0 overflow-hidden w-6 h-6">
                          <component v-if="item.icon !== 'Link' && item.icon !== 'Letter'" :is="getIconComponent(item.icon)" class="w-3.5 h-3.5" />
                          <img v-else-if="item.icon === 'Link' && getFaviconUrl(item.url) && !faviconErrors[item.id]"
                            :src="getFaviconUrl(item.url)" @error="handleFaviconError(item.id)" class="w-3.5 h-3.5 object-contain" alt="" />
                          <span v-else class="text-neutral-300 text-[10px] font-black select-none leading-none">{{ getItemTitle(item).trim().charAt(0).toUpperCase() }}</span>
                        </div>
                        <h3 class="text-xs font-bold tracking-wider text-neutral-200 uppercase">{{ getItemTitle(item) }}</h3>
                      </div>
                      <p class="text-[9px] text-neutral-400 line-clamp-2 mt-1.5 leading-relaxed">{{ item.description || $t('no.desc') }}</p>
                      <div class="flex items-center gap-1 mt-1.5 text-[8px] text-neutral-500 border-t border-line pt-1.5">
                        <ExternalLinkIcon class="w-2 h-2 text-accent shrink-0" />
                        <span class="truncate">{{ item.url.replace(/^https?:\/\//i, '') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r border-line bg-surface"></div>
                </div>

                <!-- 自动箴言弹窗 (Inactivity Idle Prompt - 从箴言卡片上方发出) -->
                <Transition name="fade">
                  <div v-if="showIdleMotto && isWidgetItem(item) && getWidgetIdFromUrl(item.url) === 'hitokoto'"
                    @click.stop.prevent
                    class="absolute bottom-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-80 sm:w-96 bg-surface border border-accent p-4 z-[100] select-none shadow-[4px_4px_0px_var(--color-accent)] flex flex-col gap-3 font-mono text-left animate-shake"
                  >
                    <!-- 气泡对话框尖角 (指向下方的卡片) -->
                    <div class="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-surface border-r border-b border-accent rotate-45 -translate-y-[6px]"></div>

                    <!-- 弹窗头部 -->
                    <div class="flex items-center justify-between border-b border-accent/20 pb-2">
                      <div class="flex items-center gap-2 text-accent text-xs font-bold">
                        <span class="inline-block w-2.5 h-2.5 bg-accent animate-pulse"></span>
                        <span>{{ $t('idle.title') }}</span>
                      </div>
                      <button @click.stop.prevent="closeIdleMotto" class="text-neutral-500 hover:text-accent font-bold text-xs cursor-pointer border-0 bg-transparent outline-none">
                        [ X ]
                      </button>
                    </div>

                    <!-- 思考状态 -->
                    <div v-if="idleMottoStep === 'thinking'" class="py-6 flex flex-col gap-2 justify-center items-center text-xs text-neutral-400">
                      <div class="flex items-center gap-1.5 font-bold">
                        <span class="text-accent cursor-blink">&gt;</span>
                        <span>{{ $t('idle.thinking') }}</span>
                      </div>
                      <!-- 闪烁载入状态条 -->
                      <div class="text-[10px] text-accent animate-pulse mt-2">
                        [■■■■■■■■□□□□] 64% LOADING...
                      </div>
                    </div>

                    <!-- 消息气泡显示状态 -->
                    <div v-if="idleMottoStep === 'bubble'" class="flex flex-col gap-3">
                      <!-- 消息内容 -->
                      <div class="relative bg-base border border-line p-3 text-neutral-300 text-xs sm:text-sm leading-relaxed rounded-none select-text">
                        <p class="font-semibold text-neutral-200">"{{ idleQuote }}"</p>
                        <div class="text-right text-[10px] text-neutral-500 mt-2 font-mono">
                          —— {{ idleAuthor }} <span v-if="idleSource">· 《{{ idleSource.replace(/^《|》$/g, '') }}》</span>
                        </div>
                      </div>

                      <!-- 功能按钮 -->
                      <div class="flex items-center justify-between mt-1 text-[10px]">
                        <span class="text-neutral-600 font-mono">{{ $t('idle.active') }}</span>
                        <div class="flex gap-2">
                          <button @click.stop.prevent="triggerIdleMotto" class="text-accent hover:underline cursor-pointer border-0 bg-transparent outline-none font-bold">
                            {{ $t('idle.reevaluate') }}
                          </button>
                          <button @click.stop.prevent="copyIdleQuote" class="text-neutral-400 hover:text-white cursor-pointer border-0 bg-transparent outline-none font-bold">
                            {{ $t('idle.copy') }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>

                <!-- Resize Handle -->
                <div 
                  class="absolute bottom-0.5 right-0.5 cursor-se-resize text-neutral-600 hover:text-accent select-none z-[60] text-[10px] leading-none p-0.5 transition-colors font-mono font-bold"
                  @mousedown.prevent.stop="startResizeItem(item, $event)"
                  title="RESIZE"
                >
                  ◢
                </div>
              </a>
            </div>

            <!-- Quick Add Tile -->
            <div v-if="paginatedItems.length < pageSize"
              @click="openAddItem(activeGroupId || groups[0]?.id)"
              class="flex flex-col items-center gap-2 group/card cursor-pointer select-none bg-surface px-1.5 py-2.5 w-full h-full justify-between"
            >
              <div class="w-16 h-16 sm:w-20 sm:h-20 border border-dashed border-line flex items-center justify-center bg-surface hover:bg-neutral-300/10 transition-none shrink-0">
                <PlusIcon class="w-6 h-6 sm:w-8 sm:h-8 text-neutral-600 group-hover/card:text-accent" />
              </div>
              <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-neutral-500 group-hover/card:text-accent transition-none block uppercase mt-1 break-all">
                {{ $t('add.tile') }}
              </span>
            </div>
          </div>

          <!-- Page Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 border-t border-border-dim pt-4 mt-2 select-none">
            <button @click="currentPage = Math.max(0, currentPage - 1)" :disabled="currentPage === 0"
              class="text-xs bg-transparent border-0 text-neutral-500 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold transition-none uppercase tracking-widest">
              {{ $t('prev') }}
            </button>
            <div class="flex gap-2">
              <button v-for="p in totalPages" :key="p"
                @click="currentPage = p - 1"
                @dragover.prevent
                @dragenter="handlePageDragEnter(p - 1)"
                @dragleave="handlePageDragLeave"
                @drop="handleDropOnPage(p - 1, $event)"
                class="w-3 h-3 border border-line cursor-pointer transition-none"
                :class="[currentPage === p - 1 ? 'bg-accent border-accent' : 'bg-transparent hover:bg-neutral-300 hover:border-neutral-300']"
                :title="`Page ${p}`"
              ></button>
            </div>
            <button @click="currentPage = Math.min(totalPages - 1, currentPage + 1)" :disabled="currentPage === totalPages - 1"
              class="text-xs bg-transparent border-0 text-neutral-500 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold transition-none uppercase tracking-widest">
              {{ $t('next') }}
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Widget Modal -->
    <MangaModal :show="showWidgetModal" @update:show="showWidgetModal = $event" :title="openedWidget ? getWidgetModalTitle(openedWidget) : ''" :max-width-class="getWidgetModalWidth(openedWidget?.id)">
      <component v-if="openedWidget && openedWidget.component" :is="openedWidget.component" />
    </MangaModal>

    <!-- Footer -->
    <footer class="text-center mt-24 text-xs text-neutral-700 select-none tracking-widest uppercase">
      <p>{{ $t('system.copyright') }}</p>
    </footer>

    <!-- Settings Modal -->
    <MangaModal v-model:show="showSettings" :title="$t('sys.config')" max-width-class="max-w-2xl">
      <div class="flex flex-col gap-5 text-sm">
        <!-- Logo Text -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('logo.text') }}</label>
          <input v-model="config.logoText" type="text"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
        </div>

        <!-- Pattern selector -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('bg.pattern') }}</label>
          <select v-model="config.backgroundPattern"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option value="dots">{{ $t('bg.pattern.dots') }}</option>
            <option value="grid">{{ $t('bg.pattern.grid') }}</option>
            <option value="none">{{ $t('bg.pattern.none') }}</option>
          </select>
        </div>

        <!-- Accent Theme swapper -->
        <div class="flex flex-col gap-2 border-b border-line pb-4">
          <label class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('accent.theme') }}</label>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="theme in accentThemesList"
              :key="theme.id"
              @click="config.accentColor = theme.id"
              class="border text-center py-2 text-[10px] font-bold cursor-pointer transition-none flex flex-col items-center gap-1.5 bg-transparent"
              :class="config.accentColor === theme.id ? 'bg-accent/15 border-accent text-accent' : 'border-line text-neutral-400 hover:bg-neutral-300/10 hover:text-neutral-300'"
            >
              <span class="w-3.5 h-3.5 border border-line" :style="{ backgroundColor: theme.color }"></span>
              <span class="font-mono">{{ $t('accent.' + theme.id) }}</span>
            </button>
          </div>
        </div>

        <!-- Font toggle -->
        <div class="flex justify-between items-center border-b border-line pb-4">
          <span class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('monospace.enforced') }}</span>
          <span class="text-xs text-accent">{{ $t('always.on') }}</span>
        </div>

        <!-- {{ $t('bg.pattern.grid') }} Layout -->
        <div class="flex flex-col gap-3 border-b border-line pb-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('icon.grid') }}</span>
            <span class="text-[10px] text-neutral-600">{{ config.gridRows * 12 }} {{ $t('items.page') }}</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] text-neutral-600 uppercase tracking-widest">{{ $t('rows') }} ({{ config.gridRows }})</label>
              <div class="flex items-center gap-2">
                <button @click="config.gridRows = Math.max(1, config.gridRows - 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">−</button>
                <div class="flex-1 text-center text-sm border border-line py-1 bg-base text-neutral-300">{{ config.gridRows }}</div>
                <button @click="config.gridRows = Math.min(12, config.gridRows + 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">+</button>
              </div>
              <input type="range" min="1" max="12" v-model.number="config.gridRows" class="w-full accent-[#FF5F1F] cursor-pointer" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[10px] text-neutral-600 uppercase tracking-widest">COLS ({{ config.gridCols }}) — auto-fill on mobile</label>
              <div class="flex items-center gap-2">
                <button @click="config.gridCols = Math.max(2, config.gridCols - 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">−</button>
                <div class="flex-1 text-center text-sm border border-line py-1 bg-base text-neutral-300">{{ config.gridCols }}</div>
                <button @click="config.gridCols = Math.min(16, config.gridCols + 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">+</button>
              </div>
              <input type="range" min="2" max="16" v-model.number="config.gridCols" class="w-full accent-[#FF5F1F] cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Widget controls -->
        <div class="flex flex-col gap-3">
          <span class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('widgets') }}</span>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="widget in availableWidgets" :key="widget.id"
              class="border border-line p-2.5 bg-surface flex items-center justify-between text-neutral-300">
              <span class="text-xs">{{ $t('widget.' + widget.id) }}</span>
              <input type="checkbox" v-model="config.widgets[widget.id]" class="accent-[#FF5F1F] w-4 h-4 cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- AI API Config -->
        <div class="border-t border-line pt-4 flex flex-col gap-3">
          <span class="text-xs text-neutral-500 uppercase tracking-widest">{{ $t('ai.api.config') }}</span>
          <div class="flex flex-col gap-2 bg-surface border border-line p-3">
            <div class="flex flex-col gap-1 text-xs">
              <label class="text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('api.key') }}</label>
              <input v-model="config.openaiKey" type="password" placeholder="sk-..."
                class="border border-line p-1.5 bg-base text-neutral-300 font-mono outline-none focus:border-accent transition-none" />
            </div>
            <div class="flex flex-col gap-1 text-xs mt-1">
              <label class="text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('api.base.url') }}</label>
              <input v-model="config.openaiBase" type="text" placeholder="https://api.deepseek.com"
                class="border border-line p-1.5 bg-base text-neutral-300 font-mono outline-none focus:border-accent transition-none" />
            </div>
            <div class="flex flex-col gap-1 text-xs mt-1">
              <label class="text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('model.name') }}</label>
              <input v-model="config.openaiModel" type="text" placeholder="deepseek-chat"
                class="border border-line p-1.5 bg-base text-neutral-300 font-mono outline-none focus:border-accent transition-none" />
            </div>
          </div>
        </div>

        <!-- Backup & Restore -->
        <div class="border-t border-line pt-4 flex flex-col gap-2.5 p-3 border border-border-dim">
          <span class="text-xs text-neutral-500 uppercase tracking-widest mb-1 block">{{ $t('backup.restore') }}</span>
          <div class="grid grid-cols-2 gap-3">
            <MangaButton @click="triggerImportClick" size="sm" class="flex items-center justify-center gap-1.5">{{ $t('import') }}</MangaButton>
            <MangaButton @click="exportData" size="sm" class="flex items-center justify-center gap-1.5">{{ $t('hitokoto.export') }}</MangaButton>
          </div>
          <input ref="importFileRef" type="file" accept=".json" class="hidden" @change="handleImport" />
        </div>

        <!-- Danger zone -->
        <div class="border-t border-line pt-4 flex justify-between gap-4">
          <MangaButton @click="resetAll" size="sm">{{ $t('reset.all') }}</MangaButton>
          <MangaButton @click="showSettings = false" size="sm">{{ $t('commit') }}</MangaButton>
        </div>
      </div>
    </MangaModal>

    <!-- Cloud Sync Modal -->
    <MangaModal v-model:show="showAuthModal" :title="isUserLoggedIn ? $t('cloud.sync') : $t('login')">
      <div class="flex flex-col gap-4 text-sm">
        <!-- Logged In View -->
        <div v-if="isUserLoggedIn" class="flex flex-col gap-4 py-2">
          <div class="border border-line bg-surface p-3.5 text-center flex flex-col gap-1.5">
            <span class="text-[10px] text-neutral-600 tracking-widest uppercase">{{ $t('sync') }} STATUS</span>
            <p class="text-sm text-neutral-300">{{ $t('account') }}: <span class="text-accent font-bold">{{ loggedInUser }}</span></p>
            <p class="text-[10px] text-neutral-500 leading-relaxed mt-1">{{ $t('auto.push') }}</p>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-1">
            <button @click="pullCloudData(false)" :disabled="isSyncing"
              class="border border-line py-2 text-xs bg-base text-neutral-400 hover:bg-neutral-300 hover:text-accent transition-none cursor-pointer text-center font-bold disabled:opacity-50">
              {{ $t('pull.from.cloud') }}
            </button>
            <button @click="pushCloudData" :disabled="isSyncing"
              class="border border-line py-2 text-xs bg-base text-neutral-400 hover:bg-neutral-300 hover:text-accent transition-none cursor-pointer text-center font-bold disabled:opacity-50">
              {{ $t('push.to.cloud') }}
            </button>
          </div>
          <p v-if="syncMessage" class="text-[9.5px] text-accent text-center font-mono mt-0.5">{{ syncMessage }}</p>
          <div class="border-t border-line pt-4 flex justify-between gap-4 mt-2">
            <MangaButton @click="handleLogout" size="sm">{{ $t('logout') }}</MangaButton>
            <MangaButton @click="showAuthModal = false" size="sm">{{ $t('countdown.abort') }}</MangaButton>
          </div>
        </div>

        <!-- Auth Login Form -->
        <div v-else class="flex flex-col gap-3">
          <div class="border border-line bg-surface p-3 text-center">
            <span class="text-[10px] text-neutral-600 tracking-widest uppercase block mb-1">DEMO {{ $t('login') }}</span>
            <p class="text-xs text-neutral-400 leading-relaxed">REGISTRATION: LOCKED // DEFAULT_{{ $t('account') }}: PRELOADED</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('username') }}</label>
            <input v-model="authForm.username" type="text" placeholder="username"
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('password') }}</label>
            <input v-model="authForm.password" type="password" placeholder="password"
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none font-mono" />
          </div>
          <p v-if="authError" class="text-[10px] text-accent text-center tracking-wider mt-1">{{ authError }}</p>
          <p v-if="syncMessage" class="text-[9.5px] text-accent text-center font-mono mt-0.5">{{ syncMessage }}</p>
          <div class="border-t border-line pt-4 flex justify-end gap-3 mt-2">
            <MangaButton @click="showAuthModal = false" size="sm">{{ $t('countdown.abort') }}</MangaButton>
            <MangaButton @click="handleAuthSubmit" :disabled="isSyncing" size="sm">AUTH_{{ $t('login') }}</MangaButton>
          </div>
        </div>
      </div>
    </MangaModal>

    <!-- Nav Item Add/Edit Modal -->
    <MangaModal v-model:show="showItemModal" :title="editingItem ? $t('edit.link') : $t('add.link')">
      <div class="flex flex-col gap-4 text-sm">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('group') }}</label>
          <select v-model="itemForm.groupId"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.title }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('title') }}</label>
          <input v-model="itemForm.title" type="text" placeholder="e.g. GitHub"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">URL</label>
          <input v-model="itemForm.url" type="text" placeholder="https://..."
            :disabled="!!(itemForm.url && itemForm.url.startsWith('#widget:'))"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none disabled:opacity-50 disabled:cursor-not-allowed" />
          <p v-if="itemForm.url && itemForm.url.startsWith('#widget:')" class="text-[9px] text-neutral-600 mt-0.5">{{ $t('widget.component') }}</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('description') }}</label>
          <input v-model="itemForm.description" type="text" placeholder="optional description"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('icon') }}</label>
          <select v-model="itemForm.icon"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option value="Link">AUTO (FAV{{ $t('icon') }})</option>
            <option value="Letter">{{ $t('first.letter') }}</option>
            <option value="Home">HOME</option>
            <option value="Github">GITHUB</option>
            <option value="Tv">TV</option>
            <option value="Search">{{ $t('widget.search') }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('size') }}</label>
          <select v-model="itemForm.size"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option value="normal">{{ $t('normal') }}</option>
            <option value="wide">{{ $t('wide') }}</option>
            <option value="tall">{{ $t('tall') }}</option>
            <option value="large">{{ $t('large') }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">{{ $t('background') }}</label>
          <div class="flex gap-2 mt-1 flex-wrap">
            <button v-for="color in colorOptions" :key="color.value"
              @click="itemForm.color = color.value"
              class="w-6 h-6 border border-line cursor-pointer transition-none"
              :style="{ backgroundColor: color.value }"
              :class="[itemForm.color === color.value ? 'border-accent ring-1 ring-accent' : '']"
              :title="color.label"
            ></button>
          </div>
        </div>
        <div class="border-t border-line pt-4 flex justify-end gap-3 mt-2">
          <MangaButton @click="showItemModal = false" size="sm">{{ $t('countdown.abort') }}</MangaButton>
          <MangaButton @click="saveItem" size="sm">{{ $t('commit') }}</MangaButton>
        </div>
      </div>
    </MangaModal>

    <!-- 自动箴言弹窗 (Inactivity Idle Prompt - 仅在当前页面找不到箴言卡片时作为右下角 fallback) -->
    <Transition name="slide-drawer">
      <div v-if="showIdleMotto && !isHitokotoRendered" class="fixed bottom-6 right-6 w-80 sm:w-96 bg-surface border border-accent p-4 z-[99] select-none shadow-[4px_4px_0px_var(--color-accent)] flex flex-col gap-3 font-mono text-left">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between border-b border-accent/20 pb-2">
          <div class="flex items-center gap-2 text-accent text-xs font-bold">
            <span class="inline-block w-2.5 h-2.5 bg-accent animate-pulse"></span>
            <span>{{ $t('idle.title') }}</span>
          </div>
          <button @click="closeIdleMotto" class="text-neutral-500 hover:text-accent font-bold text-xs cursor-pointer border-0 bg-transparent outline-none">
            [ X ]
          </button>
        </div>

        <!-- 思考状态 -->
        <div v-if="idleMottoStep === 'thinking'" class="py-6 flex flex-col gap-2 justify-center items-center text-xs text-neutral-400">
          <div class="flex items-center gap-1.5 font-bold">
            <span class="text-accent cursor-blink">&gt;</span>
            <span>{{ $t('idle.thinking') }}</span>
          </div>
          <!-- 闪烁载入状态条 -->
          <div class="text-[10px] text-accent animate-pulse mt-2">
            [■■■■■■■■□□□□] 64% LOADING...
          </div>
        </div>

        <!-- 消息气泡显示状态 -->
        <div v-if="idleMottoStep === 'bubble'" class="flex flex-col gap-3">
          <!-- 消息气泡样式 -->
          <div class="relative bg-base border border-line p-3 text-neutral-300 text-xs sm:text-sm leading-relaxed rounded-none select-text">
            <!-- 气泡对话框尖角 -->
            <div class="absolute bottom-full right-8 w-3 h-3 bg-base border-t border-l border-line rotate-45 translate-y-[7px]"></div>
            
            <p class="font-semibold text-neutral-200">"{{ idleQuote }}"</p>
            <div class="text-right text-[10px] text-neutral-500 mt-2 font-mono">
              —— {{ idleAuthor }} <span v-if="idleSource">· 《{{ idleSource.replace(/^《|》$/g, '') }}》</span>
            </div>
          </div>

          <!-- 功能按钮 -->
          <div class="flex items-center justify-between mt-1 text-[10px]">
            <span class="text-neutral-600 font-mono">{{ $t('idle.active') }}</span>
            <div class="flex gap-2">
              <button @click="triggerIdleMotto" class="text-accent hover:underline cursor-pointer border-0 bg-transparent outline-none font-bold">
                {{ $t('idle.reevaluate') }}
              </button>
              <button @click="copyIdleQuote" class="text-neutral-400 hover:text-white cursor-pointer border-0 bg-transparent outline-none font-bold">
                {{ $t('idle.copy') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes aiFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}
.animate-ai-float {
  animation: aiFloat 4s ease-in-out infinite;
}

@keyframes aiLook {
  0%, 100% { transform: translate(0, 0); }
  12%, 24% { transform: translate(-2px, 0.5px); }    /* Look left-down */
  36% { transform: translate(0, 0); }
  48%, 60% { transform: translate(2px, -0.5px); }    /* Look right-up */
  72%, 84% { transform: translate(0, -1.5px); }      /* Look straight up */
  92% { transform: translate(0, 0); }
}
.animate-ai-look {
  animation: aiLook 6s ease-in-out infinite;
}

@keyframes aiBlink {
  0%, 9%, 11%, 100% { transform: scaleY(1); }
  10% { transform: scaleY(0.1); }
}
.animate-ai-blink-left {
  animation: aiBlink 3.5s ease-in-out infinite;
  transform-origin: 15px 19px;
}
.animate-ai-blink-right {
  animation: aiBlink 3.5s ease-in-out infinite;
  transform-origin: 29px 19px;
}

/* 呼吸荧光 (Neon Glow) Effect */
@keyframes aiGlow {
  0%, 100% { filter: drop-shadow(0 0 1.5px currentColor); }
  50% { filter: drop-shadow(0 0 4.5px currentColor); }
}
.animate-ai-glow {
  animation: aiGlow 2.5s ease-in-out infinite;
}

/* 表情1: 眯眼弹跳 (Happy Bounce) */
@keyframes aiHappyBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.8px); }
}
.animate-ai-happy-bounce {
  animation: aiHappyBounce 0.55s ease-in-out infinite;
}

/* 表情2: 震惊颤动 (Shock Shake) */
@keyframes aiShockShake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-0.4px, 0.4px); }
  75% { transform: translate(0.4px, -0.4px); }
}
.animate-ai-shock-shake {
  animation: aiShockShake 0.15s linear infinite;
}

/* 表情4: 爱心跳动 (Love Pulse) */
@keyframes aiLovePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.animate-ai-love-pulse-left {
  animation: aiLovePulse 0.75s ease-in-out infinite;
  transform-origin: 15px 18px;
}
.animate-ai-love-pulse-right {
  animation: aiLovePulse 0.75s ease-in-out infinite;
  transform-origin: 29px 18px;
}

/* ── 拖拽缩放进行时的全局防护样式 ── */
:global(body.is-resizing) {
  cursor: se-resize !important;
}
:global(body.is-resizing) * {
  cursor: se-resize !important;
  user-select: none !important;
}
:global(body.is-resizing) .group\/card {
  pointer-events: none !important;
}
</style>
