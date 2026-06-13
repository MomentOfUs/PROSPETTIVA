<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { triggerCloudPush } from '../../utils/api'
import { t } from '../../i18n'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

interface Snippet {
  id: string
  title: string
  content: string
  category: string
  color: string
}

const snippets = ref<Snippet[]>([])
const activeCategory = ref('ALL')
const copiedId = ref<string | null>(null)
const isEditMode = ref(false)
const showAddForm = ref(false)

// Form fields
const newTitle = ref('')
const newContent = ref('')
const newCategory = ref('GENERAL')
const newColor = ref('#0A0A0A')

const colorOptions = [
  { label: 'BASE', value: '#000000' },
  { label: 'SURFACE', value: '#0A0A0A' },
  { label: 'CARD', value: '#111111' },
  { label: 'DARK', value: '#1A1A1A' },
  { label: 'CHARCOAL', value: '#262626' },
  { label: 'STONE', value: '#1F1F1F' }
]

function loadSnippets() {
  const stored = localStorage.getItem('manga_widget_snippets')
  if (stored) {
    try {
      snippets.value = JSON.parse(stored)
    } catch {
      snippets.value = []
    }
  } else {
    // Default initial mock snippets
    snippets.value = [
      { id: 's1', title: 'Git Commit All', content: 'git add . && git commit -m "update" && git push', category: 'DEV', color: '#0A0A0A' },
      { id: 's2', title: 'Weekly Report', content: '[PROGRESS]\n1. \n2. \n[NEXT_WEEK]\n1. \n2. \n[NEEDS]\nNone', category: 'WORK', color: '#111111' },
      { id: 's3', title: 'Get Local IP', content: 'curl ipinfo.io', category: 'DEV', color: '#1A1A1A' },
      { id: 's4', title: 'Daily Check-in', content: 'Check-in complete. All systems nominal.', category: 'GENERAL', color: '#1F1F1F' }
    ]
  }
}

onMounted(() => {
  loadSnippets()
  window.addEventListener('artisan-cloud-data-pulled', loadSnippets)
})

onUnmounted(() => {
  window.removeEventListener('artisan-cloud-data-pulled', loadSnippets)
})

watch(snippets, (newVal) => {
  localStorage.setItem('manga_widget_snippets', JSON.stringify(newVal))
  triggerCloudPush()
}, { deep: true })

// Categories computed
const categories = computed(() => {
  const cats = new Set<string>()
  cats.add('ALL')
  snippets.value.forEach(s => {
    if (s.category) cats.add(s.category)
  })
  return Array.from(cats)
})

const filteredSnippets = computed(() => {
  if (activeCategory.value === 'ALL') {
    return snippets.value
  }
  return snippets.value.filter(s => s.category === activeCategory.value)
})

// Copy action
async function copySnippet(snippet: Snippet) {
  if (isEditMode.value) return // Don't copy while deleting
  try {
    await navigator.clipboard.writeText(snippet.content)
    copiedId.value = snippet.id
    setTimeout(() => {
      if (copiedId.value === snippet.id) {
        copiedId.value = null
      }
    }, 1500)
  } catch (err) {
    alert(t('alert.clipboard_denied'))
  }
}

// Add action
function addSnippet() {
  if (!newTitle.value.trim() || !newContent.value.trim()) {
    alert(t('alert.title_content_required'))
    return
  }

  const categoryTrim = newCategory.value.trim() || 'GENERAL'

  snippets.value.push({
    id: Date.now().toString(),
    title: newTitle.value.trim(),
    content: newContent.value.trim(),
    category: categoryTrim,
    color: newColor.value
  })

  // Reset form
  newTitle.value = ''
  newContent.value = ''
  newCategory.value = 'GENERAL'
  newColor.value = '#0A0A0A'
  showAddForm.value = false

  // Switch tab if needed
  if (activeCategory.value !== 'ALL' && activeCategory.value !== categoryTrim) {
    activeCategory.value = categoryTrim
  }
}

// Delete action
function deleteSnippet(id: string) {
  if (confirm(t('confirm.destroy'))) {
    snippets.value = snippets.value.filter(s => s.id !== id)
  }
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 text-[10px] w-full text-left font-mono select-none">
    <div 
      v-for="snip in snippets" 
      :key="snip.id"
      class="relative border border-border-dim p-1.5 text-left bg-base"
    >
      <span class="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{{ snip.title }}</span>
      <p class="text-[8px] font-mono text-neutral-400 truncate mt-0.5">{{ snip.content }}</p>
    </div>
    <div v-if="snippets.length === 0" class="text-center text-[9px] text-neutral-600 py-2">
      {{ '// NO_SNIPPETS' }}
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-mono text-neutral-300">
    <!-- Header Controls -->
    <div class="flex items-center justify-end border-b border-line pb-2.5">
      <div class="flex items-center gap-1.5">
        <button 
          @click="isEditMode = !isEditMode" 
          class="text-xs px-2.5 py-0.5 border border-border-dim bg-base text-neutral-400 hover:text-black transition-none cursor-pointer"
          :class="[isEditMode ? 'bg-accent border-accent text-base' : '']"
          title="[ MANAGEMENT ]"
        >
          {{ isEditMode ? '[ OK ]' : $t('edit') }}
        </button>
        <button 
          @click="showAddForm = !showAddForm; isEditMode = false" 
          class="text-xs px-2.5 py-0.5 border border-border-dim bg-base text-neutral-400 hover:text-black transition-none cursor-pointer"
          title="ADD_SNIPPET"
        >
          {{ showAddForm ? $t('snippet.cancel') : $t('snippet.add') }}
        </button>
      </div>
    </div>

    <div>
      <!-- Add Snippet Form -->
      <div v-if="showAddForm" class="flex flex-col gap-3 border border-border-dim p-3 bg-base text-xs md:text-sm">
        <div class="flex flex-col gap-1">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('snippet.name') }}</label>
          <input 
            v-model="newTitle" 
            type="text" 
            placeholder="e.g. git add . && git commit" 
            class="border border-border-dim p-2 bg-surface text-neutral-300 outline-none focus:border-accent transition-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('snippet.category') }}</label>
          <input 
            v-model="newCategory" 
            type="text" 
            placeholder="e.g. DEV, OFFICE, GENERAL" 
            class="border border-border-dim p-2 bg-surface text-neutral-300 outline-none focus:border-accent transition-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('snippet.payload') }}</label>
          <textarea 
            v-model="newContent" 
            placeholder="Content to copy on click" 
            rows="3"
            class="border border-border-dim p-2 bg-surface text-neutral-300 outline-none focus:border-accent transition-none resize-y font-mono text-xs"
          ></textarea>
        </div>
        <!-- Color Picker -->
        <div class="flex flex-col gap-1.5">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">{{ $t('snippet.bg.color') }}</label>
          <div class="flex gap-2 flex-wrap">
            <button 
              v-for="opt in colorOptions" 
              :key="opt.value"
              @click="newColor = opt.value"
              class="w-4 h-4 border border-border-dim cursor-pointer transition-none"
              :style="{ backgroundColor: opt.value }"
              :class="[newColor === opt.value ? 'border-accent' : '']"
              :title="opt.label"
            ></button>
          </div>
        </div>
        <button 
          @click="addSnippet" 
          class="bg-surface text-neutral-300 hover:bg-neutral-200 hover:text-black border border-line py-2 font-bold cursor-pointer transition-none mt-1"
        >
            {{ $t('snippet.save') }}
        </button>
      </div>

      <!-- Normal Content -->
      <div v-else class="flex flex-col gap-3">
        <!-- Category Tabs -->
        <div class="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin max-w-full">
          <button 
            v-for="cat in categories" 
            :key="cat"
            @click="activeCategory = cat"
            class="text-[10px] px-2.5 py-0.5 border border-border-dim transition-none shrink-0 cursor-pointer"
            :class="[activeCategory === cat ? 'bg-accent text-base border-accent' : 'text-neutral-500 hover:bg-neutral-200 hover:text-black hover:border-neutral-200']"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Snippet Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
          <div 
            v-for="snip in filteredSnippets" 
            :key="snip.id"
            @click="copySnippet(snip)"
            class="relative border border-border-dim p-2 text-left cursor-pointer transition-none flex flex-col justify-between min-h-[46px] overflow-hidden"
            :style="{ backgroundColor: snip.color + 'd0' }"
            :class="[isEditMode ? 'cursor-default' : '']"
          >
            <div class="flex justify-between items-center gap-1">
              <span class="text-[10px] md:text-[11px] font-bold text-neutral-300 leading-tight select-none truncate">
                {{ snip.title }}
              </span>
              
              <!-- Action / Copy Success Indicator -->
              <button 
                v-if="isEditMode"
                @click.stop="deleteSnippet(snip.id)"
                class="text-neutral-400 hover:text-accent bg-base hover:bg-neutral-300 hover:border-neutral-300 border border-line w-4 h-4 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-none"
                title="DELETE"
              >
                ×
              </button>
              <span v-else-if="copiedId === snip.id" class="text-[8px] bg-accent text-base px-1 scale-90 origin-right">
                ✓ {{ $t('snippet.copied') }}
              </span>
              <span v-else class="text-[7.5px] opacity-45 uppercase tracking-wider text-neutral-600 font-mono scale-90 origin-right">
                COPY
              </span>
            </div>
            <p class="text-[8.5px] font-mono text-neutral-400 truncate mt-1 select-none">
              {{ snip.content }}
            </p>
          </div>
          
          <div v-if="filteredSnippets.length === 0" class="col-span-full text-center text-xs text-neutral-600 py-6">
            {{ '// NO_SNIPPETS' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 3px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--color-line);
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: var(--color-neutral);
}
</style>
