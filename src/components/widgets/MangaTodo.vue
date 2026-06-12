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
    todos.value = [
      { id: '1', text: 'STUDY_RENAISSANCE_GEOMETRY', completed: false, category: 'today' },
      { id: '2', text: 'PLAN_LONG_TERM_ORBIT', completed: true, category: 'longterm' },
      { id: '3', text: 'DEPLOY_CLOUD_OBSERVATORY', completed: false, category: 'inbox' },
      { id: '4', text: 'COLLECT_SCRIPTS', completed: false, category: 'inbox' }
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

const todayTodos = computed(() => todos.value.filter(t => t.category === 'today'))
const longtermTodos = computed(() => todos.value.filter(t => t.category === 'longterm'))
const inboxTodos = computed(() => todos.value.filter(t => t.category === 'inbox'))
</script>

<template>
  <!-- Preview mode inside hover tooltip -->
  <div v-if="preview" class="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1 text-[10px] w-full text-left font-mono">
    <div 
      v-for="todo in todos" 
      :key="todo.id"
      class="flex items-center gap-1.5 bg-surface border border-border-dim p-1"
    >
      <div 
        class="w-3 h-3 border border-neutral-600 flex items-center justify-center shrink-0"
        :class="[todo.completed ? 'bg-accent' : 'bg-base']"
      >
        <span v-if="todo.completed" class="text-[8px] text-neutral-300">✓</span>
      </div>
      <span :class="[todo.completed ? 'line-through text-neutral-500' : 'text-neutral-300']" class="truncate">
        <span class="text-[8px] opacity-50 mr-1">[{{ todo.category === 'today' ? '今' : todo.category === 'longterm' ? '远' : '集' }}]</span>{{ todo.text }}
      </span>
    </div>
    <div v-if="todos.length === 0" class="text-center text-[9px] text-neutral-500 py-2">
      // NO TASKS
    </div>
  </div>

  <!-- Full mode: Kanban Board -->
  <div v-else class="w-full flex flex-col gap-3 select-none font-mono">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border-dim pb-2.5">
      <span class="text-xs uppercase tracking-widest text-accent">[ TASKS ]</span>
      <span class="text-[10px] text-neutral-500">
        TOTAL:{{ todos.length }} / OPEN:{{ todos.filter(t => !t.completed).length }}
      </span>
    </div>

    <!-- Kanban Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-[400px]">
      <!-- 1. TODAY COLUMN -->
      <div class="border border-border-dim p-3 bg-surface flex flex-col gap-3">
        <div class="border-b border-border-dim pb-1.5 flex justify-between items-center">
          <span class="text-xs uppercase tracking-widest text-accent">TODAY</span>
          <span class="text-[9px] bg-base text-accent px-2 py-0.2 border border-border-dim">{{ todayTodos.length }}</span>
        </div>

        <div class="flex border border-border-dim bg-base overflow-hidden text-xs">
          <input 
            v-model="newTodayText"
            type="text"
            @keydown.enter="addTodo('today')"
            placeholder="$ add task..."
            class="w-full px-2 py-1.5 outline-none text-neutral-300 bg-transparent text-[11px] placeholder:text-neutral-600"
          />
          <button @click="addTodo('today')" class="bg-surface border-l border-border-dim px-2.5 text-[10px] text-accent hover:text-neutral-300 cursor-pointer transition-none">ADD</button>
        </div>

        <div class="flex-grow overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-0.5">
          <div 
            v-for="todo in todayTodos" 
            :key="todo.id"
            class="flex flex-col gap-1.5 bg-base border border-border-dim p-2 relative group"
          >
            <div class="flex justify-between items-start">
              <div @click="toggleTodo(todo)" class="flex items-start gap-2 cursor-pointer select-none pr-5 flex-grow">
                <div 
                  class="w-3.5 h-3.5 border border-neutral-600 flex items-center justify-center mt-0.5 shrink-0"
                  :class="[todo.completed ? 'bg-accent' : 'bg-base']"
                >
                  <span v-if="todo.completed" class="text-[9px] text-neutral-300">✓</span>
                </div>
                <span :class="[todo.completed ? 'line-through text-neutral-500 font-normal' : 'text-neutral-300 font-semibold']" class="text-[11px] leading-tight break-all">
                  {{ todo.text }}
                </span>
              </div>
              <button @click="removeTodo(todo.id)" class="text-accent hover:text-neutral-300 text-[11px] cursor-pointer pl-1 opacity-60 group-hover:opacity-100 transition-none">×</button>
            </div>

            <div class="flex gap-2 justify-end text-[8px] border-t border-border-dim pt-1 mt-1 opacity-70 group-hover:opacity-100 transition-none">
              <span class="text-neutral-600 mr-auto">MOVE_TO:</span>
              <button @click="moveTodo(todo, 'longterm')" class="hover:text-black text-neutral-500 cursor-pointer transition-none">LONGTERM →</button>
              <button @click="moveTodo(todo, 'inbox')" class="hover:text-black text-neutral-500 cursor-pointer transition-none">INBOX →</button>
            </div>
          </div>
          <div v-if="todayTodos.length === 0" class="text-center text-[10px] text-neutral-600 py-8">// EMPTY</div>
        </div>
      </div>

      <!-- 2. LONGTERM COLUMN -->
      <div class="border border-border-dim p-3 bg-surface flex flex-col gap-3">
        <div class="border-b border-border-dim pb-1.5 flex justify-between items-center">
          <span class="text-xs uppercase tracking-widest text-accent">LONGTERM</span>
          <span class="text-[9px] bg-base text-accent px-2 py-0.2 border border-border-dim">{{ longtermTodos.length }}</span>
        </div>

        <div class="flex border border-border-dim bg-base overflow-hidden text-xs">
          <input 
            v-model="newLongtermText"
            type="text"
            @keydown.enter="addTodo('longterm')"
            placeholder="$ add task..."
            class="w-full px-2 py-1.5 outline-none text-neutral-300 bg-transparent text-[11px] placeholder:text-neutral-600"
          />
          <button @click="addTodo('longterm')" class="bg-surface border-l border-border-dim px-2.5 text-[10px] text-accent hover:text-neutral-300 cursor-pointer transition-none">ADD</button>
        </div>

        <div class="flex-grow overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-0.5">
          <div 
            v-for="todo in longtermTodos" 
            :key="todo.id"
            class="flex flex-col gap-1.5 bg-base border border-border-dim p-2 relative group"
          >
            <div class="flex justify-between items-start">
              <div @click="toggleTodo(todo)" class="flex items-start gap-2 cursor-pointer select-none pr-5 flex-grow">
                <div 
                  class="w-3.5 h-3.5 border border-neutral-600 flex items-center justify-center mt-0.5 shrink-0"
                  :class="[todo.completed ? 'bg-accent' : 'bg-base']"
                >
                  <span v-if="todo.completed" class="text-[9px] text-neutral-300">✓</span>
                </div>
                <span :class="[todo.completed ? 'line-through text-neutral-500 font-normal' : 'text-neutral-300 font-semibold']" class="text-[11px] leading-tight break-all">
                  {{ todo.text }}
                </span>
              </div>
              <button @click="removeTodo(todo.id)" class="text-accent hover:text-neutral-300 text-[11px] cursor-pointer pl-1 opacity-60 group-hover:opacity-100 transition-none">×</button>
            </div>

            <div class="flex gap-2 justify-end text-[8px] border-t border-border-dim pt-1 mt-1 opacity-70 group-hover:opacity-100 transition-none">
              <span class="text-neutral-600 mr-auto">MOVE_TO:</span>
              <button @click="moveTodo(todo, 'today')" class="hover:text-black text-neutral-500 cursor-pointer transition-none">TODAY →</button>
              <button @click="moveTodo(todo, 'inbox')" class="hover:text-black text-neutral-500 cursor-pointer transition-none">INBOX →</button>
            </div>
          </div>
          <div v-if="longtermTodos.length === 0" class="text-center text-[10px] text-neutral-600 py-8">// EMPTY</div>
        </div>
      </div>

      <!-- 3. INBOX COLUMN -->
      <div class="border border-border-dim p-3 bg-surface flex flex-col gap-3">
        <div class="border-b border-border-dim pb-1.5 flex justify-between items-center">
          <span class="text-xs uppercase tracking-widest text-accent">INBOX</span>
          <span class="text-[9px] bg-base text-accent px-2 py-0.2 border border-border-dim">{{ inboxTodos.length }}</span>
        </div>

        <div class="flex border border-border-dim bg-base overflow-hidden text-xs">
          <input 
            v-model="newInboxText"
            type="text"
            @keydown.enter="addTodo('inbox')"
            placeholder="$ add task..."
            class="w-full px-2 py-1.5 outline-none text-neutral-300 bg-transparent text-[11px] placeholder:text-neutral-600"
          />
          <button @click="addTodo('inbox')" class="bg-surface border-l border-border-dim px-2.5 text-[10px] text-accent hover:text-neutral-300 cursor-pointer transition-none">ADD</button>
        </div>

        <div class="flex-grow overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-0.5">
          <div 
            v-for="todo in inboxTodos" 
            :key="todo.id"
            class="flex flex-col gap-1.5 bg-base border border-border-dim p-2 relative group"
          >
            <div class="flex justify-between items-start">
              <div @click="toggleTodo(todo)" class="flex items-start gap-2 cursor-pointer select-none pr-5 flex-grow">
                <div 
                  class="w-3.5 h-3.5 border border-neutral-600 flex items-center justify-center mt-0.5 shrink-0"
                  :class="[todo.completed ? 'bg-accent' : 'bg-base']"
                >
                  <span v-if="todo.completed" class="text-[9px] text-neutral-300">✓</span>
                </div>
                <span :class="[todo.completed ? 'line-through text-neutral-500 font-normal' : 'text-neutral-300 font-semibold']" class="text-[11px] leading-tight break-all">
                  {{ todo.text }}
                </span>
              </div>
              <button @click="removeTodo(todo.id)" class="text-accent hover:text-neutral-300 text-[11px] cursor-pointer pl-1 opacity-60 group-hover:opacity-100 transition-none">×</button>
            </div>

            <div class="flex gap-2 justify-end text-[8px] border-t border-border-dim pt-1 mt-1 opacity-70 group-hover:opacity-100 transition-none">
              <span class="text-neutral-600 mr-auto">MOVE_TO:</span>
              <button @click="moveTodo(todo, 'today')" class="hover:text-black text-neutral-500 cursor-pointer transition-none">TODAY →</button>
              <button @click="moveTodo(todo, 'longterm')" class="hover:text-black text-neutral-500 cursor-pointer transition-none">LONGTERM →</button>
            </div>
          </div>
          <div v-if="inboxTodos.length === 0" class="text-center text-[10px] text-neutral-600 py-8">// EMPTY</div>
        </div>
      </div>
    </div>
  </div>
</template>
