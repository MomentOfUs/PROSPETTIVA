<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import MangaCard from '../MangaCard.vue'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('aichat')

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([])
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

onMounted(() => {
  loadConfig()
  messages.value = [
    { role: 'assistant', content: '您好，远方的学者。我是这里存留的学术精魂。若您想探求世间万物的秩序，可在右上角【系统配置】中填入您的 DeepSeek/OpenAI 密钥，以开启真正的全知之眼。' }
  ]
  
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

async function sendMessage() {
  if (!inputMsg.value.trim() || loading.value) return
  
  const userText = inputMsg.value.trim()
  messages.value.push({ role: 'user', content: userText })
  inputMsg.value = ''
  loading.value = true
  scrollToBottom()

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
          messages: messages.value.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        })
      })
      
      const data = await res.json()
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        messages.value.push({
          role: 'assistant',
          content: data.choices[0].message.content
        })
      } else {
        messages.value.push({
          role: 'assistant',
          content: `错误: 接口返回异常。请检查模型名称 [${apiModel.value}] 或 API Key 是否有效。`
        })
      }
    } catch (err: any) {
      messages.value.push({
        role: 'assistant',
        content: `连接失败: ${err.message || '未知错误'}`
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
      messages.value.push({ role: 'assistant', content: data.result })
    } else {
      const fallbacks = [
        '求知之路无穷，但当前免费通道已被迷雾笼罩。请在系统配置里填入您的 API 密钥以唤醒真正的哲人。',
        '您的学识令人敬佩。若能插上专属的 API 密钥之翼，我将能为您提供更深刻的洞察。',
        '大自然以数学的语言写就。请在后台完善您的 API Key 配置，以便我们深入探索其中的奥秘。'
      ]
      const randomMsg = fallbacks[Math.floor(Math.random() * fallbacks.length)]
      messages.value.push({ role: 'assistant', content: randomMsg })
    }
  } catch {
    messages.value.push({ role: 'assistant', content: '连接有些波动，请稍后再试，或在后台配置您的专属 API 密钥。' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<template>
  <MangaCard class="w-full max-w-[280px] flex flex-col gap-2 font-bold select-none" :hover-shift="true">
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest flex justify-between items-center font-serif text-[#ebdcb9]">
      <span>🖋️ 哲人思辨录</span>
      <div class="flex items-center gap-1">
        <span class="text-[9px] bg-[#120e0c] border border-[#d4af37]/30 text-[#d4af37]/80 px-1.5 py-0.2 rounded font-serif">
          {{ apiKey ? 'DEEPSEEK' : '免费路线' }}
        </span>
        <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-0.5" :title="collapsed ? '展开' : '收起'">
          <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
        </button>
      </div>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed" class="flex flex-col gap-2">

    <!-- Chat log container -->
    <div 
      ref="chatContainer"
      class="bg-[#120e0c] border border-[#d4af37]/25 p-2 rounded h-[130px] overflow-y-auto flex flex-col gap-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] font-serif"
    >
      <div 
        v-for="(msg, idx) in messages" 
        :key="idx"
        class="flex flex-col text-[11px] mb-1"
      >
        <span 
          class="font-semibold mb-0.5 select-none font-serif tracking-widest text-[9px]"
          :class="[msg.role === 'user' ? 'text-[#d4af37]/75 text-right' : 'text-[#ebdcb9]/60']"
        >
          {{ msg.role === 'user' ? '// Q.' : '// A.' }}
        </span>
        <div 
          class="p-2 rounded border border-[#d4af37]/15 whitespace-pre-wrap select-text leading-relaxed text-[#f5f2eb] max-w-[90%]"
          :class="[
            msg.role === 'user' 
              ? 'bg-chat-user self-end rounded-tr-none' 
              : 'bg-chat-ai self-start rounded-tl-none'
          ]"
        >
          {{ msg.content }}
        </div>
      </div>
      <div v-if="loading" class="text-[9px] text-[#d4af37]/60 animate-pulse font-serif italic">
        贤者正在沉思天机...
      </div>
    </div>

    <!-- Input group -->
    <div class="flex border border-[#d4af37]/45 rounded bg-[#120e0c] overflow-hidden text-xs">
      <input 
        v-model="inputMsg" 
        type="text" 
        @keydown.enter="sendMessage"
        placeholder="探讨真理..." 
        class="w-full px-2 py-1 outline-none text-[#f5f2eb] bg-transparent placeholder-placeholder font-serif"
      />
      <button 
        @click="sendMessage"
        class="bg-btn-base border-l border-[#d4af37]/45 text-[#ebdcb9] hover:text-[#d4af37] hover:bg-btn-hover px-3 font-bold flex items-center justify-center cursor-pointer transition-colors font-serif"
      >
        探讨
      </button>
    </div>
    </div>
    </Transition>
  </MangaCard>
</template>
