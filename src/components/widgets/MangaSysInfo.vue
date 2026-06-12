<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const cpu = ref(35)
const ram = ref(62)

const partitions = ref([
  { name: 'C: 藏经阁 (System)', used: 47, total: '512 GB' },
  { name: 'D: 百宝箱 (Data)', used: 68, total: '2.0 TB' },
  { name: 'E: 炼丹炉 (Temp)', used: 12, total: '1.0 TB' },
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
  { id: 1, name: 'alchemy-engine.exe', desc: '丹道编译引擎', pid: 1402, cpu: 12, mem: 18, status: 'running' },
  { id: 2, name: 'array-spirit.sys', desc: '护法大阵守护者', pid: 884, cpu: 4, mem: 8, status: 'running' },
  { id: 3, name: 'manga-dash.node', desc: '星罗控制台', pid: 2901, cpu: 8, mem: 12, status: 'running' },
  { id: 4, name: 'cultivation-daemon', desc: '仙人后台调度', pid: 9024, cpu: 15, mem: 14, status: 'running' },
  { id: 5, name: 'browser.exe', desc: '通天镜浏览器', pid: 1056, cpu: 5, mem: 22, status: 'running' },
  { id: 6, name: 'antigravity-drive', desc: '反重力引擎驱动', pid: 7777, cpu: 1, mem: 5, status: 'running' },
])

const uptimeSeconds = ref(45296)
const formatUptime = () => {
  const h = Math.floor(uptimeSeconds.value / 3600)
  const m = Math.floor((uptimeSeconds.value % 3600) / 60)
  const s = uptimeSeconds.value % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const logs = ref<{ time: string; text: string }[]>([
  { time: '12:00:00', text: '天机核心阵法加载成功' },
  { time: '12:05:12', text: '五行风雷冷却符文生效' },
  { time: '12:30:45', text: '监测到识海波澜，已净化杂乱思绪' },
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
  optimizeMessage.value = '正在洗涤识海虚妄...'
  addLog('发起识海涤荡咒，准备释放冗余星能')
  
  setTimeout(() => {
    ram.value = Math.max(25, ram.value - Math.floor(Math.random() * 15 + 10))
    processes.value.forEach(p => {
      if (p.status === 'running') {
        p.mem = Math.max(2, p.mem - Math.floor(Math.random() * 3 + 1))
      }
    })
    isOptimizing.value = false
    optimizeMessage.value = '涤荡完毕！识海清明'
    addLog('识海涤荡成功，大量星能已归还虚空')
  }, 1500)
}

function killProcess(id: number) {
  const proc = processes.value.find(p => p.id === id)
  if (proc && proc.status === 'running') {
    proc.status = 'terminated'
    addLog(`手动终结法阵 [${proc.name}] (PID: ${proc.pid})`)
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
        addLog(`法阵守护唤醒：[${proc.name}] (PID: ${proc.pid}) 自动重启`)
      }
    }, 8000)
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
      '星能流转顺畅，大阵稳固',
      '天机运转平稳，温度维持在 42 爻',
      '检测到少量灵力潮汐波动',
      '外阻灵网 ping 正常，无心魔入侵',
      '大阵节点自我擦拭完毕'
    ]
    const alertText = alerts[Math.floor(Math.random() * alerts.length)]
    addLog(alertText)
  }
}

onMounted(() => {
  timer = setInterval(() => {
    updateStats()
    uptimeSeconds.value++
  }, 1000)
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
        <span>天机 (CPU)</span>
        <span class="text-accent">{{ cpu }}%</span>
      </div>
      <div class="border border-line bg-base h-1.5 overflow-hidden">
        <div class="bg-accent h-full transition-none" :style="{ width: `${cpu}%` }"></div>
      </div>
    </div>
    <div class="flex flex-col gap-0.5">
      <div class="flex justify-between text-neutral-300 font-semibold">
        <span>识海 (RAM)</span>
        <span class="text-accent">{{ ram }}%</span>
      </div>
      <div class="border border-line bg-base h-1.5 overflow-hidden">
        <div class="bg-accent h-full transition-none" :style="{ width: `${ram}%` }"></div>
      </div>
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 text-left font-mono text-neutral-300">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border-dim pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-400 font-bold">[ SYS_MON ]</span>
      <span class="text-[10px] text-neutral-500 font-mono">Uptime: {{ formatUptime() }}</span>
    </div>

    <!-- Main Content Grid -->
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
            <span class="text-xs font-bold text-neutral-300">阵枢状态：<span class="text-emerald-400">运转昌盛</span></span>
          </div>
          <p class="text-[11px] text-neutral-500 leading-relaxed">
            大阵九千六百结运行平稳，风雷感应冷却稳定，无天魔扰动风险。
          </p>
        </div>

        <!-- System Specifications -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-1.5 text-[11px]">
          <span class="text-[10px] text-neutral-500 tracking-widest uppercase mb-1">SPECS</span>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">仙道系统</span>
            <span class="font-mono text-neutral-300">DaoOS v9.42 Enterprise</span>
          </div>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">阵元中枢</span>
            <span class="font-mono text-neutral-300">天玑星轨 128核处理器</span>
          </div>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">本源灵频</span>
            <span class="font-mono text-neutral-300">9.99 GHz (雷火超频)</span>
          </div>
          <div class="flex justify-between border-b border-border-dim py-0.5">
            <span class="text-neutral-500">总识海量</span>
            <span class="font-mono text-neutral-300">128 GB (九转金丹颗粒)</span>
          </div>
          <div class="flex justify-between py-0.5">
            <span class="text-neutral-500">炉温评估</span>
            <span class="font-mono text-emerald-400">42°C (已刻冰封咒)</span>
          </div>
        </div>

        <!-- System Logs -->
        <div class="bg-surface border border-line p-3 flex flex-col gap-2 flex-1">
          <span class="text-[10px] text-neutral-500 tracking-widest uppercase border-b border-border-dim pb-1">SYSTEM LOG</span>
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
            {{ isOptimizing ? optimizeMessage : '> OPTIMIZE RAM' }}
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
                <circle cx="56" cy="56" r="48" stroke="#262626" stroke-width="6" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#FF5F1F" stroke-width="6" fill="none"
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
                <circle cx="56" cy="56" r="48" stroke="#262626" stroke-width="6" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#FF5F1F" stroke-width="6" fill="none"
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
          <span class="text-[10px] text-neutral-500 tracking-widest uppercase mb-1">STORAGE</span>
          <div class="flex flex-col gap-2">
            <div v-for="part in partitions" :key="part.name" class="flex flex-col gap-1">
              <div class="flex justify-between text-[11px] text-neutral-400">
                <span class="font-semibold">{{ part.name }}</span>
                <span class="font-mono text-accent">{{ part.used }}% (可用: {{ part.total }})</span>
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
            <span class="text-[10px] text-neutral-500 tracking-widest uppercase">PROCESSES</span>
            <span class="text-[9px] text-neutral-600">运行中: {{ processes.filter(p => p.status === 'running').length }} / 6</span>
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
                KILL
              </button>
              <span v-else class="text-[9px] font-mono text-red-500/60 px-1 py-0.5">
                DEAD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
