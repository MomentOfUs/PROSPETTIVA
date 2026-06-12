<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const quote = ref('心之所向，素履以往。生如逆旅，一苇以航。')
const author = ref('七堇年')
const fromSource = ref('《尘曲》')
const loading = ref(true)

// Designer States
const theme = ref<'ink' | 'star' | 'vermilion' | 'jade'>('ink')
const layoutDirection = ref<'horizontal' | 'vertical'>('horizontal')
const selectedCategory = ref('i') // Default: poetry

const categories = [
  { code: 'i', name: '诗词古风' },
  { code: 'k', name: '哲学思辨' },
  { code: 'd', name: '文学小说' },
  { code: 'h', name: '影视金句' },
  { code: 'a', name: '动漫二次元' },
  { code: 'e', name: '随笔原创' }
]

// Notification States
const showToast = ref(false)
const toastText = ref('')

function triggerToast(msg: string) {
  toastText.value = msg
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

async function fetchQuote() {
  loading.value = true
  try {
    const res = await fetch(`https://v1.hitokoto.cn/?c=${selectedCategory.value}`)
    const data = await res.json()
    if (data && data.hitokoto) {
      quote.value = data.hitokoto
      author.value = data.from_who || '佚名'
      fromSource.value = data.from || '未知'
    }
  } catch (error) {
    // Keep fallback quotes on failure
    quote.value = '山有木兮木有枝，心悦君兮君不知。'
    author.value = '佚名'
    fromSource.value = '越人歌'
  } finally {
    loading.value = false
  }
}

function copyText() {
  const fullText = `“${quote.value}”\n—— ${author.value} · 《${fromSource.value.replace(/^《|》$/g, '')}》`
  navigator.clipboard.writeText(fullText)
  triggerToast('已复制纯文本至剪贴板')
}

const isExporting = ref(false)

function exportAsImage() {
  isExporting.value = true
  // Create virtual canvas
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    isExporting.value = false
    return
  }

  // 1. Background Rendering
  if (theme.value === 'ink') {
    ctx.fillStyle = '#fcfaf2'
    ctx.fillRect(0, 0, 800, 600)
    // Brush border
    ctx.strokeStyle = '#3d2b1f'
    ctx.lineWidth = 10
    ctx.strokeRect(15, 15, 770, 570)
    ctx.strokeStyle = 'rgba(61, 43, 31, 0.2)'
    ctx.lineWidth = 2
    ctx.strokeRect(25, 25, 750, 550)
  } else if (theme.value === 'star') {
    const grad = ctx.createRadialGradient(400, 300, 50, 400, 300, 500)
    grad.addColorStop(0, '#1b263b')
    grad.addColorStop(1, '#0d1b2a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 800, 600)
    // Constellation lines border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
    ctx.lineWidth = 4
    ctx.strokeRect(20, 20, 760, 560)
  } else if (theme.value === 'vermilion') {
    ctx.fillStyle = '#faf8f5'
    ctx.fillRect(0, 0, 800, 600)
    // Left vermilion line
    ctx.fillStyle = '#b91c1c'
    ctx.fillRect(35, 0, 12, 600)
    // Outline border
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 2
    ctx.strokeRect(47, 20, 733, 560)
  } else {
    // jade
    const grad = ctx.createLinearGradient(0, 0, 800, 600)
    grad.addColorStop(0, '#e8f0ec')
    grad.addColorStop(1, '#cce3de')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 800, 600)
    ctx.strokeStyle = 'rgba(143, 188, 143, 0.4)'
    ctx.lineWidth = 6
    ctx.strokeRect(20, 20, 760, 560)
  }

  // 2. Text Color & Style
  const textColor = theme.value === 'star' ? '#ebdcb9' : (theme.value === 'ink' ? '#2c1f18' : (theme.value === 'vermilion' ? '#1f2937' : '#2d3748'))
  ctx.fillStyle = textColor
  
  // Font detection setup
  ctx.font = 'bold 26px "STKaiti", "KaiTi", "SimSun", serif'
  ctx.textBaseline = 'middle'

  const fullQuoteText = `“${quote.value}”`
  const authorText = `—— ${author.value} · 《${fromSource.value.replace(/^《|》$/g, '')}》`

  // 3. Draw text depending on layout
  if (layoutDirection.value === 'vertical') {
    ctx.textAlign = 'center'
    
    // Draw vertical text (lines flow right-to-left)
    const lines = wrapTextVertical(fullQuoteText, 380)
    const startX = 450 + (lines.length * 45) / 2
    
    lines.forEach((line, index) => {
      const x = startX - index * 45
      const yStart = 300 - (line.length * 28) / 2
      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        ctx.fillText(line[charIdx], x, yStart + charIdx * 28)
      }
    })

    // Draw vertical author source on the far left of the text block
    ctx.font = '18px "STKaiti", "KaiTi", serif'
    const authX = startX - lines.length * 45 - 45
    const authY = 320
    const authorChars = authorText.split('')
    authorChars.forEach((char, charIdx) => {
      ctx.fillText(char, authX, authY + charIdx * 20)
    })
  } else {
    ctx.textAlign = 'center'
    
    // Draw horizontal text
    const lines = wrapTextHorizontal(ctx, fullQuoteText, 620)
    const startY = 280 - (lines.length * 40) / 2
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 400, startY + index * 44)
    })

    // Draw horizontal author source
    ctx.font = '18px "STKaiti", "KaiTi", serif'
    ctx.fillText(authorText, 400, startY + lines.length * 44 + 40)
  }

  // 4. Draw Seal Stamp for Traditional Themes
  if (theme.value === 'ink' || theme.value === 'vermilion') {
    ctx.fillStyle = '#b91c1c'
    ctx.fillRect(700, 50, 48, 48)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px "STKaiti", "KaiTi", serif'
    ctx.textAlign = 'center'
    ctx.fillText('一言', 724, 66)
    ctx.fillText('妙言', 724, 82)
  }

  // 5. Trigger download file
  const link = document.createElement('a')
  link.download = `MangaHitokoto_Postcard_${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
  isExporting.value = false
}

// Utility to wrap horizontal text
function wrapTextHorizontal(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = text.split('')
  const lines: string[] = []
  let currentLine = ''

  for (let i = 0; i < chars.length; i++) {
    const testLine = currentLine + chars[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && i > 0) {
      lines.push(currentLine)
      currentLine = chars[i]
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine)
  return lines
}

// Utility to wrap vertical text
function wrapTextVertical(text: string, maxHeight: number): string[] {
  const chars = text.split('')
  const lines: string[] = []
  let currentLine = ''
  
  // Estimate height per character is 28px
  const charsPerLine = Math.floor(maxHeight / 28)
  
  for (let i = 0; i < chars.length; i++) {
    currentLine += chars[i]
    if (currentLine.length >= charsPerLine) {
      lines.push(currentLine)
      currentLine = ''
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

onMounted(() => {
  fetchQuote()
})
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col pt-1 font-serif text-left w-full select-text text-cream">
    <p class="text-[10px] leading-relaxed font-semibold">
      "{{ quote }}"
    </p>
    <div class="text-right text-[8px] text-[#ebdcb9]/60 mt-1 italic">
      —— {{ author }} · {{ fromSource }}
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 font-bold select-none font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9] font-bold">📜 先哲语录墨宝工坊 (Hitokoto Atelier)</span>
      <button
        @click="fetchQuote"
        :disabled="loading"
        class="text-xs bg-[#120e0c] border border-[#d4af37]/45 text-gold hover:bg-btn-hover hover:text-[#d4af37] px-3 py-1 rounded font-serif cursor-pointer active:scale-95 transition-all disabled:opacity-50"
      >
        {{ loading ? '翻阅手稿中...' : '🔄 摇签换语' }}
      </button>
    </div>

    <!-- Main Content Layout Grid -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
      <!-- Left Column: Postcard preview box (col-span-7) -->
      <div class="md:col-span-7 flex flex-col justify-center">
        <div v-if="loading" class="text-center py-20 text-xs text-[#d4af37]/50 animate-pulse font-serif italic border border-[#d4af37]/15 rounded-lg bg-[#120e0c]/30">
          正在翻阅先哲古籍手稿...
        </div>
        
        <div v-else 
             class="flex-1 flex items-center justify-center p-6 min-h-[300px] transition-all duration-500 rounded-lg relative overflow-hidden shadow-md"
             :class="{
               'bg-[#fcfaf2] border-2 border-[#3d2b1f]/40 text-[#2c1f18]': theme === 'ink',
               'bg-gradient-to-br from-[#1b263b] to-[#0d1b2a] border border-[#d4af37]/30 text-[#ebdcb9]': theme === 'star',
               'bg-[#faf8f5] border-l-8 border-red-700 border-y border-r border-[#120e0c]/10 text-gray-900': theme === 'vermilion',
               'bg-gradient-to-br from-[#e8f0ec] to-[#cce3de] border border-[#8fbc8f]/40 text-[#2d3748]': theme === 'jade'
             }">
          
          <!-- Traditional Chinese stamp for 'ink' and 'vermilion' themes -->
          <div v-if="theme === 'ink' || theme === 'vermilion'" 
               class="absolute top-4 right-4 w-9 h-9 border border-red-700 bg-red-700/5 text-red-700 flex flex-col items-center justify-center text-[9px] font-bold leading-tight select-none">
            <span>一言</span>
            <span>妙句</span>
          </div>

          <!-- Star accents for celestial theme -->
          <div v-if="theme === 'star'" class="absolute inset-0 pointer-events-none opacity-20">
            <div class="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
            <div class="absolute top-2/3 left-1/3 w-1 h-1 bg-white rounded-full"></div>
            <div class="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse"></div>
          </div>

          <!-- Text Display Container -->
          <div class="flex h-full w-full justify-between gap-6"
               :class="layoutDirection === 'vertical' ? 'flex-row-reverse items-center justify-center' : 'flex-col justify-center text-center'">
            
            <!-- Quote Text -->
            <div :style="layoutDirection === 'vertical' ? 'writing-mode: vertical-rl; text-orientation: mixed;' : ''"
                 class="font-serif leading-relaxed tracking-wider transition-all duration-300 text-left font-semibold"
                 :class="[
                   layoutDirection === 'vertical' ? 'text-lg max-h-[220px] py-1' : 'text-base sm:text-lg md:text-xl',
                   theme === 'ink' ? 'text-[#2c1f18]' : '',
                   theme === 'star' ? 'text-[#ebdcb9] drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]' : '',
                   theme === 'vermilion' ? 'text-gray-900' : '',
                   theme === 'jade' ? 'text-[#2d3748]' : ''
                 ]">
              “{{ quote }}”
            </div>

            <!-- Author & Source -->
            <div class="font-serif text-right text-xs select-none opacity-80 font-medium"
                 :class="layoutDirection === 'vertical' ? 'writing-mode-vertical border-r border-current/20 pr-2 pt-2 text-left' : 'mt-5'"
                 :style="layoutDirection === 'vertical' ? 'writing-mode: vertical-rl; text-orientation: mixed;' : ''">
              —— {{ author }} · 《{{ fromSource.replace(/^《|》$/g, '') }}》
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Card Designer Controllers (col-span-5) -->
      <div class="md:col-span-5 bg-[#120e0c]/60 border border-[#d4af37]/20 rounded p-4 flex flex-col gap-4 text-left">
        
        <!-- Category selection -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase">📂 灵感品类 (Categories)</span>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="cat in categories" :key="cat.code"
                    @click="selectedCategory = cat.code; fetchQuote()"
                    class="text-[11px] font-serif py-1.5 px-2 border rounded cursor-pointer transition-all active:scale-95 text-center truncate"
                    :class="selectedCategory === cat.code ? 'bg-[#d4af37]/20 border-[#d4af37] text-gold font-bold' : 'bg-[#120e0c] border-[#d4af37]/15 text-[#ebdcb9]/80 hover:bg-[#221c19]'">
              {{ cat.name }}
            </button>
          </div>
        </div>

        <!-- Background Themes -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase">🎨 墨宝底色 (Themes)</span>
          <div class="grid grid-cols-2 gap-2">
            <button @click="theme = 'ink'"
                    class="text-[11px] py-1.5 px-2 rounded border text-center font-serif truncate cursor-pointer transition-all active:scale-95"
                    :class="theme === 'ink' ? 'border-[#3d2b1f] bg-[#fcfaf2] text-[#2c1f18] font-bold' : 'border-gray-800 bg-[#120e0c] text-cream hover:bg-zinc-800'">
              🖌️ 水墨古风
            </button>
            <button @click="theme = 'star'"
                    class="text-[11px] py-1.5 px-2 rounded border text-center font-serif truncate cursor-pointer transition-all active:scale-95"
                    :class="theme === 'star' ? 'border-[#d4af37] bg-gradient-to-br from-[#1b263b] to-[#0d1b2a] text-[#ebdcb9] font-bold' : 'border-gray-800 bg-[#120e0c] text-cream hover:bg-zinc-800'">
              🌌 星空玄幻
            </button>
            <button @click="theme = 'vermilion'"
                    class="text-[11px] py-1.5 px-2 rounded border text-center font-serif truncate cursor-pointer transition-all active:scale-95"
                    :class="theme === 'vermilion' ? 'border-red-700 bg-[#faf8f5] text-gray-900 font-bold' : 'border-gray-800 bg-[#120e0c] text-cream hover:bg-zinc-800'">
              🧧 极简朱砂
            </button>
            <button @click="theme = 'jade'"
                    class="text-[11px] py-1.5 px-2 rounded border text-center font-serif truncate cursor-pointer transition-all active:scale-95"
                    :class="theme === 'jade' ? 'border-[#8fbc8f] bg-gradient-to-br from-[#e8f0ec] to-[#cce3de] text-[#2d3748] font-bold' : 'border-gray-800 bg-[#120e0c] text-cream hover:bg-zinc-800'">
              🍵 雨后初霁
            </button>
          </div>
        </div>

        <!-- Layout flows -->
        <div class="flex flex-col gap-2">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase">📐 墨宝字向 (Layout Flow)</span>
          <div class="grid grid-cols-2 gap-2">
            <button @click="layoutDirection = 'horizontal'"
                    class="text-[11px] font-serif py-1.5 px-2 border rounded cursor-pointer transition-all active:scale-95"
                    :class="layoutDirection === 'horizontal' ? 'border-[#d4af37] bg-[#221c19] text-gold font-bold' : 'border-gray-800 bg-[#120e0c] text-cream'">
              横向排版 (L-to-R)
            </button>
            <button @click="layoutDirection = 'vertical'"
                    class="text-[11px] font-serif py-1.5 px-2 border rounded cursor-pointer transition-all active:scale-95"
                    :class="layoutDirection === 'vertical' ? 'border-[#d4af37] bg-[#221c19] text-gold font-bold' : 'border-gray-800 bg-[#120e0c] text-cream'">
              纵向排版 (V-RL)
            </button>
          </div>
        </div>

        <!-- Copy / Export Options -->
        <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-[#d4af37]/15">
          <span class="text-[10px] text-gold/70 tracking-widest uppercase">📤 传扬法度 (Export Card)</span>
          <div class="flex flex-col gap-2">
            <button @click="copyText"
                    class="w-full text-xs py-2 bg-[#221c19] border border-[#d4af37]/40 text-gold hover:bg-[#3d2b1f] hover:text-[#d4af37] rounded font-serif cursor-pointer transition-all active:scale-98 font-bold">
              📋 复制纯文本墨宝
            </button>
            <button @click="exportAsImage" :disabled="isExporting || loading"
                    class="w-full text-xs py-2 bg-[#d4af37]/15 border border-[#d4af37]/60 text-cream hover:bg-[#d4af37]/35 rounded font-serif cursor-pointer transition-all active:scale-98 font-bold disabled:opacity-50">
              {{ isExporting ? '⏳ 正在拓印明信片...' : '🖼️ 拓印并下载明信片' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Custom Toast notification -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-2 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="showToast" class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#1a1510] border border-[#d4af37] text-gold text-xs px-4 py-2 rounded shadow-lg font-serif z-50">
      {{ toastText }}
    </div>
  </Transition>
</template>
