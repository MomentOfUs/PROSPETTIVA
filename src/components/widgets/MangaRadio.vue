<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { t, registerTranslations } from '../../i18n'
import { Play, Square, Volume2, VolumeX, Sliders, Radio } from '@lucide/vue'

// 注册小工具翻译文案
registerTranslations({
  'radio.title': '8-BIT 模拟电台',
  'radio.desc': 'Web Audio 实时合成白噪声与 8-bit 背景音效',
  'radio.status.active': 'STATUS: BROADCASTING',
  'radio.status.inactive': 'STATUS: MUTED',
  'radio.volume.master': '总音量 MASTER_VOL',
  'radio.volume.rain': '雨声 RAIN_NOISE',
  'radio.volume.melody': '和弦 RETRO_MELODY',
  'radio.volume.crackle': '篝火 CAMPFIRE_CRACKLE',
  'radio.volume.hum': '电磁 CRT_HUM',
  'radio.preset': '预设 PRESETS',
  'radio.preset.focus': '深度专注 FOCUS',
  'radio.preset.rain': '雨夜霓虹 CYBER_RAIN',
  'radio.preset.camp': '林间篝火 COZY_CAMP',
  'radio.play': '[ START ]',
  'radio.stop': '[ SHUTDOWN ]'
}, {
  'radio.title': '8-BIT RADIO',
  'radio.desc': 'Web Audio retro soundscapes and white noise synthesizer',
  'radio.status.active': 'STATUS: BROADCASTING',
  'radio.status.inactive': 'STATUS: MUTED',
  'radio.volume.master': 'MASTER_VOL',
  'radio.volume.rain': 'RAIN_NOISE',
  'radio.volume.melody': 'RETRO_MELODY',
  'radio.volume.crackle': 'CAMPFIRE_CRACKLE',
  'radio.volume.hum': 'CRT_HUM',
  'radio.preset': 'PRESETS',
  'radio.preset.focus': 'DEEP_FOCUS',
  'radio.preset.rain': 'CYBER_RAIN',
  'radio.preset.camp': 'COZY_CAMP',
  'radio.play': '[ START ]',
  'radio.stop': '[ SHUTDOWN ]'
})

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const isPlaying = ref(false)
const masterVolume = ref(0.4)
const channelVolumes = ref({
  rain: 0.3,
  melody: 0.3,
  crackle: 0.1,
  hum: 0.2
})

// Web Audio API 节点
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let analyser: AnalyserNode | null = null

// 音源节点
let rainSource: AudioBufferSourceNode | null = null
let rainGain: GainNode | null = null

let crackleSource: AudioBufferSourceNode | null = null
let crackleGain: GainNode | null = null

let humOsc: OscillatorNode | null = null
let humSubOsc: OscillatorNode | null = null
let humGain: GainNode | null = null

let melodyGain: GainNode | null = null

// 琶音调度
let melodyInterval: any = null
let melodyStep = 0
let currentChord = 0

// 怀旧小调和弦进行 (四小节，每小节 8 个 16 分音符，单位: Hz)
const CHORDS = [
  // Am: A3 -> C4 -> E4 -> A4 -> E4 -> C4 -> A3 -> C4
  [220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 261.63],
  // Fmaj7: F3 -> A3 -> C4 -> E4 -> C4 -> A3 -> F3 -> A3
  [174.61, 220.00, 261.63, 329.63, 261.63, 220.00, 174.61, 220.00],
  // C: C3 -> E3 -> G3 -> C4 -> G3 -> E3 -> C3 -> E3
  [130.81, 164.81, 196.00, 261.63, 196.00, 164.81, 130.81, 164.81],
  // G: G3 -> B3 -> D4 -> G4 -> D4 -> B3 -> G3 -> B3
  [196.00, 246.94, 293.66, 392.00, 293.66, 246.94, 196.00, 246.94]
]

// Canvas 渲染
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

function initAudio() {
  if (audioCtx) return

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  audioCtx = new AudioContextClass()

  masterGain = audioCtx.createGain()
  masterGain.gain.setValueAtTime(masterVolume.value, audioCtx.currentTime)

  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 64 // 低分辨率的频域条，符合 8-bit 的 block 视觉

  masterGain.connect(analyser)
  analyser.connect(audioCtx.destination)

  // 1. 初始化雨声低通白噪声
  createRainNode()

  // 2. 初始化篝火噼啪爆裂声
  createCrackleNode()

  // 3. 初始化 CRT 嗡嗡交流电声
  createHumNode()

  // 4. 初始化琶音旋律 Gain 节点
  melodyGain = audioCtx.createGain()
  melodyGain.gain.setValueAtTime(1.0, audioCtx.currentTime)
  melodyGain.connect(masterGain)
}

function createRainNode() {
  if (!audioCtx || !masterGain) return
  const sampleRate = audioCtx.sampleRate
  const bufferSize = sampleRate * 2 // 2 秒白噪音 Buffer 循环
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  rainSource = audioCtx.createBufferSource()
  rainSource.buffer = buffer
  rainSource.loop = true

  // 用 lowpass 过滤高频，听起来像闷雨声
  const lpFilter = audioCtx.createBiquadFilter()
  lpFilter.type = 'lowpass'
  lpFilter.frequency.value = 550
  lpFilter.Q.value = 0.8

  // 用 highpass 过滤低频地鸣，使声音干净
  const hpFilter = audioCtx.createBiquadFilter()
  hpFilter.type = 'highpass'
  hpFilter.frequency.value = 160

  rainGain = audioCtx.createGain()
  rainGain.gain.value = channelVolumes.value.rain

  rainSource.connect(lpFilter)
  lpFilter.connect(hpFilter)
  hpFilter.connect(rainGain)
  rainGain.connect(masterGain)
}

function createCrackleNode() {
  if (!audioCtx || !masterGain) return
  const sampleRate = audioCtx.sampleRate
  const bufferSize = sampleRate * 1.5 // 1.5 秒
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    // 极小概率写入瞬态脉冲火花或唱片底噪，其余置为 0
    data[i] = Math.random() > 0.9982 ? (Math.random() * 2 - 1) * 0.75 : 0
  }

  crackleSource = audioCtx.createBufferSource()
  crackleSource.buffer = buffer
  crackleSource.loop = true

  // 带通滤波让爆裂音保持在清脆的中高频
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2800
  filter.Q.value = 2.5

  crackleGain = audioCtx.createGain()
  crackleGain.gain.value = channelVolumes.value.crackle

  crackleSource.connect(filter)
  filter.connect(crackleGain)
  crackleGain.connect(masterGain)
}

function createHumNode() {
  if (!audioCtx || !masterGain) return
  // 60Hz 交流基波
  humOsc = audioCtx.createOscillator()
  humOsc.type = 'sine'
  humOsc.frequency.value = 60

  // 180Hz 奇次谐波，增强电磁嗡嗡质感
  humSubOsc = audioCtx.createOscillator()
  humSubOsc.type = 'triangle'
  humSubOsc.frequency.value = 180

  const subGain = audioCtx.createGain()
  subGain.gain.value = 0.15

  humGain = audioCtx.createGain()
  humGain.gain.value = channelVolumes.value.hum

  humOsc.connect(humGain)
  humSubOsc.connect(subGain)
  subGain.connect(humGain)
  humGain.connect(masterGain)
}

function triggerMelodyStep() {
  if (!audioCtx || !melodyGain || !isPlaying.value) return

  const chord = CHORDS[currentChord]
  const freq = chord[melodyStep]

  const osc = audioCtx.createOscillator()
  // 三角波比方波温和，非常适合做铺底音景
  osc.type = 'triangle'
  osc.frequency.value = freq

  const noteGain = audioCtx.createGain()
  osc.connect(noteGain)
  noteGain.connect(melodyGain)

  const now = audioCtx.currentTime
  // 8-bit 弹拨包络 ADSR
  noteGain.gain.setValueAtTime(0, now)
  noteGain.gain.linearRampToValueAtTime(channelVolumes.value.melody, now + 0.04)
  noteGain.gain.setValueAtTime(channelVolumes.value.melody, now + 0.22)
  noteGain.gain.linearRampToValueAtTime(0, now + 0.28)

  osc.start(now)
  osc.stop(now + 0.3)

  melodyStep = (melodyStep + 1) % 8
  if (melodyStep === 0) {
    currentChord = (currentChord + 1) % CHORDS.length
  }
}

function startMelodyScheduler() {
  melodyStep = 0
  currentChord = 0
  // 每 300ms 触发一次琶音音轨步进
  melodyInterval = setInterval(triggerMelodyStep, 300)
}

function startVisualizer() {
  if (!canvasRef.value || !analyser) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  const draw = () => {
    if (!isPlaying.value) return
    animationFrameId = requestAnimationFrame(draw)

    analyser!.getByteFrequencyData(dataArray)

    // 清空背景为黑色
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const totalBars = 16
    const barWidth = Math.floor(canvas.width / totalBars) - 2
    const gap = 2

    for (let i = 0; i < totalBars; i++) {
      // 截取中低频的有用分量展示
      const val = dataArray[i + 2] || 0
      const percent = val / 255
      const height = percent * (canvas.height - 4)

      // 8-bit Block 段落渲染
      const blockHeight = 3
      const blockGap = 1
      const totalBlocks = Math.floor(height / (blockHeight + blockGap))

      for (let b = 0; b < totalBlocks; b++) {
        // 高频采用橙色，低频采用白色
        if (b > 11) {
          ctx.fillStyle = '#FF5F1F' // Accent: 橙色
        } else {
          ctx.fillStyle = '#FFFFFF' // Primary: 白色
        }

        const x = i * (barWidth + gap) + 1
        const y = canvas.height - (b * (blockHeight + blockGap)) - blockHeight
        ctx.fillRect(x, y, barWidth, blockHeight)
      }
    }
  }

  draw()
}

function start() {
  if (isPlaying.value) return
  isPlaying.value = true

  try {
    initAudio()

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    // 播放所有基础环境流
    if (rainSource) rainSource.start(0)
    if (crackleSource) crackleSource.start(0)
    if (humOsc) humOsc.start(0)
    if (humSubOsc) humSubOsc.start(0)

    startMelodyScheduler()
    startVisualizer()
  } catch (err) {
    console.error('[CHIP_TUNE] initialization failed:', err)
    isPlaying.value = false
  }
}

function stop() {
  if (!isPlaying.value) return
  isPlaying.value = false

  if (melodyInterval) {
    clearInterval(melodyInterval)
    melodyInterval = null
  }

  try {
    if (rainSource) { rainSource.stop(); rainSource = null }
    if (crackleSource) { crackleSource.stop(); crackleSource = null }
    if (humOsc) { humOsc.stop(); humOsc = null }
    if (humSubOsc) { humSubOsc.stop(); humSubOsc = null }
  } catch (e) {
    // 忽略未运行停止抛错
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (audioCtx) {
    audioCtx.close().then(() => {
      audioCtx = null
      masterGain = null
      analyser = null
      rainGain = null
      crackleGain = null
      humGain = null
      melodyGain = null
    })
  }
}

function togglePlay() {
  if (isPlaying.value) {
    stop()
  } else {
    start()
  }
}

function applyPreset(type: 'focus' | 'rain' | 'camp') {
  if (type === 'focus') {
    channelVolumes.value.rain = 0.05
    channelVolumes.value.melody = 0.25
    channelVolumes.value.crackle = 0.0
    channelVolumes.value.hum = 0.55
  } else if (type === 'rain') {
    channelVolumes.value.rain = 0.65
    channelVolumes.value.melody = 0.10
    channelVolumes.value.crackle = 0.0
    channelVolumes.value.hum = 0.30
  } else if (type === 'camp') {
    channelVolumes.value.rain = 0.15
    channelVolumes.value.melody = 0.35
    channelVolumes.value.crackle = 0.60
    channelVolumes.value.hum = 0.0
  }

  // 立即刷新节点增益
  if (audioCtx) {
    const now = audioCtx.currentTime
    if (rainGain) rainGain.gain.setValueAtTime(channelVolumes.value.rain, now)
    if (crackleGain) crackleGain.gain.setValueAtTime(channelVolumes.value.crackle, now)
    if (humGain) humGain.gain.setValueAtTime(channelVolumes.value.hum, now)
  }
}

// 监听滑块值的改变
watch(masterVolume, (newVal) => {
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(newVal, audioCtx.currentTime)
  }
})

watch(() => channelVolumes.value.rain, (newVal) => {
  if (rainGain && audioCtx) {
    rainGain.gain.setValueAtTime(newVal, audioCtx.currentTime)
  }
})

watch(() => channelVolumes.value.crackle, (newVal) => {
  if (crackleGain && audioCtx) {
    crackleGain.gain.setValueAtTime(newVal, audioCtx.currentTime)
  }
})

watch(() => channelVolumes.value.hum, (newVal) => {
  if (humGain && audioCtx) {
    humGain.gain.setValueAtTime(newVal, audioCtx.currentTime)
  }
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <!-- 1. 悬停气泡预览模式 (preview === true) -->
  <div v-if="preview" class="flex items-center gap-3 w-full font-mono text-[10px]">
    <button 
      @click.stop="togglePlay"
      class="border border-line bg-btn-base p-1 text-accent hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none flex items-center justify-center shrink-0 cursor-pointer"
    >
      <Play v-if="!isPlaying" class="w-3.5 h-3.5" />
      <Square v-else class="w-3.5 h-3.5 fill-current" />
    </button>
    <div class="flex-grow flex flex-col justify-center truncate text-left">
      <span class="font-bold text-neutral-300">CHIP_TUNE RADIO</span>
      <span class="text-neutral-500 text-[8px] truncate">
        {{ isPlaying ? 'STATUS: BROADCASTING...' : 'STATUS: MUTED' }}
      </span>
    </div>
  </div>

  <!-- 2. 面板卡片主体模式 (preview === false) -->
  <div v-else class="w-full flex flex-col gap-3.5 select-none font-mono">
    <!-- Equalizer Canvas -->
    <div class="relative bg-base border border-line p-1">
      <canvas 
        ref="canvasRef" 
        width="280" 
        height="50" 
        class="w-full h-[50px] bg-black block"
      ></canvas>
      <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center bg-black/70 text-neutral-600 text-[10px] tracking-widest">
        // SIGNAL_MUTED //
      </div>
    </div>

    <!-- Controls Row -->
    <div class="flex gap-2.5 items-center justify-between">
      <button 
        @click="togglePlay"
        class="flex-grow border border-line bg-btn-base py-1.5 px-4 text-xs font-bold text-secondary hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none cursor-pointer glitch-on-click"
      >
        <span v-if="!isPlaying" class="text-accent">{{ t('radio.play') }}</span>
        <span v-else class="text-neutral-400">{{ t('radio.stop') }}</span>
      </button>

      <div class="flex items-center gap-1 border border-line bg-base px-2.5 py-1 text-[10px]">
        <Volume2 class="w-3 h-3 text-neutral-500" />
        <input 
          v-model.number="masterVolume"
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          class="w-14 accent-accent cursor-pointer"
        />
      </div>
    </div>

    <!-- Presets -->
    <div class="border border-line bg-base/50 p-2 flex flex-col gap-1.5">
      <span class="text-[9px] text-dim uppercase tracking-wider">{{ t('radio.preset') }}</span>
      <div class="grid grid-cols-3 gap-1">
        <button 
          @click="applyPreset('focus')"
          class="border border-line bg-btn-base py-1 text-[9px] text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none cursor-pointer"
        >
          {{ t('radio.preset.focus') }}
        </button>
        <button 
          @click="applyPreset('rain')"
          class="border border-line bg-btn-base py-1 text-[9px] text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none cursor-pointer"
        >
          {{ t('radio.preset.rain') }}
        </button>
        <button 
          @click="applyPreset('camp')"
          class="border border-line bg-btn-base py-1 text-[9px] text-neutral-400 hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none cursor-pointer"
        >
          {{ t('radio.preset.camp') }}
        </button>
      </div>
    </div>

    <!-- Channel Vol Faders -->
    <div class="border border-line bg-base/50 p-2 flex flex-col gap-2.5">
      <span class="text-[9px] text-dim uppercase tracking-wider flex items-center gap-1">
        <Sliders class="w-3 h-3" />
        CHANNEL_MIXER
      </span>

      <div class="flex flex-col gap-2 font-mono text-[10px]">
        <!-- 1. RAIN -->
        <div class="flex items-center justify-between gap-3">
          <span class="text-neutral-500 w-16 text-left text-[9px]">RAIN_NOISE</span>
          <input 
            v-model.number="channelVolumes.rain"
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            class="flex-grow accent-accent cursor-pointer h-1"
          />
          <span class="text-neutral-400 text-right w-6">{{ Math.round(channelVolumes.rain * 100) }}</span>
        </div>

        <!-- 2. MELODY -->
        <div class="flex items-center justify-between gap-3">
          <span class="text-neutral-500 w-16 text-left text-[9px]">8BIT_MELODY</span>
          <input 
            v-model.number="channelVolumes.melody"
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            class="flex-grow accent-accent cursor-pointer h-1"
          />
          <span class="text-neutral-400 text-right w-6">{{ Math.round(channelVolumes.melody * 100) }}</span>
        </div>

        <!-- 3. CRACKLE -->
        <div class="flex items-center justify-between gap-3">
          <span class="text-neutral-500 w-16 text-left text-[9px]">FIRE_SPARKS</span>
          <input 
            v-model.number="channelVolumes.crackle"
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            class="flex-grow accent-accent cursor-pointer h-1"
          />
          <span class="text-neutral-400 text-right w-6">{{ Math.round(channelVolumes.crackle * 100) }}</span>
        </div>

        <!-- 4. HUM -->
        <div class="flex items-center justify-between gap-3">
          <span class="text-neutral-500 w-16 text-left text-[9px]">CRT_HUM</span>
          <input 
            v-model.number="channelVolumes.hum"
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            class="flex-grow accent-accent cursor-pointer h-1"
          />
          <span class="text-neutral-400 text-right w-6">{{ Math.round(channelVolumes.hum * 100) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 强制滑块变成粗实线的极简样式，以契合 Neo-Brutalist 风格 */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-line);
  height: 4px;
  border-radius: 0px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 8px;
  height: 12px;
  background: var(--color-primary);
  border: 1px solid var(--color-base);
  border-radius: 0px;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: var(--color-accent);
}

input[type="range"]::-moz-range-thumb {
  width: 8px;
  height: 12px;
  background: var(--color-primary);
  border: 1px solid var(--color-base);
  border-radius: 0px;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  background: var(--color-accent);
}
</style>
