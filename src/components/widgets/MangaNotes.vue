<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import MangaCard from '../MangaCard.vue'
import { triggerCloudPush } from '../../utils/api'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('notes')

const notesText = ref('')
const isLocked = ref(false)
const pwdInput = ref('')
const setupPwdInput = ref('')
const setupPwdConfirmInput = ref('')
const showError = ref(false)
const showSetupError = ref(false)
const shakeLock = ref(false)
const showSetupPanel = ref(false)
const showResetPanel = ref(false)

const storedHash = ref('')

// Simple cyrb128 string hashing function
function getHash(str: string): string {
  let h1 = 1779033703, h2 = 3024733165, h3 = 3362453659, h4 = 50249321
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  return (h1>>>0).toString(16) + (h2>>>0).toString(16) + (h3>>>0).toString(16) + (h4>>>0).toString(16)
}

const isPasswordSet = computed(() => {
  return !!storedHash.value
})

function loadNotes() {
  const hash = localStorage.getItem('manga_widget_notes_pwd') || ''
  storedHash.value = hash
  
  if (hash) {
    isLocked.value = true
  } else {
    isLocked.value = false
  }

  const storedText = localStorage.getItem('manga_widget_notes')
  if (storedText) {
    notesText.value = storedText
  } else {
    notesText.value = '在此记录您的灵感与构想...\n1. 探索透视几何的美妙。\n2. 人文精神与理性的交织。'
  }
}

onMounted(() => {
  loadNotes()
  window.addEventListener('artisan-cloud-data-pulled', loadNotes)
})

onUnmounted(() => {
  window.removeEventListener('artisan-cloud-data-pulled', loadNotes)
})

watch(notesText, (newVal) => {
  localStorage.setItem('manga_widget_notes', newVal)
  triggerCloudPush()
})

// Unlock notes
function handleUnlock() {
  if (!pwdInput.value) return
  const hash = getHash(pwdInput.value)
  if (hash === storedHash.value) {
    isLocked.value = false
    pwdInput.value = ''
    showError.value = false
  } else {
    showError.value = true
    shakeLock.value = true
    setTimeout(() => {
      shakeLock.value = false
    }, 500)
  }
}

// Lock notes by setting a password
function handleSetPassword() {
  if (!setupPwdInput.value || !setupPwdConfirmInput.value) {
    showSetupError.value = true
    return
  }
  if (setupPwdInput.value !== setupPwdConfirmInput.value) {
    showSetupError.value = true
    return
  }

  const hash = getHash(setupPwdInput.value)
  localStorage.setItem('manga_widget_notes_pwd', hash)
  storedHash.value = hash
  isLocked.value = true
  triggerCloudPush()
  showSetupPanel.value = false
  setupPwdInput.value = ''
  setupPwdConfirmInput.value = ''
  showSetupError.value = false
}

// Remove/Reset Password
function handleResetPassword() {
  if (!pwdInput.value) return
  const hash = getHash(pwdInput.value)
  if (hash === storedHash.value) {
    localStorage.removeItem('manga_widget_notes_pwd')
    storedHash.value = ''
    isLocked.value = false
    triggerCloudPush()
    pwdInput.value = ''
    showResetPanel.value = false
    showError.value = false
  } else {
    showError.value = true
    shakeLock.value = true
    setTimeout(() => {
      shakeLock.value = false
    }, 500)
  }
}

function lockImmediately() {
  if (isPasswordSet.value) {
    isLocked.value = true
  }
}
</script>

<template>
  <MangaCard class="w-full max-w-[280px] flex flex-col gap-2 font-bold select-none overflow-hidden font-serif" :hover-shift="true">
    <!-- Header -->
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest flex justify-between items-center font-serif text-[#ebdcb9]">
      <span>✏️ 秘语记事本</span>
      <div class="flex items-center gap-1.5">
        <!-- Not set password yet -->
        <button 
          v-if="!isPasswordSet && !showSetupPanel"
          @click="showSetupPanel = true"
          class="text-[9px] bg-btn-base border border-[#d4af37]/45 text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          title="加密备忘录"
        >
          🔒 封存
        </button>
        <!-- Locked status (already set password) -->
        <button 
          v-if="isPasswordSet && !isLocked && !showResetPanel"
          @click="lockImmediately"
          class="text-[9px] bg-reset border border-gold/45 text-cream hover:bg-reset-hover px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          title="立刻锁定"
        >
          🔒 锁上
        </button>
        <!-- Reset password -->
        <button 
          v-if="isPasswordSet && !isLocked && !showResetPanel"
          @click="showResetPanel = true"
          class="text-[9px] bg-btn-base border border-[#d4af37]/45 text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          title="解除加密"
        >
          🔓 启封
        </button>
        <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-0.5" :title="collapsed ? '展开' : '收起'">
          <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
        </button>
      </div>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed">

    <!-- 1. LOCKED VIEW -->
    <div v-if="isLocked && !showResetPanel" class="flex flex-col items-center justify-center py-4 gap-3">
      <!-- Animated Hardboiled Lock SVG -->
      <div :class="{ 'animate-shake': shakeLock }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 text-[#d4af37] mx-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="#120e0c" stroke="currentColor" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1.5" fill="currentColor" />
          <path d="M12 17.5v2" />
        </svg>
      </div>
      <span class="text-[9px] font-serif tracking-widest text-[#d4af37]/70">【手稿密存 · 密语解禁】</span>
      
      <!-- Password unlock input -->
      <div class="w-full flex flex-col gap-2">
        <div class="flex border border-[#d4af37]/40 rounded overflow-hidden bg-[#120e0c]">
          <input 
            v-model="pwdInput"
            type="password"
            @keydown.enter="handleUnlock"
            placeholder="输入启封密语..."
            class="w-full px-2 py-1 text-xs outline-none bg-transparent text-[#f5f2eb] placeholder-placeholder font-mono"
          />
          <button 
            @click="handleUnlock"
            class="bg-btn-base hover:bg-btn-hover hover:text-[#d4af37] border-l border-[#d4af37]/40 px-3.5 text-xs font-bold cursor-pointer text-[#ebdcb9] transition-colors"
          >
            启封
          </button>
        </div>
        <p v-if="showError" class="text-[9px] text-status-bad text-center tracking-wider font-serif">
          ※ 密语不匹配，手稿未能启封！
        </p>
      </div>
    </div>

    <!-- 2. SETUP PASSWORD PANEL -->
    <div v-else-if="showSetupPanel" class="flex flex-col gap-2 py-1 text-xs">
      <span class="text-[10px] font-serif text-[#ebdcb9]/70">创设启封密语</span>
      <input 
        v-model="setupPwdInput"
        type="password"
        placeholder="设定密语..."
        class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-xs text-[#f5f2eb] placeholder-placeholder outline-none font-mono focus:border-[#d4af37]"
      />
      <input 
        v-model="setupPwdConfirmInput"
        type="password"
        placeholder="再次确认密语..."
        class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-xs text-[#f5f2eb] placeholder-placeholder outline-none font-mono focus:border-[#d4af37]"
      />
      
      <div class="flex gap-2 justify-end mt-1">
        <button 
          @click="showSetupPanel = false; showSetupError = false"
          class="border border-[#d4af37]/35 px-2.5 py-1 rounded text-[10px] bg-[#120e0c] text-[#ebdcb9] hover:bg-[#1a1512] cursor-pointer"
        >
          取消
        </button>
        <button 
          @click="handleSetPassword"
          class="border border-[#d4af37]/40 px-2.5 py-1 rounded text-[10px] bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] transition-all cursor-pointer font-bold"
        >
          保存密记
        </button>
      </div>
      <p v-if="showSetupError" class="text-[9px] text-status-bad text-center font-serif">
        ※ 密语为空或两次输入不一致！
      </p>
    </div>

    <!-- 3. RESET PASSWORD PANEL -->
    <div v-else-if="showResetPanel" class="flex flex-col gap-2 py-1 text-xs">
      <span class="text-[9px] font-serif text-[#ebdcb9]/70 text-center">请输入当前密语以启封手稿</span>
      <div class="flex border border-[#d4af37]/40 rounded overflow-hidden bg-[#120e0c]">
        <input 
          v-model="pwdInput"
          type="password"
          @keydown.enter="handleResetPassword"
          placeholder="当前启封密语..."
          class="w-full px-2 py-1 text-xs outline-none bg-transparent text-[#f5f2eb] placeholder-placeholder font-mono"
        />
      </div>
      
      <div class="flex gap-2 justify-end mt-1">
        <button 
          @click="showResetPanel = false; pwdInput = ''; showError = false"
          class="border border-[#d4af37]/35 px-2.5 py-1 rounded text-[10px] bg-[#120e0c] text-[#ebdcb9] hover:bg-[#1a1512] cursor-pointer"
        >
          返回
        </button>
        <button 
          @click="handleResetPassword"
          class="border border-gold/40 px-2.5 py-1 rounded text-[10px] bg-reset text-cream hover:bg-reset-hover cursor-pointer"
        >
          解印
        </button>
      </div>
      <p v-if="showError" class="text-[9px] text-status-bad text-center font-serif">
        ※ 密语不匹配，无法启封手稿！
      </p>
    </div>

    <!-- 4. ACTIVE NOTES VIEW -->
    <textarea 
      v-else
      v-model="notesText"
      class="w-full h-[110px] bg-[#120e0c]/90 border border-[#d4af37]/35 p-2 rounded text-xs text-[#f5f2eb] font-medium outline-none resize-none shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] focus:border-[#d4af37]/75 transition-all font-serif leading-relaxed"
      placeholder="在此记录手稿珍籍..."
    ></textarea>
    </div>
    </Transition>
  </MangaCard>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px) rotate(-2deg); }
  75% { transform: translateX(4px) rotate(2deg); }
}
.animate-shake {
  animation: shake 0.2s ease-in-out 2;
}
</style>
