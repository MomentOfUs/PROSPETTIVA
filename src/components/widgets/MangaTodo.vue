<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { triggerCloudPush } from '../../utils/api'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

interface Todo {
  id: string
  text: string
  completed: boolean
  category: 'today' | 'longterm' | 'inbox'
}

const todos = ref<Todo[]>([])

const newTodayText = ref('')
const newLongtermText = ref('')
const newInboxText = ref('')

function loadTodos() {
  const stored = localStorage.getItem('manga_widget_todos')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // compatibility check for category
      todos.value = parsed.map((t: any) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        category: t.category || 'inbox'
      }))
    } catch {
      todos.value = []
    }
  } else {
    // Default mock tasks distributed across categories
    todos.value = [
      { id: '1', text: '研习文艺复兴透视几何法', completed: false, category: 'today' },
      { id: '2', text: '构想长远星轨减重计划', completed: true, category: 'longterm' },
      { id: '3', text: '部署私人云端观测台', completed: false, category: 'inbox' },
      { id: '4', text: '收集世间咒语话术', completed: false, category: 'inbox' }
    ]
  }
}

onMounted(() => {
  loadTodos()
  window.addEventListener('artisan-cloud-data-pulled', loadTodos)
})

onUnmounted(() => {
  window.removeEventListener('artisan-cloud-data-pulled', loadTodos)
})

watch(todos, (newVal) => {
  localStorage.setItem('manga_widget_todos', JSON.stringify(newVal))
  triggerCloudPush()
}, { deep: true })

function addTodo(category: 'today' | 'longterm' | 'inbox') {
  let text = ''
  if (category === 'today') {
    text = newTodayText.value.trim()
    newTodayText.value = ''
  } else if (category === 'longterm') {
    text = newLongtermText.value.trim()
    newLongtermText.value = ''
  } else {
    text = newInboxText.value.trim()
    newInboxText.value = ''
  }

  if (!text) return
  todos.value.push({
    id: Date.now().toString(),
    text,
    completed: false,
    category
  })
}

function removeTodo(id: string) {
  todos.value = todos.value.filter(t => t.id !== id)
}

function toggleTodo(todo: Todo) {
  todo.completed = !todo.completed
}

function moveTodo(todo: Todo, target: 'today' | 'longterm' | 'inbox') {
  todo.category = target
}

// Categorized Lists
const todayTodos = computed(() => todos.value.filter(t => t.category === 'today'))
const longtermTodos = computed(() => todos.value.filter(t => t.category === 'longterm'))
const inboxTodos = computed(() => todos.value.filter(t => t.category === 'inbox'))
</script>

<template>
  <!-- Preview mode inside hover tooltip -->
  <div v-if="preview" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 text-[10px] w-full text-left font-serif">
    <div 
      v-for="todo in todos" 
      :key="todo.id"
      class="flex items-center gap-1.5 bg-[#120e0c]/50 border border-[#d4af37]/15 p-1 rounded"
    >
      <div 
        class="w-3 h-3 border border-[#d4af37]/35 flex items-center justify-center rounded-sm bg-transparent shrink-0"
        :class="[todo.completed ? 'bg-[#6e5020]' : 'bg-[#120e0c]']"
      >
        <span v-if="todo.completed" class="text-[8px] text-white">✓</span>
      </div>
      <span :class="[todo.completed ? 'line-through text-parchment/40' : 'text-parchment']" class="truncate">
        <span class="text-[8px] opacity-50 mr-1">[{{ todo.category === 'today' ? '今' : todo.category === 'longterm' ? '远' : '集' }}]</span>{{ todo.text }}
      </span>
    </div>
    <div v-if="todos.length === 0" class="text-center text-[9px] text-gold/40 py-2 italic">
      暂无备忘事项。
    </div>
  </div>

  <!-- Full mode: Kanban Board -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">📋 待办看板协同仪</span>
      <span class="text-[10px] text-[#ebdcb9]/40 font-mono">
        总事务: {{ todos.length }} / 未完成: {{ todos.filter(t => !t.completed).length }}
      </span>
    </div>

    <!-- Kanban Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[400px]">
      <!-- 1. TODAY COLUMN -->
      <div class="border border-[#d4af37]/25 rounded p-3 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3">
        <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
          <span class="text-xs font-semibold text-[#d4af37] tracking-wider">🪐 今日修业 (Today)</span>
          <span class="text-[9px] bg-[#6e5020]/40 text-[#ebdcb9] px-2 py-0.2 rounded font-mono">{{ todayTodos.length }}</span>
        </div>

        <!-- Add Input inside column -->
        <div class="flex border border-[#d4af37]/35 rounded bg-[#120e0c]/60 overflow-hidden text-xs">
          <input 
            v-model="newTodayText"
            type="text"
            @keydown.enter="addTodo('today')"
            placeholder="增添今日事务..."
            class="w-full px-2 py-1.5 outline-none text-[#f5f2eb] bg-transparent text-[11px]"
          />
          <button @click="addTodo('today')" class="bg-btn-base border-l border-[#d4af37]/30 px-2.5 text-[10px] text-[#ebdcb9] hover:text-[#d4af37] cursor-pointer">录入</button>
        </div>

        <!-- Task List -->
        <div class="flex-grow overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-0.5">
          <div 
            v-for="todo in todayTodos" 
            :key="todo.id"
            class="flex flex-col gap-1.5 bg-[#1a1512]/60 border border-[#d4af37]/15 p-2 rounded relative group"
          >
            <div class="flex justify-between items-start">
              <div @click="toggleTodo(todo)" class="flex items-start gap-2 cursor-pointer select-none pr-5 flex-grow">
                <div 
                  class="w-3.5 h-3.5 border border-[#d4af37]/45 flex items-center justify-center rounded-sm bg-transparent mt-0.5 shrink-0"
                  :class="[todo.completed ? 'bg-[#6e5020]' : 'bg-[#120e0c]']"
                >
                  <span v-if="todo.completed" class="text-[9px] text-white">✓</span>
                </div>
                <span :class="[todo.completed ? 'line-through text-parchment/40 font-normal' : 'text-parchment font-semibold']" class="text-[11px] leading-tight break-all">
                  {{ todo.text }}
                </span>
              </div>
              <button @click="removeTodo(todo.id)" class="text-status-bad hover:text-white text-[11px] cursor-pointer pl-1 opacity-60 group-hover:opacity-100">×</button>
            </div>

            <!-- Move Actions -->
            <div class="flex gap-2 justify-end text-[8px] border-t border-[#d4af37]/10 pt-1 mt-1 opacity-70 group-hover:opacity-100">
              <span class="text-[#ebdcb9]/40 mr-auto">移动至:</span>
              <button @click="moveTodo(todo, 'longterm')" class="hover:text-gold text-[#ebdcb9]/60 cursor-pointer">长远 ➔</button>
              <button @click="moveTodo(todo, 'inbox')" class="hover:text-gold text-[#ebdcb9]/60 cursor-pointer">收集 ➔</button>
            </div>
          </div>
          <div v-if="todayTodos.length === 0" class="text-center text-[10px] text-gold/30 py-8 italic font-serif">今日安宁，暂无事务。</div>
        </div>
      </div>

      <!-- 2. LONGTERM COLUMN -->
      <div class="border border-[#d4af37]/25 rounded p-3 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3">
        <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
          <span class="text-xs font-semibold text-[#d4af37] tracking-wider">📜 长远法度 (Long-term)</span>
          <span class="text-[9px] bg-[#6e5020]/40 text-[#ebdcb9] px-2 py-0.2 rounded font-mono">{{ longtermTodos.length }}</span>
        </div>

        <div class="flex border border-[#d4af37]/35 rounded bg-[#120e0c]/60 overflow-hidden text-xs">
          <input 
            v-model="newLongtermText"
            type="text"
            @keydown.enter="addTodo('longterm')"
            placeholder="增添长远构想..."
            class="w-full px-2 py-1.5 outline-none text-[#f5f2eb] bg-transparent text-[11px]"
          />
          <button @click="addTodo('longterm')" class="bg-btn-base border-l border-[#d4af37]/30 px-2.5 text-[10px] text-[#ebdcb9] hover:text-[#d4af37] cursor-pointer">录入</button>
        </div>

        <div class="flex-grow overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-0.5">
          <div 
            v-for="todo in longtermTodos" 
            :key="todo.id"
            class="flex flex-col gap-1.5 bg-[#1a1512]/60 border border-[#d4af37]/15 p-2 rounded relative group"
          >
            <div class="flex justify-between items-start">
              <div @click="toggleTodo(todo)" class="flex items-start gap-2 cursor-pointer select-none pr-5 flex-grow">
                <div 
                  class="w-3.5 h-3.5 border border-[#d4af37]/45 flex items-center justify-center rounded-sm bg-transparent mt-0.5 shrink-0"
                  :class="[todo.completed ? 'bg-[#6e5020]' : 'bg-[#120e0c]']"
                >
                  <span v-if="todo.completed" class="text-[9px] text-white">✓</span>
                </div>
                <span :class="[todo.completed ? 'line-through text-parchment/40 font-normal' : 'text-parchment font-semibold']" class="text-[11px] leading-tight break-all">
                  {{ todo.text }}
                </span>
              </div>
              <button @click="removeTodo(todo.id)" class="text-status-bad hover:text-white text-[11px] cursor-pointer pl-1 opacity-60 group-hover:opacity-100">×</button>
            </div>

            <!-- Move Actions -->
            <div class="flex gap-2 justify-end text-[8px] border-t border-[#d4af37]/10 pt-1 mt-1 opacity-70 group-hover:opacity-100">
              <span class="text-[#ebdcb9]/40 mr-auto">移动至:</span>
              <button @click="moveTodo(todo, 'today')" class="hover:text-gold text-[#ebdcb9]/60 cursor-pointer">今日 ➔</button>
              <button @click="moveTodo(todo, 'inbox')" class="hover:text-gold text-[#ebdcb9]/60 cursor-pointer">收集 ➔</button>
            </div>
          </div>
          <div v-if="longtermTodos.length === 0" class="text-center text-[10px] text-gold/30 py-8 italic font-serif">无长远备忘。</div>
        </div>
      </div>

      <!-- 3. INBOX COLUMN -->
      <div class="border border-[#d4af37]/25 rounded p-3 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3">
        <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
          <span class="text-xs font-semibold text-[#d4af37] tracking-wider">📥 随手记事 (Inbox)</span>
          <span class="text-[9px] bg-[#6e5020]/40 text-[#ebdcb9] px-2 py-0.2 rounded font-mono">{{ inboxTodos.length }}</span>
        </div>

        <div class="flex border border-[#d4af37]/35 rounded bg-[#120e0c]/60 overflow-hidden text-xs">
          <input 
            v-model="newInboxText"
            type="text"
            @keydown.enter="addTodo('inbox')"
            placeholder="随意捕获想法..."
            class="w-full px-2 py-1.5 outline-none text-[#f5f2eb] bg-transparent text-[11px]"
          />
          <button @click="addTodo('inbox')" class="bg-btn-base border-l border-[#d4af37]/30 px-2.5 text-[10px] text-[#ebdcb9] hover:text-[#d4af37] cursor-pointer">录入</button>
        </div>

        <div class="flex-grow overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-0.5">
          <div 
            v-for="todo in inboxTodos" 
            :key="todo.id"
            class="flex flex-col gap-1.5 bg-[#1a1512]/60 border border-[#d4af37]/15 p-2 rounded relative group"
          >
            <div class="flex justify-between items-start">
              <div @click="toggleTodo(todo)" class="flex items-start gap-2 cursor-pointer select-none pr-5 flex-grow">
                <div 
                  class="w-3.5 h-3.5 border border-[#d4af37]/45 flex items-center justify-center rounded-sm bg-transparent mt-0.5 shrink-0"
                  :class="[todo.completed ? 'bg-[#6e5020]' : 'bg-[#120e0c]']"
                >
                  <span v-if="todo.completed" class="text-[9px] text-white">✓</span>
                </div>
                <span :class="[todo.completed ? 'line-through text-parchment/40 font-normal' : 'text-parchment font-semibold']" class="text-[11px] leading-tight break-all">
                  {{ todo.text }}
                </span>
              </div>
              <button @click="removeTodo(todo.id)" class="text-status-bad hover:text-white text-[11px] cursor-pointer pl-1 opacity-60 group-hover:opacity-100">×</button>
            </div>

            <!-- Move Actions -->
            <div class="flex gap-2 justify-end text-[8px] border-t border-[#d4af37]/10 pt-1 mt-1 opacity-70 group-hover:opacity-100">
              <span class="text-[#ebdcb9]/40 mr-auto">移动至:</span>
              <button @click="moveTodo(todo, 'today')" class="hover:text-gold text-[#ebdcb9]/60 cursor-pointer">今日 ➔</button>
              <button @click="moveTodo(todo, 'longterm')" class="hover:text-gold text-[#ebdcb9]/60 cursor-pointer">长远 ➔</button>
            </div>
          </div>
          <div v-if="inboxTodos.length === 0" class="text-center text-[10px] text-gold/30 py-8 italic font-serif">收集箱已清空。</div>
        </div>
      </div>
    </div>
  </div>
</template>
