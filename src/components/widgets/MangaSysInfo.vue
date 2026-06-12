<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const cpu = ref(35)
const ram = ref(62)

// Partitions
const partitions = ref([
  { name: 'C: 藏经阁 (System)', used: 47, total: '512 GB' },
  { name: 'D: 百宝箱 (Data)', used: 68, total: '2.0 TB' },
  { name: 'E: 炼丹炉 (Temp)', used: 12, total: '1.0 TB' },
])

// Processes
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

// Uptime
const uptimeSeconds = ref(45296) // starts at ~12.58 hrs
const formatUptime = () => {
  const h = Math.floor(uptimeSeconds.value / 3600)
  const m = Math.floor((uptimeSeconds.value % 3600) / 60)
  const s = uptimeSeconds.value % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Logs
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
    // also reduce memory for running processes
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
    
    // Recalculate total CPU
    cpu.value = Math.max(5, cpu.value - origCpu)
    ram.value = Math.max(20, ram.value - Math.floor(origMem / 2))

    // Respawn after 8 seconds
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
  // Fluctuating values
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

  // Random log sometimes
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
  <div v-if="preview" class="select-none flex flex-col gap-2 font-serif text-[10px] w-full text-left">
    <div class="flex flex-col gap-0.5">
      <div class="flex justify-between text-[#f5f2eb] font-semibold">
        <span>天机 (CPU)</span>
        <span class="text-gold/90">{{ cpu }}%</span>
      </div>
      <div class="border border-[#d4af37]/25 bg-[#120e0c]/60 h-1.5 rounded overflow-hidden">
        <div class="bg-progress-cpu h-full transition-all duration-500" :style="{ width: `${cpu}%` }"></div>
      </div>
    </div>
    <div class="flex flex-col gap-0.5">
      <div class="flex justify-between text-[#f5f2eb] font-semibold">
        <span>识海 (RAM)</span>
        <span class="text-gold/90">{{ ram }}%</span>
      </div>
      <div class="border border-[#d4af37]/25 bg-[#120e0c]/60 h-1.5 rounded overflow-hidden">
        <div class="bg-progress-ram h-full transition-all duration-500" :style="{ width: `${ram}%` }"></div>
      </div>
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 text-left font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9] font-bold">📐 系统天机监控仪 (System Astral Core)</span>
      <span class="text-[10px] text-gold/70 font-mono">Uptime: {{ formatUptime() }}</span>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
      <!-- Left Column: Specs, Status, Logs (col-span-5) -->
      <div class="md:col-span-5 flex flex-col gap-4">
        <!-- Core Status -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-xs font-bold text-cream">阵枢状态：<span class="text-emerald-400">运转昌盛</span></span>
          </div>
          <p class="text-[11px] text-[#ebdcb9]/70 leading-relaxed">
            大阵九千六百结运行平稳，风雷感应冷却稳定，无天魔扰动风险。
          </p>
        </div>

        <!-- System Specifications -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3 flex flex-col gap-1.5 text-[11px]">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase mb-1">📜 阵枢法理规度 (Specs)</span>
          <div class="flex justify-between border-b border-[#d4af37]/10 py-0.5">
            <span class="text-[#ebdcb9]/60">仙道系统</span>
            <span class="font-mono text-cream">DaoOS v9.42 Enterprise</span>
          </div>
          <div class="flex justify-between border-b border-[#d4af37]/10 py-0.5">
            <span class="text-[#ebdcb9]/60">阵元中枢</span>
            <span class="font-mono text-cream">天玑星轨 128核处理器</span>
          </div>
          <div class="flex justify-between border-b border-[#d4af37]/10 py-0.5">
            <span class="text-[#ebdcb9]/60">本源灵频</span>
            <span class="font-mono text-cream">9.99 GHz (雷火超频)</span>
          </div>
          <div class="flex justify-between border-b border-[#d4af37]/10 py-0.5">
            <span class="text-[#ebdcb9]/60">总识海量</span>
            <span class="font-mono text-cream">128 GB (九转金丹颗粒)</span>
          </div>
          <div class="flex justify-between py-0.5">
            <span class="text-[#ebdcb9]/60">炉温评估</span>
            <span class="font-mono text-emerald-400">42°C (已刻冰封咒)</span>
          </div>
        </div>

        <!-- System Logs / Log console -->
        <div class="bg-[#120e0c]/80 border border-[#d4af37]/20 rounded p-3 flex flex-col gap-2 flex-1">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase border-b border-[#d4af37]/15 pb-1">📺 法阵周天日志 (System Log)</span>
          <div class="font-mono text-[9px] text-[#ebdcb9]/80 flex flex-col gap-1 overflow-y-auto max-h-[120px] h-[120px] pr-1 leading-normal">
            <div v-for="(log, idx) in logs" :key="idx" class="flex gap-1.5 hover:bg-white/5 p-0.5 rounded transition-all">
              <span class="text-[#d4af37]/60">[{{ log.time }}]</span>
              <span class="text-cream truncate flex-1">{{ log.text }}</span>
            </div>
          </div>
          <button 
            @click="optimizeMemory" 
            :disabled="isOptimizing"
            class="mt-1 w-full text-center py-1.5 text-xs bg-[#221c19] border border-[#d4af37]/40 text-gold hover:bg-[#3d2b1f] hover:text-[#d4af37] disabled:opacity-50 disabled:cursor-not-allowed rounded font-serif cursor-pointer active:scale-98 transition-all font-bold"
          >
            {{ isOptimizing ? optimizeMessage : '🧹 涤荡识海 (Optimize RAM)' }}
          </button>
        </div>
      </div>

      <!-- Right Column: Gauges, Storage, Processes (col-span-7) -->
      <div class="md:col-span-7 flex flex-col gap-4">
        <!-- Circular Gauges -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-4 flex justify-around items-center">
          <!-- CPU Dial -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="relative w-28 h-28 flex items-center justify-center">
              <svg class="absolute w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="rgba(212, 175, 55, 0.08)" stroke-width="6" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#ebdcb9" stroke-width="6" fill="none"
                        stroke-dasharray="301.6" :stroke-dashoffset="301.6 * (1 - cpu / 100)"
                        stroke-linecap="round" class="transition-all duration-500 ease-out" />
              </svg>
              <div class="flex flex-col items-center justify-center z-10">
                <span class="text-xl font-mono font-extrabold text-cream">{{ cpu }}%</span>
                <span class="text-[9px] text-[#ebdcb9]/60 tracking-wider font-bold">天机 CPU</span>
              </div>
            </div>
          </div>

          <!-- RAM Dial -->
          <div class="flex flex-col items-center gap-1.5">
            <div class="relative w-28 h-28 flex items-center justify-center">
              <svg class="absolute w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="rgba(212, 175, 55, 0.08)" stroke-width="6" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#d4af37" stroke-width="6" fill="none"
                        stroke-dasharray="301.6" :stroke-dashoffset="301.6 * (1 - ram / 100)"
                        stroke-linecap="round" class="transition-all duration-500 ease-out" />
              </svg>
              <div class="flex flex-col items-center justify-center z-10">
                <span class="text-xl font-mono font-extrabold text-gold">{{ ram }}%</span>
                <span class="text-[9px] text-gold/60 tracking-wider font-bold">识海 RAM</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Storage Partitions -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3 flex flex-col gap-2">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase mb-1">📂 藏经分区 (SSD Drives)</span>
          <div class="flex flex-col gap-2">
            <div v-for="part in partitions" :key="part.name" class="flex flex-col gap-1">
              <div class="flex justify-between text-[11px] text-[#ebdcb9]/90">
                <span class="font-semibold">{{ part.name }}</span>
                <span class="font-mono text-gold/80">{{ part.used }}% (可用: {{ part.total }})</span>
              </div>
              <div class="h-2 border border-[#d4af37]/15 bg-[#120e0c]/80 rounded overflow-hidden">
                <div class="h-full bg-[#6e5020] rounded-r-sm transition-all duration-500" :style="{ width: `${part.used}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Processes -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3 flex flex-col gap-2.5 flex-1">
          <div class="flex justify-between items-center border-b border-[#d4af37]/15 pb-1.5">
            <span class="text-[10px] text-gold/70 tracking-widest uppercase">🔮 阵法进程负载监测 (Active Spirits)</span>
            <span class="text-[9px] text-[#ebdcb9]/50">运行中: {{ processes.filter(p => p.status === 'running').length }} / 6</span>
          </div>
          
          <div class="overflow-y-auto max-h-[160px] pr-1.5 flex flex-col gap-1">
            <div v-for="proc in processes" :key="proc.id" 
                 class="flex items-center justify-between text-[11px] py-1 px-2 border border-[#d4af37]/10 rounded transition-all duration-300"
                 :class="proc.status === 'terminated' ? 'opacity-40 bg-black/40 border-dashed border-red-950/20' : 'bg-[#1a1512]/60 hover:bg-[#221c19]/80'">
              
              <!-- Name & Description -->
              <div class="flex flex-col items-start w-1/3 min-w-[100px]">
                <span class="font-mono font-bold text-cream truncate max-w-full" :class="{ 'line-through': proc.status === 'terminated' }">
                  {{ proc.name }}
                </span>
                <span class="text-[9px] text-[#ebdcb9]/60 truncate max-w-full text-left">{{ proc.desc }}</span>
              </div>

              <!-- PID -->
              <span class="font-mono text-gold/50 text-[10px] w-12 text-center">PID {{ proc.pid }}</span>

              <!-- Resource stats -->
              <div class="flex gap-3 text-[10px] font-mono w-24 justify-end">
                <span class="w-10 text-right" :class="proc.cpu > 25 ? 'text-red-400' : 'text-[#ebdcb9]'">
                  C: {{ proc.cpu }}%
                </span>
                <span class="w-10 text-right text-gold">
                  M: {{ proc.mem }}%
                </span>
              </div>

              <!-- Action -->
              <button 
                v-if="proc.status === 'running'"
                @click="killProcess(proc.id)"
                class="text-[9px] font-serif border border-red-900/40 bg-[#2b1618] text-red-300 hover:bg-red-950 hover:text-red-200 px-1.5 py-0.5 rounded cursor-pointer active:scale-95 transition-all select-none"
              >
                斩
              </button>
              <span v-else class="text-[9px] font-serif text-red-500/60 px-1 py-0.5 italic">
                已寂灭
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
