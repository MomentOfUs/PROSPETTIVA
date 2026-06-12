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

const rtt = ref<number | string>('未知')
const downlink = ref<number | string>('未知')
const effType = ref<string>('未知')
const isOnline = ref(true)

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
    const res = await fetch('https://ip-api.com/json/?fields=status,message,query,country,regionName,city,isp,lat,lon')
    const data = await res.json()
    if (data) {
      ip.value = data.query || '未知IP'
      country.value = data.country || ''
      region.value = data.regionName || ''
      const city = data.city || ''
      location.value = `${country.value} · ${region.value} · ${city}`.replace(/^[ ·]+|[ ·]+$/g, '') || '未知位置'
      org.value = data.isp || '未知运营商'
      if (data.lat && data.lon) {
        latLng.value = `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`
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
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)
  try {
    await fetch(node.url, {
      method: 'GET',
      mode: 'no-cors',
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
  <div v-if="preview" class="select-none flex flex-col gap-1.5 font-mono text-[10px] w-full text-left bg-base">
    <div class="flex justify-between items-center bg-surface border border-line p-1">
      <span class="text-accent text-[8px] uppercase tracking-widest">IP</span>
      <span class="font-mono text-neutral-300 truncate max-w-[90px]">{{ ip }}</span>
    </div>
    <div class="flex flex-col gap-0.5 bg-surface border border-line p-1">
      <span class="text-accent text-[8px] uppercase tracking-widest">归属</span>
      <span class="text-neutral-300 truncate">{{ location }}</span>
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 font-mono select-none text-neutral-300 bg-base">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-400">[ NET ]</span>
      <div class="flex gap-2">
        <button
          @click="fetchNetworkInfo"
          :disabled="loading"
          class="text-[10px] bg-surface border border-border-dim text-accent hover:bg-surface hover:text-black px-2.5 py-1 cursor-pointer transition-none disabled:opacity-50"
        >
          {{ loading ? '查询中...' : '🔄 刷新归属' }}
        </button>
        <button
          @click="runAllDiagnostics"
          :disabled="isDiagnosing"
          class="text-[10px] bg-surface border border-border-dim text-neutral-400 hover:bg-surface hover:text-neutral-300 px-2.5 py-1 cursor-pointer transition-none disabled:opacity-50"
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
        <div class="bg-surface border border-line p-3.5 flex flex-col gap-3">
          <span class="text-[10px] text-accent tracking-widest uppercase border-b border-border-dim pb-1">🌍 外网本源出口 (Public IP)</span>
          <div class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">公网 IP</span>
              <span class="font-mono text-neutral-300 select-text text-xs sm:text-sm">{{ ip }}</span>
            </div>

            <div class="flex flex-col gap-1 bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">地理位置</span>
              <span class="text-neutral-300 truncate text-xs sm:text-sm">{{ location || '获取中...' }}</span>
            </div>

            <div class="flex justify-between items-center bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">运营商</span>
              <span class="text-neutral-300 truncate max-w-[180px] text-right text-xs sm:text-sm">{{ org || '获取中...' }}</span>
            </div>

            <div class="flex justify-between items-center bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">经纬</span>
              <span class="font-mono text-accent text-xs">{{ latLng || '获取中...' }}</span>
            </div>
          </div>
        </div>

        <!-- Local connection card -->
        <div class="bg-surface border border-line p-3.5 flex flex-col gap-2.5">
          <span class="text-[10px] text-accent tracking-widest uppercase border-b border-border-dim pb-1">💻 内网微澜状态 (Local Conn)</span>
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">延迟 RTT</div>
              <div class="font-mono text-neutral-300 mt-0.5 text-xs">{{ rtt }}</div>
            </div>
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">带宽 Downlink</div>
              <div class="font-mono text-neutral-300 mt-0.5 text-xs">{{ downlink }}</div>
            </div>
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">通道类型</div>
              <div class="font-mono text-neutral-300 mt-0.5 text-xs uppercase">{{ effType }}</div>
            </div>
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">灵气连通</div>
              <div class="mt-0.5 text-xs uppercase tracking-widest" :class="isOnline ? 'text-accent' : 'text-neutral-600'">
                {{ isOnline ? '已接入' : '脱机' }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Ping Diagnostic Node details (col-span-7) -->
      <div class="md:col-span-7 bg-surface border border-line p-3.5 flex flex-col gap-3.5">
        <div class="flex justify-between items-center border-b border-border-dim pb-1">
          <span class="text-[10px] text-accent tracking-widest uppercase">⚡ 灵网节点延迟诊断 (Ping Diagnostics)</span>
          <span class="text-[9px] text-neutral-600">支持跨域探针技术</span>
        </div>

        <div class="flex flex-col gap-2 flex-1 justify-center">
          <div v-for="node in nodes" :key="node.name"
               class="bg-base border border-border-dim p-2.5 flex items-center justify-between transition-none">

            <div class="flex items-center gap-2 w-1/3 min-w-[120px]">
              <span class="relative flex h-1.5 w-1.5">
                <span v-if="node.status === 'testing'" class="animate-ping absolute inline-flex h-full w-full bg-accent opacity-75"></span>
                <span class="relative inline-flex h-1.5 w-1.5"
                      :class="{
                        'bg-neutral-600': node.status === 'idle',
                        'bg-accent': node.status === 'testing',
                        'bg-emerald-500': node.status === 'success' && node.latency !== null && node.latency < 150,
                        'bg-amber-500': node.status === 'success' && node.latency !== null && node.latency >= 150,
                        'bg-red-500': node.status === 'timeout' || node.status === 'failed'
                      }"></span>
              </span>
              <span class="text-neutral-300 text-xs truncate">{{ node.name }}</span>
            </div>

            <!-- Mini Progress Latency Bar -->
            <div class="flex-1 max-w-[200px] hidden sm:block px-4">
              <div class="h-1 bg-base border border-border-dim overflow-hidden">
                <div class="h-full transition-none"
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
                      'text-neutral-600': node.status === 'idle',
                      'text-accent animate-pulse': node.status === 'testing',
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
                class="text-[9px] font-mono border border-border-dim bg-surface text-accent hover:bg-surface px-1.5 py-0.5 cursor-pointer transition-none select-none disabled:opacity-50"
              >
                探
              </button>
            </div>

          </div>
        </div>

        <!-- Latency guide legend -->
        <div class="flex justify-between items-center text-[9px] text-neutral-600 border-t border-border-dim pt-2.5">
          <div class="flex gap-2">
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 bg-emerald-500"></span> &lt;150ms 顺畅</span>
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 bg-amber-500"></span> 150-300ms 迟滞</span>
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 bg-red-500"></span> 阻隔/超时</span>
          </div>
          <span>探针通过 HTTP-handshake 测算</span>
        </div>
      </div>
    </div>
  </div>
</template>
