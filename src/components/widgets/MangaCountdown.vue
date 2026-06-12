<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { triggerCloudPush } from '../../utils/api'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

interface Countdown {
  id: string
  title: string
  targetDate: string
  category: string
}

const countdowns = ref<Countdown[]>([])
const isEditMode = ref(false)
const showAddForm = ref(false)

const newTitle = ref('')
const newDate = ref(getTodayString())
const newCategory = ref('工作')

function getTodayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function loadCountdowns() {
  const stored = localStorage.getItem('manga_widget_countdowns')
  if (stored) {
    try {
      countdowns.value = JSON.parse(stored)
    } catch {
      countdowns.value = []
    }
  } else {
    countdowns.value = [
      { id: 'c1', title: '下个发薪日', targetDate: getNextPayday(), category: '生活' },
      { id: 'c2', title: '期待的周末', targetDate: getNextSaturday(), category: '生活' },
      { id: 'c3', title: '项目上线交付', targetDate: getMilestoneDate(10), category: '工作' }
    ]
  }
}

function getNextPayday() {
  const now = new Date()
  let y = now.getFullYear()
  let m = now.getMonth()
  if (now.getDate() >= 10) {
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
  }
  return `${y}-${String(m + 1).padStart(2, '0')}-10`
}

function getNextSaturday() {
  const now = new Date()
  const resultDate = new Date(now)
  resultDate.setDate(now.getDate() + (6 - now.getDay() + 7) % 7)
  const y = resultDate.getFullYear()
  const m = String(resultDate.getMonth() + 1).padStart(2, '0')
  const d = String(resultDate.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMilestoneDate(daysFromNow: number) {
  const target = new Date()
  target.setDate(target.getDate() + daysFromNow)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

onMounted(() => {
  loadCountdowns()
  window.addEventListener('artisan-cloud-data-pulled', loadCountdowns)
})

onUnmounted(() => {
  window.removeEventListener('artisan-cloud-data-pulled', loadCountdowns)
})

watch(countdowns, (newVal) => {
  localStorage.setItem('manga_widget_countdowns', JSON.stringify(newVal))
  triggerCloudPush()
}, { deep: true })

function getDaysRemaining(targetStr: string) {
  if (!targetStr) return 0
  const target = new Date(targetStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function addCountdown() {
  if (!newTitle.value.trim() || !newDate.value) {
    alert('[ERROR] TITLE_AND_DATE_REQUIRED')
    return
  }

  countdowns.value.push({
    id: Date.now().toString(),
    title: newTitle.value.trim(),
    targetDate: newDate.value,
    category: newCategory.value
  })

  newTitle.value = ''
  newDate.value = getTodayString()
  newCategory.value = '工作'
  showAddForm.value = false
}

function deleteCountdown(id: string) {
  if (confirm('[ DESTROY ] ?')) {
    countdowns.value = countdowns.value.filter(c => c.id !== id)
  }
}

const sortedCountdowns = computed(() => {
  return [...countdowns.value].sort((a, b) => {
    const daysA = getDaysRemaining(a.targetDate)
    const daysB = getDaysRemaining(b.targetDate)
    
    if (daysA >= 0 && daysB >= 0) return daysA - daysB
    if (daysA < 0 && daysB < 0) return daysB - daysA
    return daysA >= 0 ? -1 : 1
  })
})

const stats = computed(() => {
  const list = countdowns.value
  const total = list.length
  if (total === 0) return { active: 0, today: 0, past: 0, activePercent: 0 }
  
  let active = 0
  let today = 0
  let past = 0
  
  list.forEach(c => {
    const days = getDaysRemaining(c.targetDate)
    if (days > 0) active++
    else if (days === 0) today++
    else past++
  })
  
  const activePercent = Math.round((active / total) * 100)
  return { active, today, past, activePercent }
})
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 text-[10px] w-full text-left font-mono select-none">
    <div 
      v-for="cd in sortedCountdowns" 
      :key="cd.id"
      class="flex justify-between items-center bg-surface border p-1 border-line"
      :class="[
        getDaysRemaining(cd.targetDate) <= 3 && getDaysRemaining(cd.targetDate) > 0 
          ? 'border-status-bad' 
          : 'border-line',
        getDaysRemaining(cd.targetDate) <= 0 ? 'opacity-40' : ''
      ]"
    >
      <div class="flex items-center gap-1 min-w-0 flex-1">
        <span class="truncate text-neutral-400">{{ cd.title }}</span>
      </div>
      <div class="text-right shrink-0 ml-2 font-mono text-[9px] font-bold">
        <span v-if="getDaysRemaining(cd.targetDate) > 0" :class="[getDaysRemaining(cd.targetDate) <= 3 ? 'text-status-bad' : 'text-accent']">
          {{ getDaysRemaining(cd.targetDate) }}天
        </span>
        <span v-else-if="getDaysRemaining(cd.targetDate) === 0" class="text-green-400">
          今天
        </span>
        <span v-else class="text-neutral-600">
          已过
        </span>
      </div>
    </div>
    <div v-if="countdowns.length === 0" class="text-center text-[9px] text-neutral-600 py-2">
      // EMPTY //
    </div>
  </div>

  <!-- Full Mode: SPA Layout -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-mono text-neutral-300">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-400">[ TIMER ]</span>
      <div class="flex items-center gap-1.5">
        <button 
          @click="isEditMode = !isEditMode" 
          class="text-xs px-2.5 py-0.5 border bg-transparent transition-none cursor-pointer border-line"
          :class="[isEditMode ? 'bg-status-bad border-status-bad text-white' : 'border-line text-accent hover:text-black/80']"
          title="[ EDIT ]"
        >
          {{ isEditMode ? '[ OK ]' : '[ EDIT ]' }}
        </button>
        <button 
          @click="showAddForm = !showAddForm; isEditMode = false" 
          class="text-xs px-2.5 py-0.5 border border-line text-accent hover:text-black/80 bg-transparent transition-none cursor-pointer"
          title="添加倒计时"
        >
          {{ showAddForm ? '取消' : '定新约' }}
        </button>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Left 2 columns: Form & Stats -->
      <div class="lg:col-span-2 flex flex-col gap-4">
        <!-- Add Form -->
        <div v-if="showAddForm" class="flex flex-col gap-3 border border-line p-3.5 bg-surface text-xs">
          <span class="text-[10px] text-accent tracking-widest uppercase font-bold">// 订立新星相契约</span>
          <div class="flex flex-col gap-1.5">
            <label class="text-neutral-500 text-[10px] uppercase tracking-widest">事件目标</label>
            <input 
              v-model="newTitle" 
              type="text" 
              placeholder="例如: 期待的周末、发薪日" 
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent text-xs font-mono"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-neutral-500 text-[10px] uppercase tracking-widest">目标日期</label>
            <input 
              v-model="newDate" 
              type="date" 
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent font-mono text-xs"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-neutral-500 text-[10px] uppercase tracking-widest">类型标签</label>
            <select 
              v-model="newCategory" 
              class="border border-line p-2 bg-base text-neutral-300 outline-none focus:border-accent text-xs font-mono"
            >
              <option value="工作">💼 工作</option>
              <option value="生活">🏠 生活</option>
              <option value="节日">🎉 节日</option>
            </select>
          </div>
          <button 
            @click="addCountdown" 
            class="bg-base text-accent hover:text-black/80 border border-line py-2 font-bold cursor-pointer transition-none mt-1"
          >
            定下契约
          </button>
        </div>

        <!-- Stats Panel -->
        <div class="border border-line p-4 bg-surface flex flex-col gap-3.5">
          <div class="border-b border-line pb-1.5 flex justify-between items-center">
            <span class="text-xs font-semibold text-neutral-400 tracking-widest uppercase">🪐 命途星纪统计</span>
          </div>
          
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="border border-border-dim p-2 bg-base">
              <span class="text-[9px] text-neutral-500 block font-bold uppercase tracking-widest">倒数中</span>
              <span class="text-sm font-mono font-bold text-accent mt-1 block">{{ stats.active }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base">
              <span class="text-[9px] text-neutral-500 block font-bold uppercase tracking-widest">在今日</span>
              <span class="text-sm font-mono font-bold text-green-400 mt-1 block">{{ stats.today }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base">
              <span class="text-[9px] text-neutral-500 block font-bold uppercase tracking-widest">已过去</span>
              <span class="text-sm font-mono font-bold text-neutral-600 mt-1 block">{{ stats.past }}</span>
            </div>
          </div>

          <!-- Circular SVG Progress -->
          <div class="flex items-center justify-center py-2.5">
            <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-neutral-600"
                stroke="currentColor"
                stroke-width="3.2"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-accent"
                stroke="currentColor"
                stroke-width="3.2"
                stroke-dasharray="100"
                :stroke-dashoffset="100 - stats.activePercent"
                stroke-linecap="round"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.5" class="fill-neutral-300 font-bold font-mono text-[8px] transform rotate-90 origin-center text-center" text-anchor="middle">
                {{ stats.activePercent }}%
              </text>
            </svg>
          </div>
          <span class="text-[8.5px] text-neutral-600 text-center tracking-normal uppercase">进行中契约占比百分度</span>
        </div>
      </div>

      <!-- Right 3 columns: List (Grid cols-2) -->
      <div class="lg:col-span-3 border border-line p-4 bg-surface flex flex-col gap-3 min-h-[350px]">
        <span class="text-[9px] text-neutral-600 tracking-widest uppercase font-bold">// 命途星纪契约簿</span>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[360px] pr-0.5">
          <div 
            v-for="cd in sortedCountdowns" 
            :key="cd.id"
            class="relative border p-3 text-left overflow-hidden flex flex-col justify-between min-h-[72px] bg-surface border-line"
            :class="[
              getDaysRemaining(cd.targetDate) <= 3 && getDaysRemaining(cd.targetDate) > 0 
                ? 'border-status-bad' 
                : 'border-line',
              getDaysRemaining(cd.targetDate) <= 0 
                ? 'opacity-50 border-border-dim' 
                : ''
            ]"
          >
            <div class="flex justify-between items-start w-full gap-1.5 z-10">
              <span 
                class="text-[8.5px] px-1.5 py-0.2 font-bold font-mono leading-none border shrink-0 scale-90 -ml-0.5"
                :class="[
                  cd.category === '工作' ? 'bg-[#18283b] text-blue-300 border-blue-500/30' : '',
                  cd.category === '生活' ? 'bg-[#6e5020] text-amber-200 border-amber-500/30' : '',
                  cd.category === '节日' ? 'bg-[#4a161b] text-red-300 border-red-500/30' : ''
                ]"
              >
                {{ cd.category }}
              </span>
              <button 
                v-if="isEditMode"
                @click="deleteCountdown(cd.id)"
                class="text-status-bad hover:text-white bg-base hover:bg-status-bad border border-status-bad/30 w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-none shrink-0"
                title="删除契约"
              >
                ×
              </button>
            </div>

            <div class="flex flex-col gap-0.5 mt-2 z-10">
              <span class="text-xs font-bold text-neutral-300 truncate max-w-full" :title="cd.title">{{ cd.title }}</span>
              <span class="text-[9px] font-mono text-neutral-600">{{ cd.targetDate }}</span>
            </div>

            <div class="text-right mt-3 z-10 flex justify-end items-end gap-1.5 border-t border-border-dim pt-1.5">
              <template v-if="getDaysRemaining(cd.targetDate) > 0">
                <span class="text-[9px] text-neutral-500">剩余</span>
                <span 
                  class="text-base font-bold font-mono tracking-tight leading-none"
                  :class="[getDaysRemaining(cd.targetDate) <= 3 ? 'text-status-bad' : 'text-accent']"
                >
                  {{ getDaysRemaining(cd.targetDate) }} <span class="text-[9px]">天</span>
                </span>
              </template>
              <template v-else-if="getDaysRemaining(cd.targetDate) === 0">
                <span class="text-[10px] bg-green-950 border border-green-500 text-green-300 px-1.5 py-0.2 font-bold">
                  ★ 今天
                </span>
              </template>
              <template v-else>
                <span class="text-[9px] text-neutral-600">已过</span>
                <span class="text-xs font-bold font-mono text-neutral-500 leading-none">
                  {{ Math.abs(getDaysRemaining(cd.targetDate)) }}天
                </span>
              </template>
            </div>

            <div 
              v-if="getDaysRemaining(cd.targetDate) <= 3 && getDaysRemaining(cd.targetDate) > 0"
              class="absolute -right-5 top-2.5 bg-status-bad border-y border-black text-white text-[7px] font-bold font-mono px-5 py-0.2 rotate-45 pointer-events-none tracking-widest scale-75"
            >
              WARN
            </div>
          </div>
        </div>

        <div v-if="countdowns.length === 0" class="text-center text-xs text-neutral-600 py-12">
          // EMPTY //
        </div>
      </div>
    </div>
  </div>
</template>
