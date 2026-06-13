<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { triggerCloudPush } from '../../utils/api'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

interface NoteItem {
  id: string
  title: string
  content: string
  updatedAt: string
}

const notes = ref<NoteItem[]>([
  {
    id: 'n1',
    title: '文艺复兴时空法度',
    content: '在此记录您的灵感与构想...\n1. 探索透视几何的美妙。\n2. 人文精神与理性的交织。',
    updatedAt: new Date().toISOString()
  }
])
const activeNoteId = ref<string>('n1')

const activeNote = computed(() => {
  return notes.value.find(n => n.id === activeNoteId.value) || notes.value[0] || {
    id: '',
    title: '',
    content: '',
    updatedAt: new Date().toISOString()
  }
})

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

  const storedList = localStorage.getItem('manga_widget_notes_list')
  if (storedList) {
    try {
      notes.value = JSON.parse(storedList)
    } catch {
      notes.value = []
    }
  }
  
  if (notes.value.length === 0) {
    notes.value = [
      {
        id: 'n1',
        title: '文艺复兴时空法度',
        content: '在此记录您的灵感与构想...\n1. 探索透视几何的美妙。\n2. 人文精神与理性的交织。',
        updatedAt: new Date().toISOString()
      }
    ]
  }

  if (!activeNoteId.value || !notes.value.find(n => n.id === activeNoteId.value)) {
    activeNoteId.value = notes.value[0].id
  }
}

onMounted(() => {
  loadNotes()
  window.addEventListener('artisan-cloud-data-pulled', loadNotes)
})

onUnmounted(() => {
  window.removeEventListener('artisan-cloud-data-pulled', loadNotes)
})

watch(notes, (newVal) => {
  localStorage.setItem('manga_widget_notes_list', JSON.stringify(newVal))
  triggerCloudPush()
}, { deep: true })

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

function createNewNote() {
  const newId = Date.now().toString()
  notes.value.push({
    id: newId,
    title: t('notes.no_title'),
    content: 'New entry.',
    updatedAt: new Date().toISOString()
  })
  activeNoteId.value = newId
}

function deleteNote(id: string) {
  if (notes.value.length <= 1) {
    alert('[ERROR] ' + t('alert.min_one_note'))
    return
  }
  if (confirm(t('confirm.destroy'))) {
    notes.value = notes.value.filter(n => n.id !== id)
    if (activeNoteId.value === id) {
      activeNoteId.value = notes.value[0].id
    }
  }
}

function handleContentInput() {
  if (activeNote.value) {
    activeNote.value.updatedAt = new Date().toISOString()
    const lines = activeNote.value.content.split('\n')
    const firstLine = lines[0].trim()
    if (firstLine) {
      activeNote.value.title = firstLine.length > 15 ? firstLine.substring(0, 15) + '...' : firstLine
    } else {
      activeNote.value.title = t('notes.no_title')
    }
  }
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="text-left font-mono text-[10px] max-h-[120px] overflow-y-auto w-full break-all whitespace-pre-wrap leading-relaxed select-text p-1 text-neutral-400">
    <div v-if="isLocked" class="text-center text-neutral-500 py-4">
      {{ $t('notes.locked_preview') }}<br>
      <span class="text-[8px] opacity-70">{{ $t('notes.locked_click') }}</span>
    </div>
    <div v-else-if="!activeNote || !activeNote.content.trim()" class="text-center text-neutral-600 py-4">
      {{ $t('notes.empty_preview') }}
    </div>
    <div v-else class="text-neutral-300 bg-surface border border-line p-2">
      {{ activeNote.content }}
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-3 font-mono select-none text-neutral-300">
    <!-- Action Bar Controls -->
    <div class="flex items-center justify-end border-b border-line pb-2.5">
      <div class="flex items-center gap-1.5">
        <button 
          v-if="!isPasswordSet && !showSetupPanel"
          @click="showSetupPanel = true"
          class="text-[10px] bg-surface border border-line text-neutral-400 hover:text-black hover:border-accent px-2 py-0.5 cursor-pointer transition-none"
          :title="$t('notes.encrypted')"
        >
          {{ $t('notes.lock_encrypt') }}
        </button>
        <button 
          v-if="isPasswordSet && !isLocked && !showResetPanel"
          @click="lockImmediately"
          class="text-[10px] bg-surface border border-line text-neutral-500 hover:text-black hover:border-accent px-2 py-0.5 cursor-pointer transition-none"
          :title="$t('notes.lock_now_btn')"
        >
          {{ $t('notes.lock_now_btn') }}
        </button>
        <button 
          v-if="isPasswordSet && !isLocked && !showResetPanel"
          @click="showResetPanel = true"
          class="text-[10px] bg-surface border border-line text-neutral-400 hover:text-black hover:border-accent px-2 py-0.5 cursor-pointer transition-none"
          :title="$t('notes.decrypt_unlock')"
        >
          {{ $t('notes.decrypt_unlock') }}
        </button>
      </div>
    </div>

    <!-- Main Workspace: Sidebar & Editor Area -->
    <div class="flex flex-col lg:flex-row gap-5 min-h-[420px]">
      <!-- 1. Left list (Sidebar) -->
      <div 
        v-if="!isLocked || showSetupPanel || showResetPanel"
        class="w-full lg:w-[200px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line pb-3 lg:pb-0 lg:pr-3.5 gap-2"
      >
        <button 
          @click="createNewNote"
          class="w-full text-center border border-line text-accent hover:bg-surface py-1.5 text-xs cursor-pointer transition-none"
        >
          {{ $t('notes.new_note') }}
        </button>

        <div class="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible max-h-[120px] lg:max-h-[380px] pr-0.5 mt-1">
          <div 
            v-for="noteItem in notes"
            :key="noteItem.id"
            @click="activeNoteId = noteItem.id"
            class="flex items-center justify-between w-[130px] lg:w-full px-2.5 py-2 border text-[11px] cursor-pointer transition-none shrink-0"
            :class="[activeNoteId === noteItem.id ? 'bg-surface border-accent text-accent' : 'border-line text-neutral-500 hover:bg-surface hover:text-neutral-300']"
          >
            <span class="truncate select-none max-w-[95px] lg:max-w-[130px]">{{ noteItem.title }}</span>
            <button 
              @click.stop="deleteNote(noteItem.id)"
              class="text-neutral-600 hover:text-red-500 text-[9px] cursor-pointer pl-1"
              :title="$t('notes.destroy')"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Right Workspace (Editor) -->
      <div class="flex-grow flex flex-col justify-stretch">
        <!-- 1. LOCKED VIEW -->
        <div v-if="isLocked && !showResetPanel" class="flex flex-col items-center justify-center py-12 gap-3 flex-grow">
          <div :class="{ 'animate-shake': shakeLock }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-16 h-16 text-accent mx-auto">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="#0A0A0A" stroke="currentColor" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1.5" fill="currentColor" />
              <path d="M12 17.5v2" />
            </svg>
          </div>
          <span class="text-[10px] tracking-widest text-neutral-500">{{ $t('notes.secured') }}</span>
          
          <div class="w-full max-w-sm flex flex-col gap-2 mx-auto mt-2">
            <div class="flex border border-line overflow-hidden bg-surface">
              <input 
                v-model="pwdInput"
                type="password"
                @keydown.enter="handleUnlock"
                :placeholder="$t('notes.enter_passphrase')"
                class="w-full px-3 py-2 text-xs outline-none bg-transparent text-neutral-300 placeholder-neutral-600 font-mono"
              />
              <button 
                @click="handleUnlock"
                class="bg-surface hover:text-black border-l border-line px-4 text-xs font-bold cursor-pointer text-neutral-400 transition-none"
              >
                {{ $t('notes.unlock_btn') }}
              </button>
            </div>
            <p v-if="showError" class="text-xs text-red-500 text-center tracking-wider">
              ※ {{ $t('notes.auth_fail') }}
            </p>
          </div>
        </div>

        <!-- 2. SETUP PASSWORD PANEL -->
        <div v-else-if="showSetupPanel" class="flex flex-col gap-3 py-4 text-xs md:text-sm flex-grow justify-center max-w-md mx-auto w-full">
          <span class="text-xs text-neutral-500 text-center">{{ $t('notes.setup_passphrase') }}</span>
          <input 
            v-model="setupPwdInput"
            type="password"
            :placeholder="$t('notes.set_passphrase')"
            class="border border-line p-2.5 bg-surface text-neutral-300 placeholder-neutral-600 outline-none font-mono focus:border-accent"
          />
          <input 
            v-model="setupPwdConfirmInput"
            type="password"
            :placeholder="$t('notes.confirm_passphrase')"
            class="border border-line p-2.5 bg-surface text-neutral-300 placeholder-neutral-600 outline-none font-mono focus:border-accent"
          />
          
          <div class="flex gap-2 justify-end mt-1">
            <button 
              @click="showSetupPanel = false; showSetupError = false"
              class="border border-line px-4 py-1.5 text-xs bg-surface text-neutral-400 hover:text-neutral-300 cursor-pointer transition-none"
            >
              {{ $t('notes.back') }}
            </button>
            <button 
              @click="handleSetPassword"
              class="border border-line px-4 py-1.5 text-xs bg-surface text-accent hover:bg-surface transition-none cursor-pointer font-bold"
            >
              {{ $t('notes.save') }}
            </button>
          </div>
          <p v-if="showSetupError" class="text-xs text-red-500 text-center">
            ※ {{ $t('notes.passphrase_empty_or_mismatch') }}
          </p>
        </div>

        <!-- 3. RESET PASSWORD PANEL -->
        <div v-else-if="showResetPanel" class="flex flex-col gap-3 py-4 text-xs md:text-sm flex-grow justify-center max-w-md mx-auto w-full">
          <span class="text-xs text-neutral-500 text-center">[ {{ $t('bio.reset') }} ] {{ $t('notes.enter_passphrase') }}</span>
          <div class="flex border border-line overflow-hidden bg-surface">
            <input 
              v-model="pwdInput"
              type="password"
              @keydown.enter="handleResetPassword"
              :placeholder="$t('notes.enter_passphrase')"
              class="w-full px-3 py-2 text-xs outline-none bg-transparent text-neutral-300 placeholder-neutral-600 font-mono"
            />
          </div>
          
          <div class="flex gap-2 justify-end mt-1">
            <button 
              @click="showResetPanel = false; pwdInput = ''; showError = false"
              class="border border-line px-4 py-1.5 text-xs bg-surface text-neutral-400 hover:text-neutral-300 cursor-pointer transition-none"
            >
              {{ $t('notes.back') }}
            </button>
            <button 
              @click="handleResetPassword"
              class="border border-line px-4 py-1.5 text-xs bg-surface text-red-500 hover:bg-surface cursor-pointer transition-none"
            >
              {{ $t('notes.decrypt_btn') }}
            </button>
          </div>
          <p v-if="showError" class="text-xs text-red-500 text-center">
            ※ {{ $t('notes.auth_fail') }}
          </p>
        </div>

        <!-- 4. ACTIVE NOTE EDITOR -->
        <div v-else class="flex flex-col gap-2 flex-grow">
          <textarea 
            v-model="activeNote.content"
            @input="handleContentInput"
            class="w-full min-h-[380px] lg:min-h-[420px] bg-surface border border-line p-3.5 text-xs md:text-sm text-neutral-300 font-mono outline-none resize-none focus:border-accent transition-none leading-relaxed flex-grow"
            :placeholder="$t('notes.write_here')"
          ></textarea>
          <div class="text-[9px] text-neutral-600 text-right select-none">
            {{ $t('notes.last_modified') }} {{ new Date(activeNote.updatedAt).toLocaleString() }}
          </div>
        </div>
      </div>
    </div>
  </div>
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
