<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import MangaCard from '../MangaCard.vue'
import { triggerCloudPush } from '../../utils/api'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('todo')

interface Todo {
  id: string
  text: string
  completed: boolean
}

const todos = ref<Todo[]>([])
const newTodoText = ref('')

function loadTodos() {
  const stored = localStorage.getItem('manga_widget_todos')
  if (stored) {
    try {
      todos.value = JSON.parse(stored)
    } catch {
      todos.value = []
    }
  } else {
    // Default mock tasks
    todos.value = [
      { id: '1', text: '添加我的第一个导航', completed: false },
      { id: '2', text: '探索古典面板设置', completed: true },
      { id: '3', text: '部署到我的服务器！', completed: false }
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

function addTodo() {
  if (!newTodoText.value.trim()) return
  todos.value.push({
    id: Date.now().toString(),
    text: newTodoText.value.trim(),
    completed: false
  })
  newTodoText.value = ''
}

function removeTodo(id: string) {
  todos.value = todos.value.filter(t => t.id !== id)
}

function toggleTodo(todo: Todo) {
  todo.completed = !todo.completed
}
</script>

<template>
  <MangaCard class="w-full max-w-[280px] flex flex-col gap-2 font-bold select-none overflow-hidden font-serif" :hover-shift="true">
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest text-[#ebdcb9] font-serif flex justify-between items-center">
      <span>📜 每日备忘录</span>
      <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-0.5" :title="collapsed ? '展开' : '收起'">
        <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
      </button>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed" class="flex flex-col gap-2">

    <!-- List -->
    <div class="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1">
      <div 
        v-for="todo in todos" 
        :key="todo.id"
        class="flex justify-between items-center bg-[#120e0c]/90 border border-[#d4af37]/20 p-1.5 rounded text-[11px] shadow-sm"
      >
        <div 
          @click="toggleTodo(todo)"
          class="flex items-center gap-1.5 cursor-pointer flex-grow select-none"
        >
          <div 
            class="w-3.5 h-3.5 border border-[#d4af37]/45 flex items-center justify-center rounded-sm bg-transparent transition-all"
            :class="[todo.completed ? 'bg-[#6e5020]' : 'bg-[#120e0c]']"
          >
            <span v-if="todo.completed" class="text-[9px] text-white">✓</span>
          </div>
          <span :class="[todo.completed ? 'line-through text-[#ebdcb9]/40' : 'text-[#f5f2eb]']" class="font-serif font-medium">
            {{ todo.text }}
          </span>
        </div>
        <button 
          @click="removeTodo(todo.id)"
          class="text-status-bad hover:text-status-bad/70 text-xs font-bold cursor-pointer px-1"
        >
          ×
        </button>
      </div>
      <div v-if="todos.length === 0" class="text-center text-xs text-[#d4af37]/50 py-3 font-serif italic">
        暂无待办事项，悠然自得。
      </div>
    </div>

    <!-- Input Box -->
    <div class="flex border border-[#d4af37]/45 rounded bg-[#120e0c] overflow-hidden text-xs">
      <input 
        v-model="newTodoText" 
        type="text" 
        @keydown.enter="addTodo"
        placeholder="录入新任务..." 
        class="w-full px-2 py-1 outline-none text-[#f5f2eb] bg-transparent placeholder-placeholder font-serif"
      />
      <button 
        @click="addTodo"
        class="bg-btn-base text-[#ebdcb9] hover:text-[#d4af37] hover:bg-btn-hover border-l border-[#d4af37]/45 px-3.5 font-bold flex items-center justify-center cursor-pointer transition-colors font-serif"
      >
        新增
      </button>
    </div>
    </div>
    </Transition>
  </MangaCard>
</template>

