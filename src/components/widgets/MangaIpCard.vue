<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { api, isLoggedIn } from '../../utils/api'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const ip = ref('127.0.0.1')
const location = ref('LOCAL_LAN')
const org = ref('LOOPBACK')
const region = ref('')
const country = ref('')
const latLng = ref('')
const loading = ref(true)

  const rtt = ref<number | string>('N/A')
  const downlink = ref<number | string>('N/A')
  const effType = ref<string>('N/A')
const isOnline = ref(true)

interface DiagnosticNode {
  name: string
  url: string
  latency: number | null
  status: 'idle' | 'testing' | 'success' | 'timeout' | 'failed'
}

const nodes = ref<DiagnosticNode[]>([
  { name: 'Cloudflare CDN', url: 'https://1.1.1.1', latency: null, status: 'idle' },
  { name: 'Baidu', url: 'https://www.baidu.com', latency: null, status: 'idle' },
  { name: 'GitHub', url: 'https://github.com', latency: null, status: 'idle' },
  { name: 'Google', url: 'https://www.google.com', latency: null, status: 'idle' },
  { name: 'Taobao', url: 'https://www.taobao.com', latency: null, status: 'idle' }
])

const isDiagnosing = ref(false)

function checkLocalConnection() {
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  if (conn) {
    rtt.value = conn.rtt ? `${conn.rtt} ms` : 'N/A'
    downlink.value = conn.downlink ? `${conn.downlink} Mbps` : 'N/A'
    effType.value = conn.effectiveType || 'N/A'
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
      ip.value = data.query || 'N/A'
      country.value = data.country || ''
      region.value = data.regionName || ''
      const city = data.city || ''
      location.value = `${country.value} · ${region.value} · ${city}`.replace(/^[ ·]+|[ ·]+$/g, '') || 'N/A'
      org.value = data.isp || 'N/A'
      if (data.lat && data.lon) {
        latLng.value = `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`
      } else {
        latLng.value = 'N/A'
      }
    }
  } catch (error) {
    ip.value = 'FETCH_FAIL'
    location.value = 'NETWORK_BLOCKED'
    org.value = 'CHECK_PROXY_SETTINGS'
    latLng.value = 'N/A'
  } finally {
    loading.value = false
  }
}

async function pingNode(node: DiagnosticNode) {
  node.status = 'testing'
  node.latency = null
  
  if (isLoggedIn()) {
    try {
      let host = node.url
      if (host.includes('://')) host = host.split('://')[1]
      if (host.includes('/')) host = host.split('/')[0]
      
      const res = await api.probeNetwork(host)
      if (res.status === 'success' && res.latency !== null) {
        node.latency = res.latency
        node.status = 'success'
      } else {
        node.status = 'failed'
      }
    } catch {
      node.status = 'failed'
    }
  } else {
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
      <span class="text-accent text-[8px] uppercase tracking-widest">GEOLOC</span>
      <span class="text-neutral-300 truncate">{{ location }}</span>
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 font-mono select-none text-neutral-300 bg-base">
    <!-- Header Controls -->
    <div class="flex items-center justify-end border-b border-line pb-2.5">
      <div class="flex gap-2">
        <button
          @click="fetchNetworkInfo"
          :disabled="loading"
          class="text-[10px] bg-surface border border-border-dim text-accent hover:bg-surface hover:text-accent px-2.5 py-1 cursor-pointer transition-none disabled:opacity-50"
        >
          {{ loading ? $t('ipcard.querying') : $t('ipcard.refresh') }}
        </button>
        <button
          @click="runAllDiagnostics"
          :disabled="isDiagnosing"
          class="text-[10px] bg-surface border border-border-dim text-neutral-400 hover:bg-surface hover:text-neutral-300 px-2.5 py-1 cursor-pointer transition-none disabled:opacity-50"
        >
          {{ isDiagnosing ? $t('ipcard.diagnosing') : $t('ipcard.diagnose') }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-5 text-left text-xs md:text-sm">
      <!-- Left Column: IP details & Local Connection info (col-span-5) -->
      <div class="md:col-span-5 flex flex-col gap-3.5">

        <!-- Public IP Card -->
        <div class="bg-surface border border-line p-3.5 flex flex-col gap-3">
          <span class="text-[10px] text-accent tracking-widest uppercase border-b border-border-dim pb-1">{{ $t('ipcard.public.ip') }}</span>
          <div class="flex flex-col gap-2.5">
            <div class="flex justify-between items-center bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('ipcard.ip.addr') }}</span>
              <span class="font-mono text-neutral-300 select-text text-xs sm:text-sm">{{ ip }}</span>
            </div>

            <div class="flex flex-col gap-1 bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('ipcard.location') }}</span>
              <span class="text-neutral-300 truncate text-xs sm:text-sm">{{ location || $t('hitokoto.loading') }}</span>
            </div>

            <div class="flex justify-between items-center bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('ipcard.isp') }}</span>
              <span class="text-neutral-300 truncate max-w-[180px] text-right text-xs sm:text-sm">{{ org || $t('hitokoto.loading') }}</span>
            </div>

            <div class="flex justify-between items-center bg-base border border-border-dim px-3 py-2">
              <span class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('ipcard.geo') }}</span>
              <span class="font-mono text-accent text-xs">{{ latLng || $t('hitokoto.loading') }}</span>
            </div>
          </div>
        </div>

        <!-- Local connection card -->
        <div class="bg-surface border border-line p-3.5 flex flex-col gap-2.5">
          <span class="text-[10px] text-accent tracking-widest uppercase border-b border-border-dim pb-1">{{ $t('ipcard.local.connection') }}</span>
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">RTT</div>
              <div class="font-mono text-neutral-300 mt-0.5 text-xs">{{ rtt }}</div>
            </div>
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">{{ $t('ipcard.downlink') }}</div>
              <div class="font-mono text-neutral-300 mt-0.5 text-xs">{{ downlink }}</div>
            </div>
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">{{ $t('ipcard.conn.type') }}</div>
              <div class="font-mono text-neutral-300 mt-0.5 text-xs uppercase">{{ effType }}</div>
            </div>
            <div class="bg-base border border-border-dim p-2">
              <div class="text-neutral-500 text-[10px] uppercase tracking-widest">{{ $t('ipcard.online') }}</div>
              <div class="mt-0.5 text-xs uppercase tracking-widest" :class="isOnline ? 'text-accent' : 'text-neutral-600'">
                {{ isOnline ? $t('ipcard.connected') : $t('ipcard.offline') }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Ping Diagnostic Node details (col-span-7) -->
      <div class="md:col-span-7 bg-surface border border-line p-3.5 flex flex-col gap-3.5">
        <div class="flex justify-between items-center border-b border-border-dim pb-1">
          <span class="text-[10px] text-accent tracking-widest uppercase">{{ $t('ipcard.ping.diagnostics') }}</span>
          <span class="text-[9px] text-neutral-600">{{ $t('ipcard.cors.probe') }}</span>
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
                      'text-accent': node.status === 'testing',
                      'text-emerald-400': node.status === 'success' && node.latency !== null && node.latency < 150,
                      'text-amber-400': node.status === 'success' && node.latency !== null && node.latency >= 150,
                      'text-red-500': node.status === 'timeout' || node.status === 'failed'
                    }">
                <template v-if="node.status === 'idle'">{{ $t('ipcard.status.idle') }}</template>
                <template v-else-if="node.status === 'testing'">{{ $t('ipcard.status.probing') }}</template>
                <template v-else-if="node.status === 'timeout'">{{ $t('ipcard.timeout') }}</template>
                <template v-else-if="node.status === 'failed'">{{ $t('ipcard.blocked') }}</template>
                <template v-else-if="node.status === 'success'">{{ node.latency }} ms</template>
              </span>

              <button
                @click="pingNode(node)"
                :disabled="isDiagnosing || node.status === 'testing'"
                class="text-[9px] font-mono border border-border-dim bg-surface text-accent hover:bg-surface px-1.5 py-0.5 cursor-pointer transition-none select-none disabled:opacity-50"
              >
                {{ $t('ipcard.probe') }}
              </button>
            </div>

          </div>
        </div>

        <!-- Latency guide legend -->
        <div class="flex justify-between items-center text-[9px] text-neutral-600 border-t border-border-dim pt-2.5">
          <div class="flex gap-2">
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 bg-emerald-500"></span> &lt;150ms {{ $t('ipcard.status.fast') }}</span>
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 bg-amber-500"></span> 150-300ms {{ $t('ipcard.status.slow') }}</span>
            <span class="flex items-center gap-1"><span class="h-1.5 w-1.5 bg-red-500"></span> {{ $t('ipcard.blocked') }}/{{ $t('ipcard.timeout') }}</span>
          </div>
          <span>{{ $t('ipcard.probe.handshake') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
