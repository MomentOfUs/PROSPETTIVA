<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { triggerCloudPush } from '../../utils/api'

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
const newCategory = ref('通用')
const newColor = ref('#6e5020') // 拉特兰金

const colorOptions = [
  { label: '美红', value: '#4a161b' },
  { label: '波绿', value: '#152e24' },
  { label: '西蓝', value: '#18283b' },
  { label: '拉金', value: '#6e5020' },
  { label: '达褐', value: '#2e1f18' },
  { label: '威灰', value: '#2b2b2e' }
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
      { id: 's1', title: 'Git 提交全流程', content: 'git add . && git commit -m "update" && git push', category: '开发', color: '#18283b' },
      { id: 's2', title: '周报汇报模板', content: '【本周进展】\n1. \n2. \n【下周计划】\n1. \n2. \n【需协调事项】\n无', category: '办公', color: '#6e5020' },
      { id: 's3', title: '查看本地 IP 地址', content: 'curl ipinfo.io', category: '开发', color: '#152e24' },
      { id: 's4', title: '每日打卡回复', content: '今日已[ OK ]打卡，各项业务指标运行良好！', category: '通用', color: '#4a161b' }
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
    alert('[ERROR] CLIPBOARD_ACCESS_DENIED')
  }
}

// Add action
function addSnippet() {
  if (!newTitle.value.trim() || !newContent.value.trim()) {
    alert('[ERROR] TITLE_AND_CONTENT_REQUIRED')
    return
  }

  const categoryTrim = newCategory.value.trim() || '通用'

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
  newCategory.value = '通用'
  newColor.value = '#6e5020'
  showAddForm.value = false

  // Switch tab if needed
  if (activeCategory.value !== '全部' && activeCategory.value !== categoryTrim) {
    activeCategory.value = categoryTrim
  }
}

// Delete action
function deleteSnippet(id: string) {
  if (confirm('[ DESTROY ] ?')) {
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
      // EMPTY //
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-mono text-neutral-300">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-accent">[ SNIPPET ]</span>
      <div class="flex items-center gap-1.5">
        <button 
          @click="isEditMode = !isEditMode" 
          class="text-xs px-2.5 py-0.5 border border-border-dim bg-base text-neutral-400 hover:text-black transition-none cursor-pointer"
          :class="[isEditMode ? 'bg-accent border-accent text-base' : '']"
          title="[ MANAGEMENT ]"
        >
          {{ isEditMode ? '[ OK ]' : 'EDIT' }}
        </button>
        <button 
          @click="showAddForm = !showAddForm; isEditMode = false" 
          class="text-xs px-2.5 py-0.5 border border-border-dim bg-base text-neutral-400 hover:text-black transition-none cursor-pointer"
          title="[ + MOUNT ]咒语"
        >
          {{ showAddForm ? '[ ABORT ]' : '[ + MOUNT ]' }}
        </button>
      </div>
    </div>

    <div>
      <!-- Add Snippet Form -->
      <div v-if="showAddForm" class="flex flex-col gap-3 border border-border-dim p-3 bg-base text-xs md:text-sm">
        <div class="flex flex-col gap-1">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">NAME</label>
          <input 
            v-model="newTitle" 
            type="text" 
            placeholder="e.g. git add . && git commit" 
            class="border border-border-dim p-2 bg-surface text-neutral-300 outline-none focus:border-accent transition-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">CATEGORY</label>
          <input 
            v-model="newCategory" 
            type="text" 
            placeholder="e.g. DEV, OFFICE, GENERAL" 
            class="border border-border-dim p-2 bg-surface text-neutral-300 outline-none focus:border-accent transition-none"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">PAYLOAD</label>
          <textarea 
            v-model="newContent" 
            placeholder="CLICK TO COPY" 
            rows="3"
            class="border border-border-dim p-2 bg-surface text-neutral-300 outline-none focus:border-accent transition-none resize-y font-mono text-xs"
          ></textarea>
        </div>
        <!-- Color Picker -->
        <div class="flex flex-col gap-1.5">
          <label class="text-neutral-500 text-xs uppercase tracking-widest">BG_COLOR</label>
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
          [ + MOUNT ]
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
            :class="[activeCategory === cat ? 'bg-accent text-base border-accent' : 'text-neutral-500 hover:text-neutral-300']"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Snippet Cards Grid -->
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
                class="text-neutral-400 hover:text-black bg-base hover:bg-neutral-200 hover:border-neutral-200 border border-line w-4 h-4 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-none"
                title="删除此咒语"
              >
                ×
              </button>
              <span v-else-if="copiedId === snip.id" class="text-[8px] bg-accent text-base px-1 animate-pulse scale-90 origin-right">
                ✓ 已吟唱
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
            // EMPTY //
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
  background: #262626;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #404040;
}
</style>
