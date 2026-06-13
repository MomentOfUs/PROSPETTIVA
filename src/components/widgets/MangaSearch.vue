<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Engine {
  name: string
  shortcode: string
  url: string
  key: string
}

const engines: Engine[] = [
  { name: 'GOOGLE', shortcode: 'G://', url: 'https://www.google.com/search?q=%s', key: 'g' },
  { name: 'BAIDU',  shortcode: 'B://', url: 'https://www.baidu.com/s?wd=%s',      key: 'b' },
  { name: 'BING',   shortcode: 'K://', url: 'https://www.bing.com/search?q=%s',   key: 'k' },
]

const currentEngineIndex = ref(0)
const query = ref('')
const isFocused = ref(false)

// Blinking cursor state
const showCursor = ref(true)
let cursorInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  cursorInterval = setInterval(() => {
    showCursor.value = !showCursor.value
  }, 500)
})

onUnmounted(() => {
  if (cursorInterval) clearInterval(cursorInterval)
})

function handleSearch() {
  if (!query.value.trim()) return
  const engine = engines[currentEngineIndex.value]
  const targetUrl = engine.url.replace('%s', encodeURIComponent(query.value))
  window.open(targetUrl, '_blank')
  query.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleSearch()
  // Ctrl+G/B/K to switch engines
  if (e.ctrlKey) {
    const idx = engines.findIndex(en => en.key === e.key.toLowerCase())
    if (idx !== -1) { e.preventDefault(); currentEngineIndex.value = idx }
  }
}
</script>

<template>
  <div class="w-full max-w-2xl flex flex-col gap-0 select-none">

    <!-- Engine Selector Bar -->
    <div class="flex border border-line border-b-0">
      <!-- Prefix label -->
      <div class="px-3 py-1.5 text-[10px] text-dim border-r border-line flex items-center tracking-widest">
        {{ $t('search.engine') }}
      </div>
      <!-- Engine buttons -->
      <button
        v-for="(engine, idx) in engines"
        :key="engine.name"
        @click="currentEngineIndex = idx"
        class="px-4 py-1.5 text-[11px] font-bold tracking-widest border-r border-line cursor-pointer transition-none"
        :class="[
          currentEngineIndex === idx
            ? 'bg-accent text-black'
            : 'bg-base text-dim hover:bg-neutral-200 hover:text-black'
        ]"
        :title="`Ctrl+${engine.key.toUpperCase()}`"
      >
        [{{ currentEngineIndex === idx ? '●' : '○' }}] {{ engine.name }}
      </button>

      <!-- Active engine shortcode indicator -->
      <div class="ml-auto px-3 py-1.5 text-[10px] text-accent tracking-widest flex items-center opacity-70">
        {{ engines[currentEngineIndex].shortcode }}
      </div>
    </div>

    <!-- Search Input Row -->
    <div
      class="flex border border-line"
      :class="[isFocused ? 'border-accent' : '']"
    >
      <!-- Prompt symbol -->
      <div class="px-3 flex items-center border-r border-line shrink-0"
        :class="[isFocused ? 'border-accent' : '']"
      >
        <span class="text-accent text-base font-bold select-none">❯</span>
      </div>

      <!-- Text input -->
      <div class="flex-1 relative flex items-center">
        <input
          v-model="query"
          type="text"
          @keydown="handleKeydown"
          @focus="isFocused = true"
          @blur="isFocused = false"
          :placeholder="$t('search.placeholder')"
          class="w-full px-3 py-2.5 text-primary text-sm bg-transparent outline-none placeholder-neutral-600 tracking-wide"
          autocomplete="off"
          spellcheck="false"
        />
        <!-- Blinking block cursor overlay (only shows when empty + focused) -->
        <span
          v-if="query === '' && isFocused"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-[9px] h-[18px] bg-accent pointer-events-none"
          :style="{ opacity: showCursor ? 1 : 0 }"
        ></span>
      </div>

      <!-- Execute button -->
      <button
        @click="handleSearch"
        class="px-6 py-2.5 text-[11px] font-bold tracking-widest border-l border-line cursor-pointer transition-none bg-base text-neutral-300 hover:bg-neutral-200 hover:text-black glitch-on-click"
        :class="[isFocused ? 'border-accent' : '']"
      >
        {{ $t('search.exec') }}
      </button>
    </div>

    <!-- Status Bar -->
    <div class="flex items-center justify-between border border-dim border-t-0 px-3 py-1">
      <span class="text-[9px] text-neutral-600 tracking-widest">
        {{ query.length > 0 ? `LEN:${query.length}` : $t('search.awaiting') }}
      </span>
      <span class="text-[9px] text-neutral-600 tracking-widest">
        {{ $t('search.switch') }}
      </span>
    </div>

  </div>
</template>
