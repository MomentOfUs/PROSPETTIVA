<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

// Tabs: 'timestamp' | 'json' | 'base64' | 'url' | 'hash' | 'radix' | 'jwt'
const activeTab = ref<'timestamp' | 'json' | 'base64' | 'url' | 'hash' | 'radix' | 'jwt'>('timestamp')

// Save/Load tab selection
onMounted(() => {
  const storedTab = localStorage.getItem('manga_widget_devtools_tab')
  if (storedTab && ['timestamp', 'json', 'base64', 'url', 'hash', 'radix', 'jwt'].includes(storedTab)) {
    activeTab.value = storedTab as any
  }
  startClock()
})

watch(activeTab, (newTab) => {
  localStorage.setItem('manga_widget_devtools_tab', newTab)
})


// ==================== TAB 1: TIMESTAMP ====================
const currentTimestamp = ref(Math.floor(Date.now() / 1000))
const tsInput = ref(String(Math.floor(Date.now() / 1000)))
const dateOutput = ref('')
const dateInput = ref(getNowDateTimeString())
const tsOutput = ref('')

let clockInterval: any
function startClock() {
  clockInterval = setInterval(() => {
    currentTimestamp.value = Math.floor(Date.now() / 1000)
  }, 1000)
}

onUnmounted(() => {
  clearInterval(clockInterval)
})

function getNowDateTimeString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function convertTsToDate() {
  if (!tsInput.value.trim()) return
  const val = Number(tsInput.value.trim())
  if (isNaN(val)) {
    dateOutput.value = '无效的时间戳'
    return
  }
  // Detect if seconds or milliseconds
  const date = new Date(val < 10000000000 ? val * 1000 : val)
  if (isNaN(date.getTime())) {
    dateOutput.value = '无效的时间戳'
  } else {
    dateOutput.value = date.toLocaleString()
  }
}

function convertDateToTs() {
  if (!dateInput.value.trim()) return
  const date = new Date(dateInput.value.trim().replace(/-/g, '/'))
  if (isNaN(date.getTime())) {
    tsOutput.value = '无效的日期格式'
  } else {
    tsOutput.value = String(Math.floor(date.getTime() / 1000))
  }
}

// Copy helper
async function copyToClipboard(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    alert('复制成功！')
  } catch {
    alert('复制失败，请手动选择复制。')
  }
}

// ==================== TAB 2: JSON ====================
const jsonInput = ref('')
const jsonOutput = ref('')
const jsonError = ref('')

function formatJson() {
  jsonError.value = ''
  if (!jsonInput.value.trim()) {
    jsonOutput.value = ''
    return
  }
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonOutput.value = JSON.stringify(parsed, null, 2)
  } catch (e: any) {
    jsonError.value = 'JSON 解析失败: ' + e.message
    jsonOutput.value = ''
  }
}

function minifyJson() {
  jsonError.value = ''
  if (!jsonInput.value.trim()) {
    jsonOutput.value = ''
    return
  }
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonOutput.value = JSON.stringify(parsed)
  } catch (e: any) {
    jsonError.value = 'JSON 解析失败: ' + e.message
    jsonOutput.value = ''
  }
}

// ==================== TAB 3: BASE64 ====================
const b64Input = ref('')
const b64Output = ref('')
const b64Error = ref('')

function encodeBase64() {
  b64Error.value = ''
  try {
    // UTF-8 base64 encoding
    b64Output.value = btoa(encodeURIComponent(b64Input.value).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16))
    }))
  } catch (e: any) {
    b64Error.value = '编码失败: ' + e.message
  }
}

function decodeBase64() {
  b64Error.value = ''
  try {
    // UTF-8 base64 decoding
    b64Output.value = decodeURIComponent(atob(b64Input.value).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  } catch (e: any) {
    b64Error.value = '解码失败: 格式非标准 Base64'
  }
}

// ==================== TAB 4: URL CODEC ====================
const urlInput = ref('')
const urlOutput = ref('')
const urlError = ref('')

function encodeUrl() {
  urlError.value = ''
  try {
    urlOutput.value = encodeURIComponent(urlInput.value)
  } catch (e: any) {
    urlError.value = 'URL 编码失败: ' + e.message
  }
}

function decodeUrl() {
  urlError.value = ''
  try {
    urlOutput.value = decodeURIComponent(urlInput.value)
  } catch (e: any) {
    urlError.value = 'URL 解码失败: ' + e.message
  }
}

// ==================== TAB 5: CRYPTO HASH ====================
const hashInput = ref('')
const sha256Output = ref('')
const sha1Output = ref('')

async function calculateHash() {
  if (!hashInput.value) {
    sha256Output.value = ''
    sha1Output.value = ''
    return
  }
  try {
    const msgUint8 = new TextEncoder().encode(hashInput.value)
    
    // SHA-256
    const hashBuffer256 = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray256 = Array.from(new Uint8Array(hashBuffer256))
    sha256Output.value = hashArray256.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // SHA-1
    const hashBuffer1 = await crypto.subtle.digest('SHA-1', msgUint8)
    const hashArray1 = Array.from(new Uint8Array(hashBuffer1))
    sha1Output.value = hashArray1.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (e) {
    sha256Output.value = '哈希计算失败'
    sha1Output.value = '哈希计算失败'
  }
}

// ==================== TAB 6: RADIX CONVERTER ====================
const radixDec = ref('')
const radixHex = ref('')
const radixBin = ref('')
const radixOct = ref('')

function clearRadix() {
  radixDec.value = ''
  radixHex.value = ''
  radixBin.value = ''
  radixOct.value = ''
}

function updateFromDec(val: string) {
  if (!val.trim()) { clearRadix(); return }
  const parsed = parseInt(val.trim(), 10)
  if (isNaN(parsed)) return
  radixDec.value = val
  radixHex.value = parsed.toString(16)
  radixBin.value = parsed.toString(2)
  radixOct.value = parsed.toString(8)
}

function updateFromHex(val: string) {
  if (!val.trim()) { clearRadix(); return }
  const parsed = parseInt(val.trim(), 16)
  if (isNaN(parsed)) return
  radixDec.value = String(parsed)
  radixHex.value = val
  radixBin.value = parsed.toString(2)
  radixOct.value = parsed.toString(8)
}

function updateFromBin(val: string) {
  if (!val.trim()) { clearRadix(); return }
  const parsed = parseInt(val.trim(), 2)
  if (isNaN(parsed)) return
  radixDec.value = String(parsed)
  radixHex.value = parsed.toString(16)
  radixBin.value = val
  radixOct.value = parsed.toString(8)
}

function updateFromOct(val: string) {
  if (!val.trim()) { clearRadix(); return }
  const parsed = parseInt(val.trim(), 8)
  if (isNaN(parsed)) return
  radixDec.value = String(parsed)
  radixHex.value = parsed.toString(16)
  radixBin.value = parsed.toString(2)
  radixOct.value = val
}

// ==================== TAB 7: JWT DECODER ====================
const jwtInput = ref('')
const jwtHeader = ref('')
const jwtPayload = ref('')
const jwtError = ref('')

function decodeJwt() {
  jwtError.value = ''
  jwtHeader.value = ''
  jwtPayload.value = ''
  if (!jwtInput.value.trim()) return
  const parts = jwtInput.value.trim().split('.')
  if (parts.length < 2) {
    jwtError.value = '格式错误：非法的 JWT 格式'
    return
  }
  try {
    const base64UrlDecode = (str: string) => {
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) {
        base64 += '='
      }
      const raw = atob(base64)
      return decodeURIComponent(raw.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    }
    
    const headerDecoded = base64UrlDecode(parts[0])
    const payloadDecoded = base64UrlDecode(parts[1])
    
    jwtHeader.value = JSON.stringify(JSON.parse(headerDecoded), null, 2)
    jwtPayload.value = JSON.stringify(JSON.parse(payloadDecoded), null, 2)
  } catch (e: any) {
    jwtError.value = 'JWT 解析失败: ' + e.message
  }
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1.5 font-serif py-3 text-center text-[#ebdcb9] w-full">
    <div class="text-[11px] font-bold text-gold">天工度量衡</div>
    <div class="text-[9px] opacity-75 mt-1 leading-relaxed max-w-[220px]">
      集成日常开发和办公常用的时间戳双向互转、JSON 文本格式美化压缩、以及标准 Base64 编解码效率工具。
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-4 font-bold select-none font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">🛠️ 天工开物效率中心</span>
    </div>

    <!-- Layout: Sidebar and Main panels -->
    <div class="flex flex-col lg:flex-row gap-5 min-h-[420px]">
      <!-- Left Sidebar Tabs Menu -->
      <div class="w-full lg:w-[160px] shrink-0 flex flex-row lg:flex-col border-b lg:border-b-0 lg:border-r border-[#d4af37]/20 pb-3 lg:pb-0 lg:pr-3.5 gap-1 overflow-x-auto lg:overflow-x-visible">
        <button 
          @click="activeTab = 'timestamp'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'timestamp' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          ⏰ 时间戳转换
        </button>
        <button 
          @click="activeTab = 'json'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'json' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          📦 JSON 格式化
        </button>
        <button 
          @click="activeTab = 'base64'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'base64' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          🔐 Base64 编解码
        </button>
        <button 
          @click="activeTab = 'url'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'url' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          🌐 URL 编解码
        </button>
        <button 
          @click="activeTab = 'hash'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'hash' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          🔑 密码哈希计算
        </button>
        <button 
          @click="activeTab = 'radix'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'radix' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          📐 进制联动互转
        </button>
        <button 
          @click="activeTab = 'jwt'"
          class="w-auto lg:w-full text-left px-3 py-2 rounded text-[11px] md:text-xs cursor-pointer transition-all font-bold whitespace-nowrap"
          :class="[activeTab === 'jwt' ? 'bg-[#6e5020] text-[#f5f2eb] shadow-md border border-[#d4af37]/30' : 'text-[#ebdcb9]/60 hover:bg-[#1a1613] hover:text-[#ebdcb9]']"
        >
          📜 JWT 密钥解析
        </button>
      </div>

      <!-- Right Main Content Panel -->
      <div class="flex-grow flex flex-col gap-3">

      <!-- TAB 1: Timestamp Converter -->
      <div v-if="activeTab === 'timestamp'" class="flex flex-col gap-3 text-xs md:text-sm max-w-xl">
        <div class="flex justify-between items-center bg-[#1a1613] p-2.5 rounded border border-[#d4af37]/20 text-xs">
          <span class="text-parchment/60">当前时间戳 (秒级):</span>
          <span 
            @click="copyToClipboard(String(currentTimestamp))"
            class="font-mono text-gold hover:underline cursor-pointer"
            title="点击复制"
          >
            {{ currentTimestamp }} 📋
          </span>
        </div>

        <!-- TS to Date -->
        <div class="flex flex-col gap-1.5 border border-[#d4af37]/20 p-3 rounded bg-[#120e0c]/60">
          <span class="text-xs text-[#ebdcb9]/70">秒/毫秒时间戳 ➔ 易读日期时间</span>
          <div class="flex gap-2">
            <input 
              v-model="tsInput" 
              type="text" 
              placeholder="时间戳..." 
              class="flex-1 border border-[#d4af37]/35 px-2.5 py-1.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono outline-none"
            />
            <button 
              @click="convertTsToDate" 
              class="bg-[#6e5020] hover:bg-gold hover:text-black text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
            >
              转换
            </button>
          </div>
          <div v-if="dateOutput" class="flex justify-between items-center text-xs mt-1.5 font-mono text-[#f5f2eb] bg-black/45 p-2 rounded">
            <span class="truncate">{{ dateOutput }}</span>
            <button @click="copyToClipboard(dateOutput)" class="text-gold text-xs cursor-pointer hover:underline pl-2 shrink-0">复制</button>
          </div>
        </div>

        <!-- Date to TS -->
        <div class="flex flex-col gap-1.5 border border-[#d4af37]/20 p-3 rounded bg-[#120e0c]/60">
          <span class="text-xs text-[#ebdcb9]/70">标准时间 ➔ 秒时间戳</span>
          <div class="flex gap-2">
            <input 
              v-model="dateInput" 
              type="text" 
              placeholder="YYYY-MM-DD HH:mm:ss" 
              class="flex-1 border border-[#d4af37]/35 px-2.5 py-1.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono outline-none"
            />
            <button 
              @click="convertDateToTs" 
              class="bg-[#6e5020] hover:bg-gold hover:text-black text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
            >
              转换
            </button>
          </div>
          <div v-if="tsOutput" class="flex justify-between items-center text-xs mt-1.5 font-mono text-[#f5f2eb] bg-black/45 p-2 rounded">
            <span class="truncate">{{ tsOutput }}</span>
            <button @click="copyToClipboard(tsOutput)" class="text-gold text-xs cursor-pointer hover:underline pl-2 shrink-0">复制</button>
          </div>
        </div>
      </div>

      <!-- TAB 2: JSON Formatter -->
      <div v-if="activeTab === 'json'" class="flex flex-col gap-3 text-xs md:text-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Left: Input -->
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-[#ebdcb9]/70">输入 JSON 密文</span>
            <textarea 
              v-model="jsonInput" 
              placeholder="在此粘贴或输入待换算格式的 JSON 文本..." 
              class="w-full h-[220px] border border-[#d4af37]/35 p-2.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono text-xs outline-none focus:border-[#d4af37]"
            ></textarea>
          </div>
          <!-- Right: Output -->
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-green-400">换算输出结果:</span>
              <button v-if="jsonOutput" @click="copyToClipboard(jsonOutput)" class="text-gold hover:underline cursor-pointer">复制结果 📋</button>
            </div>
            <textarea 
              readonly
              :value="jsonOutput" 
              placeholder="格式化或压缩后的结果将在此显现..."
              class="w-full h-[220px] border border-[#d4af37]/20 p-2.5 rounded bg-black/45 text-green-300 font-mono text-xs outline-none"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button 
            @click="formatJson" 
            class="bg-[#6e5020] hover:bg-gold hover:text-black text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
          >
            美化格式
          </button>
          <button 
            @click="minifyJson" 
            class="bg-[#2b2b2e] hover:bg-btn-hover text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
          >
            压缩代码
          </button>
          <button 
            @click="jsonInput = ''; jsonOutput = ''; jsonError = ''" 
            class="px-4 bg-transparent text-status-bad py-1.5 rounded border border-status-bad/40 cursor-pointer text-xs hover:bg-status-bad/10 transition-colors"
          >
            清空
          </button>
        </div>
        <div v-if="jsonError" class="text-status-bad text-xs font-mono bg-status-bad/10 p-2 border border-status-bad/30 rounded break-all">
          {{ jsonError }}
        </div>
      </div>

      <!-- TAB 3: Base64 Codec -->
      <div v-if="activeTab === 'base64'" class="flex flex-col gap-3 text-xs md:text-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Left: Input -->
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-[#ebdcb9]/70">输入文本或 Base64</span>
            <textarea 
              v-model="b64Input" 
              placeholder="输入普通文本或待解密的 Base64 密文..." 
              class="w-full h-[220px] border border-[#d4af37]/35 p-2.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono text-xs outline-none focus:border-[#d4af37]"
            ></textarea>
          </div>
          <!-- Right: Output -->
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-green-400">编解码输出结果:</span>
              <button v-if="b64Output" @click="copyToClipboard(b64Output)" class="text-gold hover:underline cursor-pointer">复制结果 📋</button>
            </div>
            <textarea 
              readonly
              :value="b64Output" 
              placeholder="Base64 编解码结果将在此显现..."
              class="w-full h-[220px] border border-[#d4af37]/20 p-2.5 rounded bg-black/45 text-green-300 font-mono text-xs outline-none"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button 
            @click="encodeBase64" 
            class="bg-[#6e5020] hover:bg-gold hover:text-black text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
          >
            编码 (Encode)
          </button>
          <button 
            @click="decodeBase64" 
            class="bg-[#2b2b2e] hover:bg-btn-hover text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
          >
            解码 (Decode)
          </button>
          <button 
            @click="b64Input = ''; b64Output = ''; b64Error = ''" 
            class="px-4 bg-transparent text-status-bad py-1.5 rounded border border-status-bad/40 cursor-pointer text-xs hover:bg-status-bad/10 transition-colors"
          >
            清空
          </button>
        </div>
        <div v-if="b64Error" class="text-status-bad text-xs font-mono bg-status-bad/10 p-2 border border-status-bad/30 rounded break-all">
          {{ b64Error }}
        </div>
      </div>

      <!-- TAB 4: URL Codec -->
      <div v-if="activeTab === 'url'" class="flex flex-col gap-3 text-xs md:text-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Left: Input -->
          <div class="flex flex-col gap-1.5">
            <span class="text-xs text-[#ebdcb9]/70">输入待转换的 URL 文本</span>
            <textarea 
              v-model="urlInput" 
              placeholder="在此粘贴或输入需要 URL 编码或解码的字符串..." 
              class="w-full h-[220px] border border-[#d4af37]/35 p-2.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono text-xs outline-none focus:border-[#d4af37]"
            ></textarea>
          </div>
          <!-- Right: Output -->
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-xs">
              <span class="text-green-400">换算输出结果:</span>
              <button v-if="urlOutput" @click="copyToClipboard(urlOutput)" class="text-gold hover:underline cursor-pointer">复制结果 📋</button>
            </div>
            <textarea 
              readonly
              :value="urlOutput" 
              placeholder="URL 编解码结果将在此显现..."
              class="w-full h-[220px] border border-[#d4af37]/20 p-2.5 rounded bg-black/45 text-green-300 font-mono text-xs outline-none"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button 
            @click="encodeUrl" 
            class="bg-[#6e5020] hover:bg-gold hover:text-black text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
          >
            URL 编码 (Encode)
          </button>
          <button 
            @click="decodeUrl" 
            class="bg-[#2b2b2e] hover:bg-btn-hover text-white px-4 py-1.5 rounded border border-[#d4af37]/45 cursor-pointer text-xs transition-colors"
          >
            URL 解码 (Decode)
          </button>
          <button 
            @click="urlInput = ''; urlOutput = ''; urlError = ''" 
            class="px-4 bg-transparent text-status-bad py-1.5 rounded border border-status-bad/40 cursor-pointer text-xs hover:bg-status-bad/10 transition-colors"
          >
            清空
          </button>
        </div>
        <div v-if="urlError" class="text-status-bad text-xs font-mono bg-status-bad/10 p-2 border border-status-bad/30 rounded break-all">
          {{ urlError }}
        </div>
      </div>

      <!-- TAB 5: Hash Converter -->
      <div v-if="activeTab === 'hash'" class="flex flex-col gap-3 text-xs md:text-sm">
        <div class="flex flex-col gap-1.5">
          <span class="text-xs text-[#ebdcb9]/70">输入文本</span>
          <textarea 
            v-model="hashInput" 
            @input="calculateHash"
            placeholder="在此输入文本，哈希值将实时联动计算..." 
            class="w-full h-[80px] border border-[#d4af37]/35 p-2.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono text-xs outline-none focus:border-[#d4af37] resize-y"
          ></textarea>
        </div>

        <div class="flex flex-col gap-2.5 mt-1">
          <!-- SHA-256 -->
          <div class="border border-[#d4af37]/20 p-2.5 rounded bg-[#120e0c]/60 flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-[#ebdcb9]/75 font-mono text-[10px]">SHA-256</span>
              <button v-if="sha256Output" @click="copyToClipboard(sha256Output)" class="text-gold hover:underline text-[10px] cursor-pointer">复制 📋</button>
            </div>
            <div class="font-mono text-green-300 text-[10px] bg-black/45 p-1.5 rounded break-all select-all min-h-[26px]">
              {{ sha256Output || '等待输入...' }}
            </div>
          </div>

          <!-- SHA-1 -->
          <div class="border border-[#d4af37]/20 p-2.5 rounded bg-[#120e0c]/60 flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-[#ebdcb9]/75 font-mono text-[10px]">SHA-1</span>
              <button v-if="sha1Output" @click="copyToClipboard(sha1Output)" class="text-gold hover:underline text-[10px] cursor-pointer">复制 📋</button>
            </div>
            <div class="font-mono text-green-300 text-[10px] bg-black/45 p-1.5 rounded break-all select-all min-h-[26px]">
              {{ sha1Output || '等待输入...' }}
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 6: Radix Converter -->
      <div v-if="activeTab === 'radix'" class="flex flex-col gap-4 text-xs md:text-sm max-w-xl">
        <div class="border-b border-[#d4af37]/20 pb-1 flex justify-between items-center">
          <span class="text-xs text-[#ebdcb9]/70">程序员进制互转（任意输入，其余实时联动换算）</span>
          <button @click="clearRadix" class="text-status-bad text-[10px] hover:underline cursor-pointer">一键清空</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- DEC -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[#ebdcb9]/65 font-mono text-[10px]">十进制 (Decimal / 10)</label>
            <input 
              :value="radixDec"
              @input="updateFromDec(($event.target as HTMLInputElement).value)"
              type="text" 
              placeholder="Dec 数值..." 
              class="border border-[#d4af37]/35 px-2.5 py-1.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono outline-none"
            />
          </div>

          <!-- HEX -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[#ebdcb9]/65 font-mono text-[10px]">十六进制 (Hexadecimal / 16)</label>
            <input 
              :value="radixHex"
              @input="updateFromHex(($event.target as HTMLInputElement).value)"
              type="text" 
              placeholder="Hex 数值..." 
              class="border border-[#d4af37]/35 px-2.5 py-1.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono outline-none text-gold font-bold"
            />
          </div>

          <!-- BIN -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[#ebdcb9]/65 font-mono text-[10px]">二进制 (Binary / 2)</label>
            <input 
              :value="radixBin"
              @input="updateFromBin(($event.target as HTMLInputElement).value)"
              type="text" 
              placeholder="Bin 数值..." 
              class="border border-[#d4af37]/35 px-2.5 py-1.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono outline-none text-green-300"
            />
          </div>

          <!-- OCT -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-[#ebdcb9]/65 font-mono text-[10px]">八进制 (Octal / 8)</label>
            <input 
              :value="radixOct"
              @input="updateFromOct(($event.target as HTMLInputElement).value)"
              type="text" 
              placeholder="Oct 数值..." 
              class="border border-[#d4af37]/35 px-2.5 py-1.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono outline-none"
            />
          </div>
        </div>
      </div>

      <!-- TAB 7: JWT Decoder -->
      <div v-if="activeTab === 'jwt'" class="flex flex-col gap-3 text-xs md:text-sm">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <!-- Left 2 columns: Input -->
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <span class="text-xs text-[#ebdcb9]/70">输入 JWT Token 字符串</span>
            <textarea 
              v-model="jwtInput" 
              @input="decodeJwt"
              placeholder="在此粘贴 JWT Token 秘钥（Header.Payload.Signature）..." 
              class="w-full h-[240px] border border-[#d4af37]/35 p-2.5 rounded bg-[#1a1613] text-[#f5f2eb] font-mono text-[10px] outline-none focus:border-[#d4af37] break-all"
            ></textarea>
          </div>
          <!-- Right 3 columns: Decoded results -->
          <div class="md:col-span-3 flex flex-col gap-3">
            <div class="flex-1 flex flex-col gap-1">
              <div class="flex justify-between items-center text-xs">
                <span class="text-red-400 font-bold text-[10px] tracking-wider uppercase">Header (头)</span>
                <button v-if="jwtHeader" @click="copyToClipboard(jwtHeader)" class="text-gold text-[10px] hover:underline cursor-pointer">复制 📋</button>
              </div>
              <textarea 
                readonly
                :value="jwtHeader" 
                placeholder="Header 解码后的 JSON 数据..."
                class="w-full h-[90px] border border-red-900/30 p-2 rounded bg-black/45 text-red-300 font-mono text-[10px] outline-none"
              ></textarea>
            </div>
            
            <div class="flex-1 flex flex-col gap-1">
              <div class="flex justify-between items-center text-xs">
                <span class="text-green-400 font-bold text-[10px] tracking-wider uppercase">Payload (载荷 Claims)</span>
                <button v-if="jwtPayload" @click="copyToClipboard(jwtPayload)" class="text-gold text-[10px] hover:underline cursor-pointer">复制 📋</button>
              </div>
              <textarea 
                readonly
                :value="jwtPayload" 
                placeholder="Payload Claims 解码后的 JSON 数据..."
                class="w-full h-[120px] border border-green-900/30 p-2 rounded bg-black/45 text-green-300 font-mono text-[10px] outline-none"
              ></textarea>
            </div>
          </div>
        </div>
        <div v-if="jwtError" class="text-status-bad text-xs font-mono bg-status-bad/10 p-2 border border-status-bad/30 rounded break-all">
          {{ jwtError }}
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
</style>
