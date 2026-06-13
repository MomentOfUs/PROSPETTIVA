<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { triggerCloudPush, isLoggedIn, getToken } from '../../utils/api'
import { t } from '../../i18n'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
}

const sessions = ref<ChatSession[]>([
  {
    id: 'init_chat_sess',
    title: 'INIT_SEED',
    messages: [
      { role: 'assistant', content: t('aichat.system_ready') }
    ]
  }
])
const activeSessionId = ref<string>('init_chat_sess')

const activeSession = computed(() => {
  return sessions.value.find(s => s.id === activeSessionId.value) || sessions.value[0] || {
    id: '',
    title: '',
    messages: []
  }
})

const inputMsg = ref('')
const loading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// Config loaded from LocalStorage
const apiKey = ref('')
const apiBase = ref('https://api.deepseek.com')
const apiModel = ref('deepseek-chat')

const isUserLoggedIn = ref(isLoggedIn())

const chatNodeStatus = computed(() => {
  if (isUserLoggedIn.value) {
    return `NODE: CLOUD_${apiModel.value.toUpperCase()}`
  }
  return apiKey.value ? `NODE: ${apiModel.value}` : 'FREE_MODE'
})

function loadConfig() {
  const storedConfig = localStorage.getItem('manga_config')
  if (storedConfig) {
    try {
      const parsed = JSON.parse(storedConfig)
      apiKey.value = parsed.openaiKey || ''
      apiBase.value = parsed.openaiBase || 'https://api.deepseek.com'
      apiModel.value = parsed.openaiModel || 'deepseek-chat'
    } catch {
      // Keep defaults
    }
  }
}

function loadSessions() {
  const stored = localStorage.getItem('manga_ai_chat_sessions')
  if (stored) {
    try {
      sessions.value = JSON.parse(stored)
    } catch {
      sessions.value = []
    }
  }
  
  if (sessions.value.length === 0) {
    const initId = Date.now().toString()
    sessions.value = [{
      id: initId,
      title: 'INIT_SEED',
      messages: [
        { role: 'assistant', content: t('aichat.system_ready') }
      ]
    }]
  }
  
  if (!activeSessionId.value || !sessions.value.find(s => s.id === activeSessionId.value)) {
    activeSessionId.value = sessions.value[0].id
  }
}

watch(sessions, (newVal) => {
  localStorage.setItem('manga_ai_chat_sessions', JSON.stringify(newVal))
  triggerCloudPush()
}, { deep: true })

onMounted(() => {
  loadConfig()
  loadSessions()
  
  // Listen for config updates
  window.addEventListener('manga-config-updated', loadConfig)
  window.addEventListener('artisan-auth-state-changed', () => {
    isUserLoggedIn.value = isLoggedIn()
  })
})

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

function createNewSession() {
  const newId = Date.now().toString()
  sessions.value.push({
    id: newId,
    title: `THREAD_${sessions.value.length + 1}`,
    messages: [
      { role: 'assistant', content: t('aichat.thread_init') }
    ]
  })
  activeSessionId.value = newId
  scrollToBottom()
}

function deleteSession(id: string) {
  if (sessions.value.length <= 1) {
    alert(t('alert.min_one_chat'))
    return
  }
  if (confirm(t('confirm.destroy'))) {
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0].id
    }
  }
}

async function sendMessage() {
  if (!inputMsg.value.trim() || loading.value) return
  
  const userText = inputMsg.value.trim()
  activeSession.value.messages.push({ role: 'user', content: userText })
  inputMsg.value = ''
  loading.value = true
  scrollToBottom()

  // Update session title dynamically if default
  if (activeSession.value.title.startsWith('THREAD_')) {
    activeSession.value.title = userText.length > 8 ? userText.substring(0, 8) + '...' : userText
  }

  // 1. If user is logged in, use backend proxy EventSource/SSE stream
  if (isUserLoggedIn.value) {
    try {
      const BASE_URL = import.meta.env.DEV ? 'http://localhost:8000' : ''
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          messages: activeSession.value.messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!res.ok) {
        let errText = `ERR_API: ${res.status}`
        try {
          const errData = await res.json()
          if (errData && errData.detail) {
            if (errData.detail === 'AI_KEY_NOT_CONFIGURED') {
              errText = 'ERR_API: Cloud key is not configured. Please set OpenAI Key in settings.'
            } else {
              errText = `ERR_API: ${errData.detail}`
            }
          }
        } catch {}
        throw new Error(errText)
      }

      const reader = res.body?.getReader()
      if (!reader) {
        throw new Error('SSE stream reader not available.')
      }

      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      
      const assistantMessageIndex = activeSession.value.messages.length
      activeSession.value.messages.push({ role: 'assistant', content: '' })

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed === 'data: [DONE]') continue
          
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6)
            try {
              const dataObj = JSON.parse(dataStr)
              if (dataObj.error) {
                activeSession.value.messages[assistantMessageIndex].content += `\n[ERROR: ${dataObj.error}]`
                continue
              }
              const content = dataObj.choices?.[0]?.delta?.content
              if (content) {
                activeSession.value.messages[assistantMessageIndex].content += content
                scrollToBottom()
              }
            } catch (e) {
              // Ignore partial or non-JSON messages
            }
          }
        }
      }
    } catch (err: any) {
      activeSession.value.messages.push({
        role: 'assistant',
        content: err.message || 'unknown API stream error'
      })
      scrollToBottom()
    } finally {
      loading.value = false
    }
    return
  }

  // 2. If user configured custom API Key offline
  if (apiKey.value) {
    try {
      const res = await fetch(`${apiBase.value}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.value}`
        },
        body: JSON.stringify({
          model: apiModel.value,
          messages: activeSession.value.messages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        })
      })
      
      const data = await res.json()
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        activeSession.value.messages.push({
          role: 'assistant',
          content: data.choices[0].message.content
        })
      } else {
        activeSession.value.messages.push({
          role: 'assistant',
          content: `ERR_API: check model [${apiModel.value}] or API key config.`
        })
      }
    } catch (err: any) {
      activeSession.value.messages.push({
        role: 'assistant',
        content: `CONN_FAIL: ${err.message || 'unknown network error'}`
      })
    } finally {
      loading.value = false
      scrollToBottom()
    }
    return
  }

  // 3. Fallback to free public AI API
  try {
    const res = await fetch(`https://api.pearktrue.cn/api/gpt/?message=${encodeURIComponent(userText)}&type=chat`)
    const data = await res.json()
    if (data && data.code === 200 && data.result) {
      activeSession.value.messages.push({ role: 'assistant', content: data.result })
    } else {
      const fallbacks = [
        'FREE_TIER exhausted. Configure your API key in settings for unlimited access.',
        'Rate limit reached on free tier. Set up your own API key for full capacity.',
        'Free channel unavailable. Add your API credentials to unlock unlimited queries.'
      ]
      const randomMsg = fallbacks[Math.floor(Math.random() * fallbacks.length)]
      activeSession.value.messages.push({ role: 'assistant', content: randomMsg })
    }
  } catch {
    activeSession.value.messages.push({ role: 'assistant', content: 'CONN_UNSTABLE: retry or configure your API key in settings.' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1.5 py-3 text-center text-neutral-300 w-full">
    <div class="text-[11px] font-bold text-accent">AI_CHAT</div>
    <div class="text-[9px] text-neutral-500 mt-1 leading-relaxed max-w-[220px]">
      Chat node ready. Click card to open.
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-mono text-neutral-300">
    <!-- Header Controls -->
    <div class="flex items-center justify-end border-b border-line pb-2.5">
      <span class="text-[10px] bg-surface border border-line text-accent px-2.5 py-0.5 font-mono">
        {{ chatNodeStatus }}
      </span>
    </div>

    <!-- Layout -->
    <div class="flex flex-col lg:flex-row gap-5 min-h-[460px]">
      <!-- Left: Sessions -->
      <div class="w-full lg:w-[200px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line pb-3 lg:pb-0 lg:pr-3.5 gap-2">
        <button
          @click="createNewSession"
          class="w-full text-center border border-line text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 py-1.5 text-xs cursor-pointer font-bold transition-none"
        >
          [ + MOUNT ]
        </button>

        <div class="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible max-h-[120px] lg:max-h-[380px] pr-0.5 mt-1">
          <div
            v-for="sess in sessions"
            :key="sess.id"
            @click="activeSessionId = sess.id; scrollToBottom()"
            class="flex items-center justify-between w-[130px] lg:w-full px-2.5 py-1.5 border text-[11px] cursor-pointer transition-none shrink-0"
            :class="[activeSessionId === sess.id ? 'bg-accent/10 border-accent text-accent' : 'border-line text-neutral-500 hover:bg-surface hover:text-neutral-300']"
          >
            <span class="truncate select-none max-w-[95px] lg:max-w-[130px] font-bold">{{ sess.title }}</span>
            <button
              @click.stop="deleteSession(sess.id)"
              class="text-neutral-500 hover:text-accent text-[9px] cursor-pointer pl-1 bg-transparent border-0 outline-none font-bold"
              title="[ DESTROY ]"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Chat -->
      <div class="flex-grow flex flex-col gap-3">
        <div
          ref="chatContainer"
          class="bg-base border border-line p-3 h-[380px] lg:h-[420px] overflow-y-auto flex flex-col gap-3 font-mono"
        >
          <div
            v-for="(msg, idx) in activeSession.messages"
            :key="idx"
            class="flex flex-col text-xs md:text-sm mb-1"
          >
            <span
              class="font-semibold mb-1 select-none font-mono tracking-widest text-[9px] md:text-xs"
              :class="[msg.role === 'user' ? 'text-dim' : 'text-accent']"
            >
              {{ msg.role === 'user' ? '> QUERY' : '> RESPONSE' }}
            </span>
            <div
              class="p-3 whitespace-pre-wrap select-text leading-relaxed text-neutral-300 max-w-[85%] sm:max-w-[80%] border border-line"
              :class="[
                msg.role === 'user'
                  ? 'bg-surface self-end'
                  : 'bg-chat-ai self-start'
              ]"
            >
              {{ msg.content }}
            </div>
          </div>
          <div v-if="loading" class="text-xs text-accent font-mono py-1 cursor-blink-accent">
            AWAITING_RESPONSE...
          </div>
        </div>

        <!-- Input -->
        <div class="flex border border-line bg-base overflow-hidden text-xs md:text-sm">
          <input
            v-model="inputMsg"
            type="text"
            @keydown.enter="sendMessage"
            placeholder="QUERY_STRING..."
            class="w-full px-3 py-2.5 outline-none text-neutral-300 bg-transparent placeholder-neutral-600 font-mono"
          />
          <button
            @click="sendMessage"
            class="bg-btn-base border-l border-line text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 px-5 font-bold flex items-center justify-center cursor-pointer transition-none font-mono"
          >
            EXEC
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
