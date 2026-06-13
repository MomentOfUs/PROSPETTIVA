<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t } from '../../i18n'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), { preview: false })

const quote = ref('心之所向，素履以往。')
const author = ref('佚名')
const fromSource = ref('')
const loading = ref(true)

const theme = ref<'mono'>('mono')
const layoutDirection = ref<'horizontal' | 'vertical'>('horizontal')
const selectedCategory = ref('i')

const categories = [
  { code: 'i', nameKey: 'poetry' },
  { code: 'k', nameKey: 'philosophy' },
  { code: 'd', nameKey: 'literature' },
  { code: 'h', nameKey: 'film' },
  { code: 'a', nameKey: 'anime' },
  { code: 'e', nameKey: 'original' }
]

const showToast = ref(false)
const toastText = ref('')

function triggerToast(msg: string) {
  toastText.value = msg; showToast.value = true
  setTimeout(() => { showToast.value = false }, 2000)
}

async function fetchQuote() {
  loading.value = true
  try {
    const res = await fetch(`https://v1.hitokoto.cn/?c=${selectedCategory.value}`)
    const data = await res.json()
    if (data && data.hitokoto) {
      quote.value = data.hitokoto; author.value = data.from_who || '佚名'; fromSource.value = data.from || ''
    }
  } catch {
    quote.value = '山有木兮木有枝，心悦君兮君不知。'; author.value = '佚名'; fromSource.value = '越人歌'
  } finally { loading.value = false }
}

function copyText() {
  const fullText = `"${quote.value}"\n—— ${author.value} · 《${fromSource.value.replace(/^《|》$/g, '')}》`
  navigator.clipboard.writeText(fullText); triggerToast(t('hitokoto.copied'))
}

const isExporting = ref(false)

function exportAsImage() {
  isExporting.value = true
  const canvas = document.createElement('canvas')
  canvas.width = 800; canvas.height = 600
  const ctx = canvas.getContext('2d')
  if (!ctx) { isExporting.value = false; return }

  const themeStyle = getComputedStyle(document.documentElement)
  const colorBase = themeStyle.getPropertyValue('--color-base').trim() || '#000000'
  const colorLine = themeStyle.getPropertyValue('--color-line').trim() || '#262626'
  const colorPrimary = themeStyle.getPropertyValue('--color-primary').trim() || '#FFFFFF'
  const colorAccent = themeStyle.getPropertyValue('--color-accent').trim() || '#FF5F1F'

  // Terminal black background
  ctx.fillStyle = colorBase; ctx.fillRect(0, 0, 800, 600)
  ctx.strokeStyle = colorLine; ctx.lineWidth = 1; ctx.strokeRect(10, 10, 780, 580)

  ctx.fillStyle = colorPrimary; ctx.font = 'bold 26px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
  const fullQuoteText = `> "${quote.value}"`
  const authorText = `// ${author.value} · ${fromSource.value.replace(/^《|》$/g, '')}`

  if (layoutDirection.value === 'vertical') {
    ctx.textAlign = 'center'
    const lines: string[] = []; let currentLine = ''
    for (const ch of fullQuoteText) { currentLine += ch; if (currentLine.length >= 12) { lines.push(currentLine); currentLine = '' } }
    if (currentLine) lines.push(currentLine)
    const startX = 450 + (lines.length * 45) / 2
    lines.forEach((line, index) => {
      const x = startX - index * 45; const yStart = 300 - (line.length * 28) / 2
      for (let i = 0; i < line.length; i++) ctx.fillText(line[i], x, yStart + i * 28)
    })
  } else {
    ctx.textAlign = 'center'
    const chars = fullQuoteText.split(''); const lines: string[] = []; let currentLine = ''
    for (let i = 0; i < chars.length; i++) {
      const testLine = currentLine + chars[i]
      if (ctx.measureText(testLine).width > 620 && i > 0) { lines.push(currentLine); currentLine = chars[i] }
      else { currentLine = testLine }
    }
    lines.push(currentLine)
    const startY = 280 - (lines.length * 40) / 2
    lines.forEach((line, index) => { ctx.fillText(line, 400, startY + index * 44) })
    ctx.font = '18px "JetBrains Mono", monospace'
    ctx.fillText(authorText, 400, startY + lines.length * 44 + 40)
  }

  // Terminal prompt decoration
  ctx.fillStyle = colorAccent; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left'
  ctx.fillText('$ hitokoto --category ' + selectedCategory.value, 30, 40)

  const link = document.createElement('a')
  link.download = `hitokoto_${Date.now()}.png`; link.href = canvas.toDataURL('image/png')
  link.click(); isExporting.value = false
}

onMounted(() => { fetchQuote() })
</script>

<template>
  <!-- Preview -->
  <div v-if="preview" class="select-none text-left w-full select-text text-neutral-300">
    <p class="text-[10px] leading-relaxed font-semibold">"{{ quote }}"</p>
    <div class="text-right text-[8px] text-neutral-600 mt-1">—— {{ author }} · {{ fromSource }}</div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 font-bold select-none text-neutral-300">
    <div class="flex items-center justify-end border-b border-line pb-2.5">
      <button @click="fetchQuote" :disabled="loading"
        class="text-xs bg-base border border-line text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 px-3 py-1 cursor-pointer transition-none disabled:opacity-50">
        {{ loading ? $t('hitokoto.loading') : $t('hitokoto.refresh') }}
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
      <!-- Left: Preview -->
      <div class="md:col-span-7 flex flex-col justify-center">
        <div v-if="loading" class="text-center py-20 text-xs text-neutral-600 border border-border-dim bg-surface">{{ $t('hitokoto.loading') }}</div>
        <div v-else class="flex-1 flex items-center justify-center p-6 min-h-[300px] border border-line bg-base relative">
          <!-- Terminal prompt -->
          <div class="absolute top-3 left-3 text-[10px] text-accent font-mono">$ hitokoto</div>
          <div class="absolute top-3 right-3 text-[10px] text-neutral-700 font-mono">{{ new Date().toISOString().slice(0,19) }}</div>

          <div class="flex h-full w-full justify-between gap-6"
            :class="layoutDirection === 'vertical' ? 'flex-row-reverse items-center justify-center' : 'flex-col justify-center text-center'">
            <div :style="layoutDirection === 'vertical' ? 'writing-mode: vertical-rl; text-orientation: mixed;' : ''"
              class="leading-relaxed tracking-wider text-left font-semibold text-neutral-300"
              :class="[layoutDirection === 'vertical' ? 'text-lg max-h-[220px] py-1' : 'text-base sm:text-lg md:text-xl']">
              "{{ quote }}"
            </div>
            <div class="text-right text-xs select-none opacity-60 font-medium text-neutral-500"
              :class="layoutDirection === 'vertical' ? 'border-r border-line pr-2 pt-2 text-left' : 'mt-5'"
              :style="layoutDirection === 'vertical' ? 'writing-mode: vertical-rl; text-orientation: mixed;' : ''">
              —— {{ author }} · 《{{ fromSource.replace(/^《|》$/g, '') }}》
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="md:col-span-5 bg-surface border border-line p-4 flex flex-col gap-4 text-left">
        <div class="flex flex-col gap-2">
          <span class="text-[10px] text-neutral-600 tracking-widest uppercase">{{ $t('hitokoto.categories') }}</span>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="cat in categories" :key="cat.code"
              @click="selectedCategory = cat.code; fetchQuote()"
              class="text-[11px] py-1.5 px-2 border cursor-pointer transition-none text-center truncate"
              :class="selectedCategory === cat.code ? 'bg-accent/10 border-accent text-accent font-bold' : 'bg-base border-border-dim text-neutral-500 hover:bg-surface hover:text-neutral-300'">
              {{ $t('hitokoto.' + cat.nameKey) }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-[10px] text-neutral-600 tracking-widest uppercase">{{ $t('hitokoto.layout') }}</span>
          <div class="grid grid-cols-2 gap-2">
            <button @click="layoutDirection = 'horizontal'"
              class="text-[11px] py-1.5 px-2 border cursor-pointer transition-none"
              :class="layoutDirection === 'horizontal' ? 'border-accent bg-surface text-accent font-bold' : 'border-border-dim bg-base text-neutral-500'">
              {{ $t('hitokoto.horizontal') }}
            </button>
            <button @click="layoutDirection = 'vertical'"
              class="text-[11px] py-1.5 px-2 border cursor-pointer transition-none"
              :class="layoutDirection === 'vertical' ? 'border-accent bg-surface text-accent font-bold' : 'border-border-dim bg-base text-neutral-500'">
              {{ $t('hitokoto.vertical') }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-border-dim">
          <span class="text-[10px] text-neutral-600 tracking-widest uppercase">{{ $t('hitokoto.export') }}</span>
          <div class="flex flex-col gap-2">
            <button @click="copyText"
              class="w-full text-xs py-2 bg-surface border border-line text-neutral-300 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 cursor-pointer transition-none font-bold">
              {{ $t('hitokoto.copy') }}
            </button>
            <button @click="exportAsImage" :disabled="isExporting || loading"
              class="w-full text-xs py-2 bg-surface border border-line text-neutral-300 hover:bg-neutral-200 hover:text-black cursor-pointer transition-none font-bold disabled:opacity-50">
              {{ isExporting ? $t('hitokoto.exporting') : $t('hitokoto.export.png') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <Transition enter-active-class="transition-none" leave-active-class="transition-none">
    <div v-if="showToast" class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-base border border-accent text-accent text-xs px-4 py-2 z-50">
      {{ toastText }}
    </div>
  </Transition>
</template>
