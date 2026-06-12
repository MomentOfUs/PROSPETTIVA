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
const activeCategory = ref('全部')
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
      { id: 's4', title: '每日打卡回复', content: '今日已完成打卡，各项业务指标运行良好！', category: '通用', color: '#4a161b' }
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
  cats.add('全部')
  snippets.value.forEach(s => {
    if (s.category) cats.add(s.category)
  })
  return Array.from(cats)
})

const filteredSnippets = computed(() => {
  if (activeCategory.value === '全部') {
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
    alert('复制失败，请检查浏览器剪贴板权限！')
  }
}

// Add action
function addSnippet() {
  if (!newTitle.value.trim() || !newContent.value.trim()) {
    alert('标题与内容不能为空！')
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
  if (confirm('确认抹去这条咒语吗？')) {
    snippets.value = snippets.value.filter(s => s.id !== id)
  }
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 text-[10px] w-full text-left font-serif select-none">
    <div 
      v-for="snip in snippets" 
      :key="snip.id"
      class="relative border border-[#d4af37]/20 rounded p-1.5 text-left bg-black/20"
    >
      <span class="text-[9px] font-bold text-parchment">{{ snip.title }}</span>
      <p class="text-[8px] font-mono text-parchment/50 truncate mt-0.5">{{ snip.content }}</p>
    </div>
    <div v-if="snippets.length === 0" class="text-center text-[9px] text-gold/40 py-2 italic">
      暂无咒语。
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">📜 秘法咒语快传</span>
      <div class="flex items-center gap-1.5">
        <button 
          @click="isEditMode = !isEditMode" 
          class="text-xs px-2.5 py-0.5 border rounded bg-transparent transition-all cursor-pointer"
          :class="[isEditMode ? 'bg-status-bad border-status-bad text-white' : 'border-[#d4af37]/45 text-gold hover:text-gold/80']"
          title="管理咒语"
        >
          {{ isEditMode ? '完成' : '编辑' }}
        </button>
        <button 
          @click="showAddForm = !showAddForm; isEditMode = false" 
          class="text-xs px-2.5 py-0.5 border border-[#d4af37]/45 text-gold hover:text-gold/80 rounded bg-transparent transition-all cursor-pointer"
          title="添加咒语"
        >
          {{ showAddForm ? '取消' : '添加' }}
        </button>
      </div>
    </div>

    <div>
      <!-- Add Snippet Form -->
      <div v-if="showAddForm" class="flex flex-col gap-3 border border-[#d4af37]/30 p-3 rounded bg-[#120e0c] text-xs md:text-sm">
        <div class="flex flex-col gap-1">
          <label class="text-[#ebdcb9]/70 text-xs">咒语名称</label>
          <input 
            v-model="newTitle" 
            type="text" 
            placeholder="例如: Git 一键提交" 
            class="border border-[#d4af37]/30 p-2 rounded bg-[#1a1613] text-[#f5f2eb] outline-none focus:border-[#d4af37]"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[#ebdcb9]/70 text-xs">分类</label>
          <input 
            v-model="newCategory" 
            type="text" 
            placeholder="例如: 开发, 办公, 通用" 
            class="border border-[#d4af37]/30 p-2 rounded bg-[#1a1613] text-[#f5f2eb] outline-none focus:border-[#d4af37]"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[#ebdcb9]/70 text-xs">咒语文本内容</label>
          <textarea 
            v-model="newContent" 
            placeholder="点击卡片时自动复制的内容" 
            rows="3"
            class="border border-[#d4af37]/30 p-2 rounded bg-[#1a1613] text-[#f5f2eb] outline-none focus:border-[#d4af37] resize-y font-mono text-xs"
          ></textarea>
        </div>
        <!-- Color Picker -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[#ebdcb9]/70 text-xs">卡牌底色</label>
          <div class="flex gap-2 flex-wrap">
            <button 
              v-for="opt in colorOptions" 
              :key="opt.value"
              @click="newColor = opt.value"
              class="w-4.5 h-4.5 rounded-full border border-black cursor-pointer transition-transform"
              :style="{ backgroundColor: opt.value }"
              :class="[newColor === opt.value ? 'scale-125 border-[#d4af37] ring-1 ring-[#d4af37]' : '']"
              :title="opt.label"
            ></button>
          </div>
        </div>
        <button 
          @click="addSnippet" 
          class="bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] border border-[#d4af37]/45 py-2 rounded font-bold cursor-pointer transition-colors mt-1"
        >
          设备记入
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
            class="text-[10px] px-2.5 py-0.5 border rounded-full transition-all shrink-0 cursor-pointer"
            :class="[activeCategory === cat ? 'bg-[#6e5020] text-[#f5f2eb] border-[#d4af37]' : 'border-[#d4af37]/25 text-[#ebdcb9]/60 hover:text-[#ebdcb9]']"
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
            class="relative border border-[#d4af37]/35 rounded p-2 text-left cursor-pointer transition-all hover:scale-[1.02] hover:border-[#d4af37] hover:shadow-[0_0_8px_rgba(212,175,55,0.25)] flex flex-col justify-between min-h-[46px] overflow-hidden"
            :style="{ backgroundColor: snip.color + 'd0' }"
            :class="[isEditMode ? 'cursor-default' : 'active:translate-y-0.5']"
          >
            <!-- Card inset border -->
            <div class="absolute inset-0.5 border border-[#d4af37]/10 pointer-events-none rounded"></div>

            <div class="flex justify-between items-center gap-1">
              <span class="text-[10px] md:text-[11px] font-bold text-[#f5f2eb] leading-tight select-none truncate">
                {{ snip.title }}
              </span>
              
              <!-- Action / Copy Success Indicator -->
              <button 
                v-if="isEditMode"
                @click.stop="deleteSnippet(snip.id)"
                class="text-status-bad hover:text-white bg-black/40 hover:bg-status-bad border border-status-bad/30 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all"
                title="删除此咒语"
              >
                ×
              </button>
              <span v-else-if="copiedId === snip.id" class="text-[8px] bg-green-950 border border-green-500 text-green-300 px-1 rounded animate-pulse scale-90 origin-right">
                ✓ 已吟唱
              </span>
              <span v-else class="text-[7.5px] opacity-45 uppercase tracking-wider text-[#ebdcb9] font-mono scale-90 origin-right">
                COPY
              </span>
            </div>
            <p class="text-[8.5px] font-mono text-parchment/65 truncate mt-1 select-none">
              {{ snip.content }}
            </p>
          </div>
          
          <div v-if="filteredSnippets.length === 0" class="col-span-full text-center text-xs text-[#d4af37]/50 py-6 italic">
            此分类暂无秘法咒语。
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
  background: rgba(212, 175, 55, 0.2);
  border-radius: 2px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 175, 55, 0.4);
}
</style>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 3px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.2);
  border-radius: 2px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 175, 55, 0.4);
}
</style>
