<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const ip = ref('127.0.0.1')
const location = ref('局域网')
const org = ref('本地回环')
const region = ref('')
const country = ref('')
const latLng = ref('')
const loading = ref(true)

// Connection properties
const rtt = ref<number | string>('未知')
const downlink = ref<number | string>('未知')
const effType = ref<string>('未知')
const isOnline = ref(true)

// Diagnostic nodes
interface DiagnosticNode {
  name: string
  url: string
  latency: number | null
  status: 'idle' | 'testing' | 'success' | 'timeout' | 'failed'
}

const nodes = ref<DiagnosticNode[]>([
  { name: 'Cloudflare CDN (全球枢纽)', url: 'https://1.1.1.1', latency: null, status: 'idle' },
  { name: 'Baidu (中文搜索门户)', url: 'https://www.baidu.com', latency: null, status: 'idle' },
  { name: 'GitHub (代码托管核心)', url: 'https://github.com', latency: null, status: 'idle' },
  { name: 'Google (谷歌搜索主站)', url: 'https://www.google.com', latency: null, status: 'idle' },
  { name: 'Taobao (淘宝购物商网)', url: 'https://www.taobao.com', latency: null, status: 'idle' }
])

const isDiagnosing = ref(false)

function checkLocalConnection() {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (conn) {
    rtt.value = conn.rtt ? `${conn.rtt} ms` : '未知'
    downlink.value = conn.downlink ? `${conn.downlink} Mbps` : '未知'
    effType.value = conn.effectiveType || '未知'
  }
}

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

async function fetchNetworkInfo() {
  loading.value = true
  try {
    const res = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    if (data) {
      ip.value = data.ip || '未知IP'
      country.value = data.country_name || ''
      region.value = data.region || ''
      const city = data.city || ''
      location.value = `${country.value} · ${region.value} · ${city}`.replace(/^[ ·]+|[ ·]+$/g, '') || '未知位置'
      org.value = data.org || '未知运营商'
      if (data.latitude && data.longitude) {
        latLng.value = `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`
      } else {
        latLng.value = '未知经纬度'
      }
    }
  } catch (error) {
    ip.value = '获取失败'
    location.value = '网络请求受阻'
    org.value = '请检查网络或拦截设置'
    latLng.value = '未知经纬度'
  } finally {
    loading.value = false
  }
}

async function pingNode(node: DiagnosticNode) {
  node.status = 'testing'
  node.latency = null
  const startTime = performance.now()
  
  // Use AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)
  
  try {
    await fetch(node.url, {
      method: 'GET',
      mode: 'no-cors', // Bypass CORS
      cache: 'no-store',
      signal: controller.signal
    })
    
    const endTime = performance.now()
    const diff = Math.round(endTime - startTime)
    node.latency = diff
    node.status = 'success'
  } catch (err: any) {
    if (err.name === 'AbortError') {
      node.status = 'timeout'
    } else {
      node.status = 'failed'
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function runAllDiagnostics() {
  if (isDiagnosing.value) return
  isDiagnosing.value = true
  
  // Test nodes sequentially
  for (const node of nodes.value) {
    await pingNode(node)
  }
  
  isDiagnosing.value = false
}

onMounted(() => {
  isOnline.value = navigator.onLine
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  fetchNetworkInfo()
  checkLocalConnection()
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col gap-1.5 font-serif text-[10px] w-full text-left">
    <div class="flex justify-between items-center bg-[#120e0c]/50 border border-[#d4af37]/15 p-1 rounded">
      <span class="text-gold/70 text-[8px]">IP</span>
      <span class="font-mono text-parchment truncate max-w-[90px]">{{ ip }}</span>
    </div>
    <div class="flex flex-col gap-0.5 bg-[#120e0c]/50 border border-[#d4af37]/15 p-1 rounded">
      <span class="text-gold/70 text-[8px]">归属</span>
      <span class="text-parchment truncate">{{ location }}</span>
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 font-bold select-none font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9] font-bold">🌐 网络出口诊断星仪 (Network Astral Diagnosis)</span>
      <div class="flex gap-2">
        <button
          @click="fetchNetworkInfo"
          :disabled="loading"
          class="text-[10px] bg-[#120e0c] border border-[#d4af37]/45 text-gold hover:bg-btn-hover hover:text-[#d4af37] px-2.5 py-1 rounded font-serif cursor-pointer active:scale-95 transition-all disabled:opacity-50"
        >
          {{ loading ? '查询中...' : '🔄 刷新归属' }}
        </button>
        <button
          @click="runAllDiagnostics"
          :disabled="isDiagnosing"
          class="text-[10px] bg-[#221c19] border border-[#d4af37]/60 text-cream hover:bg-[#3d2b1f] hover:text-[#ebdcb9] px-2.5 py-1 rounded font-serif cursor-pointer active:scale-95 transition-all disabled:opacity-50"
        >
          {{ isDiagnosing ? '诊断中...' : '⚡ 一键诊断' }}
        </button>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-5 text-left text-xs md:text-sm">
      <!-- Left Column: IP details & Local Connection info (col-span-5) -->
      <div class="md:col-span-5 flex flex-col gap-3.5">
        
        <!-- Public IP Card -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3.5 flex flex-col gap-3">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase border-b border-[#d4af37]/15 pb-1">🌍 外网本源出口 (Public IP)</span>
          <div class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center bg-[#1a1512]/60 border border-[#d4af37]/10 px-3 py-2 rounded">
              <span class="text-[#ebdcb9]/60 text-xs">公网 IP</span>
              <span class="font-mono font-bold text-cream select-text text-xs sm:text-sm">{{ ip }}</span>
            </div>
            
            <div class="flex flex-col gap-1 bg-[#1a1512]/60 border border-[#d4af37]/10 px-3 py-2 rounded">
              <span class="text-[#ebdcb9]/60 text-xs">地理位置</span>
              <span class="text-cream font-bold truncate text-xs sm:text-sm">{{ location || '获取中...' }}</span>
            </div>
            
            <div class="flex justify-between items-center bg-[#1a1512]/60 border border-[#d4af37]/10 px-3 py-2 rounded">
              <span class="text-[#ebdcb9]/60 text-xs">运营商 / 组织</span>
              <span class="text-cream font-bold truncate max-w-[180px] text-right text-xs sm:text-sm">{{ org || '获取中...' }}</span>
            </div>

            <div class="flex justify-between items-center bg-[#1a1512]/60 border border-[#d4af37]/10 px-3 py-2 rounded">
              <span class="text-[#ebdcb9]/60 text-xs">定星经纬</span>
              <span class="font-mono text-gold/80 text-xs">{{ latLng || '获取中...' }}</span>
            </div>
          </div>
        </div>

        <!-- Local connection card -->
        <div class="bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3.5 flex flex-col gap-2.5">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase border-b border-[#d4af37]/15 pb-1">💻 内网微澜状态 (Local Conn)</span>
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div class="bg-[#1a1512]/50 border border-[#d4af37]/10 p-2 rounded">
              <div class="text-[#ebdcb9]/60 text-[10px]">延迟 (RTT)</div>
              <div class="font-mono text-cream font-bold mt-0.5 text-xs">{{ rtt }}</div>
            </div>
            <div class="bg-[#1a1512]/50 border border-[#d4af37]/10 p-2 rounded">
              <div class="text-[#ebdcb9]/60 text-[10px]">带宽 (Downlink)</div>
              <div class="font-mono text-cream font-bold mt-0.5 text-xs">{{ downlink }}</div>
            </div>
            <div class="bg-[#1a1512]/50 border border-[#d4af37]/10 p-2 rounded">
              <div class="text-[#ebdcb9]/60 text-[10px]">通道类型</div>
              <div class="font-mono text-cream font-bold mt-0.5 text-xs uppercase">{{ effType }}</div>
            </div>
            <div class="bg-[#1a1512]/50 border border-[#d4af37]/10 p-2 rounded">
              <div class="text-[#ebdcb9]/60 text-[10px]">灵气连通</div>
              <div class="font-bold mt-0.5 text-xs" :class="isOnline ? 'text-emerald-400' : 'text-red-500'">
                {{ isOnline ? '已接入' : '脱机' }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Ping Diagnostic Node details (col-span-7) -->
      <div class="md:col-span-7 bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-3.5 flex flex-col gap-3.5">
        <div class="flex justify-between items-center border-b border-[#d4af37]/15 pb-1">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase">⚡ 灵网节点延迟诊断 (Ping Diagnostics)</span>
          <span class="text-[9px] text-[#ebdcb9]/50">支持跨域探针技术</span>
        </div>

        <div class="flex flex-col gap-2 flex-1 justify-center">
          <div v-for="node in nodes" :key="node.name" 
               class="bg-[#1a1512]/50 border border-[#d4af37]/10 rounded p-2.5 flex items-center justify-between hover:bg-[#221c19]/60 transition-all">
            
            <div class="flex items-center gap-2 w-1/3 min-w-[120px]">
              <!-- Status dot -->
              <span class="relative flex h-1.5 w-1.5">
                <span v-if="node.status === 'testing'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5" 
                      :class="{
                        'bg-gray-600': node.status === 'idle',
                        'bg-gold': node.status === 'testing',
                        'bg-emerald-500': node.status === 'success' && node.latency !== null && node.latency < 150,
                        'bg-amber-500': node.status === 'success' && node.latency !== null && node.latency >= 150,
                        'bg-red-500': node.status === 'timeout' || node.status === 'failed'
                      }"></span>
              </span>
              <span class="text-cream text-xs font-semibold truncate">{{ node.name }}</span>
            </div>

            <!-- Mini Progress Latency Bar -->
            <div class="flex-1 max-w-[200px] hidden sm:block px-4">
              <div class="h-1 bg-black/60 rounded overflow-hidden">
                <div class="h-full rounded-r-sm transition-all duration-300"
                     :class="{
                       'bg-emerald-500': node.latency !== null && node.latency < 150,
                       'bg-amber-500': node.latency !== null && node.latency >= 150,
                       'bg-red-500': node.latency === null
                     }"
                     :style="{ width: node.latency ? `${Math.min(100, (node.latency / 500) * 100)}%` : '0%' }">
                </div>
              </div>
            </div>

            <!-- Latency text & Action -->
            <div class="flex items-center gap-3">
              <span class="font-mono text-xs w-16 text-right"
                    :class="{
                      'text-[#ebdcb9]/40': node.status === 'idle',
                      'text-gold animate-pulse': node.status === 'testing',
                      'text-emerald-400': node.status === 'success' && node.latency !== null && node.latency < 150,
                      'text-amber-400': node.status === 'success' && node.latency !== null && node.latency >= 150,
                      'text-red-500': node.status === 'timeout' || node.status === 'failed'
                    }">
                <template v-if="node.status === 'idle'">待诊断</template>
                <template v-else-if="node.status === 'testing'">测算中</template>
                <template v-else-if="node.status === 'timeout'">超时</template>
                <template v-else-if="node.status === 'failed'">阻断</template>
                <template v-else-if="node.status === 'success'">{{ node.latency }} ms</template>
              </span>

              <button 
                @click="pingNode(node)"
                :disabled="isDiagnosing || node.status === 'testing'"
                class="text-[9px] font-serif border border-[#d4af37]/35 bg-[#120e0c] text-gold hover:bg-btn-hover px-1.5 py-0.5 rounded cursor-pointer active:scale-95 transition-all select-none disabled:opacity-50"
              >
                探
              </button>
            </div>

          </div>
        </div>

        <!-- Latency guide legend -->
        <div class="flex justify-between items-center text-[9px] text-[#ebdcb9]/50 border-t border-[#d4af37]/10 pt-2.5">
          <div class="flex gap-2">
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> &lt;150ms 顺畅</span>
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> 150-300ms 迟滞</span>
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full bg-red-500"></span> 阻隔/超时</span>
          </div>
          <span>探针通过 HTTP-handshake 测算</span>
        </div>
      </div>
    </div>
  </div>
</template>
