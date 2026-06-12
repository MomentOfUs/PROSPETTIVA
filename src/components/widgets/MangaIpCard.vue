<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MangaCard from '../MangaCard.vue'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('ipcard')

const ip = ref('127.0.0.1')
const location = ref('局域网')
const org = ref('本地回环')
const loading = ref(true)

async function fetchNetworkInfo() {
  loading.value = true
  try {
    const res = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    if (data) {
      ip.value = data.ip || '未知IP'
      const country = data.country_name || ''
      const region = data.region || ''
      const city = data.city || ''
      location.value = `${country} · ${region} · ${city}`.replace(/^[ ·]+|[ ·]+$/g, '') || '未知位置'
      org.value = data.org || '未知运营商'
    }
  } catch (error) {
    ip.value = '获取失败'
    location.value = '网络请求受阻'
    org.value = '请检查网络或拦截设置'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNetworkInfo()
})
</script>

<template>
  <MangaCard class="w-full max-w-[280px] select-none flex flex-col gap-2 font-bold overflow-hidden font-serif" :hover-shift="true">
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest flex justify-between items-center font-serif text-[#ebdcb9]">
      <span>🌐 网络出口舆图</span>
      <div class="flex items-center gap-1">
        <button
          @click="fetchNetworkInfo"
          class="text-[9px] bg-[#120e0c] border border-[#d4af37]/45 text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] px-2 py-0.5 rounded font-serif cursor-pointer active:scale-95 transition-all"
        >
          检测
        </button>
        <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-0.5" :title="collapsed ? '展开' : '收起'">
          <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
        </button>
      </div>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed" class="flex flex-col gap-1.5 pt-1 text-left text-xs font-serif">
      <div class="flex justify-between items-center bg-[#120e0c]/90 border border-[#d4af37]/20 px-2.5 py-1.5 rounded shadow-sm">
        <span class="text-[#d4af37]/65 text-[9px]">公网 IP</span>
        <span class="font-mono font-semibold text-[#f5f2eb] select-text">{{ ip }}</span>
      </div>
      <div class="flex flex-col gap-0.5 bg-[#120e0c]/90 border border-[#d4af37]/20 p-2 rounded shadow-sm">
        <div class="text-[9px] text-[#d4af37]/65">地理位置</div>
        <div class="text-[#f5f2eb] font-semibold truncate text-[11px]">{{ location }}</div>
      </div>
      <div class="flex flex-col gap-0.5 bg-[#120e0c]/90 border border-[#d4af37]/20 p-2 rounded shadow-sm">
        <div class="text-[9px] text-[#d4af37]/65">运营商 / 组织</div>
        <div class="text-[#f5f2eb] font-semibold truncate text-[11px]">{{ org }}</div>
      </div>
    </div>
    </Transition>
  </MangaCard>
</template>

