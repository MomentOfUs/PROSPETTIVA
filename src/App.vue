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
  FileCode: FileCodeIcon, Wrench: WrenchIcon, Hourglass: HourglassIcon
}

const getIconComponent = (iconName: string) => iconMap[iconName] || LinkIcon

const colorOptions = [
  { label: '黑', value: '#0a0a0a' },
  { label: '深灰', value: '#1a1a1a' },
  { label: '炭', value: '#262626' },
  { label: '暗', value: '#111111' },
  { label: '墨', value: '#0d0d0d' },
  { label: '石', value: '#1f1f1f' }
]

const { 
  groups, items, config, loadFromStorage, setupPersistence, resetAll, 
  addItem, updateItem, deleteItem: deleteNavItem, addGroup, updateGroup,
  deleteGroup, exportData, importData 
} = useNavData()

const showWidgetModal = ref(false)
const openedWidget = ref<any>(null)
const faviconErrors = ref<Record<string, boolean>>({})

function handleFaviconError(itemId: string) { faviconErrors.value[itemId] = true }

function hasChinese(text: string): boolean {
  return /[一-鿿㐀-䶿]/.test(text)
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

const activeGroupId = ref<string>('')
const showCategorySidebar = ref(false)
const currentPage = ref(0)
const pageSize = computed(() => (config.value.gridRows ?? 3) * (config.value.gridCols ?? 5))
const filteredItems = computed(() => !activeGroupId.value ? items.value : items.value.filter(i => i.groupId === activeGroupId.value))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize.value)))
const paginatedItems = computed(() => filteredItems.value.slice(currentPage.value * pageSize.value, currentPage.value * pageSize.value + pageSize.value))

watch(activeGroupId, () => { currentPage.value = 0 })
watch(pageSize, () => { currentPage.value = 0 })

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
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) }
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
  const title = prompt('请输入新分类的名称：')
  if (title && title.trim()) addGroup(title.trim())
}

function handleRenameCategory(group: any) {
  const newTitle = prompt('重命名分类为：', group.title)
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
  const confirmMsg = isWidget ? `[ DESTROY ] "${item.title}" ?` : `[ DESTROY ] "${item.title}" ?`
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
  icon: 'Link', color: '#0a0a0a', size: 'normal' as 'normal' | 'wide'
})
const importFileRef = ref<HTMLInputElement | null>(null)

function ensureGroup(): string {
  if (groups.value.length === 0) addGroup('我的导航')
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
  try { await importData(file); alert('[OK] IMPORT_COMPLETE'); location.reload() }
  catch (err: any) { alert('[ERROR] IMPORT_FAIL: ' + (err.message || 'PARSE_ERROR')) }
  finally { target.value = '' }
}

onMounted(async () => {
  loadFromStorage(); setupPersistence(); setupAuthListener()
  window.addEventListener('artisan-request-cloud-push', queueCloudPush)
  if (isLoggedIn()) await pullCloudData(true)
  isAppLoading.value = false; initCanvas()
})

onUnmounted(() => {
  destroyCanvas()
  window.removeEventListener('artisan-request-cloud-push', queueCloudPush)
})
</script>

<template>
  <div class="min-h-screen text-neutral-300 pb-16 relative overflow-x-hidden bg-base scanlines">

    <!-- Loading Screen -->
    <div v-if="isAppLoading" class="fixed inset-0 z-[9999] bg-base flex flex-col items-center justify-center">
      <div class="border border-accent bg-base px-8 py-6 flex flex-col items-center gap-4" style="min-width:320px">
        <div class="text-[10px] text-neutral-600 tracking-widest mb-1">SYSTEM BOOT</div>
        <h1 class="text-xl font-bold tracking-[0.25em] text-accent select-none uppercase">
          {{ config.logoText || 'DASHBOARD' }}
        </h1>
        <div class="w-full border-t border-line"></div>
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 bg-accent cursor-blink-accent"></span>
          <p class="text-[11px] text-accent tracking-[0.2em]">INITIALIZING...</p>
        </div>
        <div class="text-[9px] text-neutral-700 tracking-widest">PLEASE_WAIT &gt;&gt;</div>
      </div>
    </div>

    <!-- Canvas -->
    <canvas ref="bgCanvas" class="fixed inset-0 pointer-events-none z-0 opacity-10"></canvas>

    <!-- Header -->
    <header class="border-b-2 border-line relative z-20 bg-[#0a0a0a]">
      <!-- Top strip -->
      <div class="border-b border-line px-4 py-1 flex items-center gap-3">
        <span class="text-[9px] text-accent tracking-widest">❯ DASHBOARD://HOME</span>
        <span class="text-[9px] text-neutral-500 tracking-widest hidden sm:inline">PID:01 | MEM:OK | NET:UP</span>
        <div class="ml-auto flex items-center gap-4">
          <span class="text-[9px] text-neutral-500 tracking-widest hidden md:inline">{{ new Date().toISOString().replace('T',' ').slice(0,19) }}</span>
          <div class="flex gap-1.5">
            <span class="w-2 h-2 bg-neutral-600 inline-block"></span>
            <span class="w-2 h-2 bg-accent inline-block"></span>
            <span class="w-2 h-2 bg-white inline-block"></span>
          </div>
        </div>
      </div>
      <!-- Main header row -->
      <div class="max-w-[90rem] mx-auto px-4 py-2 flex flex-row items-center gap-3">
        <span class="text-line text-sm hidden sm:inline">//</span>
        <component
          v-if="config.widgets.clock"
          :is="availableWidgets.find(w => w.id === 'clock')?.component"
          :compact="true"
        />
        <div class="flex-1 min-w-0"></div>
        <!-- Cloud Sync Button -->
        <button
          @click="showAuthModal = true"
          class="border border-line bg-[#111] text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 px-3 py-1.5 text-[10px] font-bold tracking-widest cursor-pointer transition-none flex items-center gap-1.5 glitch-on-click"
          :title="isUserLoggedIn ? 'SYNC:CONNECTED — ' + loggedInUser : 'SYNC:OFFLINE'"
        >
          <span class="w-1.5 h-1.5 inline-block" :class="isUserLoggedIn ? 'bg-white' : 'bg-neutral-700'"></span>
          <span>{{ isUserLoggedIn ? loggedInUser.toUpperCase() : 'SYNC' }}</span>
        </button>
        <!-- Settings Button -->
        <button
          @click="showSettings = true"
          class="border border-line bg-[#111] text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 w-8 h-8 flex items-center justify-center cursor-pointer transition-none glitch-on-click"
          title="SETTINGS"
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
        <p class="text-sm mb-4 text-neutral-400">// EMPTY_GRID //</p>
        <MangaButton @click="openAddItem(groups[0]?.id || 'g1')">
          <PlusIcon class="w-4 h-4" /> [ + MOUNT ]
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
          class="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#0d0d0d] border-r-2 border-accent p-5 z-[90] flex flex-col gap-4 select-none"
        >
          <div class="flex items-center justify-between border-b border-line pb-3">
            <span class="text-xs uppercase tracking-widest text-accent font-bold">CATEGORIES</span>
            <div class="flex items-center gap-3">
              <button @click="handleAddCategory" class="text-[10px] text-accent hover:text-white transition-none cursor-pointer bg-transparent border-0 outline-none font-bold">+ ADD</button>
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
              <span class="truncate uppercase tracking-widest">ALL</span>
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
              <span class="truncate pr-4 uppercase tracking-wider">{{ g.title }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] opacity-75">({{ items.filter(i => i.groupId === g.id).length }})</span>
                <div class="hidden group-hover/tab:flex items-center gap-1.5 ml-1">
                  <button @click.stop="handleRenameCategory(g)" class="text-[10px] text-neutral-500 hover:text-white transition-none bg-transparent border-0 outline-none" title="重命名">✎</button>
                  <button @click.stop="handleDeleteCategory(g.id)" class="text-[11px] text-neutral-500 hover:text-white transition-none bg-transparent border-0 outline-none font-bold" title="[ DESTROY ]">×</button>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-line pt-3">
            <p class="text-[9px] text-neutral-500 leading-relaxed">// DRAG CARD TO CATEGORY TO ASSIGN</p>
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
              class="text-xs bg-surface hover:bg-neutral-200 hover:text-black border border-line hover:border-neutral-200 text-neutral-400 px-3 py-1.5 cursor-pointer transition-none flex items-center gap-1.5 font-bold uppercase tracking-widest"
            >
              <span>CATEGORIES</span>
              <span class="text-[10px] opacity-75 font-normal">({{ activeGroupId ? groups.find(g => g.id === activeGroupId)?.title : 'ALL' }})</span>
            </button>
          </div>
          <MangaButton @click="openAddItem(activeGroupId || groups[0]?.id)" size="sm">
            <PlusIcon class="w-3.5 h-3.5" /> [ + MOUNT ]
          </MangaButton>
        </div>

        <!-- Right Side Content -->
        <div class="flex flex-col gap-4">
          <!-- Empty Grid -->
          <div v-if="filteredItems.length === 0" class="text-center py-16 border border-dashed border-line p-6">
            <p class="text-sm mb-3 text-neutral-400">// EMPTY_CATEGORY //</p>
            <MangaButton @click="openAddItem(activeGroupId)" size="sm">
              <PlusIcon class="w-3.5 h-3.5" /> [ + MOUNT ]
            </MangaButton>
          </div>

          <!-- Icon Grid -->
          <div v-else class="flex flex-col gap-4 min-h-[220px]">
            <div
              class="grid bg-neutral-800 gap-px p-4"
              :style="{ gridTemplateColumns: `repeat(${config.gridCols ?? 5}, minmax(0, 1fr))` }"
            >
              <a v-for="item in paginatedItems" :key="item.id"
                :href="isWidgetItem(item) ? 'javascript:void(0)' : item.url"
                :target="isWidgetItem(item) ? '_self' : '_blank'"
                @click="handleItemClick(item, $event)"
                :draggable="true"
                @dragstart="handleItemDragStart(item.id, $event)"
                @dragover="handleItemDragOver(item.id, $event)"
                @drop="handleItemDrop(item.id, $event)"
                @dragend="handleDragEnd"
                class="flex flex-col items-center gap-1.5 group/card relative select-none w-16 sm:w-20 shrink-0 bg-surface"
                :class="[dragOverItemId === item.id ? 'opacity-50' : '']"
                :title="item.description || item.title"
              >
                <!-- Edit/Delete hover buttons -->
                <div class="absolute -top-2 -right-2 flex gap-1 z-[60] opacity-0 group-hover/card:opacity-100 transition-none">
                  <button @click.prevent.stop="openEditItem(item)" class="bg-base border border-line p-1 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 text-neutral-500 transition-none cursor-pointer" title="[ EDIT ]">
                    <EditIcon class="w-3 h-3" />
                  </button>
                  <button @click.prevent.stop="handleDeleteItem(item)" class="bg-base border border-line p-1 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 text-neutral-500 transition-none cursor-pointer" title="[ DESTROY ]">
                    <TrashIcon class="w-3 h-3" />
                  </button>
                </div>

                <!-- App Icon Tile -->
                <div
                  class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transition-none group-hover/card:bg-neutral-200 group-hover/card:scale-110 active:scale-95 cursor-grab active:cursor-grabbing overflow-hidden"
                  :style="{ backgroundColor: item.color }"
                >
                  <div v-if="isWidgetItem(item) || (item.icon !== 'Link' && item.icon !== 'Letter')" class="group-hover/card:text-black transition-none flex items-center justify-center"
                    :style="{ color: getIconColor(item.color) }">
                    <component :is="getIconComponent(item.icon)" class="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div v-else-if="item.icon === 'Link'" class="w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <img v-if="getFaviconUrl(item.url) && !faviconErrors[item.id]"
                      :src="getFaviconUrl(item.url)"
                      @error="handleFaviconError(item.id)"
                      class="w-8 h-8 sm:w-10 sm:h-10 object-contain transition-none"
                      alt=""
                    />
                    <div v-else class="group-hover/card:text-black text-2xl sm:text-3xl font-black tracking-tighter select-none"
                      :style="{ color: getIconColor(item.color) }">
                      {{ item.title.trim().charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div v-else-if="item.icon === 'Letter'" class="w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <div class="group-hover/card:text-black text-2xl sm:text-3xl font-black tracking-tighter select-none"
                      :style="{ color: getIconColor(item.color) }">
                      {{ item.title.trim().charAt(0).toUpperCase() }}
                    </div>
                  </div>
                </div>

                <!-- Label -->
                <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-neutral-400 group-hover/card:text-black transition-none truncate max-w-[80px] sm:max-w-[100px] uppercase flex items-center gap-0">
                  <span v-if="hasChinese(item.title)" class="text-neutral-600 group-hover/card:text-black">[</span>
                  <span class="truncate">{{ item.title }}</span>
                  <span v-if="hasChinese(item.title)" class="text-neutral-600 group-hover/card:text-black">]</span>
                </span>

                <!-- Hover Tooltip -->
                <div
                  class="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-[9999]
                         opacity-0 origin-bottom bg-[#141414] border-2 border-[#3a3a3a] p-3
                         group-hover/card:opacity-100 group-hover/card:pointer-events-auto
                         group-focus-within/card:opacity-100 group-focus-within/card:pointer-events-auto"
                  :class="[isWidgetItem(item) ? 'w-72' : 'w-52']"
                >
                  <div class="relative">
                    <div v-if="isWidgetItem(item)" class="flex flex-col gap-2">
                      <div class="flex items-center gap-2 border-b border-line pb-1.5 mb-1">
                        <div class="border border-line bg-[#0a0a0a] p-1 flex items-center justify-center text-accent shrink-0">
                          <component :is="getIconComponent(item.icon)" class="w-3.5 h-3.5" />
                        </div>
                        <h3 class="text-xs font-bold tracking-wider text-neutral-200 uppercase">{{ item.title }}</h3>
                      </div>
                      <component :is="availableWidgets.find(w => w.id === getWidgetIdFromUrl(item.url))?.component" :preview="true" />
                      <div class="text-[8px] text-neutral-500 border-t border-line pt-1.5 text-center mt-1 uppercase tracking-widest">CLICK TO OPEN</div>
                    </div>
                    <div v-else>
                      <div class="flex items-center gap-2">
                        <div class="border border-line bg-[#0a0a0a] p-1 flex items-center justify-center text-accent shrink-0 overflow-hidden w-6 h-6">
                          <component v-if="item.icon !== 'Link' && item.icon !== 'Letter'" :is="getIconComponent(item.icon)" class="w-3.5 h-3.5" />
                          <img v-else-if="item.icon === 'Link' && getFaviconUrl(item.url) && !faviconErrors[item.id]"
                            :src="getFaviconUrl(item.url)" @error="handleFaviconError(item.id)" class="w-3.5 h-3.5 object-contain" alt="" />
                          <span v-else class="text-neutral-300 text-[10px] font-black select-none leading-none">{{ item.title.trim().charAt(0).toUpperCase() }}</span>
                        </div>
                        <h3 class="text-xs font-bold tracking-wider text-neutral-200 uppercase">{{ item.title }}</h3>
                      </div>
                      <p class="text-[9px] text-neutral-400 line-clamp-2 mt-1.5 leading-relaxed">{{ item.description || '// NO_DESC //' }}</p>
                      <div class="flex items-center gap-1 mt-1.5 text-[8px] text-neutral-500 border-t border-line pt-1.5">
                        <ExternalLinkIcon class="w-2 h-2 text-accent shrink-0" />
                        <span class="truncate">{{ item.url.replace(/^https?:\/\//i, '') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b-2 border-r-2 border-[#3a3a3a] bg-[#141414]"></div>
                </div>
              </a>
            </div>

            <!-- Quick Add Tile -->
            <div v-if="paginatedItems.length < pageSize"
              @click="openAddItem(activeGroupId || groups[0]?.id)"
              class="flex flex-col items-center gap-1.5 group/card cursor-pointer select-none"
            >
              <div class="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-line flex items-center justify-center bg-surface hover:bg-neutral-200 transition-none">
                <PlusIcon class="w-6 h-6 sm:w-8 sm:h-8 text-neutral-600 group-hover/card:text-black" />
              </div>
              <span class="text-[10px] sm:text-xs font-bold tracking-wide text-center text-neutral-500 group-hover/card:text-black transition-none uppercase">ADD</span>
            </div>
          </div>

          <!-- Page Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 border-t border-border-dim pt-4 mt-2 select-none">
            <button @click="currentPage = Math.max(0, currentPage - 1)" :disabled="currentPage === 0"
              class="text-xs bg-transparent border-0 text-neutral-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold transition-none uppercase tracking-widest">
              ◀ PREV
            </button>
            <div class="flex gap-2">
              <button v-for="p in totalPages" :key="p"
                @click="currentPage = p - 1"
                @dragover.prevent
                @dragenter="handlePageDragEnter(p - 1)"
                @dragleave="handlePageDragLeave"
                @drop="handleDropOnPage(p - 1, $event)"
                class="w-3 h-3 border border-line cursor-pointer transition-none"
                :class="[currentPage === p - 1 ? 'bg-accent border-accent' : 'bg-transparent hover:bg-neutral-200 hover:border-neutral-200']"
                :title="`Page ${p}`"
              ></button>
            </div>
            <button @click="currentPage = Math.min(totalPages - 1, currentPage + 1)" :disabled="currentPage === totalPages - 1"
              class="text-xs bg-transparent border-0 text-neutral-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold transition-none uppercase tracking-widest">
              NEXT ▶
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Widget Modal -->
    <MangaModal :show="showWidgetModal" @update:show="showWidgetModal = $event" :title="openedWidget ? openedWidget.name : ''" :max-width-class="getWidgetModalWidth(openedWidget?.id)">
      <component v-if="openedWidget && openedWidget.component" :is="openedWidget.component" />
    </MangaModal>

    <!-- Footer -->
    <footer class="text-center mt-24 text-xs text-neutral-700 select-none tracking-widest uppercase">
      <p>DASHBOARD © 2026</p>
    </footer>

    <!-- Settings Modal -->
    <MangaModal v-model:show="showSettings" title="SYSTEM CONFIG" max-width-class="max-w-2xl">
      <div class="flex flex-col gap-5 text-sm">
        <!-- Logo Text -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest">LOGO TEXT</label>
          <input v-model="config.logoText" type="text"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
        </div>

        <!-- Pattern selector -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest">BACKGROUND PATTERN</label>
          <select v-model="config.backgroundPattern"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option value="dots">Dots</option>
            <option value="grid">Grid</option>
            <option value="none">None</option>
          </select>
        </div>

        <!-- Font toggle -->
        <div class="flex justify-between items-center border-b border-line pb-4">
          <span class="text-xs text-neutral-500 uppercase tracking-widest">MONOSPACE ENFORCED</span>
          <span class="text-xs text-accent">ALWAYS ON</span>
        </div>

        <!-- Grid Layout -->
        <div class="flex flex-col gap-3 border-b border-line pb-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-neutral-500 uppercase tracking-widest">ICON GRID</span>
            <span class="text-[10px] text-neutral-600">{{ config.gridRows * config.gridCols }} ICONS/PAGE</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] text-neutral-600 uppercase tracking-widest">ROWS ({{ config.gridRows }})</label>
              <div class="flex items-center gap-2">
                <button @click="config.gridRows = Math.max(1, config.gridRows - 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">−</button>
                <div class="flex-1 text-center text-sm border border-line py-1 bg-base text-neutral-300">{{ config.gridRows }}</div>
                <button @click="config.gridRows = Math.min(12, config.gridRows + 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">+</button>
              </div>
              <input type="range" min="1" max="12" v-model.number="config.gridRows" class="w-full accent-[#FF5F1F] cursor-pointer" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[10px] text-neutral-600 uppercase tracking-widest">COLS ({{ config.gridCols }})</label>
              <div class="flex items-center gap-2">
                <button @click="config.gridCols = Math.max(2, config.gridCols - 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">−</button>
                <div class="flex-1 text-center text-sm border border-line py-1 bg-base text-neutral-300">{{ config.gridCols }}</div>
                <button @click="config.gridCols = Math.min(16, config.gridCols + 1)"
                  class="w-7 h-7 border border-line text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 bg-transparent cursor-pointer transition-none flex items-center justify-center font-bold text-sm">+</button>
              </div>
              <input type="range" min="2" max="16" v-model.number="config.gridCols" class="w-full accent-[#FF5F1F] cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Widget controls -->
        <div class="flex flex-col gap-3">
          <span class="text-xs text-neutral-500 uppercase tracking-widest">WIDGETS</span>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="widget in availableWidgets" :key="widget.id"
              class="border border-line p-2.5 bg-surface flex items-center justify-between text-neutral-300">
              <span class="text-xs">{{ widget.name }}</span>
              <input type="checkbox" v-model="config.widgets[widget.id]" class="accent-[#FF5F1F] w-4 h-4 cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- AI API Config -->
        <div class="border-t border-line pt-4 flex flex-col gap-3">
          <span class="text-xs text-neutral-500 uppercase tracking-widest">AI API CONFIG</span>
          <div class="flex flex-col gap-2 bg-surface border border-line p-3">
            <div class="flex flex-col gap-1 text-xs">
              <label class="text-neutral-500 uppercase tracking-widest text-[10px]">API KEY</label>
              <input v-model="config.openaiKey" type="password" placeholder="sk-..."
                class="border border-line p-1.5 bg-base text-neutral-300 font-mono outline-none focus:border-accent transition-none" />
            </div>
            <div class="flex flex-col gap-1 text-xs mt-1">
              <label class="text-neutral-500 uppercase tracking-widest text-[10px]">API BASE URL</label>
              <input v-model="config.openaiBase" type="text" placeholder="https://api.deepseek.com"
                class="border border-line p-1.5 bg-base text-neutral-300 font-mono outline-none focus:border-accent transition-none" />
            </div>
            <div class="flex flex-col gap-1 text-xs mt-1">
              <label class="text-neutral-500 uppercase tracking-widest text-[10px]">MODEL NAME</label>
              <input v-model="config.openaiModel" type="text" placeholder="deepseek-chat"
                class="border border-line p-1.5 bg-base text-neutral-300 font-mono outline-none focus:border-accent transition-none" />
            </div>
          </div>
        </div>

        <!-- Backup & Restore -->
        <div class="border-t border-line pt-4 flex flex-col gap-2.5 p-3 border border-border-dim">
          <span class="text-xs text-neutral-500 uppercase tracking-widest mb-1 block">BACKUP & RESTORE</span>
          <div class="grid grid-cols-2 gap-3">
            <MangaButton @click="triggerImportClick" size="sm" class="flex items-center justify-center gap-1.5">IMPORT</MangaButton>
            <MangaButton @click="exportData" size="sm" class="flex items-center justify-center gap-1.5">EXPORT</MangaButton>
          </div>
          <input ref="importFileRef" type="file" accept=".json" class="hidden" @change="handleImport" />
        </div>

        <!-- Danger zone -->
        <div class="border-t border-line pt-4 flex justify-between gap-4">
          <MangaButton @click="resetAll" size="sm">RESET ALL</MangaButton>
          <MangaButton @click="showSettings = false" size="sm">[ COMMIT ]</MangaButton>
        </div>
      </div>
    </MangaModal>

    <!-- Cloud Sync Modal -->
    <MangaModal v-model:show="showAuthModal" :title="isUserLoggedIn ? 'CLOUD SYNC' : 'LOGIN'">
      <div class="flex flex-col gap-4 text-sm">
        <!-- Logged In View -->
        <div v-if="isUserLoggedIn" class="flex flex-col gap-4 py-2">
          <div class="border border-line bg-surface p-3.5 text-center flex flex-col gap-1.5">
            <span class="text-[10px] text-neutral-600 tracking-widest uppercase">SYNC STATUS</span>
            <p class="text-sm text-neutral-300">ACCOUNT: <span class="text-accent font-bold">{{ loggedInUser }}</span></p>
            <p class="text-[10px] text-neutral-500 leading-relaxed mt-1">AUTO_PUSH: ENABLED</p>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-1">
            <button @click="pullCloudData(false)" :disabled="isSyncing"
              class="border border-line py-2 text-xs bg-base text-neutral-400 hover:bg-neutral-200 hover:text-black transition-none cursor-pointer text-center font-bold disabled:opacity-50">
              PULL FROM CLOUD
            </button>
            <button @click="pushCloudData" :disabled="isSyncing"
              class="border border-line py-2 text-xs bg-base text-neutral-400 hover:bg-neutral-200 hover:text-black transition-none cursor-pointer text-center font-bold disabled:opacity-50">
              PUSH TO CLOUD
            </button>
          </div>
          <p v-if="syncMessage" class="text-[9.5px] text-accent text-center font-mono mt-0.5">{{ syncMessage }}</p>
          <div class="border-t border-line pt-4 flex justify-between gap-4 mt-2">
            <MangaButton @click="handleLogout" size="sm">AUTH_LOGOUT</MangaButton>
            <MangaButton @click="showAuthModal = false" size="sm">[ ABORT ]</MangaButton>
          </div>
        </div>

        <!-- Auth Login Form -->
        <div v-else class="flex flex-col gap-3">
          <div class="border border-line bg-surface p-3 text-center">
            <span class="text-[10px] text-neutral-600 tracking-widest uppercase block mb-1">DEMO LOGIN</span>
            <p class="text-xs text-neutral-400 leading-relaxed">REGISTRATION: LOCKED // DEFAULT_ACCOUNT: PRELOADED</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">USERNAME</label>
            <input v-model="authForm.username" type="text" placeholder="username"
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">PASSWORD</label>
            <input v-model="authForm.password" type="password" placeholder="password"
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none font-mono" />
          </div>
          <p v-if="authError" class="text-[10px] text-accent text-center tracking-wider mt-1">{{ authError }}</p>
          <p v-if="syncMessage" class="text-[9.5px] text-accent text-center font-mono mt-0.5">{{ syncMessage }}</p>
          <div class="border-t border-line pt-4 flex justify-end gap-3 mt-2">
            <MangaButton @click="showAuthModal = false" size="sm">[ ABORT ]</MangaButton>
            <MangaButton @click="handleAuthSubmit" :disabled="isSyncing" size="sm">AUTH_LOGIN</MangaButton>
          </div>
        </div>
      </div>
    </MangaModal>

    <!-- Nav Item Add/Edit Modal -->
    <MangaModal v-model:show="showItemModal" :title="editingItem ? 'EDIT LINK' : 'ADD LINK'">
      <div class="flex flex-col gap-4 text-sm">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">GROUP</label>
          <select v-model="itemForm.groupId"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.title }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">TITLE</label>
          <input v-model="itemForm.title" type="text" placeholder="e.g. GitHub"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">URL</label>
          <input v-model="itemForm.url" type="text" placeholder="https://..."
            :disabled="!!(itemForm.url && itemForm.url.startsWith('#widget:'))"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none disabled:opacity-50 disabled:cursor-not-allowed" />
          <p v-if="itemForm.url && itemForm.url.startsWith('#widget:')" class="text-[9px] text-neutral-600 mt-0.5">WIDGET COMPONENT — URL CANNOT BE CHANGED</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">DESCRIPTION</label>
          <input v-model="itemForm.description" type="text" placeholder="optional description"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">ICON</label>
          <select v-model="itemForm.icon"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option value="Link">AUTO (FAVICON)</option>
            <option value="Letter">FIRST LETTER</option>
            <option value="Home">HOME</option>
            <option value="Github">GITHUB</option>
            <option value="Tv">TV</option>
            <option value="Search">SEARCH</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">SIZE</label>
          <select v-model="itemForm.size"
            class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent transition-none">
            <option value="normal">NORMAL</option>
            <option value="wide">WIDE (2 COL)</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs text-neutral-500 uppercase tracking-widest text-[10px]">BACKGROUND</label>
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
          <MangaButton @click="showItemModal = false" size="sm">[ ABORT ]</MangaButton>
          <MangaButton @click="saveItem" size="sm">[ COMMIT ]</MangaButton>
        </div>
      </div>
    </MangaModal>
  </div>
</template>
