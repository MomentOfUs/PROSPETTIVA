<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  compact?: boolean
  preview?: boolean
}>(), {
  compact: false,
  preview: false
})

// ==================== TIME CLOCK SECTION ====================
const timeStr = ref('--:--:--')
const dateStr = ref('----年--月--日')
const weekStr = ref('星期-')

const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const timeZoneData = ref({
  beijing: '',
  tokyo: '',
  london: '',
  newyork: ''
})

function updateTime() {
  const now = new Date()
  const hrs = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const secs = String(now.getSeconds()).padStart(2, '0')
  timeStr.value = `${hrs}:${mins}:${secs}`

  const yy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  dateStr.value = `${yy}年${mm}月${dd}日`
  weekStr.value = weeks[now.getDay()]

  updateTimeZones(now)
}

function updateTimeZones(now: Date) {
  const getTzTime = (offset: number) => {
    // Calculate time relative to UTC
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const nd = new Date(utc + (3600000 * offset))
    const hh = String(nd.getHours()).padStart(2, '0')
    const mm = String(nd.getMinutes()).padStart(2, '0')
    const ss = String(nd.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  timeZoneData.value = {
    beijing: getTzTime(8),
    tokyo: getTzTime(9),
    london: getTzTime(0),
    newyork: getTzTime(-5)
  }
}

// ==================== POMODORO CONCENTRATION SECTION ====================
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
  if (pomodoroSeconds.value > 0) {
    pomodoroSeconds.value--
  } else if (pomodoroMinutes.value > 0) {
    pomodoroMinutes.value--
    pomodoroSeconds.value = 59
  } else {
    // Timer completed!
    clearInterval(pInterval)
    pomodoroState.value = 'completed'
    playDing()
  }
}

// Web Audio API pure tone generator
function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 1.2)
  } catch {
    // audio context blocked by browser
  }
}

let timer: any
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
  clearInterval(pInterval)
})
</script>

<template>
  <!-- Compact mode: header inline clock -->
  <div v-if="compact" class="select-none flex items-center gap-2 border border-gold/35 bg-[#120e0c] px-3 py-1 rounded shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
    <span class="text-sm font-bold font-serif text-gold tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{{ timeStr }}</span>
    <span class="text-[9px] font-serif text-parchment/70 hidden sm:inline">{{ dateStr }}</span>
    <span class="text-[9px] font-serif text-parchment/80 border border-gold/30 bg-bg-surface px-1.5 py-0.2 rounded hidden sm:inline">{{ weekStr }}</span>
  </div>

  <!-- Preview mode: hover tooltip preview -->
  <div v-else-if="preview" class="select-none text-center flex flex-col justify-center items-center gap-0.5 font-serif py-1">
    <div class="text-2xl font-bold tracking-widest text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
      {{ timeStr }}
    </div>
    <div class="text-[9px] mt-0.5 flex items-center justify-center gap-1.5 text-parchment/80">
      <span>{{ dateStr }}</span>
      <span class="bg-[#120e0c] border border-gold/30 px-1 py-0.2 rounded text-[8px] font-bold text-gold/90">{{ weekStr }}</span>
    </div>
  </div>

  <!-- Full mode: SPA-style dashboard clock application -->
  <div v-else class="w-full select-none font-serif text-cream flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">🕒 时间与专注修业仪</span>
    </div>

    <!-- Main Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Left 3 columns: World Clock & Local Day -->
      <div class="lg:col-span-3 border border-[#d4af37]/25 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col justify-between min-h-[350px]">
        <!-- Big Clock -->
        <div class="flex flex-col gap-2 items-center py-6 text-center border-b border-[#d4af37]/15">
          <div class="text-5xl font-bold tracking-widest text-gold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] font-mono">
            {{ timeStr }}
          </div>
          <div class="text-xs font-semibold flex items-center gap-2.5 text-parchment/90 mt-1">
            <span>{{ dateStr }}</span>
            <span class="bg-[#6e5020]/45 border border-gold/35 text-gold px-2 py-0.2 rounded font-bold text-[10px]">{{ weekStr }}</span>
          </div>
        </div>

        <!-- World Timezones -->
        <div class="flex flex-col gap-2 mt-4">
          <span class="text-[10px] text-[#ebdcb9]/40 tracking-wider uppercase font-bold">// 世界星历同步仪</span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35 flex flex-col gap-0.5">
              <span class="text-[9px] text-[#ebdcb9]/55">🇨🇳 北京 (Beijing)</span>
              <span class="text-xs font-mono font-bold text-[#f5f2eb] mt-0.5">{{ timeZoneData.beijing }}</span>
            </div>
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35 flex flex-col gap-0.5">
              <span class="text-[9px] text-[#ebdcb9]/55">🇯🇵 东京 (Tokyo)</span>
              <span class="text-xs font-mono font-bold text-[#f5f2eb] mt-0.5">{{ timeZoneData.tokyo }}</span>
            </div>
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35 flex flex-col gap-0.5">
              <span class="text-[9px] text-[#ebdcb9]/55">🇬🇧 伦敦 (London)</span>
              <span class="text-xs font-mono font-bold text-[#f5f2eb] mt-0.5">{{ timeZoneData.london }}</span>
            </div>
            <div class="border border-[#d4af37]/15 p-2 rounded bg-black/35 flex flex-col gap-0.5">
              <span class="text-[9px] text-[#ebdcb9]/55">🇺🇸 纽约 (New York)</span>
              <span class="text-xs font-mono font-bold text-[#f5f2eb] mt-0.5">{{ timeZoneData.newyork }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right 2 columns: Pomodoro timer -->
      <div class="lg:col-span-2 border border-[#d4af37]/25 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col justify-between min-h-[350px]">
        <div class="border-b border-[#d4af37]/15 pb-1.5 flex justify-between items-center">
          <span class="text-xs font-semibold text-[#d4af37] tracking-wider">⏳ 番茄专注钟 (Pomodoro)</span>
          <span class="text-[8px] bg-red-950/60 border border-red-500/35 text-red-300 px-1.5 py-0.2 rounded font-mono uppercase tracking-widest font-bold">
            {{ pomodoroState }}
          </span>
        </div>

        <!-- Countdown Display -->
        <div class="flex flex-col items-center justify-center py-6">
          <div 
            class="text-6xl font-bold tracking-tight font-mono text-center"
            :class="[pomodoroState === 'running' ? 'text-[#ebdcb9] animate-pulse' : pomodoroState === 'completed' ? 'text-green-400' : 'text-[#ebdcb9]/70']"
          >
            {{ String(pomodoroMinutes).padStart(2, '0') }}:{{ String(pomodoroSeconds).padStart(2, '0') }}
          </div>
          <span class="text-[9px] text-[#ebdcb9]/40 mt-1 italic">
            {{ pomodoroState === 'completed' ? '☕ 修业圆满，宜稍作休憩' : '专注思考，心无旁骛' }}
          </span>
        </div>

        <!-- Duration Selectors (only if not running) -->
        <div class="flex justify-between gap-1 border-t border-b border-[#d4af37]/10 py-2">
          <button 
            v-for="mins in [15, 25, 35, 45, 60]" 
            :key="mins"
            @click="setPomodoroDuration(mins)"
            class="flex-1 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer bg-transparent"
            :class="[
              selectedDuration === mins 
                ? 'border-[#d4af37] text-gold bg-[#d4af37]/10' 
                : 'border-transparent text-[#ebdcb9]/40 hover:text-[#ebdcb9]/80'
            ]"
            :disabled="pomodoroState === 'running'"
          >
            {{ mins }}m
          </button>
        </div>

        <!-- Controls -->
        <div class="flex gap-2.5 mt-4">
          <button 
            v-if="pomodoroState !== 'running'"
            @click="startPomodoro"
            class="flex-1 bg-btn-base border border-[#d4af37]/45 text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] py-2 rounded text-xs font-bold cursor-pointer transition-colors shadow-md"
          >
            ⚡ 开始专注
          </button>
          <button 
            v-else
            @click="pausePomodoro"
            class="flex-1 bg-[#2b2b2e] border border-[#d4af37]/30 text-[#ebdcb9]/80 hover:text-[#ebdcb9] py-2 rounded text-xs font-bold cursor-pointer transition-colors"
          >
            ⏸ 暂停
          </button>
          <button 
            @click="resetPomodoro"
            class="border border-status-bad/45 text-status-bad hover:bg-status-bad/10 px-4 py-2 rounded text-xs font-bold cursor-pointer transition-all"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
