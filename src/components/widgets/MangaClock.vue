<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import MangaCard from '../MangaCard.vue'
import { useCollapsible } from '../../composables/useCollapsible'

const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const { collapsed, toggle } = useCollapsible('clock')

const timeStr = ref('--:--:--')
const dateStr = ref('----年--月--日')
const weekStr = ref('星期-')

const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function updateTime() {
  const now = new Date()
  const hrs = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const secs = String(now.getSeconds()).padStart(2, '0')
  timeStr.value = `${hrs}:${mins}:${secs}`

  const yy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  dateStr.value = `${yy}年${mm}月${dd}日`
  weekStr.value = weeks[now.getDay()]
}

let timer: any
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <!-- Compact mode: header inline clock -->
  <div v-if="compact" class="select-none flex items-center gap-2 border border-gold/35 bg-bg-base px-3 py-1 rounded shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
    <span class="text-sm font-bold font-serif text-gold tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{{ timeStr }}</span>
    <span class="text-[9px] font-serif text-parchment/70 hidden sm:inline">{{ dateStr }}</span>
    <span class="text-[9px] font-serif text-parchment/80 border border-gold/30 bg-bg-surface px-1.5 py-0.2 rounded hidden sm:inline">{{ weekStr }}</span>
  </div>

  <!-- Full mode: dashboard card -->
  <MangaCard v-else class="w-full max-w-[280px] select-none text-center flex flex-col justify-center items-center gap-1" :hover-shift="true">
    <div class="w-full flex justify-between items-center">
      <div class="flex-1"></div>
      <div class="flex-1 flex flex-col items-center gap-1">
        <div class="text-3xl font-bold tracking-widest font-serif text-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          {{ timeStr }}
        </div>
        <div class="text-[11px] font-semibold mt-1 flex items-center justify-center gap-2 font-serif text-parchment/90">
          <span>{{ dateStr }}</span>
          <span class="bg-bg-base border border-gold/35 text-parchment px-2 py-0.5 rounded text-[9px] font-bold">{{ weekStr }}</span>
        </div>
      </div>
      <div class="flex-1 flex justify-end">
        <button
          @click="toggle"
          class="text-gold/40 hover:text-gold transition-all cursor-pointer p-1 -mr-1"
          :title="collapsed ? '展开' : '收起'"
        >
          <span class="text-xs transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
        </button>
      </div>
    </div>
  </MangaCard>
</template>
