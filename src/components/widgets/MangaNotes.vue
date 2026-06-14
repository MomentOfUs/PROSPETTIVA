<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { triggerCloudPush } from '../../utils/api'
import { t } from '../../i18n'

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
  tags?: string[]
}

const notes = ref<NoteItem[]>([])
const activeNoteId = ref<string>('')

// New Notebook features states
const searchQuery = ref('')
const selectedTagFilter = ref('')
const editMode = ref(true) // true = Edit, false = Preview
const isFullscreen = ref(false)
const newTagInput = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Lock states (Existing)
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
      const parsed = JSON.parse(storedList)
      notes.value = parsed.map((n: any) => ({
        ...n,
        tags: n.tags || []
      }))
    } catch {
      notes.value = []
    }
  }
  
  if (notes.value.length === 0) {
    notes.value = [
      {
        id: 'n1',
        title: '文艺复兴时空法度',
        content: '# 文艺复兴时空法度\n\n在此记录您的灵感与构想...\n- **透视几何**：探索透视几何的美妙与对称。\n- **理性精神**：人文精神与理性的双重交织。\n\n```javascript\n// 示例代码块\nconsole.log("探索新世界");\n```\n\n1. 第一步：勾勒轮廓\n2. 第二步：施以色彩\n\n---\n*写下你的第一行笔记吧！*',
        updatedAt: new Date().toISOString(),
        tags: ['灵感', '设计']
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
  document.body.style.overflow = ''
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

const activeNote = computed(() => {
  return notes.value.find(n => n.id === activeNoteId.value) || notes.value[0] || {
    id: '',
    title: '',
    content: '',
    updatedAt: new Date().toISOString(),
    tags: []
  }
})

function createNewNote() {
  const newId = Date.now().toString()
  notes.value.push({
    id: newId,
    title: t('notes.no_title'),
    content: '',
    updatedAt: new Date().toISOString(),
    tags: []
  })
  activeNoteId.value = newId
  editMode.value = true
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
      // strip markdown header markup if first line has it
      const cleanTitle = firstLine.replace(/^#+\s+/, '').trim()
      activeNote.value.title = cleanTitle.length > 15 ? cleanTitle.substring(0, 15) + '...' : cleanTitle
    } else {
      activeNote.value.title = t('notes.no_title')
    }
  }
}

// Custom Markdown render functions
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const renderedMarkdown = computed(() => {
  const text = activeNote.value?.content || ''
  if (!text.trim()) {
    return `<p class="text-neutral-500 italic select-none">${t('notes.empty')}</p>`
  }
  
  const lines = text.split('\n')
  let html = ''
  let inList = false
  let inOrderedList = false
  let inCodeBlock = false
  let codeContent = ''
  let codeLang = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre class="bg-surface border border-line p-3 my-2 overflow-x-auto text-[11px] font-mono text-accent whitespace-pre"><code class="language-${codeLang}">${escapeHtml(codeContent.trim())}</code></pre>`
        inCodeBlock = false
        codeContent = ''
      } else {
        inCodeBlock = true
        codeLang = line.trim().slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeContent += line + '\n'
      continue
    }

    let escapedLine = escapeHtml(line)

    // Inline elements formatting
    escapedLine = escapedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    escapedLine = escapedLine.replace(/\*(.*?)\*/g, '<em>$1</em>')
    escapedLine = escapedLine.replace(/`(.*?)`/g, '<code class="bg-[#151515] border border-line px-1 py-0.5 rounded text-[11px] font-mono text-accent">$1</code>')

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1 class="text-neutral-100 text-lg font-bold border-b border-line pb-1 mt-4 mb-2 font-mono">${escapedLine.slice(2)}</h1>`
      continue
    }
    if (line.startsWith('## ')) {
      html += `<h2 class="text-neutral-200 text-md font-bold mt-3 mb-2 font-mono">${escapedLine.slice(3)}</h2>`
      continue
    }
    if (line.startsWith('### ')) {
      html += `<h3 class="text-neutral-300 text-sm font-bold mt-3 mb-1 font-mono">${escapedLine.slice(4)}</h3>`
      continue
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      html += '<hr class="border-line my-4">'
      continue
    }

    // Unordered lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (!inList) {
        if (inOrderedList) {
          html += '</ol>'
          inOrderedList = false
        }
        html += '<ul class="list-disc list-inside pl-4 my-2 text-neutral-300 space-y-1">'
        inList = true
      }
      const itemContent = escapedLine.trim().slice(2)
      html += `<li>${itemContent}</li>`
      continue
    }

    // Ordered lists
    const olMatch = line.trim().match(/^(\d+)\.\s+(.*)/)
    if (olMatch) {
      if (!inOrderedList) {
        if (inList) {
          html += '</ul>'
          inList = false
        }
        html += '<ol class="list-decimal list-inside pl-4 my-2 text-neutral-300 space-y-1">'
        inOrderedList = true
      }
      const itemContent = escapeHtml(olMatch[2])
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`/g, '<code class="bg-[#151515] border border-line px-1 py-0.5 rounded text-[11px] font-mono text-accent">$1</code>')
      html += `<li>${itemContent}</li>`
      continue
    }

    // Close list tags if no longer in list
    if (inList) {
      html += '</ul>'
      inList = false
    }
    if (inOrderedList) {
      html += '</ol>'
      inOrderedList = false
    }

    if (line.trim() === '') {
      html += '<div class="h-2"></div>'
    } else {
      html += `<p class="my-1 leading-relaxed text-xs md:text-sm text-neutral-300">${escapedLine}</p>`
    }
  }

  // Final tags closing
  if (inCodeBlock) {
    html += `<pre class="bg-surface border border-line p-3 my-2 overflow-x-auto text-[11px] font-mono text-accent whitespace-pre"><code class="language-${codeLang}">${escapeHtml(codeContent.trim())}</code></pre>`
  }
  if (inList) html += '</ul>'
  if (inOrderedList) html += '</ol>'

  return html
})

// Search and Tag filters computed
const filteredNotes = computed(() => {
  return notes.value.filter(note => {
    const matchesSearch = searchQuery.value
      ? note.title.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
        note.content.toLowerCase().includes(searchQuery.value.toLowerCase())
      : true
    
    const matchesTag = selectedTagFilter.value
      ? (note.tags && note.tags.includes(selectedTagFilter.value))
      : true
      
    return matchesSearch && matchesTag
  })
})

const allTags = computed(() => {
  const set = new Set<string>()
  notes.value.forEach(note => {
    if (note.tags) {
      note.tags.forEach(t => {
        const trimmed = t.trim()
        if (trimmed) set.add(trimmed)
      })
    }
  })
  return Array.from(set)
})

function addTag() {
  const val = newTagInput.value.trim()
  if (!val) return
  if (!activeNote.value.tags) {
    activeNote.value.tags = []
  }
  if (!activeNote.value.tags.includes(val)) {
    activeNote.value.tags.push(val)
    notes.value = [...notes.value] // Force watch trigger for autosave
  }
  newTagInput.value = ''
}

function removeTag(tag: string) {
  if (activeNote.value.tags) {
    activeNote.value.tags = activeNote.value.tags.filter(t => t !== tag)
    notes.value = [...notes.value] // Force watch trigger for autosave
  }
}

// Textarea formatter helper
function insertFormat(prefix: string, suffix: string = '') {
  const el = textareaRef.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = activeNote.value.content
  const selectedText = text.substring(start, end)
  
  const replacement = prefix + (selectedText || '') + suffix
  activeNote.value.content = text.substring(0, start) + replacement + text.substring(end)
  
  handleContentInput()
  
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
  })
}

// Statistics computed
const wordCount = computed(() => {
  const content = activeNote.value?.content || ''
  const zhChars = content.match(/[\u4e00-\u9fa5]/g) || []
  const enWords = content.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b[a-zA-Z0-9_-]+\b/g) || []
  return zhChars.length + enWords.length
})

const lineCount = computed(() => {
  const content = activeNote.value?.content || ''
  return content ? content.split('\n').length : 0
})

// Actions: Export & Fullscreen
function exportNote() {
  if (!activeNote.value) return
  const title = activeNote.value.title || 'note'
  const content = activeNote.value.content
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${title}.md`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

watch(isFullscreen, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <!-- Preview Mode (Dashboard Grid card) -->
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

  <!-- Full Workspace Mode -->
  <Teleport to="body" :disabled="!isFullscreen">
    <div 
      v-if="!preview"
      :class="[
        isFullscreen 
          ? 'fixed inset-0 z-[99999] bg-base p-6 flex flex-col gap-4 overflow-y-auto w-screen h-screen border-4 border-double border-accent' 
          : 'w-full flex flex-col gap-3 font-mono select-none text-neutral-300'
      ]"
    >
      <!-- Action Bar Controls -->
      <div class="flex items-center justify-between border-b border-line pb-2.5">
        <div class="flex items-center gap-2">
          <!-- Back from Fullscreen (Window mode) -->
          <button 
            v-if="isFullscreen"
            @click="toggleFullscreen"
            class="text-[10px] bg-accent border border-accent text-black font-bold px-2 py-0.5 cursor-pointer transition-none flex items-center gap-1 hover:bg-transparent hover:text-accent"
          >
            ❮ {{ $t('notes.windowed') }}
          </button>
          
          <!-- Edit / Preview Toggles -->
          <div v-if="!isLocked && !showSetupPanel && !showResetPanel" class="flex border border-line bg-surface p-0.5">
            <button 
              @click="editMode = true"
              :class="[editMode ? 'bg-accent text-black font-bold' : 'text-neutral-400 hover:text-neutral-200']"
              class="text-[10px] px-2.5 py-0.5 cursor-pointer transition-none font-mono"
            >
              {{ $t('notes.edit') }}
            </button>
            <button 
              @click="editMode = false"
              :class="[!editMode ? 'bg-accent text-black font-bold' : 'text-neutral-400 hover:text-neutral-200']"
              class="text-[10px] px-2.5 py-0.5 cursor-pointer transition-none font-mono"
            >
              {{ $t('notes.preview') }}
            </button>
          </div>
          
          <!-- Export .md Button -->
          <button 
            v-if="!isLocked && !showSetupPanel && !showResetPanel"
            @click="exportNote"
            class="text-[10px] bg-surface border border-line text-neutral-400 hover:text-accent hover:border-accent px-2 py-0.5 cursor-pointer transition-none"
            :title="$t('notes.export_md')"
          >
            {{ $t('notes.export_md') }}
          </button>

          <!-- Fullscreen Toggle Button -->
          <button 
            v-if="!isFullscreen"
            @click="toggleFullscreen"
            class="text-[10px] bg-surface border border-line text-neutral-400 hover:text-accent hover:border-accent px-2 py-0.5 cursor-pointer transition-none"
            :title="$t('notes.fullscreen')"
          >
            🗖 {{ $t('notes.fullscreen') }}
          </button>
        </div>

        <!-- Security lock control actions -->
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
      <div class="flex flex-col lg:flex-row gap-5 min-h-[420px] flex-grow">
        <!-- 1. Left Sidebar (List & Filters) -->
        <div 
          v-if="!isLocked || showSetupPanel || showResetPanel"
          class="w-full lg:w-[220px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line pb-3 lg:pb-0 lg:pr-3.5 gap-3"
        >
          <!-- New Note Trigger -->
          <button 
            @click="createNewNote"
            class="w-full text-center border border-line text-accent hover:bg-surface py-1.5 text-xs cursor-pointer transition-none font-bold"
          >
            {{ $t('notes.new_note') }}
          </button>

          <!-- Search Input -->
          <div class="relative w-full">
            <input 
              v-model="searchQuery"
              type="text"
              :placeholder="$t('notes.search_placeholder')"
              class="w-full border border-line bg-[#0d0d0d] px-2.5 py-1.5 text-[11px] outline-none text-neutral-300 focus:border-accent placeholder-neutral-600 font-mono"
            />
            <button 
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 hover:text-neutral-400 cursor-pointer"
            >
              ×
            </button>
          </div>

          <!-- Tag Selection Filter -->
          <div v-if="allTags.length > 0" class="flex flex-col gap-1 w-full">
            <select 
              v-model="selectedTagFilter"
              class="w-full border border-line bg-[#0d0d0d] px-2 py-1.5 text-[11px] outline-none text-neutral-400 focus:border-accent font-mono cursor-pointer"
            >
              <option value="">🏷️ {{ $t('notes.all_tags') }}</option>
              <option v-for="tag in allTags" :key="tag" :value="tag"># {{ tag }}</option>
            </select>
          </div>

          <!-- Notes Navigation List -->
          <div class="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible max-h-[120px] lg:max-h-[380px] pr-0.5 mt-1 flex-grow">
            <div 
              v-for="noteItem in filteredNotes"
              :key="noteItem.id"
              @click="activeNoteId = noteItem.id"
              class="flex items-center justify-between w-[140px] lg:w-full px-2.5 py-2 border text-[11px] cursor-pointer transition-none shrink-0"
              :class="[activeNoteId === noteItem.id ? 'bg-surface border-accent text-accent' : 'border-line text-neutral-500 hover:bg-surface hover:text-neutral-300']"
            >
              <div class="flex flex-col gap-0.5 truncate max-w-[105px] lg:max-w-[150px]">
                <span class="truncate select-none font-bold">{{ noteItem.title || $t('notes.no_title') }}</span>
                <!-- Note tag badges -->
                <div v-if="noteItem.tags && noteItem.tags.length > 0" class="flex gap-1 truncate max-w-[105px] lg:max-w-[150px] opacity-70">
                  <span v-for="t in noteItem.tags" :key="t" class="text-[8px] text-neutral-600">#{{ t }}</span>
                </div>
              </div>
              <button 
                @click.stop="deleteNote(noteItem.id)"
                class="text-neutral-600 hover:text-red-500 text-[10px] cursor-pointer pl-1 font-bold"
                :title="$t('notes.destroy')"
              >
                ×
              </button>
            </div>
            <div v-if="filteredNotes.length === 0" class="text-center text-[10px] text-neutral-600 py-4 font-mono select-none">
              {{ $t('notes.empty') }}
            </div>
          </div>
        </div>

        <!-- 2. Right Workspace (Editor or Preview) -->
        <div class="flex-grow flex flex-col justify-stretch min-w-0">
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

          <!-- 4. ACTIVE NOTE EDITOR workspace -->
          <div v-else class="flex flex-col gap-2 flex-grow h-full justify-between min-w-0">
            <!-- Format Toolbar -->
            <div v-if="editMode" class="flex flex-wrap items-center gap-1 border border-line bg-surface p-1">
              <button @click="insertFormat('**', '**')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs font-bold font-mono transition-none cursor-pointer" title="加粗">B</button>
              <button @click="insertFormat('*', '*')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs italic font-mono transition-none cursor-pointer" title="斜体">I</button>
              <button @click="insertFormat('# ')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-none cursor-pointer" title="标题 1">H1</button>
              <button @click="insertFormat('## ')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-none cursor-pointer" title="标题 2">H2</button>
              <button @click="insertFormat('```\n', '\n```')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-none cursor-pointer" title="代码块">&lt;/&gt;</button>
              <button @click="insertFormat('- ')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-none cursor-pointer" title="无序列表">• List</button>
              <button @click="insertFormat('\n---\n')" class="px-2 py-0.5 border border-transparent hover:border-line hover:bg-base text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-none cursor-pointer" title="分割线">Divider</button>
              
              <div class="h-4 w-[1px] bg-line mx-1"></div>
              
              <!-- Tag Adding Input -->
              <div class="flex items-center gap-1 ml-auto">
                <input 
                  v-model="newTagInput"
                  type="text"
                  @keydown.enter="addTag"
                  :placeholder="$t('notes.add_tag')"
                  class="bg-base border border-line px-1.5 py-0.5 text-[10px] outline-none text-neutral-300 focus:border-accent placeholder-neutral-600 font-mono w-[80px]"
                />
                <button 
                  @click="addTag"
                  class="px-1.5 py-0.5 border border-line bg-base text-neutral-400 hover:text-accent hover:border-accent text-[10px] transition-none cursor-pointer font-mono"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Note Tag list -->
            <div v-if="editMode && activeNote.tags && activeNote.tags.length > 0" class="flex flex-wrap items-center gap-1.5 mt-0.5 pb-0.5">
              <span 
                v-for="tag in activeNote.tags" 
                :key="tag" 
                class="flex items-center gap-1 bg-surface border border-line px-2 py-0.5 text-[9px] text-neutral-400 font-mono select-none"
              >
                # {{ tag }}
                <button @click="removeTag(tag)" class="text-neutral-600 hover:text-red-500 cursor-pointer font-bold ml-1 text-[9px]">×</button>
              </span>
            </div>

            <!-- Content Area -->
            <div class="flex-grow flex flex-col min-h-0 justify-stretch mt-1">
              <textarea 
                v-if="editMode"
                ref="textareaRef"
                v-model="activeNote.content"
                @input="handleContentInput"
                class="w-full h-full bg-surface border border-line p-3.5 text-xs md:text-sm text-neutral-300 font-mono outline-none resize-none focus:border-accent transition-none leading-relaxed flex-grow min-h-[380px] lg:min-h-[420px]"
                :placeholder="$t('notes.write_here')"
              ></textarea>

              <!-- Markdown HTML Preview rendering -->
              <div 
                v-else 
                v-html="renderedMarkdown"
                class="markdown-preview w-full h-full bg-surface border border-line p-4 text-xs md:text-sm text-neutral-300 font-mono overflow-y-auto leading-relaxed select-text flex-grow min-h-[380px] lg:min-h-[420px]"
              ></div>
            </div>

            <!-- Footer statistics and modified time -->
            <div class="flex items-center justify-between border-t border-line pt-2 text-[10px] text-neutral-600 select-none font-mono mt-1 w-full">
              <div class="flex gap-3">
                <span>{{ $t('notes.words') }}: {{ wordCount }}</span>
                <span>{{ $t('notes.lines') }}: {{ lineCount }}</span>
              </div>
              <div class="truncate max-w-[200px] sm:max-w-none">
                {{ $t('notes.last_modified') }} {{ new Date(activeNote.updatedAt).toLocaleString() }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
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

/* Custom Markdown styles inside editor preview */
.markdown-preview :deep(h1) {
  font-size: 1.25rem;
  font-weight: bold;
  border-bottom: 1px solid var(--color-line, #262626);
  padding-bottom: 0.25rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #f5f5f5;
}
.markdown-preview :deep(h2) {
  font-size: 1.1rem;
  font-weight: bold;
  margin-top: 0.8rem;
  margin-bottom: 0.4rem;
  color: #e5e5e5;
}
.markdown-preview :deep(h3) {
  font-size: 1rem;
  font-weight: bold;
  margin-top: 0.6rem;
  margin-bottom: 0.3rem;
  color: #d4d4d4;
}
.markdown-preview :deep(p) {
  margin-top: 0.4rem;
  margin-bottom: 0.4rem;
  line-height: 1.6;
}
.markdown-preview :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.4rem;
  margin-bottom: 0.4rem;
}
.markdown-preview :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-top: 0.4rem;
  margin-bottom: 0.4rem;
}
.markdown-preview :deep(li) {
  margin-bottom: 0.2rem;
}
.markdown-preview :deep(strong) {
  font-weight: bold;
  color: var(--color-accent, #ff0055);
}
.markdown-preview :deep(em) {
  font-style: italic;
}
.markdown-preview :deep(pre) {
  background-color: #0d0d0d;
  border: 1px solid #262626;
  padding: 0.75rem;
  overflow-x: auto;
  font-family: monospace;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.markdown-preview :deep(code) {
  font-family: monospace;
  color: var(--color-accent, #ff0055);
  background-color: #1a1a1a;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}
.markdown-preview :deep(hr) {
  border: 0;
  border-top: 1px solid #262626;
  margin: 1rem 0;
}
</style>
