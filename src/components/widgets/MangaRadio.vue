<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { t, registerTranslations } from '../../i18n'
import { Play, Square, Volume2, VolumeX, Sliders, Radio, Music } from '@lucide/vue'
import MangaModal from '../MangaModal.vue'

// 注册国际化文案
registerTranslations({
  'radio.title': 'RETRO RECEIVER // 复古收音机',
  'radio.desc': '手绘漫画风拟物电台，支持多风格合成与电磁搜台声',
  'radio.status.active': 'STATUS: BROADCASTING',
  'radio.status.inactive': 'STATUS: MUTED',
  'radio.volume.master': '总音量 MASTER_VOL',
  'radio.preset': '预设 PRESETS',
  'radio.play': '[ 开启电源 ]',
  'radio.stop': '[ 切断广播 ]',
  'radio.console.open': '[ 调频控制面板 ]',
  'radio.station': '当前波段 STATION',
  'radio.static': '电磁搜台声...',
  'radio.tuning': '调谐旋钮 TUNING',
  'radio.mhz': '兆赫 MHz'
}, {
  'radio.title': 'RETRO RECEIVER // CONSOLE',
  'radio.desc': 'Skeuomorphic radio with simulated tuning noise and rich soundscapes',
  'radio.status.active': 'STATUS: BROADCASTING',
  'radio.status.inactive': 'STATUS: MUTED',
  'radio.volume.master': 'MASTER_VOL',
  'radio.preset': 'PRESETS',
  'radio.play': '[ START ]',
  'radio.stop': '[ SHUTDOWN ]',
  'radio.console.open': '[ OPEN RECEIVER CONSOLE ]',
  'radio.station': 'CURRENT STATION',
  'radio.static': 'Tuning Static...',
  'radio.tuning': 'TUNING KNOB',
  'radio.mhz': 'MHz'
})

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

// 控制台 Modal 显隐
const showConsoleModal = ref(false)

// 5 种不同风格的电台定义
interface Station {
  id: string
  name: string
  fm: string
  descZh: string
  descEn: string
  chans: {
    rain: number
    melody: number
    crackle: number
    hum: number
  }
  chords: number[][]
  tempo: number // 音符步进时间 (ms)
  oscType: 'triangle' | 'square'
}

const STATIONS: Station[] = [
  {
    id: 'focus',
    name: 'DEEP_FOCUS',
    fm: '91.2',
    descZh: '深度沉浸学习流，低沉硬件嗡嗡电磁声',
    descEn: 'Deep cognitive flow with heavy electromagnetic hum',
    chans: { rain: 0.05, melody: 0.25, crackle: 0.00, hum: 0.60 },
    chords: [
      [220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 261.63], // Am
      [174.61, 220.00, 261.63, 329.63, 261.63, 220.00, 174.61, 220.00]  // Fmaj7
    ],
    tempo: 380,
    oscType: 'triangle'
  },
  {
    id: 'rain',
    name: 'TOKYO_RAIN',
    fm: '96.5',
    descZh: '涩谷雨夜，重低音雨声配以温柔爵士七和弦',
    descEn: 'Neon rainy nights in Tokyo with soft jazz progression',
    chans: { rain: 0.80, melody: 0.22, crackle: 0.00, hum: 0.20 },
    chords: [
      [261.63, 329.63, 392.00, 493.88, 392.00, 329.63, 261.63, 329.63], // Cmaj7
      [220.00, 261.63, 329.63, 392.00, 329.63, 261.63, 220.00, 261.63], // Am7
      [293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 293.66, 349.23]  // Dm7
    ],
    tempo: 320,
    oscType: 'triangle'
  },
  {
    id: 'camp',
    name: 'COZY_CAMP',
    fm: '101.3',
    descZh: '林间野营篝火，清脆的木柴爆裂声与舒缓大调',
    descEn: 'Forest campfire soundscape with warm acoustic major chords',
    chans: { rain: 0.15, melody: 0.35, crackle: 0.75, hum: 0.00 },
    chords: [
      [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 329.63], // C
      [196.00, 246.94, 293.66, 392.00, 293.66, 246.94, 196.00, 246.94], // G
      [220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00, 261.63]  // Am
    ],
    tempo: 360,
    oscType: 'triangle'
  },
  {
    id: 'arcade',
    name: 'CHIP_DUNGEON',
    fm: '104.8',
    descZh: '红白机像素地城，欢快紧凑的方波琶音',
    descEn: '8-Bit retro gaming dungeon with fast square wave arpeggios',
    chans: { rain: 0.00, melody: 0.40, crackle: 0.15, hum: 0.10 },
    chords: [
      [164.81, 196.00, 246.94, 329.63, 392.00, 329.63, 246.94, 196.00], // Em
      [130.81, 164.81, 196.00, 261.63, 329.63, 261.63, 196.00, 164.81], // C
      [146.83, 185.00, 220.00, 293.66, 369.99, 293.66, 220.00, 185.00]  // D
    ],
    tempo: 190,
    oscType: 'square'
  },
  {
    id: 'cafe',
    name: 'LOFI_JAZZ',
    fm: '107.2',
    descZh: '午后爵士咖啡馆，伴有杯具敲击的慵懒 Lo-Fi 调',
    descEn: 'Cozy afternoon cafe with lazy jazz swing & cup clinks',
    chans: { rain: 0.10, melody: 0.30, crackle: 0.55, hum: 0.05 },
    chords: [
      [349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 349.23, 440.00], // Fmaj7
      [329.63, 392.00, 493.88, 587.33, 493.88, 392.00, 329.63, 392.00], // Em7
      [440.00, 554.37, 659.25, 783.99, 659.25, 554.37, 440.00, 554.37]  // A7
    ],
    tempo: 420,
    oscType: 'triangle'
  }
]

const currentStationIdx = ref(1) // 默认 Tokyo Rain
const currentStation = computed(() => STATIONS[currentStationIdx.value])

// 指针位置过渡 (10% - 90%)
const pointerLeftPercent = computed(() => {
  return 10 + currentStationIdx.value * 20
})

const isPlaying = ref(false)
const masterVolume = ref(0.4)
const channelVolumes = ref({
  rain: 0.80,
  melody: 0.22,
  crackle: 0.00,
  hum: 0.20
})

// 物理旋钮角度旋转动效计数
const tuningRotation = ref(0)
const volumeRotation = computed(() => {
  // -120deg 到 120deg
  return -120 + masterVolume.value * 240
})

// Web Audio API 节点
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let analyser: AnalyserNode | null = null

// 音源通道
let rainSource: AudioBufferSourceNode | null = null
let rainGain: GainNode | null = null

let crackleSource: AudioBufferSourceNode | null = null
let crackleGain: GainNode | null = null

let humOsc: OscillatorNode | null = null
let humSubOsc: OscillatorNode | null = null
let humGain: GainNode | null = null

let melodyGain: GainNode | null = null

// 琶音调度定时器与状态
let melodyInterval: any = null
let melodyStep = 0
let currentChord = 0

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
  analyser.fftSize = 64

  masterGain.connect(analyser)
  analyser.connect(audioCtx.destination)

  // 1. 初始化白噪声雨声
  createRainNode()

  // 2. 初始化火花噼啪/玻璃器皿敲击声
  createCrackleNode()

  // 3. 初始化 CRT 嗡嗡交流电
  createHumNode()

  // 4. 初始化琶音旋律主 Gain
  melodyGain = audioCtx.createGain()
  melodyGain.gain.setValueAtTime(1.0, audioCtx.currentTime)
  melodyGain.connect(masterGain)
}

function createRainNode() {
  if (!audioCtx || !masterGain) return
  const sampleRate = audioCtx.sampleRate
  const bufferSize = sampleRate * 2.0
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  rainSource = audioCtx.createBufferSource()
  rainSource.buffer = buffer
  rainSource.loop = true

  const lpFilter = audioCtx.createBiquadFilter()
  lpFilter.type = 'lowpass'
  lpFilter.frequency.value = 520
  lpFilter.Q.value = 0.8

  const hpFilter = audioCtx.createBiquadFilter()
  hpFilter.type = 'highpass'
  hpFilter.frequency.value = 150

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
  const bufferSize = sampleRate * 1.5
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    // 极小概率爆裂电火花/叮当杂音，模拟自然木柴燃烧或老唱片
    data[i] = Math.random() > 0.9983 ? (Math.random() * 2 - 1) * 0.70 : 0
  }

  crackleSource = audioCtx.createBufferSource()
  crackleSource.buffer = buffer
  crackleSource.loop = true

  const filter = audioCtx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2600
  filter.Q.value = 2.0

  crackleGain = audioCtx.createGain()
  crackleGain.gain.value = channelVolumes.value.crackle

  crackleSource.connect(filter)
  filter.connect(crackleGain)
  crackleGain.connect(masterGain)
}

function createHumNode() {
  if (!audioCtx || !masterGain) return
  humOsc = audioCtx.createOscillator()
  humOsc.type = 'sine'
  humOsc.frequency.value = 60

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

  const station = currentStation.value
  const chord = station.chords[currentChord]
  const freq = chord[melodyStep]

  const osc = audioCtx.createOscillator()
  osc.type = station.oscType
  osc.frequency.value = freq

  const noteGain = audioCtx.createGain()
  osc.connect(noteGain)
  noteGain.connect(melodyGain)

  const now = audioCtx.currentTime
  // 经典 8-bit Plucked 包络
  noteGain.gain.setValueAtTime(0, now)
  noteGain.gain.linearRampToValueAtTime(channelVolumes.value.melody, now + 0.03)
  noteGain.gain.setValueAtTime(channelVolumes.value.melody, now + 0.20)
  noteGain.gain.linearRampToValueAtTime(0, now + 0.26)

  osc.start(now)
  osc.stop(now + 0.28)

  melodyStep = (melodyStep + 1) % 8
  if (melodyStep === 0) {
    currentChord = (currentChord + 1) % station.chords.length
  }
}

function playTuningStatic() {
  if (!audioCtx || !masterGain || !isPlaying.value) return

  // 1. 创建电磁波搜台沙沙声
  const sampleRate = audioCtx.sampleRate
  const bufferSize = sampleRate * 0.35 // 0.35 秒
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const staticSource = audioCtx.createBufferSource()
  staticSource.buffer = buffer

  const filter = audioCtx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1400

  const staticGain = audioCtx.createGain()

  staticSource.connect(filter)
  filter.connect(staticGain)
  staticGain.connect(masterGain)

  const now = audioCtx.currentTime
  staticGain.gain.setValueAtTime(0, now)
  staticGain.gain.linearRampToValueAtTime(0.6, now + 0.05)
  staticGain.gain.setValueAtTime(0.6, now + 0.15)
  staticGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

  // 2. 临时抑制乐音音轨
  if (melodyGain) {
    const curMelVol = channelVolumes.value.melody
    melodyGain.gain.setValueAtTime(curMelVol, now)
    melodyGain.gain.linearRampToValueAtTime(0.01, now + 0.05)
    melodyGain.gain.setValueAtTime(0.01, now + 0.25)
    melodyGain.gain.linearRampToValueAtTime(curMelVol, now + 0.35)
  }

  staticSource.start(now)
  staticSource.stop(now + 0.36)
}

function startMelodyScheduler() {
  if (melodyInterval) clearInterval(melodyInterval)
  melodyStep = 0
  currentChord = 0
  melodyInterval = setInterval(triggerMelodyStep, currentStation.value.tempo)
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

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const totalBars = 16
    const barWidth = Math.floor(canvas.width / totalBars) - 2
    const gap = 2

    for (let i = 0; i < totalBars; i++) {
      const val = dataArray[i + 2] || 0
      const percent = val / 255
      const height = percent * (canvas.height - 4)

      const blockHeight = 3
      const blockGap = 1
      const totalBlocks = Math.floor(height / (blockHeight + blockGap))

      for (let b = 0; b < totalBlocks; b++) {
        if (b > 11) {
          ctx.fillStyle = '#FF5F1F' // Accent color
        } else {
          ctx.fillStyle = '#FFFFFF' // Primary white
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

    if (rainSource) rainSource.start(0)
    if (crackleSource) crackleSource.start(0)
    if (humOsc) humOsc.start(0)
    if (humSubOsc) humSubOsc.start(0)

    startMelodyScheduler()
    startVisualizer()
  } catch (err) {
    console.error('[CHIP_TUNE] start failed:', err)
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
    // 忽略未激活报错
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

// 换台调谐控制
function changeStation(dir: 'next' | 'prev') {
  let nextIdx = currentStationIdx.value
  if (dir === 'next') {
    nextIdx = (nextIdx + 1) % STATIONS.length
  } else {
    nextIdx = (nextIdx - 1 + STATIONS.length) % STATIONS.length
  }

  tuningRotation.value += (dir === 'next' ? 45 : -45)
  currentStationIdx.value = nextIdx

  // 播放搜频静态沙沙声
  playTuningStatic()

  // 刷新当前电台各音轨配比并更新 Web Audio 增益
  channelVolumes.value = { ...currentStation.value.chans }
  if (audioCtx) {
    const now = audioCtx.currentTime
    if (rainGain) rainGain.gain.setValueAtTime(channelVolumes.value.rain, now)
    if (crackleGain) crackleGain.gain.setValueAtTime(channelVolumes.value.crackle, now)
    if (humGain) humGain.gain.setValueAtTime(channelVolumes.value.hum, now)
  }

  // 重新生成琶音调度
  if (isPlaying.value) {
    startMelodyScheduler()
  }
}

function selectStationDirect(idx: number) {
  if (idx === currentStationIdx.value) return
  
  tuningRotation.value += (idx > currentStationIdx.value ? 45 : -45)
  currentStationIdx.value = idx
  
  playTuningStatic()
  
  channelVolumes.value = { ...currentStation.value.chans }
  if (audioCtx) {
    const now = audioCtx.currentTime
    if (rainGain) rainGain.gain.setValueAtTime(channelVolumes.value.rain, now)
    if (crackleGain) crackleGain.gain.setValueAtTime(channelVolumes.value.crackle, now)
    if (humGain) humGain.gain.setValueAtTime(channelVolumes.value.hum, now)
  }

  if (isPlaying.value) {
    startMelodyScheduler()
  }
}

// 监听滑块修改
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
  // 卸载小工具实例时，需切断 Audio 释放底层资源
  stop()
})
</script>

<template>
  <!-- 1. 顶部悬停气泡预览模式 (preview === true) -->
  <div v-if="preview" class="flex items-center gap-3 w-full font-mono text-[10px]">
    <button 
      @click.stop="togglePlay"
      class="border border-line bg-btn-base p-1 text-accent hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none flex items-center justify-center shrink-0 cursor-pointer"
    >
      <Play v-if="!isPlaying" class="w-3.5 h-3.5" />
      <Square v-else class="w-3.5 h-3.5 fill-current" />
    </button>
    <div class="flex-grow flex flex-col justify-center truncate text-left">
      <span class="font-bold text-neutral-300">CHIP_TUNE [{{ currentStation.fm }} FM]</span>
      <span class="text-neutral-500 text-[8px] truncate">
        {{ isPlaying ? `STATION: ${currentStation.name}...` : 'STATUS: MUTED' }}
      </span>
    </div>
  </div>

  <!-- 2. Dashboard 网页卡片主体模式 (preview === false) -->
  <div v-else class="w-full flex flex-col gap-3.5 select-none font-mono">
    <!-- Equalizer Mini display -->
    <div class="relative bg-base border border-line p-1">
      <canvas 
        ref="canvasRef" 
        width="280" 
        height="45" 
        class="w-full h-[45px] bg-black block"
      ></canvas>
      <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center bg-black/80 text-neutral-600 text-[9px] tracking-widest uppercase">
        // RECEIVER_OFFLINE //
      </div>
      <div v-else class="absolute top-1 right-2.5 text-[8px] text-accent blink">
        ● BROADCASTING ({{ currentStation.fm }} FM)
      </div>
    </div>

    <!-- Info Row -->
    <div class="border border-line bg-base p-2 text-left flex flex-col gap-0.5">
      <span class="text-[9px] text-dim">{{ t('radio.station') }}</span>
      <span class="text-xs font-bold text-neutral-300 truncate">
        {{ currentStation.fm }} {{ t('radio.mhz') }} - {{ currentStation.name }}
      </span>
    </div>

    <!-- Quick Buttons -->
    <div class="flex gap-2 justify-between">
      <button 
        @click="togglePlay"
        class="flex-1 border border-line bg-btn-base py-1.5 px-3 text-[11px] font-bold text-secondary hover:bg-neutral-200 hover:text-black hover:border-neutral-200 active:translate-y-[1px] transition-none cursor-pointer glitch-on-click"
      >
        <span v-if="!isPlaying" class="text-accent">{{ t('radio.play') }}</span>
        <span v-else class="text-neutral-400">{{ t('radio.stop') }}</span>
      </button>

      <button 
        @click="showConsoleModal = true"
        class="flex-1 border border-accent bg-accent-dim text-accent py-1.5 px-3 text-[11px] font-bold hover:bg-accent hover:text-black hover:border-accent active:translate-y-[1px] transition-none cursor-pointer"
      >
        {{ t('radio.console.open') }}
      </button>
    </div>

    <!-- 3. Teleport 拟物收音机大面板 -->
    <MangaModal v-model:show="showConsoleModal" :title="t('radio.title')" maxWidthClass="max-w-xl">
      <div class="w-full bg-zinc-900 border-4 border-black p-6 relative font-mono text-left select-none text-zinc-300 flex flex-col gap-6 shadow-[8px_8px_0px_#000]">
        
        <!-- 装饰性天线 -->
        <div class="absolute -top-[55px] left-10 w-2 h-14 bg-black origin-bottom transform rotate-12 flex flex-col justify-end items-center">
          <div class="w-1.5 h-12 bg-zinc-400 border border-black"></div>
          <!-- LED 发光球 -->
          <div 
            class="w-3.5 h-3.5 rounded-full border border-black -mb-2 z-20"
            :class="[isPlaying ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-red-950']"
          ></div>
        </div>

        <!-- Radio Chassis Top Screw Marks -->
        <div class="flex justify-between -mt-3.5 px-1.5 text-zinc-600 text-[8px]">
          <span>⨂</span>
          <span>⨂</span>
        </div>

        <!-- 第一部分: 模拟调谐频率度盘 (Tuning Scale Panel) -->
        <div class="border-4 border-black bg-zinc-950 p-3 flex flex-col gap-2 relative">
          <!-- Dial Header -->
          <div class="flex justify-between items-center text-[9px] text-zinc-500 font-bold border-b border-zinc-800 pb-1.5">
            <span>TRANSISTOR RECEIVER TR-801</span>
            <span class="text-accent">FM BAND TELEMETRY</span>
          </div>

          <!-- Scale ticks -->
          <div class="h-10 relative mt-2 bg-black border border-zinc-900 overflow-hidden flex flex-col justify-between py-1">
            <!-- Ticks Graphics -->
            <div class="w-full flex justify-between px-3 text-[8px] text-zinc-500 select-none">
              <span v-for="(st, i) in STATIONS" :key="st.id" @click="selectStationDirect(i)" class="cursor-pointer hover:text-white transition-colors">
                {{ st.fm }}
              </span>
            </div>
            
            <div class="h-2 w-full border-t-2 border-zinc-800 border-dashed relative"></div>

            <div class="w-full flex justify-between px-3 text-[7px] text-zinc-600 leading-none">
              <span v-for="st in STATIONS" :key="st.id">{{ st.name }}</span>
            </div>

            <!-- 红色物理指示滑针 (Tuning Needle) -->
            <div 
              class="absolute top-0 bottom-0 w-[4px] bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] z-10 transition-all duration-300"
              :style="{ left: pointerLeftPercent + '%' }"
            >
              <div class="w-1.5 h-1.5 bg-red-500 border border-black absolute -top-0.5 -left-[1px]"></div>
            </div>
          </div>
        </div>

        <!-- 第二部分: 透明磁带卡舱舱盖 (Cassette Tape Deck) 与双旋钮 -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          
          <!-- 左侧/中部: 卡带舱 (Skeuomorphic Tape Slot) (占据 7 列) -->
          <div class="md:col-span-8 border-4 border-black bg-zinc-950 p-4 flex flex-col items-center justify-center relative min-h-[170px]">
            
            <!-- 磁带内部结构 -->
            <div class="w-full max-w-[240px] border-4 border-black bg-amber-500/90 text-black p-3.5 relative flex flex-col gap-3 rounded-sm shadow-[4px_4px_0px_#000]">
              
              <!-- Cassette label -->
              <div class="bg-white border-2 border-black px-1.5 py-0.5 text-center text-[9px] font-black uppercase flex items-center justify-between">
                <span>TAPE_A</span>
                <span class="text-neutral-500 truncate max-w-[120px]">{{ currentStation.name }}</span>
                <span>NR</span>
              </div>

              <!-- Rotating hubs window -->
              <div class="bg-zinc-900 border-2 border-black h-12 flex items-center justify-around relative px-6 rounded-sm">
                <!-- Left spool -->
                <div 
                  class="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-950 flex items-center justify-center"
                  :style="{ transform: isPlaying ? 'rotate(360deg)' : 'none' }"
                  :class="[isPlaying ? 'animate-[spin_7s_linear_infinite]' : '']"
                >
                  <div class="w-4 h-4 rounded-full border border-dashed border-zinc-500"></div>
                  <!-- Hub teeth -->
                  <div class="absolute inset-0 flex justify-center items-center">
                    <div class="w-0.5 h-7 bg-zinc-800 transform rotate-45"></div>
                    <div class="w-0.5 h-7 bg-zinc-800 transform -rotate-45"></div>
                  </div>
                </div>

                <!-- Center transparency tape level -->
                <div class="w-12 h-2.5 bg-amber-700/60 border border-zinc-950 flex justify-between items-center px-1">
                  <span class="text-[5px] text-zinc-900">100</span>
                  <span class="text-[5px] text-zinc-900">50</span>
                  <span class="text-[5px] text-zinc-900">0</span>
                </div>

                <!-- Right spool -->
                <div 
                  class="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-950 flex items-center justify-center"
                  :style="{ transform: isPlaying ? 'rotate(360deg)' : 'none' }"
                  :class="[isPlaying ? 'animate-[spin_7s_linear_infinite]' : '']"
                >
                  <div class="w-4 h-4 rounded-full border border-dashed border-zinc-500"></div>
                  <!-- Hub teeth -->
                  <div class="absolute inset-0 flex justify-center items-center">
                    <div class="w-0.5 h-7 bg-zinc-800 transform rotate-45"></div>
                    <div class="w-0.5 h-7 bg-zinc-800 transform -rotate-45"></div>
                  </div>
                </div>
              </div>

              <!-- Tape screws -->
              <div class="flex justify-between text-[6px] text-zinc-800 px-0.5 -mb-2.5">
                <span>○</span>
                <span>○</span>
              </div>
            </div>
            
            <!-- Transparent plastic window overlay -->
            <div class="absolute inset-0 bg-sky-300/10 border-2 border-dashed border-zinc-800 pointer-events-none"></div>
          </div>

          <!-- 右侧: 两个巨大旋钮 (Knobs) (占据 4 列) -->
          <div class="md:col-span-4 flex md:flex-col gap-6 justify-center items-center">
            <!-- 1. Volume Knob -->
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[8px] text-zinc-500 font-bold uppercase">VOL_LEVEL</span>
              <div 
                class="w-16 h-16 rounded-full border-4 border-black bg-zinc-800 relative shadow-[3px_3px_0px_#000] cursor-pointer flex items-center justify-center select-none"
                :style="{ transform: `rotate(${volumeRotation}deg)` }"
              >
                <!-- Indicator dot -->
                <div class="absolute top-1.5 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                <!-- Ridges -->
                <div class="absolute inset-0 rounded-full border-4 border-dashed border-zinc-900 pointer-events-none opacity-40"></div>
                <!-- Inner circle -->
                <div class="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center text-[7px] text-zinc-500 font-black">
                  VOL
                </div>
              </div>
              <div class="flex items-center gap-1 mt-1 text-[10px]">
                <input 
                  v-model.number="masterVolume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  class="w-16 accent-accent h-1 cursor-pointer"
                />
              </div>
            </div>

            <!-- 2. Tuning Selector Knob -->
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[8px] text-zinc-500 font-bold uppercase">{{ t('radio.tuning') }}</span>
              <div 
                @click="changeStation('next')"
                class="w-16 h-16 rounded-full border-4 border-black bg-zinc-800 relative shadow-[3px_3px_0px_#000] cursor-pointer flex items-center justify-center select-none active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-transform"
                :style="{ transform: `rotate(${tuningRotation}deg)` }"
                title="Click to tune next station"
              >
                <!-- Indicator dot -->
                <div class="absolute top-1.5 w-1.5 h-1.5 bg-accent rounded-full"></div>
                <!-- Inner circle -->
                <div class="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center text-[7px] text-accent font-black">
                  TUNE
                </div>
              </div>
              <span class="text-[8px] text-zinc-600 mt-1 select-none font-bold">CLICK TO TUNE</span>
            </div>
          </div>
        </div>

        <!-- 第三部分: 声音特性介绍 (Station Descs) -->
        <div class="border border-zinc-800 bg-zinc-950/40 p-3 font-mono text-left flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-[8px] text-zinc-500">
            <span>STATION INFODOCKET</span>
            <span class="text-accent">FM {{ currentStation.fm }} MHz</span>
          </div>
          <p class="text-xs font-bold text-neutral-200 uppercase tracking-wide">
            {{ currentStation.name }}
          </p>
          <p class="text-[10px] text-neutral-400 leading-relaxed">
            {{ locale === 'zh' ? currentStation.descZh : currentStation.descEn }}
          </p>
        </div>

        <!-- 第四部分: 电道混音台 (Channel Mixer Faders) -->
        <div class="border border-zinc-800 bg-zinc-950/20 p-3 flex flex-col gap-2">
          <span class="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sliders class="w-3 h-3 text-zinc-600" />
            ANALOG MIXER SLIDERS
          </span>
          <div class="grid grid-cols-2 gap-x-5 gap-y-2 text-[10px]">
            <!-- 1. RAIN -->
            <div class="flex items-center justify-between gap-2 border border-zinc-800/80 p-1.5 bg-black/40">
              <span class="text-zinc-500 w-16 text-[9px]">RAIN_NOISE</span>
              <input 
                v-model.number="channelVolumes.rain"
                type="range" min="0" max="1" step="0.05"
                class="flex-grow accent-accent h-1"
              />
              <span class="text-zinc-400 text-right w-6">{{ Math.round(channelVolumes.rain * 100) }}</span>
            </div>
            <!-- 2. MELODY -->
            <div class="flex items-center justify-between gap-2 border border-zinc-800/80 p-1.5 bg-black/40">
              <span class="text-zinc-500 w-16 text-[9px]">8BIT_MELODY</span>
              <input 
                v-model.number="channelVolumes.melody"
                type="range" min="0" max="1" step="0.05"
                class="flex-grow accent-accent h-1"
              />
              <span class="text-zinc-400 text-right w-6">{{ Math.round(channelVolumes.melody * 100) }}</span>
            </div>
            <!-- 3. CRACKLE -->
            <div class="flex items-center justify-between gap-2 border border-zinc-800/80 p-1.5 bg-black/40">
              <span class="text-zinc-500 w-16 text-[9px]">FIRE_SPARKS</span>
              <input 
                v-model.number="channelVolumes.crackle"
                type="range" min="0" max="1" step="0.05"
                class="flex-grow accent-accent h-1"
              />
              <span class="text-zinc-400 text-right w-6">{{ Math.round(channelVolumes.crackle * 100) }}</span>
            </div>
            <!-- 4. HUM -->
            <div class="flex items-center justify-between gap-2 border border-zinc-800/80 p-1.5 bg-black/40">
              <span class="text-zinc-500 w-16 text-[9px]">CRT_HUM</span>
              <input 
                v-model.number="channelVolumes.hum"
                type="range" min="0" max="1" step="0.05"
                class="flex-grow accent-accent h-1"
              />
              <span class="text-zinc-400 text-right w-6">{{ Math.round(channelVolumes.hum * 100) }}</span>
            </div>
          </div>
        </div>

        <!-- 第五部分: 磁带琴键型底座大按键 (Tape Deck Piano Keys) -->
        <div class="grid grid-cols-4 gap-2.5 mt-2 border-t border-zinc-800 pt-4 pb-1">
          <!-- 1. PREV -->
          <button 
            @click="changeStation('prev')"
            class="border-4 border-black bg-zinc-300 text-black py-2.5 font-bold uppercase text-[10px] tracking-widest shadow-[3px_3px_0px_#000] active:translate-y-[3px] active:shadow-none transition-none cursor-pointer"
          >
            ⏪ PREV
          </button>
          
          <!-- 2. PLAY/PAUSE -->
          <button 
            @click="togglePlay"
            class="border-4 border-black py-2.5 font-bold uppercase text-[10px] tracking-widest shadow-[3px_3px_0px_#000] active:translate-y-[3px] active:shadow-none transition-none cursor-pointer"
            :class="[isPlaying ? 'bg-red-500 text-white border-black' : 'bg-green-500 text-white border-black']"
          >
            {{ isPlaying ? '⏸ PAUSE' : '▶ PLAY' }}
          </button>

          <!-- 3. NEXT -->
          <button 
            @click="changeStation('next')"
            class="border-4 border-black bg-zinc-300 text-black py-2.5 font-bold uppercase text-[10px] tracking-widest shadow-[3px_3px_0px_#000] active:translate-y-[3px] active:shadow-none transition-none cursor-pointer"
          >
            NEXT ⏩
          </button>

          <!-- 4. EJECT / CLOSE MODAL -->
          <button 
            @click="showConsoleModal = false"
            class="border-4 border-black bg-zinc-200 text-red-600 py-2.5 font-bold uppercase text-[10px] tracking-widest shadow-[3px_3px_0px_#000] active:translate-y-[3px] active:shadow-none transition-none cursor-pointer"
          >
            ⏏ EJECT
          </button>
        </div>

        <!-- Bottom Brand Footnotes -->
        <div class="flex justify-between items-center text-[7px] text-zinc-600 uppercase tracking-widest -mb-3 px-1">
          <span>MADE_BY_GEMINI</span>
          <span>HIGH_FIDELITY_ANALOG_CHIPS</span>
        </div>
      </div>
    </MangaModal>
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

.blink {
  animation: blink-light 1.2s step-end infinite;
}

@keyframes blink-light {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
