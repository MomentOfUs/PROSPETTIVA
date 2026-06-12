<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { triggerCloudPush } from '../../utils/api'

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
    title: '探求万物之始',
    messages: [
      { role: 'assistant', content: '您好，远方的学者。我是这里存留的学术精魂。若您想探求世间万物的秩序，可在右上角【系统配置】中填入您的 DeepSeek/OpenAI 密钥，以开启真正的全知之眼。' }
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
      title: '探求万物之始',
      messages: [
        { role: 'assistant', content: '您好，远方的学者。我是这里存留的学术精魂。若您想探求世间万物的秩序，可在右上角【系统配置】中填入您的 DeepSeek/OpenAI 密钥，以开启真正的全知之眼。' }
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
    title: `思辨探讨 #${sessions.value.length + 1}`,
    messages: [
      { role: 'assistant', content: '新会话已开启。请向贤者提问任何关于天体、算法或哲理的困惑。' }
    ]
  })
  activeSessionId.value = newId
  scrollToBottom()
}

function deleteSession(id: string) {
  if (sessions.value.length <= 1) {
    alert('[ERROR] MIN_ONE_CHAT_REQUIRED')
    return
  }
  if (confirm('[ DESTROY ] ?')) {
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
  if (activeSession.value.title.startsWith('思辨探讨 #')) {
    activeSession.value.title = userText.length > 8 ? userText.substring(0, 8) + '...' : userText
  }

  // 1. If user configured custom API Key
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
          content: `错误: 接口返回异常。请检查模型名称 [${apiModel.value}] 或密钥配置。`
        })
      }
    } catch (err: any) {
      activeSession.value.messages.push({
        role: 'assistant',
        content: `连接失败: ${err.message || '未知网络偏差'}`
      })
    } finally {
      loading.value = false
      scrollToBottom()
    }
    return
  }

  // 2. Fallback to free public AI API
  try {
    const res = await fetch(`https://api.pearktrue.cn/api/gpt/?message=${encodeURIComponent(userText)}&type=chat`)
    const data = await res.json()
    if (data && data.code === 200 && data.result) {
      activeSession.value.messages.push({ role: 'assistant', content: data.result })
    } else {
      const fallbacks = [
        '求知之路无穷，但当前免费通道已被迷雾笼罩。请在系统配置里填入您的 API 密钥以唤醒真正的哲人。',
        '您的学识令人敬佩。若能插上专属的 API 密钥之翼，我将能为您提供更深刻 of 洞察。',
        '大自然以数学的语言写就。请在后台完善您的 API Key 配置，以便我们深入探索其中的奥秘。'
      ]
      const randomMsg = fallbacks[Math.floor(Math.random() * fallbacks.length)]
      activeSession.value.messages.push({ role: 'assistant', content: randomMsg })
    }
  } catch {
    activeSession.value.messages.push({ role: 'assistant', content: '连接有些波动，请稍后再试，或在配置中录入您的专属 API 密钥。' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1.5 font-mono py-3 text-center text-neutral-500 w-full">
    <div class="text-[11px] font-bold text-gold">哲人思辨录</div>
    <div class="text-[9px] opacity-75 mt-1 leading-relaxed max-w-[220px]">
      💬 哲人对话姬已就绪，点击网格卡片即可开启网页检索与智能思辨。
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold select-none font-mono text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-500">[ CHAT ]</span>
      <span class="text-[10px] bg-base border border-line text-accent px-2.5 py-0.5 rounded font-mono">
        {{ apiKey ? `DeepSeek: ${apiModel}` : '免费思辨路线' }}
      </span>
    </div>

    <!-- Layout: Session sidebar + Chat workspace -->
    <div class="flex flex-col lg:flex-row gap-5 min-h-[460px]">
      <!-- Left sidebar: Session lists -->
      <div class="w-full lg:w-[200px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[#d4af37]/20 pb-3 lg:pb-0 lg:pr-3.5 gap-2">
        <button 
          @click="createNewSession"
          class="w-full text-center border border-[#d4af37]/45 text-accent hover:bg-[#d4af37]/10 py-1.5 rounded text-xs cursor-pointer font-bold transition-all"
        >
          ➕ 开启新论题
        </button>

        <div class="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible max-h-[120px] lg:max-h-[380px] pr-0.5 mt-1">
          <div 
            v-for="sess in sessions"
            :key="sess.id"
            @click="activeSessionId = sess.id; scrollToBottom()"
            class="flex items-center justify-between w-[130px] lg:w-full px-2.5 py-1.8 rounded border text-[11px] cursor-pointer transition-all shrink-0"
            :class="[activeSessionId === sess.id ? 'bg-[#6e5020]/45 border-[#d4af37] text-gold' : 'border-[#d4af37]/15 text-neutral-500/50 hover:bg-[#1a1613] hover:text-neutral-500']"
          >
            <span class="truncate select-none max-w-[95px] lg:max-w-[130px] font-bold">{{ sess.title }}</span>
            <button 
              @click.stop="deleteSession(sess.id)"
              class="text-neutral-500/40 hover:text-status-bad text-[9px] cursor-pointer pl-1 bg-transparent border-0 outline-none"
              title="抹去探讨"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Right Chat workspace -->
      <div class="flex-grow flex flex-col gap-3">
        <!-- Chat log container -->
        <div 
          ref="chatContainer"
          class="bg-base border border-[#d4af37]/25 p-3 rounded h-[380px] lg:h-[420px] overflow-y-auto flex flex-col gap-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] font-mono"
        >
          <div 
            v-for="(msg, idx) in activeSession.messages" 
            :key="idx"
            class="flex flex-col text-xs md:text-sm mb-1"
          >
            <span 
              class="font-semibold mb-1 select-none font-mono tracking-widest text-[9px] md:text-xs"
              :class="[msg.role === 'user' ? 'text-accent/75 text-right' : 'text-neutral-500/60']"
            >
              {{ msg.role === 'user' ? '// 探讨提出者 Q.' : '// 贤者释义 A.' }}
            </span>
            <div 
              class="p-3 rounded-lg border border-[#d4af37]/15 whitespace-pre-wrap select-text leading-relaxed text-[#f5f2eb] max-w-[85%] sm:max-w-[80%]"
              :class="[
                msg.role === 'user' 
                  ? 'bg-chat-user self-end rounded-tr-none border-line' 
                  : 'bg-chat-ai self-start rounded-tl-none border-gold/10'
              ]"
            >
              {{ msg.content }}
            </div>
          </div>
          <div v-if="loading" class="text-xs text-accent/60 animate-pulse font-mono italic py-1">
            贤者正在计算万物的秩序...
          </div>
        </div>

        <!-- Input group -->
        <div class="flex border border-[#d4af37]/45 rounded bg-base overflow-hidden text-xs md:text-sm">
          <input 
            v-model="inputMsg" 
            type="text" 
            @keydown.enter="sendMessage"
            placeholder="与贤者思辨天理..." 
            class="w-full px-3 py-2.5 outline-none text-[#f5f2eb] bg-transparent placeholder-placeholder font-mono"
          />
          <button 
            @click="sendMessage"
            class="bg-btn-base border-l border-[#d4af37]/45 text-neutral-500 hover:text-accent hover:bg-btn-hover px-5 font-bold flex items-center justify-center cursor-pointer transition-colors font-mono"
          >
            思辨
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
