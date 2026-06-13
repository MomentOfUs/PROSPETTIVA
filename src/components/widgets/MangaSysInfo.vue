<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { api, isLoggedIn } from '../../utils/api'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const cpu = ref(35)
const ram = ref(62)

const partitions = ref([
  { name: 'C: SYSTEM', used: 47, total: '512 GB' },
  { name: 'D: DATA', used: 68, total: '2.0 TB' },
  { name: 'E: TEMP', used: 12, total: '1.0 TB' },
])

interface ProcessItem {
  id: number
  name: string
  desc: string
  pid: number
  cpu: number
  mem: number
  status: 'running' | 'terminated'
}

const processes = ref<ProcessItem[]>([
  { id: 1, name: 'alchemy-engine.exe', desc: 'compute engine', pid: 1402, cpu: 12, mem: 18, status: 'running' },
  { id: 2, name: 'array-spirit.sys', desc: 'array daemon', pid: 884, cpu: 4, mem: 8, status: 'running' },
  { id: 3, name: 'manga-dash.node', desc: 'dashboard core', pid: 2901, cpu: 8, mem: 12, status: 'running' },
  { id: 4, name: 'cultivation-daemon', desc: 'bg scheduler', pid: 9024, cpu: 15, mem: 14, status: 'running' },
  { id: 5, name: 'browser.exe', desc: 'web renderer', pid: 1056, cpu: 5, mem: 22, status: 'running' },
  { id: 6, name: 'antigravity-drive', desc: 'kernel driver', pid: 7777, cpu: 1, mem: 5, status: 'running' },
])

const uptimeSeconds = ref(45296)
const formatUptime = () => {
  const h = Math.floor(uptimeSeconds.value / 3600)
  const m = Math.floor((uptimeSeconds.value % 3600) / 60)
  const s = uptimeSeconds.value % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const logs = ref<{ time: string; text: string }[]>([
  { time: '12:00:00', text: 'CORE_LOAD_OK' },
  { time: '12:05:12', text: 'COOLING_SYSTEM_ACTIVE' },
  { time: '12:30:45', text: 'NOISE_FILTER_ENGAGED' },
])

const isOptimizing = ref(false)
const optimizeMessage = ref('')

function addLog(text: string) {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.unshift({ time: timeStr, text })
  if (logs.value.length > 8) {
    logs.value.pop()
  }
}

function optimizeMemory() {
  if (isOptimizing.value) return
  isOptimizing.value = true
  optimizeMessage.value = 'FLUSHING_RAM...'
  addLog('RAM_FLUSH_INIT: releasing orphaned pages')
  
  setTimeout(() => {
    ram.value = Math.max(25, ram.value - Math.floor(Math.random() * 15 + 10))
    processes.value.forEach(p => {
      if (p.status === 'running') {
        p.mem = Math.max(2, p.mem - Math.floor(Math.random() * 3 + 1))
      }
    })
    isOptimizing.value = false
    optimizeMessage.value = 'FLUSH_OK'
    addLog('RAM_FLUSH_COMPLETE: memory reclaimed')
  }, 1500)
}

async function fetchRealTelemetry() {
  try {
    const data = await api.getSysTelemetry()
    cpu.value = data.cpu
    ram.value = data.ram
    partitions.value = data.partitions
    processes.value = data.processes
    uptimeSeconds.value = data.uptime
  } catch (err: any) {
    addLog(`TELEMETRY_ERROR: ${err.message}`)
  }
}

async function killProcess(id: number) {
  if (isLoggedIn()) {
    const proc = processes.value.find(p => p.id === id)
    const procName = proc ? proc.name : 'unknown'
    addLog(`KILL [${procName}] PID=${id} INIT...`)
    try {
      await api.killProcess(id)
      addLog(`KILL [${procName}] PID=${id} SUCCESS`)
      fetchRealTelemetry()
    } catch (err: any) {
      addLog(`KILL_FAILED: ${err.message}`)
    }
  } else {
    const proc = processes.value.find(p => p.id === id)
    if (proc && proc.status === 'running') {
      proc.status = 'terminated'
      addLog(`KILL [${proc.name}] PID=${proc.pid}`)
      const origCpu = proc.cpu
      const origMem = proc.mem
      proc.cpu = 0
      proc.mem = 0
      
      cpu.value = Math.max(5, cpu.value - origCpu)
      ram.value = Math.max(20, ram.value - Math.floor(origMem / 2))

      setTimeout(() => {
        if (proc) {
          proc.status = 'running'
          proc.cpu = Math.floor(Math.random() * 10) + 2
          proc.mem = Math.floor(Math.random() * 12) + 4
          addLog(`RESTART [${proc.name}] PID=${proc.pid}`)
        }
      }, 8000)
    }
  }
}

let timer: any
function updateStats() {
  let totalCpu = 0
  processes.value.forEach(p => {
    if (p.status === 'running') {
      p.cpu = Math.max(1, Math.min(60, p.cpu + Math.floor(Math.random() * 7) - 3))
      p.mem = Math.max(2, Math.min(50, p.mem + Math.floor(Math.random() * 3) - 1))
      totalCpu += p.cpu
    }
  })
  
  cpu.value = Math.max(5, Math.min(95, Math.round(totalCpu + 8)))
  ram.value = Math.max(20, Math.min(90, ram.value + Math.floor(Math.random() * 3) - 1))

  if (Math.random() > 0.8) {
    const alerts = [
      'NOMINAL: power flow stable',
      'HEAT_42C: within threshold',
      'FLUCTUATION detected: minor',
      'PING_OK: no intrusions',
      'GC_CYCLE: self-cleanup done'
    ]
    const alertText = alerts[Math.floor(Math.random() * alerts.length)]
    addLog(alertText)
  }
}

onMounted(() => {
  if (isLoggedIn()) {
    fetchRealTelemetry()
    timer = setInterval(() => {
      fetchRealTelemetry()
    }, 2000)
  } else {
    timer = setInterval(() => {
      updateStats()
      uptimeSeconds.value++
    }, 1000)
  }
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col gap-2 font-mono text-[10px] w-full text-left">
    <div class="flex flex-col gap-0.5">
      <div class="flex justify-between text-neutral-300 font-semibold">
        <span>CPU</span>
        <span class="text-accent">{{ cpu }}%</span>
      </div>
      <div class="border border-line bg-base h-1.5 overflow-hidden">
        <div class="bg-accent h-full transition-none" :style="{ width: `${cpu}%` }"></div>
      </div>
    </div>
    <div class="flex flex-col gap-0.5">
      <div class="flex justify-between text-neutral-300 font-semibold">
        <span>RAM</span>
        <span class="text-accent">{{ ram }}%</span>
      </div>
      <div class="border border-line bg-base h-1.5 overflow-hidden">
        <div class="bg-accent h-full transition-none" :style="{ width: `${ram}%` }"></div>
      </div>
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 text-left font-mono text-neutral-300">
    <!-- Header Controls -->
    <div class="flex items-center justify-end border-b border-border-dim pb-2.5">
      <span class="text-[10px] text-neutral-500 font-mono">{{ $t('sysinfo.uptime') }}: {{ formatUptime() }}</span>
    </div>

    <!-- Main Content {{ $t('bg.pattern.grid') }} -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
      <!-- Left Column -->
      <div class="md:col-span-5 flex flex-col gap-4">
        <!-- Core Status -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-xs font-bold text-neutral-300">{{ $t('sysinfo.status.nominal') }}</span>
          </div>
          <p class="text-[11px] text-neutral-500 leading-relaxed">
            {{ $t('sysinfo.all.systems') }}
          </p>
        </div>

        <!-- System Specifications -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-1.5 text-[11px]">
          <span class="text-[10px] text-neutral-500 tracking-widest uppercase mb-1">{{ $t('sysinfo.specs') }}</span>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">{{ $t('sysinfo.os') }}</span>
            <span class="font-mono text-neutral-300">{{ $t('sysinfo.os.value') }} Enterprise</span>
          </div>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">{{ $t('sysinfo.cpu.core') }}</span>
            <span class="font-mono text-neutral-300">TIANJI_X128_CORE</span>
          </div>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">{{ $t('sysinfo.freq') }}</span>
            <span class="font-mono text-neutral-300">9.99_GHZ (OVERCLOCKED)</span>
          </div>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">{{ $t('sysinfo.total.ram') }}</span>
            <span class="font-mono text-neutral-300">128_GB</span>
          </div>
          <div class="flex justify-between py-0.5">
            <span class="text-neutral-500">{{ $t('sysinfo.temp') }}</span>
            <span class="font-mono text-neutral-300">42C_NOMINAL</span>
          </div>
        </div>

        <!-- System Logs -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-2 flex-1">
          <span class="text-[10px] text-neutral-500 tracking-widest uppercase border-b border-border-dim pb-1">{{ $t('sysinfo.system.log') }}</span>
          <div class="font-mono text-[9px] text-neutral-400 flex flex-col gap-1 overflow-y-auto max-h-[120px] h-[120px] pr-1 leading-normal">
            <div v-for="(log, idx) in logs" :key="idx" class="flex gap-1.5 hover:bg-base p-0.5 transition-none">
              <span class="text-neutral-600">[{{ log.time }}]</span>
              <span class="text-neutral-300 truncate flex-1">{{ log.text }}</span>
            </div>
          </div>
          <button 
            @click="optimizeMemory" 
            :disabled="isOptimizing"
            class="mt-1 w-full text-center py-1.5 text-xs bg-base border border-line text-accent hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed font-mono cursor-pointer transition-none font-bold"
          >
            {{ isOptimizing ? optimizeMessage : $t('sysinfo.optimize.ram') }}
          </button>
        </div>
      </div>

      <!-- Right Column -->
      <div class="md:col-span-7 flex flex-col gap-4">
        <!-- Circular Gauges -->
        <div class="bg-surface border border-line p-4 flex justify-around items-center">
          <!-- CPU Dial -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="relative w-28 h-28 flex items-center justify-center">
              <svg class="absolute w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="var(--color-line)" stroke-width="6" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="var(--color-accent)" stroke-width="6" fill="none"
                        stroke-dasharray="301.6" :stroke-dashoffset="301.6 * (1 - cpu / 100)"
                        stroke-linecap="round" class="transition-none" />
              </svg>
              <div class="flex flex-col items-center justify-center z-10">
                <span class="text-xl font-mono font-extrabold text-neutral-300">{{ cpu }}%</span>
                <span class="text-[9px] text-neutral-500 tracking-wider font-bold">CPU</span>
              </div>
            </div>
          </div>

          <!-- RAM Dial -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="relative w-28 h-28 flex items-center justify-center">
              <svg class="absolute w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="var(--color-line)" stroke-width="6" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="var(--color-accent)" stroke-width="6" fill="none"
                        stroke-dasharray="301.6" :stroke-dashoffset="301.6 * (1 - ram / 100)"
                        stroke-linecap="round" class="transition-none" />
              </svg>
              <div class="flex flex-col items-center justify-center z-10">
                <span class="text-xl font-mono font-extrabold text-accent">{{ ram }}%</span>
                <span class="text-[9px] text-neutral-500 tracking-wider font-bold">RAM</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Storage Partitions -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-2">
          <span class="text-[10px] text-neutral-500 tracking-widest uppercase mb-1">{{ $t('sysinfo.storage') }}</span>
          <div class="flex flex-col gap-2">
            <div v-for="part in partitions" :key="part.name" class="flex flex-col gap-1">
              <div class="flex justify-between text-[11px] text-neutral-400">
                <span class="font-semibold">{{ part.name }}</span>
                <span class="font-mono text-accent">{{ part.used }}% (AVAIL: {{ part.total }})</span>
              </div>
              <div class="h-2 border border-border-dim bg-base overflow-hidden">
                <div class="h-full bg-neutral-600 transition-none" :style="{ width: `${part.used}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Processes -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-2.5 flex-1">
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-[10px] text-neutral-500 tracking-widest uppercase">{{ $t('sysinfo.processes') }}</span>
            <span class="text-[9px] text-neutral-600">RUNNING: {{ processes.filter(p => p.status === 'running').length }} / 6</span>
          </div>
          
          <div class="overflow-y-auto max-h-[160px] pr-1.5 flex flex-col gap-1">
            <div v-for="proc in processes" :key="proc.id" 
                 class="flex items-center justify-between text-[11px] py-1 px-2 border border-border-dim transition-none"
                 :class="proc.status === 'terminated' ? 'opacity-40 bg-base border-dashed border-red-950/20' : 'bg-base hover:bg-surface'">
              
              <div class="flex flex-col items-start w-1/3 min-w-[100px]">
                <span class="font-mono font-bold text-neutral-300 truncate max-w-full" :class="{ 'line-through': proc.status === 'terminated' }">
                  {{ proc.name }}
                </span>
                <span class="text-[9px] text-neutral-500 truncate max-w-full text-left">{{ proc.desc }}</span>
              </div>

              <span class="font-mono text-neutral-600 text-[10px] w-12 text-center">PID {{ proc.pid }}</span>

              <div class="flex gap-3 text-[10px] font-mono w-24 justify-end">
                <span class="w-10 text-right" :class="proc.cpu > 25 ? 'text-red-400' : 'text-neutral-400'">
                  C: {{ proc.cpu }}%
                </span>
                <span class="w-10 text-right text-accent">
                  M: {{ proc.mem }}%
                </span>
              </div>

              <button 
                v-if="proc.status === 'running'"
                @click="killProcess(proc.id)"
                class="text-[9px] font-mono border border-red-900/40 bg-base text-red-300 hover:bg-red-950 hover:text-red-200 px-1.5 py-0.5 cursor-pointer transition-none select-none"
              >
                {{ $t('sysinfo.kill') }}
              </button>
              <span v-else class="text-[9px] font-mono text-red-500/60 px-1 py-0.5">
                {{ $t('sysinfo.dead') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
