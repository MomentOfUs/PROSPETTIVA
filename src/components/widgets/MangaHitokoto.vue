<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MangaCard from '../MangaCard.vue'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('hitokoto')

const quote = ref('心之所向，素履以往。生如逆旅，一苇以航。')
const author = ref('七堇年')
const fromSource = ref('《尘曲》')
const loading = ref(true)

async function fetchQuote() {
  loading.value = true
  try {
    const res = await fetch('https://v1.hitokoto.cn')
    const data = await res.json()
    if (data && data.hitokoto) {
      quote.value = data.hitokoto
      author.value = data.from_who || '未知'
      fromSource.value = data.from || '未知'
    }
  } catch (error) {
    // Keep default fallback quote if API fails
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchQuote()
})
</script>

<template>
  <MangaCard class="w-full max-w-[280px] select-none flex flex-col gap-2 font-bold" :hover-shift="true">
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest flex justify-between items-center font-serif text-[#ebdcb9]">
      <span>📜 pick-up quotes</span>
      <div class="flex items-center gap-1">
        <button
          @click="fetchQuote"
          class="text-[9px] bg-[#120e0c] border border-[#d4af37]/40 text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] px-2 py-0.5 rounded font-serif cursor-pointer active:scale-95 transition-all"
        >
          刷新
        </button>
        <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-0.5" :title="collapsed ? '展开' : '收起'">
          <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
        </button>
      </div>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed">
    <div v-if="loading" class="text-center py-6 text-xs text-[#d4af37]/50 animate-pulse font-serif italic">
      正在翻阅先哲手稿...
    </div>
    <div v-else class="flex flex-col justify-between h-full pt-1 font-serif">
      <p class="text-xs text-[#f5f2eb] leading-relaxed font-semibold text-left tracking-wider">
        "{{ quote }}"
      </p>
      <div class="text-right text-[10px] text-[#ebdcb9]/70 mt-2.5 font-medium italic">
        —— {{ author }} · {{ fromSource }}
      </div>
    </div>
    </div>
    </Transition>
  </MangaCard>
</template>
