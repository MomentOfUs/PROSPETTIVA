<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import MangaCard from '../MangaCard.vue'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('sysinfo')

const cpu = ref(35)
const ram = ref(62)
const disk = ref(47)

function updateStats() {
  cpu.value = Math.max(5, Math.min(95, cpu.value + Math.floor(Math.random() * 11) - 5))
  ram.value = Math.max(20, Math.min(90, ram.value + Math.floor(Math.random() * 5) - 2))
}

let timer: any
onMounted(() => {
  timer = setInterval(updateStats, 3000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <MangaCard class="w-full max-w-[280px] select-none flex flex-col gap-3 font-bold font-serif" :hover-shift="true">
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest text-[#ebdcb9] font-serif flex justify-between items-center">
      <span>📐 运转天机仪</span>
      <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-1 shrink-0" :title="collapsed ? '展开' : '收起'">
        <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
      </button>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed" class="flex flex-col gap-3">
    <div class="flex flex-col gap-1 mt-0.5">
      <div class="flex justify-between text-xs font-semibold text-[#f5f2eb] font-serif">
        <span>天机 (CPU)</span>
        <span class="font-serif text-[#d4af37]/80">{{ cpu }}%</span>
      </div>
      <div class="border border-[#d4af37]/30 bg-[#120e0c]/90 h-2 rounded overflow-hidden shadow-inner">
        <div 
          class="bg-progress-cpu h-full transition-all duration-500 rounded-r-sm"
          :style="{ width: `${cpu}%` }"
        ></div>
      </div>
    </div>

    <!-- RAM -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between text-xs font-semibold text-[#f5f2eb] font-serif">
        <span>识海 (RAM)</span>
        <span class="font-serif text-[#d4af37]/80">{{ ram }}%</span>
      </div>
      <div class="border border-[#d4af37]/30 bg-[#120e0c]/90 h-2 rounded overflow-hidden shadow-inner">
        <div 
          class="bg-progress-ram h-full transition-all duration-500 rounded-r-sm"
          :style="{ width: `${ram}%` }"
        ></div>
      </div>
    </div>

    <!-- Disk -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between text-xs font-semibold text-[#f5f2eb] font-serif">
        <span>藏阁 (SSD)</span>
        <span class="font-serif text-[#d4af37]/80">{{ disk }}%</span>
      </div>
      <div class="border border-[#d4af37]/30 bg-[#120e0c]/90 h-2 rounded overflow-hidden shadow-inner">
        <div 
          class="bg-progress-disk h-full transition-all duration-500 rounded-r-sm"
          :style="{ width: `${disk}%` }"
        ></div>
      </div>
    </div>
    </div>
    </Transition>
  </MangaCard>
</template>

