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
    alert('标题与日期不能为空！')
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
  if (confirm('是否从倒计时中抹去此项日程？')) {
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
  <div v-if="preview" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 text-[10px] w-full text-left font-serif select-none">
    <div 
      v-for="cd in sortedCountdowns" 
      :key="cd.id"
      class="flex justify-between items-center bg-[#1a1613]/80 border p-1 rounded border-[#d4af37]/20"
      :class="[
        getDaysRemaining(cd.targetDate) <= 3 && getDaysRemaining(cd.targetDate) > 0 
          ? 'border-status-bad shadow-[0_0_4px_rgba(255,0,60,0.15)] bg-[#261314]/80' 
          : 'border-[#d4af37]/20',
        getDaysRemaining(cd.targetDate) <= 0 ? 'opacity-40 bg-black/20' : ''
      ]"
    >
      <div class="flex items-center gap-1 min-w-0 flex-1">
        <span class="truncate">{{ cd.title }}</span>
      </div>
      <div class="text-right shrink-0 ml-2 font-mono text-[9px] font-bold">
        <span v-if="getDaysRemaining(cd.targetDate) > 0" :class="[getDaysRemaining(cd.targetDate) <= 3 ? 'text-status-bad' : 'text-gold']">
          {{ getDaysRemaining(cd.targetDate) }}天
        </span>
        <span v-else-if="getDaysRemaining(cd.targetDate) === 0" class="text-green-400">
          今天
        </span>
        <span v-else class="text-parchment/40">
          已过
        </span>
      </div>
    </div>
    <div v-if="countdowns.length === 0" class="text-center text-[9px] text-gold/40 py-2 italic">
      暂无纪日契约。
    </div>
  </div>

  <!-- Full Mode: SPA Layout -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">📅 命途星纪倒计时大盘</span>
      <div class="flex items-center gap-1.5">
        <button 
          @click="isEditMode = !isEditMode" 
          class="text-xs px-2.5 py-0.5 border rounded bg-transparent transition-all cursor-pointer"
          :class="[isEditMode ? 'bg-status-bad border-status-bad text-white' : 'border-[#d4af37]/45 text-gold hover:text-gold/80']"
          title="编辑倒计时"
        >
          {{ isEditMode ? '完成' : '编辑' }}
        </button>
        <button 
          @click="showAddForm = !showAddForm; isEditMode = false" 
          class="text-xs px-2.5 py-0.5 border border-[#d4af37]/45 text-gold hover:text-gold/80 rounded bg-transparent transition-all cursor-pointer"
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
        <div v-if="showAddForm" class="flex flex-col gap-3 border border-[#d4af37]/30 p-3.5 rounded bg-[#120e0c]/90 text-xs shadow-lg">
          <span class="text-[10px] text-gold tracking-widest uppercase font-bold">// 订立新星相契约</span>
          <div class="flex flex-col gap-1.5">
            <label class="text-[#ebdcb9]/70 text-[10px]">事件目标</label>
            <input 
              v-model="newTitle" 
              type="text" 
              placeholder="例如: 期待的周末、发薪日" 
              class="border border-[#d4af37]/30 p-2 rounded bg-[#1a1613] text-[#f5f2eb] outline-none focus:border-[#d4af37] text-xs font-serif"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[#ebdcb9]/70 text-[10px]">目标日期</label>
            <input 
              v-model="newDate" 
              type="date" 
              class="border border-[#d4af37]/30 p-2 rounded bg-[#1a1613] text-[#f5f2eb] outline-none focus:border-[#d4af37] font-mono text-xs"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[#ebdcb9]/70 text-[10px]">类型标签</label>
            <select 
              v-model="newCategory" 
              class="border border-[#d4af37]/30 p-2 rounded bg-[#1a1613] text-[#f5f2eb] outline-none focus:border-[#d4af37] text-xs font-serif"
            >
              <option value="工作">💼 工作</option>
              <option value="生活">🏠 生活</option>
              <option value="节日">🎉 节日</option>
            </select>
          </div>
          <button 
            @click="addCountdown" 
            class="bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] border border-[#d4af37]/45 py-2 rounded font-bold cursor-pointer transition-colors shadow-md mt-1"
          >
            定下契约
          </button>
        </div>

        <!-- Stats Panel -->
        <div class="border border-[#d4af37]/35 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3.5">
          <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
            <span class="text-xs font-semibold text-[#ebdcb9] tracking-wider">🪐 命途星纪统计</span>
          </div>
          
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35">
              <span class="text-[9px] text-[#ebdcb9]/55 block font-bold">倒数中</span>
              <span class="text-sm font-mono font-bold text-gold mt-1 block">{{ stats.active }}</span>
            </div>
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35">
              <span class="text-[9px] text-[#ebdcb9]/55 block font-bold">在今日</span>
              <span class="text-sm font-mono font-bold text-green-400 mt-1 block">{{ stats.today }}</span>
            </div>
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35">
              <span class="text-[9px] text-[#ebdcb9]/55 block font-bold">已过去</span>
              <span class="text-sm font-mono font-bold text-parchment/40 mt-1 block">{{ stats.past }}</span>
            </div>
          </div>

          <!-- Circular SVG Progress -->
          <div class="flex items-center justify-center py-2.5">
            <svg class="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <path
                class="text-black/50"
                stroke="currentColor"
                stroke-width="3.2"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="text-gold"
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
              <text x="18" y="20.5" class="fill-[#f5f2eb] font-bold font-mono text-[8px] transform rotate-90 origin-center text-center" text-anchor="middle">
                {{ stats.activePercent }}%
              </text>
            </svg>
          </div>
          <span class="text-[8.5px] text-[#ebdcb9]/40 text-center tracking-normal">进行中契约占比百分度</span>
        </div>
      </div>

      <!-- Right 3 columns: List (Grid cols-2) -->
      <div class="lg:col-span-3 border border-[#d4af37]/25 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3 min-h-[350px]">
        <span class="text-[9px] text-[#ebdcb9]/40 tracking-wider uppercase font-bold">// 命途星纪契约簿</span>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[360px] pr-0.5">
          <div 
            v-for="cd in sortedCountdowns" 
            :key="cd.id"
            class="relative border p-3 rounded text-left overflow-hidden flex flex-col justify-between min-h-[72px] bg-[#1a1613]"
            :class="[
              getDaysRemaining(cd.targetDate) <= 3 && getDaysRemaining(cd.targetDate) > 0 
                ? 'border-status-bad shadow-[inset_0_0_6px_rgba(255,0,60,0.2)] bg-[#261314]' 
                : 'border-[#d4af37]/35',
              getDaysRemaining(cd.targetDate) <= 0 
                ? 'opacity-50 border-[#ebdcb9]/15 bg-black/30' 
                : ''
            ]"
          >
            <!-- Card inner border -->
            <div class="absolute inset-0.5 border border-[#d4af37]/5 pointer-events-none rounded"></div>

            <div class="flex justify-between items-start w-full gap-1.5 z-10">
              <span 
                class="text-[8.5px] px-1.5 py-0.2 rounded font-bold font-serif leading-none border shrink-0 scale-90 -ml-0.5"
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
                class="text-status-bad hover:text-white bg-black/40 hover:bg-status-bad border border-status-bad/30 rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all shrink-0"
                title="删除契约"
              >
                ×
              </button>
            </div>

            <!-- Title & Date -->
            <div class="flex flex-col gap-0.5 mt-2 z-10">
              <span class="text-xs font-bold text-[#f5f2eb] truncate max-w-full" :title="cd.title">{{ cd.title }}</span>
              <span class="text-[9px] font-mono text-parchment/40">{{ cd.targetDate }}</span>
            </div>

            <!-- Remaining days -->
            <div class="text-right mt-3 z-10 flex justify-end items-end gap-1.5 border-t border-[#d4af37]/10 pt-1.5">
              <template v-if="getDaysRemaining(cd.targetDate) > 0">
                <span class="text-[9px] text-parchment/50">剩余</span>
                <span 
                  class="text-base font-bold font-mono tracking-tight leading-none"
                  :class="[getDaysRemaining(cd.targetDate) <= 3 ? 'text-status-bad' : 'text-gold']"
                >
                  {{ getDaysRemaining(cd.targetDate) }} <span class="text-[9px]">天</span>
                </span>
              </template>
              <template v-else-if="getDaysRemaining(cd.targetDate) === 0">
                <span class="text-[10px] bg-green-950 border border-green-500 text-green-300 px-1.5 py-0.2 rounded font-bold animate-pulse">
                  ★ 今天
                </span>
              </template>
              <template v-else>
                <span class="text-[9px] text-parchment/40">已过</span>
                <span class="text-xs font-bold font-mono text-parchment/55 leading-none">
                  {{ Math.abs(getDaysRemaining(cd.targetDate)) }}天
                </span>
              </template>
            </div>

            <!-- Urgent WARN Overlay tag -->
            <div 
              v-if="getDaysRemaining(cd.targetDate) <= 3 && getDaysRemaining(cd.targetDate) > 0"
              class="absolute -right-5 top-2.5 bg-status-bad border-y border-black text-white text-[7px] font-bold font-mono px-5 py-0.2 rotate-45 pointer-events-none tracking-widest scale-75"
            >
              WARN
            </div>
          </div>
        </div>

        <div v-if="countdowns.length === 0" class="text-center text-xs text-[#d4af37]/50 py-12 italic">
          暂无命途纪日契约。
        </div>
      </div>
    </div>
  </div>
</template>
