<script setup lang="ts">
import { ref } from 'vue'

interface Engine {
  name: string
  url: string
  color: string
}

const engines: Engine[] = [
  { name: 'Google', url: 'https://www.google.com/search?q=%s', color: 'bg-[#ebdcb9] text-[#120e0c]' },
  { name: 'Baidu', url: 'https://www.baidu.com/s?wd=%s', color: 'bg-[#4a161b] text-[#f5f2eb]' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=%s', color: 'bg-[#18283b] text-[#f5f2eb]' }
]

const currentEngineIndex = ref(0)
const query = ref('')

function handleSearch() {
  if (!query.value.trim()) return
  const engine = engines[currentEngineIndex.value]
  const targetUrl = engine.url.replace('%s', encodeURIComponent(query.value))
  window.open(targetUrl, '_blank')
  query.value = ''
}
</script>

<template>
  <div class="w-full max-w-xl flex flex-col gap-2.5 select-none">
    <!-- Engine Selectors -->
    <div class="flex gap-2">
      <button 
        v-for="(engine, idx) in engines" 
        :key="engine.name"
        @click="currentEngineIndex = idx"
        class="border border-[#d4af37]/40 px-3 py-1 text-xs font-semibold rounded shadow-[0_2px_5px_rgba(0,0,0,0.3)] active:scale-95 transition-all cursor-pointer font-serif"
        :class="[
          currentEngineIndex === idx ? `${engine.color} border-[#d4af37]/80` : 'bg-[#120e0c] text-[#ebdcb9]/80 hover:bg-btn-base hover:text-[#ebdcb9]'
        ]"
      >
        {{ engine.name }}
      </button>
    </div>

    <!-- Input Box -->
    <div class="flex border border-[#d4af37]/50 rounded bg-[#120e0c]/90 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_3px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-300">
      <input 
        v-model="query" 
        type="text" 
        @keydown.enter="handleSearch"
        placeholder="检索乾坤，探求真理..." 
        class="w-full px-4 py-2 text-[#f5f2eb] font-medium outline-none text-base bg-transparent placeholder-placeholder font-serif"
      />
      <button 
        @click="handleSearch"
        class="bg-btn-base text-[#ebdcb9] border-l border-[#d4af37]/50 px-5 font-bold flex items-center justify-center cursor-pointer hover:bg-btn-hover hover:text-[#d4af37] active:bg-[#120e0c] transition-colors font-serif"
      >
        检索
      </button>
    </div>
  </div>
</template>

