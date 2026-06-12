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
  Hourglass as HourglassIcon
} from '@lucide/vue'

import MangaButton from './components/MangaButton.vue'
import MangaModal from './components/MangaModal.vue'
import { availableWidgets } from './components/WidgetRegistry'
import { useNavData } from './composables/useNavData'
import { useCloudSync } from './composables/useCloudSync'
import { useCanvasAnimation } from './composables/useCanvasAnimation'
import { isLoggedIn } from './utils/api'

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
  Link: LinkIcon,
  Clock: ClockIcon,
  Cpu: CpuIcon,
  CloudRain: CloudRainIcon,
  MessageSquare: MessageSquareIcon,
  Globe: GlobeIcon,
  Bot: BotIcon,
  CheckSquare: CheckSquareIcon,
  FileText: FileTextIcon,
  Activity: ActivityIcon,
  FileCode: FileCodeIcon,
  Wrench: WrenchIcon,
  Hourglass: HourglassIcon
}

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || LinkIcon
}

// 🎨 Classical woodblock shades for cards
const colorOptions = [
  { label: '美第奇红', value: '#4a161b' },
  { label: '波提切利绿', value: '#152e24' },
  { label: '西斯廷蓝', value: '#18283b' },
  { label: '拉特兰金', value: '#6e5020' },
  { label: '达芬奇褐', value: '#2e1f18' },
  { label: '威尼斯灰', value: '#2b2b2e' }
]

// ── Composables ──
const { 
  groups, 
  items, 
  config, 
  loadFromStorage, 
  setupPersistence, 
  resetAll, 
  addItem, 
  updateItem, 
  deleteItem: deleteNavItem, 
  addGroup,
  updateGroup,
  deleteGroup,
  exportData, 
  importData 
} = useNavData()

// Widget Popup Window State
const showWidgetModal = ref(false)
const openedWidget = ref<any>(null)

const faviconErrors = ref<Record<string, boolean>>({})

function handleFaviconError(itemId: string) {
  faviconErrors.value[itemId] = true
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
    } catch {
      return ''
    }
  }
}

const activeGroupId = ref<string>('')
const showCategorySidebar = ref(false)
const currentPage = ref(0)
const pageSize = computed(() => (config.value.gridRows ?? 3) * (config.value.gridCols ?? 5))

const filteredItems = computed(() => {
  if (!activeGroupId.value) return items.value
  return items.value.filter(i => i.groupId === activeGroupId.value)
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value))
})

const paginatedItems = computed(() => {
  const start = currentPage.value * pageSize.value
  const end = start + pageSize.value
  return filteredItems.value.slice(start, end)
})

watch(activeGroupId, () => {
  currentPage.value = 0
})

// 行/列数变化时重置到第0页，防止越界
watch(pageSize, () => {
  currentPage.value = 0
})

// ── 拖放状态与定时器 ──
const dragItemId = ref<string | null>(null)
const dragOverItemId = ref<string | null>(null)

let pageSwitchTimer: number | null = null
let edgeSwitchTimer: number | null = null
let sidebarOpenTimer: number | null = null

function clearAllDragTimers() {
  if (pageSwitchTimer) {
    clearTimeout(pageSwitchTimer)
    pageSwitchTimer = null
  }
  if (edgeSwitchTimer) {
    clearTimeout(edgeSwitchTimer)
    edgeSwitchTimer = null
  }
  if (sidebarOpenTimer) {
    clearTimeout(sidebarOpenTimer)
    sidebarOpenTimer = null
  }
}

function handleItemDragStart(id: string, e: DragEvent) {
  dragItemId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
}

// 手机级实时拖拽交换位置
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
  dragItemId.value = null
  dragOverItemId.value = null
  clearAllDragTimers()
}

function handleDragEnd() {
  dragItemId.value = null
  dragOverItemId.value = null
  clearAllDragTimers()
}

// 拖拽卡片安全移至指定页面并排在首位
function moveDragItemToPage(targetPageIndex: number) {
  const sourceId = dragItemId.value
  if (!sourceId) return
  
  const srcIdx = items.value.findIndex(i => i.id === sourceId)
  if (srcIdx === -1) return
  
  const [moved] = items.value.splice(srcIdx, 1)
  
  // 查找目标页面包含的卡片
  const targetPageItems = filteredItems.value.slice(targetPageIndex * pageSize.value, (targetPageIndex + 1) * pageSize.value)
  
  let globalInsertIdx = items.value.length
  if (targetPageItems.length > 0) {
    const targetFirstItemId = targetPageItems[0].id
    globalInsertIdx = items.value.findIndex(i => i.id === targetFirstItemId)
  }
  
  if (globalInsertIdx !== -1) {
    items.value.splice(globalInsertIdx, 0, moved)
  } else {
    items.value.push(moved)
  }
  
  currentPage.value = targetPageIndex
}

// 页码指示圆点悬停自动翻页
function handlePageDragEnter(pageIndex: number) {
  if (pageSwitchTimer) clearTimeout(pageSwitchTimer)
  pageSwitchTimer = window.setTimeout(() => {
    if (dragItemId.value && currentPage.value !== pageIndex) {
      moveDragItemToPage(pageIndex)
    }
  }, 600)
}

function handlePageDragLeave() {
  if (pageSwitchTimer) {
    clearTimeout(pageSwitchTimer)
    pageSwitchTimer = null
  }
}

// 屏幕左右边缘悬停自动翻页
function handleEdgeDragEnter(direction: 'prev' | 'next') {
  if (edgeSwitchTimer) clearTimeout(edgeSwitchTimer)
  edgeSwitchTimer = window.setTimeout(() => {
    if (!dragItemId.value) return
    if (direction === 'prev' && currentPage.value > 0) {
      moveDragItemToPage(currentPage.value - 1)
    } else if (direction === 'next' && currentPage.value < totalPages.value - 1) {
      moveDragItemToPage(currentPage.value + 1)
    }
  }, 800)
}

function handleEdgeDragLeave() {
  if (edgeSwitchTimer) {
    clearTimeout(edgeSwitchTimer)
    edgeSwitchTimer = null
  }
}

// 拖拽卡片到最左侧边缘或星罗按钮上智能打开抽屉
function handleSidebarDragEnter() {
  if (sidebarOpenTimer) clearTimeout(sidebarOpenTimer)
  sidebarOpenTimer = window.setTimeout(() => {
    if (dragItemId.value) {
      showCategorySidebar.value = true
    }
  }, 500)
}

function handleSidebarDragLeave() {
  if (sidebarOpenTimer) {
    clearTimeout(sidebarOpenTimer)
    sidebarOpenTimer = null
  }
}

// 兼容性的圆点松手Drop逻辑
function handleDropOnPage(pageIndex: number, e: DragEvent) {
  e.preventDefault()
  if (dragItemId.value) {
    moveDragItemToPage(pageIndex)
  }
  dragItemId.value = null
  dragOverItemId.value = null
  clearAllDragTimers()
}

// ── 分类管理函数 ──
function handleAddCategory() {
  const title = prompt('请输入新分类的名称：')
  if (title && title.trim()) {
    addGroup(title.trim())
  }
}

function handleRenameCategory(group: any) {
  const newTitle = prompt('重命名分类为：', group.title)
  if (newTitle && newTitle.trim()) {
    updateGroup(group.id, newTitle.trim())
  }
}

function handleDeleteCategory(groupId: string) {
  deleteGroup(groupId)
  if (activeGroupId.value === groupId) {
    activeGroupId.value = ''
  }
}

function handleDropOnCategory(groupId: string, e: DragEvent) {
  e.preventDefault()
  const itemId = dragItemId.value
  if (itemId) {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.groupId = groupId
    }
  }
  dragItemId.value = null
  dragOverItemId.value = null
  clearAllDragTimers()
}

function getWidgetModalWidth(widgetId: string): string {
  if (!widgetId) return 'max-w-md'
  return 'max-w-5xl'
}

function isWidgetItem(item: any): boolean {
  return item.url && item.url.startsWith('#widget:')
}

function getWidgetIdFromUrl(url: string): string {
  return url.replace('#widget:', '')
}

function handleItemClick(item: any, e: MouseEvent) {
  if (isWidgetItem(item)) {
    e.preventDefault()
    const widgetId = getWidgetIdFromUrl(item.url)
    const widget = availableWidgets.find(w => w.id === widgetId)
    if (widget) {
      openedWidget.value = widget
      showWidgetModal.value = true
    }
  }
}

function handleDeleteItem(item: any) {
  const isWidget = isWidgetItem(item)
  const confirmMsg = isWidget 
    ? `确认停用并从网格中移除“${item.title}”小工具吗？` 
    : `确认删除“${item.title}”导航项目吗？`
  
  if (confirm(confirmMsg)) {
    if (isWidget) {
      const widgetId = getWidgetIdFromUrl(item.url)
      config.value.widgets[widgetId] = false
    } else {
      deleteNavItem(item.id)
    }
  }
}

const { 
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
} = useCloudSync(groups, items, config)

// Canvas Background
const bgCanvas = ref<HTMLCanvasElement | null>(null)
const { paperBgUrl, initCanvas, destroyCanvas } = useCanvasAnimation(bgCanvas)

// Startup Loading state
const isAppLoading = ref(true)

// Local UI Form & Modal state
const showSettings = ref(false)
const showItemModal = ref(false)

const editingItem = ref<any>(null)
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

const importFileRef = ref<HTMLInputElement | null>(null)

// ── Ensure group helper ──
function ensureGroup(): string {
  if (groups.value.length === 0) {
    addGroup('我的导航')
  }
  return groups.value[0]?.id || 'g1'
}

// ── Item Action handlers ──
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
    color: '#2b2b2e',
    size: 'normal'
  }
  showItemModal.value = true
}

const openEditItem = (item: any) => {
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
    updateItem(editingItem.value.id, { ...itemForm.value } as any)
  } else {
    addItem({ ...itemForm.value } as any)
  }
  showItemModal.value = false
}

// ── Drag & Drop Handlers Move to Scripts Top ──

// ── Backup Import handlers ──
function triggerImportClick() {
  importFileRef.value?.click()
}

async function handleImport(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    await importData(file)
    alert('备份导入成功，页面将刷新以应用更改！')
    location.reload()
  } catch (err: any) {
    alert('导入失败：' + (err.message || '文件格式错误'))
  } finally {
    target.value = ''
  }
}

// ── Lifecycle ──
onMounted(async () => {
  loadFromStorage()
  setupPersistence()
  setupAuthListener()
  window.addEventListener('artisan-request-cloud-push', queueCloudPush)

  // Cloud Sync
  if (isLoggedIn()) {
    await pullCloudData(true)
  }
  
  isAppLoading.value = false
  initCanvas()
})

onUnmounted(() => {
  destroyCanvas()
  window.removeEventListener('artisan-request-cloud-push', queueCloudPush)
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
      backgroundImage: paperBgUrl ? `radial-gradient(circle at center, rgba(22, 17, 36, 0.35) 0%, rgba(12, 9, 8, 0.98) 100%), url(${paperBgUrl})` : 'none',
      backgroundSize: 'auto, auto',
      backgroundRepeat: 'no-repeat, repeat'
    }"
  >
    <!-- App Startup Loading Screen -->
    <div 
      v-if="isAppLoading" 
      class="fixed inset-0 z-[9999] bg-[#120e0c] flex flex-col items-center justify-center font-serif text-[#ebdcb9]"
      :style="{
        backgroundImage: paperBgUrl ? `radial-gradient(circle at center, rgba(22, 17, 36, 0.35) 0%, rgba(12, 9, 8, 0.98) 100%), url(${paperBgUrl})` : 'none',
        backgroundSize: 'auto, auto',
        backgroundRepeat: 'no-repeat, repeat'
      }"
    >
      <div class="border border-gold/60 bg-bg-surface px-6 py-3 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(212,175,55,0.15)] flex flex-col items-center gap-4">
        <h1 class="text-2xl font-bold tracking-widest text-gold select-none uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          {{ config.logoText || 'PROSPETTIVA' }}
        </h1>
        <div class="h-[1px] w-32 bg-gradient-to-r from-transparent via-gold/50 to-transparent"></div>
        <p class="text-xs text-[#ebdcb9]/70 tracking-widest animate-pulse font-serif">
          正在对齐乾坤天盘星谱...
        </p>
      </div>
    </div>
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
        <button
          @click="showSettings = true"
          class="h-7 md:h-8 w-7 md:w-8 p-0 shrink-0 border border-gold/45 bg-btn-base text-parchment hover:bg-btn-hover hover:text-gold rounded flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-200"
          title="系统设置"
        >
          <SettingsIcon class="w-4 h-4" />
        </button>
      </div>
    </header>

    <!-- Search Section -->
    <section
      v-if="config.widgets.search"
      class="max-w-7xl mx-auto px-6 mt-5 flex justify-center"
    >
      <component :is="availableWidgets.find(w => w.id === 'search')?.component" />
    </section>
    
    <!-- Main Navigation (App Launcher Grid) -->
    <main class="max-w-7xl mx-auto px-6 mt-8 flex flex-col gap-6 relative z-10">

      <!-- Empty State -->
      <div v-if="items.length === 0" class="text-center py-12 bg-bg-base/30 border border-dashed border-gold/30 rounded p-6 shadow-lg">
        <p class="text-base font-medium mb-4 font-serif text-parchment/80">当前暂无任何导航链接，请添加一个</p>
        <MangaButton @click="openAddItem(groups[0]?.id || 'g1')" bg-class="bg-btn-base hover:bg-btn-hover border-gold/40">
          <PlusIcon class="w-4 h-4" /> 新增导航
        </MangaButton>
      </div>

      <!-- Sidebar Drawer Overlay (Backdrop) -->
      <Transition name="fade">
        <div 
          v-if="showCategorySidebar" 
          @click="showCategorySidebar = false" 
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        ></div>
      </Transition>

      <!-- Left Sidebar Drawer: Category Tabs -->
      <Transition name="slide-drawer">
        <aside 
          v-if="showCategorySidebar" 
          class="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#161210]/95 border-r border-[#d4af37]/35 p-5 shadow-[5px_0_30px_rgba(0,0,0,0.85)] z-[90] flex flex-col gap-4 backdrop-blur-md select-none"
        >
          <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
            <span class="text-xs uppercase tracking-widest text-[#ebdcb9] font-bold font-serif flex items-center gap-1.5">
              🧭 星罗分域
            </span>
            <div class="flex items-center gap-3">
              <button 
                @click="handleAddCategory"
                class="text-[10px] text-gold hover:text-white transition-colors cursor-pointer bg-transparent border-0 outline-none font-serif flex items-center gap-0.5 font-bold"
                title="新增分组分类"
              >
                ➕ 新增
              </button>
              <button 
                @click="showCategorySidebar = false"
                class="text-sm text-[#ebdcb9]/60 hover:text-gold transition-colors cursor-pointer bg-transparent border-0 outline-none font-bold"
                title="收起侧栏"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Tabs list container -->
          <div class="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin select-none">
            <!-- 1. All Categories Tab -->
            <div 
              @click="activeGroupId = ''"
              @dragover.prevent
              @drop="handleDropOnCategory('', $event)"
              class="flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all shrink-0 font-serif font-bold w-full animate-none"
              :class="[activeGroupId === '' ? 'bg-[#6e5020]/45 border-[#d4af37] text-gold shadow-md' : 'border-[#d4af37]/15 text-[#ebdcb9]/60 hover:bg-[#221c19] hover:text-cream']"
            >
              <span class="truncate">🧭 全部展示</span>
              <span class="font-mono text-[10px] opacity-75">({{ items.length }})</span>
            </div>

            <!-- 2. Custom Group Tabs -->
            <div 
              v-for="g in groups"
              :key="g.id"
              @click="activeGroupId = g.id"
              @dragover.prevent
              @drop="handleDropOnCategory(g.id, $event)"
              class="flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all shrink-0 font-serif font-bold w-full group/tab relative animate-none"
              :class="[activeGroupId === g.id ? 'bg-[#6e5020]/45 border-[#d4af37] text-gold shadow-md' : 'border-[#d4af37]/15 text-[#ebdcb9]/60 hover:bg-[#221c19] hover:text-cream']"
            >
              <span class="truncate pr-4">{{ g.title }}</span>
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-[10px] opacity-75">({{ items.filter(i => i.groupId === g.id).length }})</span>
                <!-- Action buttons visible on hover -->
                <div class="hidden group-hover/tab:flex items-center gap-1.5 ml-1">
                  <button 
                    @click.stop="handleRenameCategory(g)" 
                    class="text-[10px] text-[#ebdcb9]/40 hover:text-gold transition-colors bg-transparent border-0 outline-none" 
                    title="重命名"
                  >
                    ✎
                  </button>
                  <button 
                    @click.stop="handleDeleteCategory(g.id)" 
                    class="text-[11px] text-[#ebdcb9]/40 hover:text-status-bad transition-colors bg-transparent border-0 outline-none font-bold" 
                    title="删除分类"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="border-t border-[#d4af37]/20 pt-3 flex flex-col gap-1.5">
            <p class="text-[9px] text-[#ebdcb9]/55 italic font-serif leading-relaxed">
              ※ 您可在此进行星罗分类的创立与更张。拖拽卡片至此分类标签上可快捷归入该域。
            </p>
          </div>
        </aside>
      </Transition>

      <!-- Main Layout: Content Area (Full width) -->
      <div v-if="items.length > 0" class="flex flex-col gap-4 w-full">
        <!-- Top bar with actions -->
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <button 
              @click="showCategorySidebar = true"
              @dragenter="handleSidebarDragEnter"
              @dragleave="handleSidebarDragLeave"
              @dragover.prevent
              class="text-xs bg-[#1a1512]/60 hover:bg-[#6e5020]/45 border border-gold/45 text-gold hover:text-cream px-3 py-1.5 rounded-lg font-serif cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 font-bold shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
            >
              <span>🧭 诸天星罗</span>
              <span class="text-[10px] opacity-75 font-serif font-normal">({{ activeGroupId ? groups.find(g => g.id === activeGroupId)?.title : '全部' }})</span>
            </button>
            <span class="text-[9px] text-[#ebdcb9]/50 font-serif italic hidden md:inline leading-none">
              ※ 拖拽卡片掠过进行手机级排序；悬停下方页码或屏幕左右发光边缘进行自动翻页
            </span>
          </div>
          <MangaButton @click="openAddItem(activeGroupId || groups[0]?.id)" bg-class="bg-btn-base hover:bg-btn-hover border-gold/40" size="sm">
            <PlusIcon class="w-3.5 h-3.5" /> 新增导航
          </MangaButton>
        </div>

        <!-- Right Side Inner Content -->
        <div class="flex flex-col gap-4">

          <!-- Empty Grid Warning -->
          <div v-if="filteredItems.length === 0" class="text-center py-16 bg-bg-base/30 border border-dashed border-gold/30 rounded p-6 shadow-lg font-serif">
            <p class="text-sm font-medium mb-3 text-parchment/70">此分类下暂无任何导航链接</p>
            <MangaButton @click="openAddItem(activeGroupId)" bg-class="bg-btn-base hover:bg-btn-hover border-gold/30" size="sm">
              <PlusIcon class="w-3.5 h-3.5" /> 在此分类中新增
            </MangaButton>
          </div>

          <!-- Icon Grid (Mobile App Launcher Style) -->
          <div v-else class="flex flex-col gap-4 bg-bg-base/20 border border-[#d4af37]/10 p-5 rounded-xl min-h-[220px]">
            <!-- Grid Cards -->
            <div
              class="grid gap-6 md:gap-7"
              :style="{ gridTemplateColumns: `repeat(${config.gridCols ?? 5}, minmax(0, max-content))` }"
            >
                <a v-for="item in paginatedItems" :key="item.id" :href="isWidgetItem(item) ? 'javascript:void(0)' : item.url" :target="isWidgetItem(item) ? '_self' : '_blank'" @click="handleItemClick(item, $event)" :draggable="true" @dragstart="handleItemDragStart(item.id, $event)" @dragover="handleItemDragOver(item.id, $event)" @drop="handleItemDrop(item.id, $event)" @dragend="handleDragEnd" class="flex flex-col items-center gap-1.5 group/card relative select-none w-16 sm:w-20 shrink-0" :class="[dragOverItemId === item.id ? 'opacity-60 scale-95' : '']" :title="item.description || item.title">
              
                <!-- Edit/Delete hover buttons -->
                <div class="absolute -top-2 -right-2 flex gap-1 z-[60] opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-200">
                  <button @click.prevent.stop="openEditItem(item)" class="bg-bg-modal border border-gold/60 p-1 rounded hover:bg-card-walnut text-parchment hover:text-gold transition-all cursor-pointer shadow-md" title="编辑">
                    <EditIcon class="w-3 h-3" />
                  </button>
                  <button @click.prevent.stop="handleDeleteItem(item)" class="bg-bg-modal border border-delete/60 p-1 rounded hover:bg-delete text-delete hover:text-status-bad transition-all cursor-pointer shadow-md" title="删除">
                    <TrashIcon class="w-3 h-3" />
                  </button>
                </div>

                <!-- App Icon Tile -->
                <div
                  class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-gold/25 transition-all duration-300 group-hover/card:scale-110 group-hover/card:shadow-[0_12px_32px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(212,175,55,0.45)] group-hover/card:border-gold/80 group-focus-within/card:scale-110 group-focus-within/card:shadow-[0_12px_32px_rgba(0,0,0,0.8),inset_0_0_0_1.5px_rgba(212,175,55,0.45)] group-focus-within/card:border-gold/80 active:scale-95 cursor-grab active:cursor-grabbing overflow-hidden"
                  :style="{ backgroundColor: item.color }"
                >
                  <!-- 1. Widget OR Explicit Component Icons (Home, Github, etc.) -->
                  <div v-if="isWidgetItem(item) || (item.icon !== 'Link' && item.icon !== 'Letter')" class="text-gold/90 group-hover/card:text-white group-focus-within/card:text-white transition-colors flex items-center justify-center">
                    <component :is="getIconComponent(item.icon)" class="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>

                  <!-- 2. Auto-favicon Mode (icon === 'Link') -->
                  <div v-else-if="item.icon === 'Link'" class="w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <img
                      v-if="getFaviconUrl(item.url) && !faviconErrors[item.id]"
                      :src="getFaviconUrl(item.url)"
                      @error="handleFaviconError(item.id)"
                      class="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] group-hover/card:scale-105 transition-transform duration-300"
                      alt=""
                    />
                    <!-- Fallback: First letter of site name -->
                    <div
                      v-else
                      class="text-cream text-2xl sm:text-3xl font-black font-serif tracking-tighter select-none"
                    >
                      {{ item.title.trim().charAt(0).toUpperCase() }}
                    </div>
                  </div>

                  <!-- 3. Explicit Letter Mode (icon === 'Letter') -->
                  <div v-else-if="item.icon === 'Letter'" class="w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <div
                      class="text-cream text-2xl sm:text-3xl font-black font-serif tracking-tighter select-none"
                    >
                      {{ item.title.trim().charAt(0).toUpperCase() }}
                    </div>
                  </div>
                </div>

                <!-- Label -->
                <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-parchment/85 group-hover/card:text-gold group-focus-within/card:text-gold transition-colors truncate max-w-[64px] sm:max-w-[80px] font-serif">
                  {{ item.title }}
                </span>

                <!-- Hover Tooltip Popup -->
                <div
                  class="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50
                         opacity-0 scale-90 origin-bottom
                         group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto
                         group-focus-within/card:opacity-100 group-focus-within/card:scale-100 group-focus-within/card:pointer-events-auto
                         transition-all duration-200 ease-out"
                  :class="[isWidgetItem(item) ? 'w-72' : 'w-52']"
                >
                  <div
                    class="relative border border-gold/55 rounded text-cream shadow-[0_16px_40px_rgba(0,0,0,0.9)] overflow-hidden p-3"
                    :style="{ backgroundColor: item.color }"
                  >
                    <!-- For Widgets: Live Preview -->
                    <div v-if="isWidgetItem(item)" class="flex flex-col gap-2">
                      <div class="flex items-center gap-2 border-b border-gold/25 pb-1.5 mb-1">
                        <div class="border border-gold/40 bg-bg-base/90 p-1 rounded flex items-center justify-center text-gold shrink-0">
                          <component :is="getIconComponent(item.icon)" class="w-3.5 h-3.5" />
                        </div>
                        <h3 class="text-xs font-bold tracking-wider text-cream font-serif">{{ item.title }}</h3>
                      </div>
                      <!-- Widget content inside tooltip with preview mode -->
                      <component 
                        :is="availableWidgets.find(w => w.id === getWidgetIdFromUrl(item.url))?.component"
                        :preview="true"
                      />
                      <div class="text-[8px] text-gold/50 italic border-t border-gold/15 pt-1.5 text-center mt-1">
                        点击卡片以打开完整面板
                      </div>
                    </div>

                    <!-- For Normal Links: Standard Info -->
                    <div v-else>
                      <div class="flex items-center gap-2">
                        <div class="border border-gold/40 bg-bg-base/90 p-1 rounded flex items-center justify-center text-gold shrink-0 overflow-hidden w-6 h-6">
                          <!-- Explicit Component Icon -->
                          <component v-if="item.icon !== 'Link' && item.icon !== 'Letter'" :is="getIconComponent(item.icon)" class="w-3.5 h-3.5" />
                          
                          <!-- Auto Favicon -->
                          <img 
                            v-else-if="item.icon === 'Link' && getFaviconUrl(item.url) && !faviconErrors[item.id]"
                            :src="getFaviconUrl(item.url)"
                            @error="handleFaviconError(item.id)"
                            class="w-3.5 h-3.5 object-contain rounded-sm"
                            alt=""
                          />
                          
                          <!-- First Letter -->
                          <span v-else class="text-cream text-[10px] font-black font-serif select-none leading-none">
                            {{ item.title.trim().charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <h3 class="text-xs font-bold tracking-wider text-cream font-serif">{{ item.title }}</h3>
                      </div>

                      <p class="text-[9px] text-parchment/85 line-clamp-2 mt-1.5 leading-relaxed font-serif">{{ item.description || '暂无描述信息' }}</p>
                      <div class="flex items-center gap-1 mt-1.5 text-[8px] text-gold/65 font-serif border-t border-gold/15 pt-1.5">
                        <ExternalLinkIcon class="w-2 h-2 text-gold/75 shrink-0" />
                        <span class="truncate">{{ item.url.replace(/^https?:\/\//i, '') }}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    class="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r border-gold/55"
                    :style="{ backgroundColor: item.color }"
                  ></div>
                </div>
            </a>
            </div>

            <!-- Quick Add Tile -->
            <div
              v-if="paginatedItems.length < pageSize"
              @click="openAddItem(activeGroupId || groups[0]?.id)"
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

          <!-- Page Pagination Controls (Phone Launcher Style) -->
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 border-t border-gold/10 pt-4 mt-2 select-none">
            <button 
              @click="currentPage = Math.max(0, currentPage - 1)"
              :disabled="currentPage === 0"
              class="text-xs bg-transparent border-0 text-[#ebdcb9] hover:text-gold disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer font-serif font-bold transition-colors"
            >
              ◀ 前页
            </button>
            
            <div class="flex gap-2">
              <button 
                v-for="p in totalPages" 
                :key="p"
                @click="currentPage = p - 1"
                @dragover.prevent
                @dragenter="handlePageDragEnter(p - 1)"
                @dragleave="handlePageDragLeave"
                @drop="handleDropOnPage(p - 1, $event)"
                class="w-2.5 h-2.5 rounded-full border border-gold/45 cursor-pointer transition-all duration-300"
                :class="[currentPage === p - 1 ? 'bg-gold scale-125 shadow-[0_0_8px_rgba(212,175,55,0.7)]' : 'bg-transparent hover:bg-gold/35']"
                :title="`第 ${p} 页`"
              ></button>
            </div>

            <button 
              @click="currentPage = Math.min(totalPages - 1, currentPage + 1)"
              :disabled="currentPage === totalPages - 1"
              class="text-xs bg-transparent border-0 text-[#ebdcb9] hover:text-gold disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer font-serif font-bold transition-colors"
            >
              后页 ▶
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal for opening full widget view -->
    <MangaModal 
      :show="showWidgetModal" 
      @update:show="showWidgetModal = $event" 
      :title="openedWidget ? openedWidget.name : ''"
      :max-width-class="getWidgetModalWidth(openedWidget?.id)"
    >
      <component 
        v-if="openedWidget && openedWidget.component" 
        :is="openedWidget.component"
      />
    </MangaModal>

    <!-- Footer -->
    <footer class="text-center mt-24 text-xs font-semibold text-[#d4af37]/40 select-none font-serif tracking-widest uppercase">
      <p>Prospettiva 透视法 © 2026 Yibo. All Rights Reserved.</p>
    </footer>

    <!-- Settings Modal -->
    <MangaModal v-model:show="showSettings" title="⚙️ 系统配置中心" max-width-class="max-w-2xl">
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

        <!-- Grid Layout Config -->
        <div class="flex flex-col gap-3 border-b border-[#d4af37]/20 pb-4">
          <div class="flex items-center justify-between">
            <span class="text-sm">图标网格布局</span>
            <span class="text-[10px] text-gold/60 font-serif font-normal">每页 {{ config.gridRows * config.gridCols }} 个图标</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <!-- 行数 -->
            <div class="flex flex-col gap-2">
              <label class="text-xs text-[#ebdcb9]/70 font-serif font-normal">行数（{{ config.gridRows }} 行）</label>
              <div class="flex items-center gap-2">
                <button
                  @click="config.gridRows = Math.max(1, config.gridRows - 1)"
                  class="w-7 h-7 rounded border border-[#d4af37]/40 text-gold hover:bg-[#6e5020]/40 bg-transparent cursor-pointer transition-all flex items-center justify-center font-bold text-sm"
                >−</button>
                <div class="flex-1 text-center text-sm font-serif border border-[#d4af37]/20 rounded py-1 bg-[#120e0c] text-[#f5f2eb]">
                  {{ config.gridRows }}
                </div>
                <button
                  @click="config.gridRows = Math.min(6, config.gridRows + 1)"
                  class="w-7 h-7 rounded border border-[#d4af37]/40 text-gold hover:bg-[#6e5020]/40 bg-transparent cursor-pointer transition-all flex items-center justify-center font-bold text-sm"
                >＋</button>
              </div>
              <input type="range" min="1" max="6" v-model.number="config.gridRows"
                class="w-full accent-[#d4af37] cursor-pointer" />
            </div>
            <!-- 列数 -->
            <div class="flex flex-col gap-2">
              <label class="text-xs text-[#ebdcb9]/70 font-serif font-normal">列数（{{ config.gridCols }} 列）</label>
              <div class="flex items-center gap-2">
                <button
                  @click="config.gridCols = Math.max(2, config.gridCols - 1)"
                  class="w-7 h-7 rounded border border-[#d4af37]/40 text-gold hover:bg-[#6e5020]/40 bg-transparent cursor-pointer transition-all flex items-center justify-center font-bold text-sm"
                >−</button>
                <div class="flex-1 text-center text-sm font-serif border border-[#d4af37]/20 rounded py-1 bg-[#120e0c] text-[#f5f2eb]">
                  {{ config.gridCols }}
                </div>
                <button
                  @click="config.gridCols = Math.min(10, config.gridCols + 1)"
                  class="w-7 h-7 rounded border border-[#d4af37]/40 text-gold hover:bg-[#6e5020]/40 bg-transparent cursor-pointer transition-all flex items-center justify-center font-bold text-sm"
                >＋</button>
              </div>
              <input type="range" min="2" max="10" v-model.number="config.gridCols"
                class="w-full accent-[#d4af37] cursor-pointer" />
            </div>
          </div>
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

        <!-- Backup & Restore -->
        <div class="border-t border-[#d4af37]/20 pt-4 flex flex-col gap-2.5 bg-[#1a1512]/45 p-3.5 rounded border border-[#d4af37]/25 shadow-inner">
          <span class="text-xs text-[#ebdcb9] tracking-wider font-serif mb-1 block">📦 备份与数据迁徙</span>
          <div class="grid grid-cols-2 gap-3">
            <MangaButton 
              @click="triggerImportClick"
              bg-class="bg-btn-base border-gold/40 text-parchment hover:bg-btn-hover hover:text-gold"
              size="sm"
              class="flex items-center justify-center gap-1.5"
            >
              📥 导入备份
            </MangaButton>
            <MangaButton 
              @click="exportData"
              bg-class="bg-btn-base border-gold/40 text-parchment hover:bg-btn-hover hover:text-gold"
              size="sm"
              class="flex items-center justify-center gap-1.5"
            >
              📤 导出备份
            </MangaButton>
          </div>
          <input 
            ref="importFileRef" 
            type="file" 
            accept=".json" 
            class="hidden" 
            @change="handleImport" 
          />
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
            :disabled="!!(itemForm.url && itemForm.url.startsWith('#widget:'))"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#120e0c] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-serif disabled:opacity-50 disabled:cursor-not-allowed" 
          />
          <p v-if="itemForm.url && itemForm.url.startsWith('#widget:')" class="text-[9px] text-gold/60 mt-0.5">
            ※ 此项为小工具组件卡片，地址属性不可变更
          </p>
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
            <option value="Link">🌐 自动获取网站图标 (Favicon)</option>
            <option value="Letter">🔤 显示名称首字 (First Letter)</option>
            <option value="Home">🏠 主页 (Home)</option>
            <option value="Github">💻 GitHub</option>
            <option value="Tv">📺 视频/电视 (Tv)</option>
            <option value="Search">🔍 搜索 (Search)</option>
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

/* Sidebar transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
