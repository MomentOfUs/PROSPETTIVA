<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

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

const weeks = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

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
  weekStr.value = weeks[now.getDay()]
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

let timer: any
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => { clearInterval(timer); clearInterval(pInterval) })
</script>

<template>
  <!-- Compact mode -->
  <div v-if="compact" class="select-none flex items-center gap-2 border border-line bg-base px-3 py-1">
    <span class="text-sm font-bold text-accent tracking-widest">{{ timeStr }}</span>
    <span class="text-[9px] text-neutral-500 hidden sm:inline">{{ dateStr }}</span>
    <span class="text-[9px] text-neutral-500 border border-line bg-surface px-1.5 py-0.2 hidden sm:inline">{{ weekStr }}</span>
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
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-500">[ CLOCK & POMODORO ]</span>
    </div>

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
          <span class="text-[10px] text-neutral-600 tracking-wider uppercase font-bold">// WORLD TIMEZONES</span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">BEIJING</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.beijing }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">TOKYO</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.tokyo }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">LONDON</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.london }}</span>
            </div>
            <div class="border border-border-dim p-2 bg-base flex flex-col gap-0.5">
              <span class="text-[9px] text-neutral-600">NEW YORK</span>
              <span class="text-xs font-mono font-bold text-neutral-300 mt-0.5">{{ timeZoneData.newyork }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Pomodoro -->
      <div class="lg:col-span-2 border border-line p-4 bg-surface flex flex-col justify-between min-h-[350px]">
        <div class="border-b border-line pb-1.5 flex justify-between items-center">
          <span class="text-xs font-semibold text-accent tracking-wider uppercase">POMODORO</span>
          <span class="text-[8px] bg-base border border-line text-neutral-400 px-1.5 py-0.2 font-mono uppercase tracking-widest font-bold">{{ pomodoroState }}</span>
        </div>

        <div class="flex flex-col items-center justify-center py-6">
          <div class="text-6xl font-bold tracking-tight font-mono text-center"
            :class="[pomodoroState === 'running' ? 'text-accent cursor-blink-accent' : pomodoroState === 'completed' ? 'text-white' : 'text-neutral-400']">
            {{ String(pomodoroMinutes).padStart(2, '0') }}:{{ String(pomodoroSeconds).padStart(2, '0') }}
          </div>
          <span class="text-[9px] text-neutral-600 mt-1">
            {{ pomodoroState === 'completed' ? 'DONE' : 'FOCUS MODE' }}
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
            class="flex-1 bg-base border border-line text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 py-2 text-xs font-bold cursor-pointer transition-none">
            START
          </button>
          <button v-else @click="pausePomodoro"
            class="flex-1 bg-surface border border-line text-neutral-400 hover:text-neutral-300 py-2 text-xs font-bold cursor-pointer transition-none">
            PAUSE
          </button>
          <button @click="resetPomodoro"
            class="border border-line text-neutral-500 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 px-4 py-2 text-xs font-bold cursor-pointer transition-none">
            RESET
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
