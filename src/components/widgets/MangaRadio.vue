<script lang="ts">
// ── 外部 Module Scope：常驻内存单例，保证弹窗关闭后 Web Audio 继续运行 ──
import { ref, watch, computed } from 'vue'

const isPlaying = ref(false)
const masterVolume = ref(0.4)

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
    descZh: '涩谷雨夜，重低音雨声配以温柔七和弦',
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
    descZh: '红白机像素地城，欢快紧凑的方波琶音进行',
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
    descZh: '午后爵士咖啡馆，伴有杯具敲击的慵懒 Swing 调',
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

const channelVolumes = ref({
  rain: 0.80,
  melody: 0.22,
  crackle: 0.00,
  hum: 0.20
})

const tuningRotation = ref(0)
const volumeRotation = computed(() => {
  return -120 + masterVolume.value * 240
})

// Web Audio API 节点单例
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

let melodyInterval: any = null
let melodyStep = 0
let currentChord = 0

// 音频初始化
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

  createRainNode()
  createCrackleNode()
  createHumNode()

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

  const sampleRate = audioCtx.sampleRate
  const bufferSize = sampleRate * 0.35
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
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { t, locale } from '../../i18n'
import { Play, Square, Volume2, Sliders, Radio, Music } from '@lucide/vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

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

    const totalBars = 20
    const barWidth = Math.floor(canvas.width / totalBars) - 1.5
    const gap = 1.5

    for (let i = 0; i < totalBars; i++) {
      const val = dataArray[i + 1] || 0
      const percent = val / 255
      const height = percent * (canvas.height - 4)

      const blockHeight = 2.5
      const blockGap = 1
      const totalBlocks = Math.floor(height / (blockHeight + blockGap))

      for (let b = 0; b < totalBlocks; b++) {
        if (b > 12) {
          ctx.fillStyle = '#FF5F1F'
        } else {
          ctx.fillStyle = '#00FF66' // 复古液晶屏绿
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

function changeStation(dir: 'next' | 'prev') {
  let nextIdx = currentStationIdx.value
  if (dir === 'next') {
    nextIdx = (nextIdx + 1) % STATIONS.length
  } else {
    nextIdx = (nextIdx - 1 + STATIONS.length) % STATIONS.length
  }

  tuningRotation.value += (dir === 'next' ? 45 : -45)
  currentStationIdx.value = nextIdx

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

function ejectModal() {
  window.dispatchEvent(new CustomEvent('manga-close-widget-modal'))
}

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

onMounted(() => {
  if (isPlaying.value && analyser) {
    startVisualizer()
  }
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
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

  <!-- 2. Dashboard 完整界面 (preview === false)：高密度横向 3 栏 Boombox，内容全保留，绝不溢出 -->
  <div v-else class="w-full bg-zinc-900 border-4 border-black p-4 relative font-mono text-left select-none text-zinc-300 flex flex-col gap-3.5 shadow-[6px_6px_0px_#000] rounded-none">
    
    <!-- 装饰性天线 -->
    <div class="absolute -top-[48px] left-8 w-1.5 h-12 bg-black origin-bottom transform rotate-12 flex flex-col justify-end items-center">
      <div class="w-1 h-9 bg-zinc-400 border border-black"></div>
      <div 
        class="w-3 h-3 rounded-full border border-black -mb-1.5 z-20"
        :class="[isPlaying ? 'bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]' : 'bg-red-950']"
      ></div>
    </div>

    <!-- 螺丝标记 -->
    <div class="flex justify-between -mt-3.5 px-1 text-zinc-600 text-[8px] select-none">
      <span>⨂</span>
      <span>⨂</span>
    </div>

    <!-- 三栏水平式高级电台控制台 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      
      <!-- ==================== 第一栏: 卡带舱与琴键 (lg:col-span-4) ==================== -->
      <div class="lg:col-span-4 flex flex-col justify-between gap-3 border-r-0 lg:border-r border-zinc-800 pr-0 lg:pr-4">
        <!-- 卡带舱 -->
        <div class="border-4 border-black bg-zinc-950 p-2 flex flex-col items-center justify-center relative min-h-[120px] flex-grow">
          <div class="w-full max-w-[190px] border-4 border-black bg-amber-500/90 text-black p-2 relative flex flex-col gap-1.5 rounded-sm shadow-[2px_2px_0px_#000]">
            <!-- label -->
            <div class="bg-white border border-black px-1 py-0.2 text-center text-[8px] font-black uppercase flex items-center justify-between">
              <span>TAPE_A</span>
              <span class="text-neutral-500 truncate max-w-[90px]">{{ currentStation.name }}</span>
              <span>NR</span>
            </div>

            <!-- spools window -->
            <div class="bg-zinc-900 border border-black h-8.5 flex items-center justify-around relative px-4 rounded-sm">
              <div 
                class="w-5.5 h-5.5 rounded-full border border-zinc-700 bg-zinc-950 flex items-center justify-center"
                :style="{ transform: isPlaying ? 'rotate(360deg)' : 'none' }"
                :class="[isPlaying ? 'animate-[spin_7s_linear_infinite]' : '']"
              >
                <div class="w-2 h-2 rounded-full border border-dashed border-zinc-500"></div>
                <div class="absolute inset-0 flex justify-center items-center">
                  <div class="w-0.5 h-4.5 bg-zinc-850 transform rotate-45"></div>
                  <div class="w-0.5 h-4.5 bg-zinc-850 transform -rotate-45"></div>
                </div>
              </div>

              <div class="w-8 h-1 bg-amber-700/60 border border-zinc-950 flex justify-between items-center px-0.5">
                <span class="text-[4px] text-zinc-900">100</span>
                <span class="text-[4px] text-zinc-900">0</span>
              </div>

              <div 
                class="w-5.5 h-5.5 rounded-full border border-zinc-700 bg-zinc-950 flex items-center justify-center"
                :style="{ transform: isPlaying ? 'rotate(360deg)' : 'none' }"
                :class="[isPlaying ? 'animate-[spin_7s_linear_infinite]' : '']"
              >
                <div class="w-2 h-2 rounded-full border border-dashed border-zinc-500"></div>
                <div class="absolute inset-0 flex justify-center items-center">
                  <div class="w-0.5 h-4.5 bg-zinc-850 transform rotate-45"></div>
                  <div class="w-0.5 h-4.5 bg-zinc-850 transform -rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="absolute inset-0 bg-sky-300/5 border border-dashed border-zinc-850 pointer-events-none"></div>
        </div>

        <!-- 磁带琴键型底座大按键 -->
        <div class="grid grid-cols-4 gap-1">
          <button 
            @click="changeStation('prev')"
            class="border-2 border-black bg-zinc-300 text-black py-1.5 font-bold text-[8.5px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-none cursor-pointer text-center"
          >
            {{ t('radio.btn.prev') }}
          </button>
          
          <button 
            @click="togglePlay"
            class="border-2 border-black py-1.5 font-bold text-[8.5px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-none cursor-pointer text-center text-white"
            :class="[isPlaying ? 'bg-red-500' : 'bg-green-500']"
          >
            {{ isPlaying ? t('radio.btn.pause') : t('radio.btn.play') }}
          </button>

          <button 
            @click="changeStation('next')"
            class="border-2 border-black bg-zinc-300 text-black py-1.5 font-bold text-[8.5px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-none cursor-pointer text-center"
          >
            {{ t('radio.btn.next') }}
          </button>

          <button 
            @click="ejectModal"
            class="border-2 border-black bg-zinc-200 text-red-600 py-1.5 font-bold text-[8.5px] tracking-wider shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:shadow-none transition-none cursor-pointer text-center"
          >
            {{ t('radio.btn.eject') }}
          </button>
        </div>
      </div>

      <!-- ==================== 第二栏: 调频盘与发光液晶频谱大屏 (lg:col-span-4) ==================== -->
      <div class="lg:col-span-4 flex flex-col justify-between gap-3 border-r-0 lg:border-r border-zinc-800 pr-0 lg:pr-4">
        <!-- 模拟调谐频率指示盘 (FM Dial) -->
        <div class="border-4 border-black bg-zinc-950 p-2 flex flex-col gap-1 relative h-[50px] justify-center shrink-0">
          <div class="h-6.5 relative bg-black border border-zinc-900 overflow-hidden flex flex-col justify-between py-0.5">
            <div class="w-full flex justify-between px-2 text-[7.5px] text-zinc-500 select-none leading-none">
              <span v-for="(st, i) in STATIONS" :key="st.id" @click="selectStationDirect(i)" class="cursor-pointer hover:text-white transition-colors">
                {{ st.fm }}
              </span>
            </div>
            <div class="h-0.5 w-full border-t border-zinc-850 border-dashed relative"></div>
            <!-- 红色刻度指针 -->
            <div 
              class="absolute top-0 bottom-0 w-[3px] bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.8)] z-10 transition-all duration-300"
              :style="{ left: pointerLeftPercent + '%' }"
            >
              <div class="w-1.5 h-1.5 bg-red-500 border border-black absolute -top-0.5 -left-[0.5px]"></div>
            </div>
          </div>
        </div>

        <!-- 液晶电子指示大屏 (Canvas 频谱分析 + 完整中文详情) -->
        <div class="border-4 border-black bg-[#08150f] p-2 flex flex-col gap-2 relative min-h-[100px] flex-grow text-[#00ff66]">
          <!-- Canvas 频段 Equalizer -->
          <div class="w-full h-[40px] relative bg-black/40 border border-[#0a2618]">
            <canvas 
              ref="canvasRef" 
              width="220" 
              height="38" 
              class="w-full h-full block"
            ></canvas>
            <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center text-[#044c2c] text-[8px] font-black tracking-widest uppercase">
              // MUTED_LINE //
            </div>
          </div>

          <!-- 电台文本介绍区 (完整保留内容，不截断) -->
          <div class="flex flex-col gap-0.5 text-left text-[9px] font-mono leading-snug">
            <div class="flex justify-between items-center text-[8.5px] font-black border-b border-[#0f3622] pb-0.5">
              <span>FM {{ currentStation.fm }} MHz // {{ currentStation.name }}</span>
              <span v-if="isPlaying" class="text-red-500 animate-pulse text-[7.5px]">● ON AIR</span>
            </div>
            <p class="text-[#83ffd2] mt-0.5 text-[8.5px] leading-tight">
              <span class="text-[#0e5c35] font-normal mr-0.5">[</span>
              {{ locale === 'zh' ? currentStation.descZh : currentStation.descEn }}
              <span class="text-[#0e5c35] font-normal ml-0.5">]</span>
            </p>
          </div>
        </div>
      </div>

      <!-- ==================== 第三栏: 预设选台 + 旋钮与模拟混音台 (lg:col-span-4) ==================== -->
      <div class="lg:col-span-4 flex flex-col justify-between gap-3">
        <!-- 1. 预设快捷选台按键组 (Presets) -->
        <div class="border border-zinc-800 bg-zinc-950/40 p-2 flex flex-col gap-1.5">
          <span class="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{{ t('radio.preset') }}</span>
          <div class="flex flex-wrap gap-1">
            <button 
              v-for="(st, idx) in STATIONS" 
              :key="st.id"
              @click="selectStationDirect(idx)"
              class="border border-zinc-700 bg-zinc-950 py-0.5 px-1.5 text-[8px] transition-none cursor-pointer"
              :class="[currentStationIdx === idx ? 'border-accent text-accent font-bold bg-accent/5 shadow-[1px_1px_0px_#ff5f1f]' : 'text-zinc-500 hover:text-zinc-300 hover:border-zinc-500']"
            >
              {{ st.fm }}
            </button>
          </div>
        </div>

        <!-- 2. 音量与搜频旋钮 -->
        <div class="flex justify-around items-center bg-zinc-950/20 py-1 border border-zinc-800">
          <div class="flex flex-col items-center gap-0.5">
            <div 
              class="w-9 h-9 rounded-full border-2 border-black bg-zinc-850 relative shadow-[2px_2px_0px_#000] cursor-pointer flex items-center justify-center select-none"
              :style="{ transform: `rotate(${volumeRotation}deg)` }"
            >
              <div class="absolute top-0.5 w-1 h-1 bg-red-600 rounded-full"></div>
              <div class="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-750 flex items-center justify-center text-[5px] text-zinc-500 font-bold">
                VOL
              </div>
            </div>
            <span class="text-[7px] text-zinc-500 font-bold tracking-wide uppercase">{{ t('radio.volume.master') }}</span>
          </div>

          <!-- Slider inside Volume unit -->
          <input 
            v-model.number="masterVolume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-14 accent-accent h-0.5 cursor-pointer"
          />

          <div class="flex flex-col items-center gap-0.5">
            <div 
              @click="changeStation('next')"
              class="w-9 h-9 rounded-full border-2 border-black bg-zinc-850 relative shadow-[2px_2px_0px_#000] cursor-pointer flex items-center justify-center select-none active:translate-y-[1px] active:shadow-[1px_1px_0px_#000] transition-transform"
              :style="{ transform: `rotate(${tuningRotation}deg)` }"
            >
              <div class="absolute top-0.5 w-1 h-1 bg-accent rounded-full"></div>
              <div class="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-750 flex items-center justify-center text-[5px] text-accent font-bold">
                TUNE
              </div>
            </div>
            <span class="text-[7px] text-zinc-500 font-bold tracking-wide uppercase">{{ t('radio.tuning.knob') }}</span>
          </div>
        </div>

        <!-- 3. 4声道混音推子台 -->
        <div class="border border-zinc-800 bg-black/20 p-2 flex flex-col gap-1 text-[8.5px]">
          <!-- RAIN -->
          <div class="flex items-center gap-2">
            <span class="text-zinc-500 w-16 text-left truncate">{{ t('radio.chan.rain') }}</span>
            <input 
              v-model.number="channelVolumes.rain"
              type="range" min="0" max="1" step="0.05"
              class="flex-grow accent-accent h-1"
            />
            <span class="text-zinc-400 text-right w-4 font-bold">{{ Math.round(channelVolumes.rain * 10) }}</span>
          </div>
          <!-- MELODY -->
          <div class="flex items-center gap-2">
            <span class="text-zinc-500 w-16 text-left truncate">{{ t('radio.chan.melody') }}</span>
            <input 
              v-model.number="channelVolumes.melody"
              type="range" min="0" max="1" step="0.05"
              class="flex-grow accent-accent h-1"
            />
            <span class="text-zinc-400 text-right w-4 font-bold">{{ Math.round(channelVolumes.melody * 10) }}</span>
          </div>
          <!-- CRACKLE -->
          <div class="flex items-center gap-2">
            <span class="text-zinc-500 w-16 text-left truncate">{{ t('radio.chan.crackle') }}</span>
            <input 
              v-model.number="channelVolumes.crackle"
              type="range" min="0" max="1" step="0.05"
              class="flex-grow accent-accent h-1"
            />
            <span class="text-zinc-400 text-right w-4 font-bold">{{ Math.round(channelVolumes.crackle * 10) }}</span>
          </div>
          <!-- HUM -->
          <div class="flex items-center gap-2">
            <span class="text-zinc-500 w-16 text-left truncate">{{ t('radio.chan.hum') }}</span>
            <input 
              v-model.number="channelVolumes.hum"
              type="range" min="0" max="1" step="0.05"
              class="flex-grow accent-accent h-1"
            />
            <span class="text-zinc-400 text-right w-4 font-bold">{{ Math.round(channelVolumes.hum * 10) }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 底部脚注 -->
    <div class="flex justify-between items-center text-[7px] text-zinc-600 uppercase tracking-widest -mb-1.5 border-t border-zinc-800 pt-3.5 select-none">
      <span>⨂ HIGH_FIDELITY_ANALOG_CHIPS</span>
      <span>MADE_BY_GEMINI ⨂</span>
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
  width: 6px;
  height: 10px;
  background: var(--color-primary);
  border: 1px solid var(--color-base);
  border-radius: 0px;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: var(--color-accent);
}

input[type="range"]::-moz-range-thumb {
  width: 6px;
  height: 10px;
  background: var(--color-primary);
  border: 1px solid var(--color-base);
  border-radius: 0px;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb:hover {
  background: var(--color-accent);
}
</style>
