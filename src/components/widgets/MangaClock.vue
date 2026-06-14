<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from '../../i18n'

const { locale } = useI18n()

const props = withDefaults(defineProps<{
  compact?: boolean
  preview?: boolean
}>(), {
  compact: false,
  preview: false
})

const timeStr = ref('--:--:--')
const dateStr = ref('----/--/--')
const weekStr = ref('---')

const weeks = computed(() => {
  return locale.value === 'zh'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
})

const timeZoneData = ref({ beijing: '', tokyo: '', london: '', newyork: '' })

function updateTime() {
  const now = new Date()
  const hrs = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const secs = String(now.getSeconds()).padStart(2, '0')
  timeStr.value = `${hrs}:${mins}:${secs}`
  const yy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  dateStr.value = `${yy}/${mm}/${dd}`
  weekStr.value = weeks.value[now.getDay()]
  updateTimeZones(now)
}

function updateTimeZones(now: Date) {
  const getTzTime = (offset: number) => {
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const nd = new Date(utc + (3600000 * offset))
    const hh = String(nd.getHours()).padStart(2, '0')
    const mm = String(nd.getMinutes()).padStart(2, '0')
    const ss = String(nd.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  timeZoneData.value = {
    beijing: getTzTime(8), tokyo: getTzTime(9),
    london: getTzTime(0), newyork: getTzTime(-5)
  }
}

const pomodoroMinutes = ref(25)
const pomodoroSeconds = ref(0)
const pomodoroState = ref<'idle' | 'running' | 'paused' | 'completed'>('idle')
const selectedDuration = ref(25)
let pInterval: any = null

function setPomodoroDuration(mins: number) {
  if (pomodoroState.value === 'running') return
  selectedDuration.value = mins
  pomodoroMinutes.value = mins
  pomodoroSeconds.value = 0
  pomodoroState.value = 'idle'
}

function startPomodoro() {
  if (pomodoroState.value === 'running') return
  pomodoroState.value = 'running'
  pInterval = setInterval(tickPomodoro, 1000)
}

function pausePomodoro() {
  if (pomodoroState.value !== 'running') return
  pomodoroState.value = 'paused'
  clearInterval(pInterval)
}

function resetPomodoro() {
  clearInterval(pInterval)
  pomodoroMinutes.value = selectedDuration.value
  pomodoroSeconds.value = 0
  pomodoroState.value = 'idle'
}

function tickPomodoro() {
  if (pomodoroSeconds.value > 0) { pomodoroSeconds.value-- }
  else if (pomodoroMinutes.value > 0) { pomodoroMinutes.value--; pomodoroSeconds.value = 59 }
  else { clearInterval(pInterval); pomodoroState.value = 'completed'; playDing() }
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 1.2)
  } catch {}
}

function handleTriggerPomo(e: any) {
  const mins = e.detail?.minutes || 25
  setPomodoroDuration(mins)
  startPomodoro()
}

let timer: any
onMounted(() => { 
  updateTime(); 
  timer = setInterval(updateTime, 1000) 
  window.addEventListener('manga-trigger-pomo', handleTriggerPomo)
})
onUnmounted(() => { 
  clearInterval(timer); 
  clearInterval(pInterval) 
  window.removeEventListener('manga-trigger-pomo', handleTriggerPomo)
})

// ── 悬浮弹窗与日历交互逻辑 ──
const showPopup = ref(false)
const isPinned = ref(false)
let hoverTimer: any = null

function handleMouseEnter() {
  if (hoverTimer) clearTimeout(hoverTimer)
  showPopup.value = true
}

function handleMouseLeave() {
  if (isPinned.value) return
  hoverTimer = setTimeout(() => {
    showPopup.value = false
  }, 400)
}

function clearPopupTimer() {
  if (hoverTimer) clearTimeout(hoverTimer)
}

function togglePopupClick() {
  if (isPinned.value) {
    isPinned.value = false
    showPopup.value = false
  } else {
    showPopup.value = !showPopup.value
  }
}

function togglePin() {
  isPinned.value = !isPinned.value
}

// ── 日历逻辑 ──
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth()) // 0-11

const calendarTitle = computed(() => {
  if (locale.value === 'zh') {
    return `${calendarYear.value}年 ${calendarMonth.value + 1}月`
  }
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]
  return `${months[calendarMonth.value]} ${calendarYear.value}`
})

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

function getFirstDayOfMonth(y: number, m: number) {
  return new Date(y, m, 1).getDay()
}

interface CalendarDay {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  dateStr: string
}

const calendarDays = computed(() => {
  const year = calendarYear.value
  const month = calendarMonth.value
  const days: CalendarDay[] = []

  const firstDay = getFirstDayOfMonth(year, month)
  const totalDays = getDaysInMonth(year, month)

  // 上月填充
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevTotalDays = getDaysInMonth(prevYear, prevMonth)
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevTotalDays - i
    days.push({
      day: d,
      isCurrentMonth: false,
      isToday: false,
      dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    })
  }

  // 本月
  const today = new Date()
  for (let i = 1; i <= totalDays; i++) {
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i
    days.push({
      day: i,
      isCurrentMonth: true,
      isToday,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    })
  }

  // 下月填充
  const remaining = 42 - days.length
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      isToday: false,
      dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    })
  }

  return days
})

function prevMonth() {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}

function nextMonth() {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}

function resetToToday() {
  const today = new Date()
  calendarYear.value = today.getFullYear()
  calendarMonth.value = today.getMonth()
}
</script>

<template>
  <!-- Compact mode -->
  <div v-if="compact" 
       class="relative select-none"
       @mouseenter="handleMouseEnter"
       @mouseleave="handleMouseLeave"
  >
    <!-- Trigger Button -->
    <div class="flex items-center gap-2 border border-line bg-base px-3 py-1 cursor-pointer hover:border-accent transition-colors"
         :class="{ 'border-accent bg-accent/5': showPopup || isPinned }"
         @click="togglePopupClick"
    >
      <span class="text-sm font-bold text-accent tracking-widest">{{ timeStr }}</span>
      <span class="text-[9px] text-neutral-500 hidden sm:inline">{{ dateStr }}</span>
      <span class="text-[9px] text-neutral-500 border border-line bg-surface px-1.5 py-0.2 hidden sm:inline">{{ weekStr }}</span>
    </div>

    <!-- Popover Window -->
    <div v-if="showPopup || isPinned"
         class="absolute top-full left-0 mt-2 z-[999] border-2 border-line bg-surface p-4 shadow-[6px_6px_0px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-neutral-300 w-[92vw] sm:w-[540px] max-w-[calc(100vw-2rem)] popover-panel"
         @mouseenter="clearPopupTimer"
         @mouseleave="handleMouseLeave"
    >
      <!-- Title bar -->
      <div class="flex items-center justify-between border-b border-line pb-2 mb-1">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 bg-accent inline-block animate-pulse"></span>
          <span class="text-[10px] font-bold text-neutral-400 tracking-wider uppercase font-mono">
            {{ $t('clock.terminal.title') || 'NEXUS TERMINAL v1.0.3' }}
          </span>
        </div>
        <div class="flex gap-1.5">
          <button @click="togglePin" 
                  class="text-[9px] border px-1.5 py-0.5 cursor-pointer font-bold font-mono transition-colors"
                  :class="isPinned ? 'border-accent bg-accent/20 text-accent' : 'border-line hover:bg-neutral-300 hover:text-base'"
          >
            {{ isPinned ? $t('clock.calendar.unpin') : $t('clock.calendar.pin') }}
          </button>
          <button @click="showPopup = false; isPinned = false" 
                  class="text-[9px] border border-line px-1.5 py-0.5 hover:bg-neutral-300 hover:text-base cursor-pointer font-bold font-mono"
          >
            ESC
          </button>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-5">
        <!-- Left Column: Calendar -->
        <div class="sm:col-span-6 border-r-0 sm:border-r border-line pr-0 sm:pr-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <button @click="prevMonth" class="border border-line px-1.5 py-0.5 hover:bg-neutral-300 hover:text-base cursor-pointer font-mono font-bold text-[10px]">
              &lt;
            </button>
            <span class="text-[11px] font-bold text-accent font-mono cursor-pointer hover:underline" @click="resetToToday" title="Go to Today">
              {{ calendarTitle }}
            </span>
            <button @click="nextMonth" class="border border-line px-1.5 py-0.5 hover:bg-neutral-300 hover:text-base cursor-pointer font-mono font-bold text-[10px]">
              &gt;
            </button>
          </div>

          <!-- Calendar Days Grid -->
          <div class="grid grid-cols-7 gap-0.5 text-center text-[9px] font-mono">
            <!-- Weeks -->
            <div v-for="w in weeks" :key="w" class="text-neutral-500 font-bold py-1 select-none border-b border-border-dim">
              {{ locale === 'zh' ? w : w.slice(0, 2) }}
            </div>
            <!-- Days -->
            <div v-for="d in calendarDays" :key="d.dateStr"
                 class="p-1 border border-transparent select-none transition-colors"
                 :class="[
                   d.isCurrentMonth ? 'text-neutral-300' : 'text-neutral-600',
                   d.isToday ? 'border-accent text-accent font-bold bg-accent/10' : 'hover:border-border-dim'
                 ]"
            >
              {{ d.day }}
            </div>
          </div>
          <div class="flex justify-end">
            <button @click="resetToToday" class="text-[8px] border border-line px-1.5 py-0.5 hover:bg-neutral-300 hover:text-base cursor-pointer font-mono font-bold uppercase">
              {{ $t('clock.calendar.today') || 'TODAY' }}
            </button>
          </div>
        </div>

        <!-- Right Column: Info & Pomodoro -->
        <div class="sm:col-span-6 flex flex-col gap-4">
          <!-- Big Clock -->
          <div class="text-center bg-base border border-line p-2.5 flex flex-col gap-0.5 select-none">
            <div class="text-2xl font-bold tracking-widest text-accent font-mono">{{ timeStr }}</div>
            <div class="text-[9px] text-neutral-500 font-mono mt-0.5 uppercase">
              {{ dateStr }} // {{ weekStr }}
            </div>
          </div>

          <!-- Pomodoro Mini -->
          <div class="border border-line p-2.5 bg-base/50 flex flex-col gap-2">
            <div class="flex justify-between items-center border-b border-border-dim pb-1">
              <span class="text-[9px] font-bold text-neutral-400 tracking-wider font-mono">{{ $t('clock.pomodoro') }}</span>
              <span class="text-[8px] px-1 bg-surface border border-line text-neutral-400 font-mono uppercase font-bold">
                {{ $t('clock.' + pomodoroState) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-lg font-bold font-mono text-neutral-200">
                {{ String(pomodoroMinutes).padStart(2, '0') }}:{{ String(pomodoroSeconds).padStart(2, '0') }}
              </div>
              <div class="flex gap-1">
                <button v-if="pomodoroState !== 'running'" @click="startPomodoro"
                        class="border border-line px-2 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-neutral-300 hover:text-base transition-colors"
                >
                  {{ $t('clock.start') }}
                </button>
                <button v-else @click="pausePomodoro"
                        class="border border-line px-2 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-neutral-300 hover:text-base transition-colors"
                >
                  {{ $t('clock.pause') }}
                </button>
                <button @click="resetPomodoro"
                        class="border border-line px-2 py-0.5 text-[9px] text-neutral-500 hover:text-accent cursor-pointer font-bold"
                >
                  {{ $t('clock.reset') }}
                </button>
              </div>
            </div>
            <div class="flex gap-0.5">
              <button v-for="mins in [15, 25, 45]" :key="mins"
                      @click="setPomodoroDuration(mins)"
                      class="flex-1 py-0.5 border text-[8px] font-bold transition-none cursor-pointer bg-transparent"
                      :class="[selectedDuration === mins ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-neutral-600 hover:text-neutral-400']"
                      :disabled="pomodoroState === 'running'"
              >
                {{ mins }}m
              </button>
            </div>
          </div>

          <!-- Timezones Mini -->
          <div class="grid grid-cols-2 gap-1.5">
            <div class="border border-border-dim p-1.5 bg-base flex flex-col gap-0.2 select-none">
              <span class="text-[8px] text-neutral-600 font-mono">{{ $t('clock.beijing') }} (UTC+8)</span>
              <span class="text-[10px] font-mono font-bold text-neutral-300">{{ timeZoneData.beijing }}</span>
            </div>
            <div class="border border-border-dim p-1.5 bg-base flex flex-col gap-0.2 select-none">
              <span class="text-[8px] text-neutral-600 font-mono">{{ $t('clock.tokyo') }} (UTC+9)</span>
              <span class="text-[10px] font-mono font-bold text-neutral-300">{{ timeZoneData.tokyo }}</span>
            </div>
            <div class="border border-border-dim p-1.5 bg-base flex flex-col gap-0.2 select-none">
              <span class="text-[8px] text-neutral-600 font-mono">{{ $t('clock.london') }} (UTC+0)</span>
              <span class="text-[10px] font-mono font-bold text-neutral-300">{{ timeZoneData.london }}</span>
            </div>
            <div class="border border-border-dim p-1.5 bg-base flex flex-col gap-0.2 select-none">
              <span class="text-[8px] text-neutral-600 font-mono">{{ $t('clock.newyork') }} (UTC-5)</span>
              <span class="text-[10px] font-mono font-bold text-neutral-300">{{ timeZoneData.newyork }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Preview mode -->
  <div v-else-if="preview" class="select-none text-center flex flex-col justify-center items-center gap-0.5 py-1">
    <div class="text-2xl font-bold tracking-widest text-accent">{{ timeStr }}</div>
    <div class="text-[9px] mt-0.5 flex items-center justify-center gap-1.5 text-neutral-500">
      <span>{{ dateStr }}</span>
      <span class="bg-surface border border-line px-1 py-0.2 text-[8px] font-bold text-accent">{{ weekStr }}</span>
    </div>
  </div>

  <!-- Full mode -->
  <div v-else class="w-full select-none text-neutral-300 flex flex-col gap-5">
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Left: World Clock -->
      <div class="lg:col-span-3 border border-line p-4 bg-surface flex flex-col justify-between min-h-[350px]">
        <div class="flex flex-col gap-2 items-center py-6 text-center border-b border-line">
          <div class="text-5xl font-bold tracking-widest text-accent font-mono">{{ timeStr }}</div>
          <div class="text-xs flex items-center gap-2.5 text-neutral-400 mt-1">
            <span>{{ dateStr }}</span>
            <span class="bg-surface border border-line text-accent px-2 py-0.2 font-bold text-[10px]">{{ weekStr }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2 mt-4">
          <span class="text-[10px] text-neutral-600 tracking-wider uppercase font-bold">{{ $t('clock.world.time') }}</span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">{{ $t('clock.beijing') }}</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.beijing }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">{{ $t('clock.tokyo') }}</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.tokyo }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">{{ $t('clock.london') }}</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.london }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">{{ $t('clock.newyork') }}</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.newyork }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Pomodoro -->
      <div class="lg:col-span-2 border border-line p-4 bg-surface flex flex-col justify-between min-h-[350px]">
        <div class="border-b border-line pb-1.5 flex justify-between items-center">
          <span class="text-xs font-semibold text-accent tracking-wider uppercase">{{ $t('clock.pomodoro') }}</span>
          <span class="text-[8px] bg-base border border-line text-neutral-400 px-1.5 py-0.2 font-mono uppercase tracking-widest font-bold">{{ pomodoroState }}</span>
        </div>

        <div class="flex flex-col items-center justify-center py-6">
          <div class="text-6xl font-bold tracking-tight font-mono text-center"
            :class="[pomodoroState === 'running' ? 'text-accent cursor-blink-accent' : pomodoroState === 'completed' ? 'text-white' : 'text-neutral-400']">
            {{ String(pomodoroMinutes).padStart(2, '0') }}:{{ String(pomodoroSeconds).padStart(2, '0') }}
          </div>
          <span class="text-[9px] text-neutral-600 mt-1">
            {{ pomodoroState === 'completed' ? 'DONE' : $t('clock.focus') }}
          </span>
        </div>

        <div class="flex justify-between gap-1 border-t border-b border-border-dim py-2">
          <button v-for="mins in [15, 25, 35, 45, 60]" :key="mins"
            @click="setPomodoroDuration(mins)"
            class="flex-1 py-1 border text-[10px] font-bold transition-none cursor-pointer bg-transparent"
            :class="[selectedDuration === mins ? 'border-accent text-accent bg-accent/10' : 'border-transparent text-neutral-600 hover:text-neutral-400']"
            :disabled="pomodoroState === 'running'">
            {{ mins }}m
          </button>
        </div>

        <div class="flex gap-2.5 mt-4">
          <button v-if="pomodoroState !== 'running'" @click="startPomodoro"
            class="flex-1 bg-base border border-line text-neutral-400 hover:bg-neutral-300 hover:text-accent hover:border-neutral-300 py-2 text-xs font-bold cursor-pointer transition-none">
            {{ $t('clock.start') }}
          </button>
          <button v-else @click="pausePomodoro"
            class="flex-1 bg-surface border border-line text-neutral-400 hover:text-neutral-300 py-2 text-xs font-bold cursor-pointer transition-none">
            {{ $t('clock.pause') }}
          </button>
          <button @click="resetPomodoro"
            class="border border-line text-neutral-500 hover:bg-neutral-300 hover:text-accent hover:border-neutral-300 px-4 py-2 text-xs font-bold cursor-pointer transition-none">
            {{ $t('bio.reset') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
