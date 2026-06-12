<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { triggerCloudPush } from '../../utils/api'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

interface WeightRecord {
  id: string
  date: string
  weight: number
  bodyFat?: number
  waist?: number
  hip?: number
  note?: string
}

const records = ref<WeightRecord[]>([])
const height = ref(175)
const targetWeight = ref(70)
const birthYear = ref(1995)
const gender = ref<'male' | 'female'>('male')
const activityLevel = ref(1.375)

const inputWeight = ref<number | null>(null)
const inputBodyFat = ref<number | null>(null)
const inputWaist = ref<number | null>(null)
const inputHip = ref<number | null>(null)
const inputDate = ref(new Date().toISOString().split('T')[0])
const inputNote = ref('')

const editingRecordId = ref<string | null>(null)
const editWeight = ref<number | null>(null)
const editBodyFat = ref<number | null>(null)
const editWaist = ref<number | null>(null)
const editHip = ref<number | null>(null)
const editDate = ref('')
const editNote = ref('')

const searchQuery = ref('')

const bigChartRange = ref<7 | 30 | 0>(7)
const bigChartType = ref<'weight' | 'bodyFat' | 'waist'>('weight')

function loadData() {
  const storedRecords = localStorage.getItem('manga_weight_records')
  if (storedRecords) {
    try {
      records.value = JSON.parse(storedRecords)
    } catch {
      records.value = []
    }
  } else {
    records.value = [
      { id: 'r1', date: '2026-06-06', weight: 75.2, bodyFat: 21.0, waist: 88, hip: 96, note: 'BIG_FEAST' },
      { id: 'r2', date: '2026-06-07', weight: 74.8, bodyFat: 20.8, waist: 87, hip: 96, note: 'FAST_WALK_3KM' },
      { id: 'r3', date: '2026-06-08', weight: 74.3, bodyFat: 20.5, waist: 86, hip: 95, note: 'FAST_DAY' },
      { id: 'r4', date: '2026-06-09', weight: 74.5, bodyFat: 20.6, waist: 87, hip: 95, note: 'LATE_SNACK_CRISIS' },
      { id: 'r5', date: '2026-06-10', weight: 73.8, bodyFat: 20.2, waist: 85, hip: 94, note: 'GYM_IRON' },
      { id: 'r6', date: '2026-06-11', weight: 73.4, bodyFat: 19.9, waist: 85, hip: 94, note: 'GRAVITY_DOWN!' },
      { id: 'r7', date: '2026-06-12', weight: 72.8, bodyFat: 19.5, waist: 84, hip: 93, note: 'CLOSE_TO_TARGET' }
    ]
  }

  height.value = Number(localStorage.getItem('manga_user_height') || '175')
  targetWeight.value = Number(localStorage.getItem('manga_user_weight_target') || '70')
  birthYear.value = Number(localStorage.getItem('manga_user_birth_year') || '1995')
  gender.value = (localStorage.getItem('manga_user_gender') || 'male') as 'male' | 'female'
  activityLevel.value = Number(localStorage.getItem('manga_user_activity') || '1.375')
}

onMounted(() => {
  loadData()
  window.addEventListener('artisan-cloud-data-pulled', loadData)
})

onUnmounted(() => {
  window.removeEventListener('artisan-cloud-data-pulled', loadData)
})

watch(records, (newVal) => {
  localStorage.setItem('manga_weight_records', JSON.stringify(newVal))
  triggerCloudPush()
}, { deep: true })

watch(height, (newVal) => {
  localStorage.setItem('manga_user_height', String(newVal))
  triggerCloudPush()
})

watch(targetWeight, (newVal) => {
  localStorage.setItem('manga_user_weight_target', String(newVal))
  triggerCloudPush()
})

watch(birthYear, (newVal) => {
  localStorage.setItem('manga_user_birth_year', String(newVal))
  triggerCloudPush()
})

watch(gender, (newVal) => {
  localStorage.setItem('manga_user_gender', newVal)
  triggerCloudPush()
})

watch(activityLevel, (newVal) => {
  localStorage.setItem('manga_user_activity', String(newVal))
  triggerCloudPush()
})

function handleAddRecord() {
  if (!inputWeight.value || inputWeight.value <= 0) {
    alert('[ERROR] INVALID_WEIGHT')
    return
  }

  records.value.push({
    id: Date.now().toString(),
    date: inputDate.value || new Date().toISOString().split('T')[0],
    weight: inputWeight.value,
    bodyFat: inputBodyFat.value || undefined,
    waist: inputWaist.value || undefined,
    hip: inputHip.value || undefined,
    note: inputNote.value.trim() || undefined
  })

  records.value.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  inputWeight.value = null
  inputBodyFat.value = null
  inputWaist.value = null
  inputHip.value = null
  inputNote.value = ''

}

function deleteRecord(id: string) {
  if (confirm('[ DESTROY ] ?')) {
    records.value = records.value.filter(r => r.id !== id)
    if (editingRecordId.value === id) {
      editingRecordId.value = null
    }
  }
}

function startEdit(r: WeightRecord) {
  editingRecordId.value = r.id
  editWeight.value = r.weight
  editBodyFat.value = r.bodyFat || null
  editWaist.value = r.waist || null
  editHip.value = r.hip || null
  editDate.value = r.date
  editNote.value = r.note || ''
}

function cancelEdit() {
  editingRecordId.value = null
}

function saveEdit(id: string) {
  if (!editWeight.value || editWeight.value <= 0) {
    alert('[ERROR] INVALID_WEIGHT')
    return
  }
  const record = records.value.find(r => r.id === id)
  if (record) {
    record.weight = editWeight.value
    record.bodyFat = editBodyFat.value || undefined
    record.waist = editWaist.value || undefined
    record.hip = editHip.value || undefined
    record.date = editDate.value
    record.note = editNote.value.trim() || undefined

    records.value.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  editingRecordId.value = null
}

function resetToMock() {
  if (confirm('[ RESET ] ? [WILL_OVERWRITE]')) {
    localStorage.removeItem('manga_weight_records')
    loadData()
  }
}

function clearAllRecords() {
  if (confirm('[ DESTROY_ALL ] ? [IRREVERSIBLE]')) {
    records.value = []
  }
}

const filteredHistoryRecords = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return records.value
  return records.value.filter(r =>
    r.date.includes(query) ||
    (r.note && r.note.toLowerCase().includes(query)) ||
    r.weight.toString().includes(query)
  )
})

const latestRecord = computed(() => {
  if (records.value.length === 0) return null
  return records.value[records.value.length - 1]
})

const bmi = computed(() => {
  if (!latestRecord.value || !height.value) return 0
  const hM = height.value / 100
  return Number((latestRecord.value.weight / (hM * hM)).toFixed(1))
})

const bmiStatus = computed(() => {
  const val = bmi.value
  if (val <= 0) return { label: 'NO_DATA', class: 'text-status-neutral', desc: '// VOID //' }
  if (val < 18.5) return { label: 'LIGHT', class: 'text-status-info', desc: 'EAT_MORE' }
  if (val < 24.0) return { label: 'FIT', class: 'text-status-good', desc: 'PERFECT' }
  if (val < 28.0) return { label: 'PLUMP', class: 'text-status-warn', desc: 'SLIGHTLY_HIGH' }
  return { label: 'HEAVY', class: 'text-status-bad', desc: 'CONTROL_NEEDED' }
})

const age = computed(() => {
  const currentYear = new Date().getFullYear()
  return Math.max(1, currentYear - birthYear.value)
})

const bmr = computed(() => {
  if (records.value.length === 0 || !height.value) return 0
  const w = latestRecord.value ? latestRecord.value.weight : targetWeight.value
  const h = height.value
  const a = age.value
  if (gender.value === 'male') {
    return Math.round(88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a))
  } else {
    return Math.round(447.593 + (9.247 * w) + (3.098 * h) - (4.330 * a))
  }
})

const tdee = computed(() => {
  return Math.round(bmr.value * activityLevel.value)
})

const whr = computed(() => {
  if (!latestRecord.value || !latestRecord.value.waist || !latestRecord.value.hip) return 0
  return Number((latestRecord.value.waist / latestRecord.value.hip).toFixed(2))
})

const whrStatus = computed(() => {
  const val = whr.value
  if (val <= 0) return { label: 'N/A', class: 'text-status-neutral', desc: 'NO_WAIST_HIP' }
  if (gender.value === 'male') {
    if (val < 0.90) return { label: 'SYMMETRIC', class: 'text-status-good', desc: 'HEALTHY' }
    if (val <= 0.95) return { label: 'WIDE_RATIO', class: 'text-status-warn', desc: 'CARDIO_NEEDED' }
    return { label: 'ROUND', class: 'text-status-bad', desc: 'WARNING' }
  } else {
    if (val < 0.80) return { label: 'GOLDEN', class: 'text-status-good', desc: 'MAINTAIN' }
    if (val <= 0.85) return { label: 'SLIGHTLY_PLUMP', class: 'text-status-warn', desc: 'WATCH_SUGAR' }
    return { label: 'FULL_FIGURE', class: 'text-status-bad', desc: 'STRENGTH_TRAIN' }
  }
})

const targetProgressPercent = computed(() => {
  if (records.value.length === 0) return 0
  const start = records.value[0].weight
  const current = latestRecord.value ? latestRecord.value.weight : start
  const target = targetWeight.value

  if (start === target) return 100
  const totalNeed = start - target
  const achieved = start - current

  if (totalNeed > 0) {
    if (current <= target) return 100
    if (current >= start) return 0
    return Math.min(100, Math.max(0, Math.round((achieved / totalNeed) * 100)))
  } else {
    if (current >= target) return 100
    if (current <= start) return 0
    return Math.min(100, Math.max(0, Math.round((achieved / totalNeed) * 100)))
  }
})

const bigChartRecords = computed(() => {
  let list = records.value
  if (bigChartRange.value > 0) {
    list = records.value.slice(-bigChartRange.value)
  }

  if (bigChartType.value === 'bodyFat') {
    return list.filter(r => r.bodyFat !== undefined && r.bodyFat > 0)
  } else if (bigChartType.value === 'waist') {
    return list.filter(r => r.waist !== undefined && r.waist > 0)
  }
  return list
})

const bigSvgConfig = {
  width: 580,
  height: 200,
  paddingLeft: 40,
  paddingRight: 20,
  paddingTop: 20,
  paddingBottom: 30
}

const bigSvgPoints = computed(() => {
  const ptsRecords = bigChartRecords.value
  if (ptsRecords.length < 2) return []

  const values = ptsRecords.map(r => {
    if (bigChartType.value === 'bodyFat') return r.bodyFat || 0
    if (bigChartType.value === 'waist') return r.waist || 0
    return r.weight
  })

  const minV = Math.max(0, Math.min(...values) - 1.0)
  const maxV = Math.max(...values) + 1.0
  const range = maxV - minV || 1

  const activeW = bigSvgConfig.width - bigSvgConfig.paddingLeft - bigSvgConfig.paddingRight
  const activeH = bigSvgConfig.height - bigSvgConfig.paddingTop - bigSvgConfig.paddingBottom

  return ptsRecords.map((r, idx) => {
    const val = bigChartType.value === 'bodyFat' ? (r.bodyFat || 0) : bigChartType.value === 'waist' ? (r.waist || 0) : r.weight
    const x = bigSvgConfig.paddingLeft + (idx / (ptsRecords.length - 1)) * activeW
    const y = bigSvgConfig.height - bigSvgConfig.paddingBottom - ((val - minV) / range) * activeH
    return { x, y, val, record: r }
  })
})

const bigSvgPathString = computed(() => {
  const pts = bigSvgPoints.value
  if (!pts || pts.length === 0) return ''
  return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

const bigSvgAreaPathString = computed(() => {
  const pts = bigSvgPoints.value
  if (!pts || pts.length === 0) return ''
  const startX = pts[0].x
  const endX = pts[pts.length - 1].x
  const baseY = bigSvgConfig.height - bigSvgConfig.paddingBottom
  return `${bigSvgPathString.value} L ${endX} ${baseY} L ${startX} ${baseY} Z`
})

const bigSvgYTicks = computed(() => {
  const ptsRecords = bigChartRecords.value
  if (ptsRecords.length === 0) return []

  const values = ptsRecords.map(r => {
    if (bigChartType.value === 'bodyFat') return r.bodyFat || 0
    if (bigChartType.value === 'waist') return r.waist || 0
    return r.weight
  })
  const minV = Math.max(0, Math.min(...values) - 1.0)
  const maxV = Math.max(...values) + 1.0
  const range = maxV - minV || 1

  const ticks = []
  const count = 4
  for (let i = 0; i < count; i++) {
    const val = minV + (range / (count - 1)) * i
    const y = bigSvgConfig.height - bigSvgConfig.paddingBottom - (i / (count - 1)) * (bigSvgConfig.height - bigSvgConfig.paddingTop - bigSvgConfig.paddingBottom)
    ticks.push({ y, val: Number(val.toFixed(1)) })
  }
  return ticks
})

const bigSvgXTicks = computed(() => {
  const pts = bigSvgPoints.value
  if (pts.length === 0) return []

  const ticks = []
  const maxTicks = 6
  if (pts.length <= maxTicks) {
    return pts
  } else {
    const step = Math.floor(pts.length / (maxTicks - 1))
    for (let i = 0; i < pts.length; i += step) {
      if (ticks.length < maxTicks - 1) {
        ticks.push(pts[i])
      }
    }
    if (!ticks.includes(pts[pts.length - 1])) {
      ticks.push(pts[pts.length - 1])
    }
    return ticks
  }
})

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
    records: records.value,
    height: height.value,
    targetWeight: targetWeight.value,
    birthYear: birthYear.value,
    gender: gender.value,
    activityLevel: activityLevel.value
  }));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `renaissance_weight_data_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string)
      if (parsed && Array.isArray(parsed.records)) {
        records.value = parsed.records
        if (parsed.height) height.value = Number(parsed.height)
        if (parsed.targetWeight) targetWeight.value = Number(parsed.targetWeight)
        if (parsed.birthYear) birthYear.value = Number(parsed.birthYear)
        if (parsed.gender) gender.value = parsed.gender
        if (parsed.activityLevel) activityLevel.value = Number(parsed.activityLevel)
        alert('[OK] IMPORT_COMPLETE')
      } else {
        alert('[ERROR] PARSE_FAIL')
      }
    } catch {
      alert('[ERROR] INVALID_FILE')
    }
  }
  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1 font-mono py-1 text-neutral-300 w-full">
    <div v-if="latestRecord" class="flex flex-col items-center gap-0.5">
      <div class="text-xl font-bold font-mono tracking-tight text-accent">
        {{ latestRecord.weight }} <span class="text-[9px] font-mono opacity-75">kg</span>
      </div>
      <div class="flex gap-2 text-[9px] opacity-85 mt-0.5">
        <span class="bg-surface border border-border-dim px-1.5 py-0.2 text-neutral-400">BMI: {{ bmi }}</span>
        <span v-if="latestRecord.bodyFat" class="bg-surface border border-border-dim px-1.5 py-0.2 text-neutral-400">BF%: {{ latestRecord.bodyFat }}%</span>
      </div>
    </div>
    <div v-else class="text-center text-[9px] text-neutral-600 py-2 italic">
      // EMPTY //
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-5 font-bold font-mono text-neutral-300">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-400">[ BIO ]</span>
    </div>

    <!-- Top: Large Quantitative Astronomy Line Chart -->
    <div class="border border-line p-4 bg-surface flex flex-col gap-3 ">
      <div class="border-b border-line pb-1.5 flex justify-between items-center">
        <span class="text-sm font-semibold tracking-wider text-accent flex items-center gap-1.5">
          CHART // WEIGHT TRAJECTORY
        </span>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Metric switches -->
          <div class="flex border border-border-dim bg-base overflow-hidden text-[9px]">
            <button
              @click="bigChartType = 'weight'"
              class="px-2.5 py-0.5 cursor-pointer transition-none"
              :class="[bigChartType === 'weight' ? 'bg-accent text-base font-bold' : 'text-neutral-500 hover:text-neutral-300']"
            >
              WEIGHT
            </button>
            <button
              @click="bigChartType = 'bodyFat'"
              class="px-2.5 py-0.5 cursor-pointer border-l border-r border-border-dim transition-none"
              :class="[bigChartType === 'bodyFat' ? 'bg-accent text-base font-bold' : 'text-neutral-500 hover:text-neutral-300']"
            >
              BF%
            </button>
            <button
              @click="bigChartType = 'waist'"
              class="px-2.5 py-0.5 cursor-pointer transition-none"
              :class="[bigChartType === 'waist' ? 'bg-accent text-base font-bold' : 'text-neutral-500 hover:text-neutral-300']"
            >
              WAIST
            </button>
          </div>

          <!-- Range switches -->
          <div class="flex border border-border-dim bg-base overflow-hidden text-[9px]">
            <button
              @click="bigChartRange = 7"
              class="px-2 py-0.5 cursor-pointer transition-none"
              :class="[bigChartRange === 7 ? 'bg-accent text-base font-bold' : 'text-neutral-500 hover:text-neutral-300']"
            >
              LAST 7
            </button>
            <button
              @click="bigChartRange = 30"
              class="px-2 py-0.5 cursor-pointer border-l border-r border-border-dim transition-none"
              :class="[bigChartRange === 30 ? 'bg-accent text-base font-bold' : 'text-neutral-500 hover:text-neutral-300']"
            >
              LAST 30
            </button>
            <button
              @click="bigChartRange = 0"
              class="px-2 py-0.5 cursor-pointer transition-none"
              :class="[bigChartRange === 0 ? 'bg-accent text-base font-bold' : 'text-neutral-500 hover:text-neutral-300']"
            >
              ALL
            </button>
          </div>
        </div>
      </div>

      <div class="w-full h-[200px] bg-base border border-border-dim relative overflow-hidden p-1 flex items-center justify-center">
        <div v-if="bigChartRecords.length < 2" class="text-center text-neutral-600 py-12">
          // NEED 2+ RECORDS WITH SELECTED METRIC
        </div>

        <svg v-else class="w-full h-full" viewBox="0 0 580 200">
          <defs>
            <pattern id="big-chart-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
              <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(38, 38, 38, 0.3)" stroke-width="0.7" />
            </pattern>
          </defs>

          <!-- Hatching area under graph -->
          <path :d="bigSvgAreaPathString" fill="url(#big-chart-hatch)" />

          <!-- Grid horizontal Lines & Y labels -->
          <g v-for="(tick, idx) in bigSvgYTicks" :key="'y-'+idx">
            <line
              :x1="bigSvgConfig.paddingLeft"
              :y1="tick.y"
              :x2="bigSvgConfig.width - bigSvgConfig.paddingRight"
              :y2="tick.y"
              stroke="#262626"
              stroke-width="0.8"
              stroke-dasharray="3,3"
            />
            <text
              :x="bigSvgConfig.paddingLeft - 8"
              :y="tick.y + 3"
              fill="#737373"
              font-size="8px"
              text-anchor="end"
              font-family="monospace"
            >
              {{ tick.val }}{{ bigChartType === 'weight' ? 'k' : bigChartType === 'bodyFat' ? '%' : 'c' }}
            </text>
          </g>

          <!-- Grid vertical Lines & X labels -->
          <g v-for="(tick, idx) in bigSvgXTicks" :key="'x-'+idx">
            <line
              :x1="tick.x"
              :y1="bigSvgConfig.paddingTop"
              :x2="tick.x"
              :y2="bigSvgConfig.height - bigSvgConfig.paddingBottom"
              stroke="#262626"
              stroke-width="0.8"
            />
            <text
              :x="tick.x"
              :y="bigSvgConfig.height - bigSvgConfig.paddingBottom + 12"
              fill="#737373"
              font-size="9px"
              text-anchor="middle"
              font-family="monospace"
            >
              {{ tick.record.date.substring(5) }}
            </text>
          </g>

          <!-- Graph main Path -->
          <path
            :d="bigSvgPathString"
            fill="none"
            stroke="#FF5F1F"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Graph Nodes -->
          <g v-for="(p, idx) in bigSvgPoints" :key="'p-'+idx" :transform="`translate(${p.x}, ${p.y})`">
            <line x1="-4" y1="0" x2="4" y2="0" stroke="#FF5F1F" stroke-width="0.8" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="#FF5F1F" stroke-width="0.8" />
            <circle cx="0" cy="0" r="2.5" fill="#0A0A0A" stroke="#FF5F1F" stroke-width="1.2" />
            <text
              x="0"
              y="-8"
              fill="#d4d4d4"
              font-size="9px"
              font-family="monospace"
              text-anchor="middle"
              class="font-bold"
            >
              {{ p.val }}{{ bigChartType === 'weight' ? '' : bigChartType === 'bodyFat' ? '%' : 'cm' }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Main Grid layout: left 1/3 (metrics + form), right 2/3 (history) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left side: New Record + Metrics + Config -->
      <div class="flex flex-col gap-4">
        <div class="border border-line p-4 bg-surface flex flex-col gap-4">
      
          <div class="border-b border-line pb-1.5 flex justify-between items-center">
            <span class="text-sm font-semibold tracking-wider text-accent">NEW RECORD</span>
            <span class="text-[9px] text-neutral-500 font-mono uppercase tracking-widest">
              {{ editingRecordId ? 'EDITING' : 'LOGGING' }}
            </span>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex gap-3">
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-neutral-500 text-[10px] uppercase tracking-widest">DATE</label>
                <input
                  v-model="inputDate"
                  type="date"
                  class="border border-border-dim p-1.5 bg-base text-neutral-300 outline-none font-mono"
                />
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-neutral-500 text-[10px] uppercase tracking-widest">WT (KG) *</label>
                <input
                  v-model.number="inputWeight"
                  type="number"
                  step="0.1"
                  placeholder="72.5"
                  class="border border-border-dim p-1.5 bg-base text-neutral-300 outline-none font-bold"
                />
              </div>
            </div>

            <div class="flex gap-3">
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-neutral-500 text-[10px] uppercase tracking-widest">BF%</label>
                <input
                  v-model.number="inputBodyFat"
                  type="number"
                  step="0.1"
                  placeholder="19.5"
                  class="border border-border-dim p-1.5 bg-base text-neutral-300 outline-none"
                />
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-neutral-500 text-[10px] uppercase tracking-widest">W/H (CM)</label>
                <div class="flex gap-1.5">
                  <input
                    v-model.number="inputWaist"
                    type="number"
                    step="0.5"
                    placeholder="82"
                    class="flex-1 border border-border-dim p-1.5 bg-base text-neutral-300 outline-none"
                  />
                  <input
                    v-model.number="inputHip"
                    type="number"
                    step="0.5"
                    placeholder="94"
                    class="flex-1 border border-border-dim p-1.5 bg-base text-neutral-300 outline-none"
                  />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-neutral-500 text-[10px] uppercase tracking-widest">NOTES</label>
              <textarea
                v-model="inputNote"
                rows="2"
                placeholder="e.g. morning run, diet, notes..."
                class="border border-border-dim p-1.5 bg-base text-neutral-300 outline-none resize-none"
              ></textarea>
            </div>

            <button
              @click="handleAddRecord"
              class="border border-line px-4 py-2 mt-2 text-xs bg-base text-neutral-300 hover:bg-neutral-200 hover:text-black transition-none cursor-pointer text-center font-bold"
            >
              LOG RECORD
            </button>
        </div>
          </div>
        <!-- 1. Top Indexes and calculated properties -->
        <div class="border border-line p-4 bg-surface flex flex-col gap-3.5">
          <div class="border-b border-line pb-1.5 flex justify-between items-center">
            <span class="text-xs font-semibold tracking-wider text-accent">BODY METRICS</span>
            <span class="text-[9px] bg-base text-neutral-400 border border-border-dim px-2 py-0.5 font-mono">
              {{ gender === 'male' ? 'M' : 'F' }} / {{ age }}Y
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="border border-border-dim p-2 bg-base">
              <p class="text-[10px] text-neutral-500 uppercase tracking-widest">WEIGHT</p>
              <p class="text-base font-bold text-neutral-300 mt-1">{{ latestRecord ? latestRecord.weight : '--' }} <span class="text-[10px] text-neutral-600">kg</span></p>
            </div>
            <div class="border border-border-dim p-2 bg-base">
              <p class="text-[10px] text-neutral-500 uppercase tracking-widest">BODY FAT</p>
              <p class="text-base font-bold text-neutral-300 mt-1">{{ (latestRecord && latestRecord.bodyFat) ? latestRecord.bodyFat : '--' }} <span class="text-[10px] text-neutral-600">%</span></p>
            </div>
            <div class="border border-border-dim p-2 bg-base">
              <p class="text-[10px] text-neutral-500 uppercase tracking-widest">BMR</p>
              <p class="text-base font-bold text-accent mt-1">{{ bmr || '--' }} <span class="text-[10px] text-neutral-600">kcal</span></p>
            </div>
            <div class="border border-border-dim p-2 bg-base">
              <p class="text-[10px] text-neutral-500 uppercase tracking-widest">TDEE</p>
              <p class="text-base font-bold text-neutral-400 mt-1">{{ tdee || '--' }} <span class="text-[10px] text-neutral-600">kcal</span></p>
            </div>
          </div>

          <div class="flex flex-col gap-2.5 mt-1">
            <!-- BMI Section -->
            <div class="border border-border-dim p-2.5 bg-base flex justify-between items-center text-xs">
              <div>
                <span class="text-[10px] text-neutral-500 block uppercase tracking-widest">BMI</span>
                <span class="text-sm font-bold text-neutral-300">{{ bmi }}</span>
                <span class="text-[9px] ml-1.5 font-mono" :class="bmiStatus.class">[{{ bmiStatus.label }}]</span>
              </div>
              <span class="text-[10px] text-neutral-600 text-right max-w-[100px] sm:max-w-[140px] leading-tight">{{ bmiStatus.desc }}</span>
            </div>

            <!-- WHR Section -->
            <div class="border border-border-dim p-2.5 bg-base flex justify-between items-center text-xs">
              <div>
                <span class="text-[10px] text-neutral-500 block uppercase tracking-widest">WHR</span>
                <span class="text-sm font-bold text-neutral-300">{{ whr || '--' }}</span>
                <span class="text-[9px] ml-1.5 font-mono" :class="whrStatus.class">[{{ whrStatus.label }}]</span>
              </div>
              <span class="text-[10px] text-neutral-600 text-right max-w-[100px] sm:max-w-[140px] leading-tight">{{ whrStatus.desc }}</span>
            </div>
          </div>

          <!-- Goal Progress Bar -->
          <div class="border border-border-dim p-2.5 bg-base flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-neutral-500 uppercase tracking-widest">TARGET {{ targetWeight }}kg</span>
              <span class="text-accent font-bold">{{ targetProgressPercent }}%</span>
            </div>
            <div class="w-full h-3 border border-border-dim bg-base relative overflow-hidden p-0.5">
              <div
                class="h-full bg-accent transition-none"
                :style="{ width: `${targetProgressPercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 2. Configurations (Birth, Sex, Height, TargetWeight, Activity level) -->
        <div class="border border-line p-4 bg-surface flex flex-col gap-3 text-xs md:text-sm">
          <div class="border-b border-line pb-1.5">
            <span class="text-xs font-semibold tracking-wider text-neutral-400 uppercase tracking-widest">CONFIGURATION</span>
          </div>

          <div class="flex flex-col gap-2.5 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-neutral-500">GENDER:</span>
              <div class="flex gap-2">
                <button
                  @click="gender = 'male'"
                  class="border px-2.5 py-0.5 text-[10px] transition-none cursor-pointer bg-transparent"
                  :class="[gender === 'male' ? 'bg-accent/20 border-accent text-neutral-300' : 'border-border-dim text-neutral-600']"
                >
                  MALE
                </button>
                <button
                  @click="gender = 'female'"
                  class="border px-2.5 py-0.5 text-[10px] transition-none cursor-pointer bg-transparent"
                  :class="[gender === 'female' ? 'bg-accent/20 border-accent text-neutral-300' : 'border-border-dim text-neutral-600']"
                >
                  FEMALE
                </button>
              </div>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-neutral-500">BIRTH YEAR:</span>
              <input
                v-model.number="birthYear"
                type="number"
                min="1920"
                max="2026"
                class="border border-border-dim p-1 bg-base text-right text-neutral-300 w-[70px] outline-none font-mono text-xs"
              />
            </div>

            <div class="flex justify-between items-center">
              <span class="text-neutral-500">HEIGHT (CM):</span>
              <input
                v-model.number="height"
                type="number"
                class="border border-border-dim p-1 bg-base text-right text-neutral-300 w-[70px] outline-none font-mono"
              />
            </div>

            <div class="flex justify-between items-center">
              <span class="text-neutral-500">TARGET (KG):</span>
              <input
                v-model.number="targetWeight"
                type="number"
                step="0.1"
                class="border border-border-dim p-1 bg-base text-right text-neutral-300 w-[70px] outline-none font-mono"
              />
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-neutral-500">ACTIVITY LEVEL:</span>
              <select
                v-model.number="activityLevel"
                class="border border-border-dim p-1 bg-base text-neutral-300 outline-none w-full font-mono"
              >
                <option :value="1.2">SEDENTARY</option>
                <option :value="1.375">LIGHT</option>
                <option :value="1.55">MODERATE</option>
                <option :value="1.725">HEAVY</option>
              </select>
            </div>
          </div>

          <div class="border-t border-line pt-2.5 flex flex-col gap-2 mt-auto">
            <span class="text-[9px] text-neutral-600 text-center leading-normal uppercase tracking-widest">
              Harris-Benedict Algorithm
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button @click="resetToMock" class="border border-status-warn/50 text-status-warn py-1 text-[10px] cursor-pointer text-center font-bold transition-none">RESET</button>
              <button @click="clearAllRecords" class="border border-status-bad/50 text-status-bad py-1 text-[10px] cursor-pointer text-center font-bold transition-none">CLEAR</button>
            </div>
          </div>
        </div>
      


        

        </div>
        <!-- Right: Log Chronicle Table -->
        <div class="border border-line p-4 bg-surface flex flex-col gap-3 ">
          <div class="border-b border-line pb-1.5 flex justify-between items-center">
            <span class="text-sm font-semibold tracking-wider text-neutral-400 uppercase tracking-widest">HISTORY</span>
            <div class="flex border border-border-dim bg-base overflow-hidden text-[9px]">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="SEARCH..."
                class="w-[120px] px-2 py-0.5 outline-none text-neutral-300 bg-transparent placeholder-neutral-600"
              />
            </div>
          </div>

          <!-- History Table -->
          <div class="flex-grow overflow-y-auto border border-border-dim bg-base" style="min-height: 200px">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface border-b border-border-dim text-[10px] text-neutral-400 uppercase tracking-widest sticky top-0">
                  <th class="p-1.5 sm:p-2 w-[60px] sm:w-[80px]">DATE</th>
                  <th class="p-1.5 sm:p-2 w-[40px] sm:w-[55px]">WT</th>
                  <th class="p-1.5 sm:p-2 w-[30px] sm:w-[40px] hidden sm:table-cell">BF%</th>
                  <th class="p-1.5 sm:p-2 w-[40px] sm:w-[55px] hidden sm:table-cell">W/H</th>
                  <th class="p-1.5 sm:p-2">NOTE</th>
                  <th class="p-1.5 sm:p-2 text-right w-[55px] sm:w-[70px]">ACT</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-dim text-[10px]">
                <tr
                  v-for="r in filteredHistoryRecords.slice().reverse()"
                  :key="r.id"
                  class="hover:bg-surface transition-none"
                >
                  <!-- Row normal mode -->
                  <template v-if="editingRecordId !== r.id">
                    <td class="p-1.5 sm:p-2 font-mono whitespace-nowrap">{{ r.date }}</td>
                    <td class="p-1.5 sm:p-2 font-bold">{{ r.weight }}</td>
                    <td class="p-1.5 sm:p-2 hidden sm:table-cell">{{ r.bodyFat ? `${r.bodyFat}%` : '--' }}</td>
                    <td class="p-1.5 sm:p-2 font-mono whitespace-nowrap hidden sm:table-cell">{{ (r.waist && r.hip) ? `${r.waist}/${r.hip}` : '--' }}</td>
                    <td class="p-1.5 sm:p-2 text-neutral-500 truncate" :title="r.note">{{ r.note || '--' }}</td>
                    <td class="p-1.5 sm:p-2 text-right whitespace-nowrap">
                      <button @click="startEdit(r)" class="text-accent hover:text-neutral-300 mr-2 cursor-pointer">EDIT</button>
                      <button @click="deleteRecord(r.id)" class="text-status-bad hover:text-neutral-300 font-bold cursor-pointer">DEL</button>
                    </td>
                  </template>

                  <!-- Row inline edit mode -->
                  <template v-else>
                    <td class="p-1 whitespace-nowrap">
                      <input v-model="editDate" type="date" class="border border-border-dim bg-base text-[8px] p-0.5 text-neutral-300 w-[70px] sm:w-[80px] font-mono" />
                    </td>
                    <td class="p-1">
                      <input v-model.number="editWeight" type="number" step="0.1" class="border border-border-dim bg-base text-[8px] p-0.5 text-neutral-300 w-[45px] font-bold" />
                    </td>
                    <td class="p-1">
                      <input v-model.number="editBodyFat" type="number" step="0.1" class="border border-border-dim bg-base text-[8px] p-0.5 text-neutral-300 w-[35px]" placeholder="%" />
                    </td>
                    <td class="p-1 whitespace-nowrap flex gap-0.5">
                      <input v-model.number="editWaist" type="number" step="0.5" class="border border-border-dim bg-base text-[8px] p-0.5 text-neutral-300 w-[25px]" placeholder="W" />
                      <input v-model.number="editHip" type="number" step="0.5" class="border border-border-dim bg-base text-[8px] p-0.5 text-neutral-300 w-[25px]" placeholder="H" />
                    </td>
                    <td class="p-1">
                      <input v-model="editNote" type="text" class="border border-border-dim bg-base text-[8px] p-0.5 text-neutral-300 w-full" placeholder="..." />
                    </td>
                    <td class="p-1 text-right whitespace-nowrap">
                      <button @click="saveEdit(r.id)" class="text-status-good font-bold mr-1 cursor-pointer">SAVE</button>
                      <button @click="cancelEdit" class="text-neutral-500 cursor-pointer">ESC</button>
                    </td>
                  </template>
                </tr>
                <tr v-if="filteredHistoryRecords.length === 0">
                  <td colspan="6" class="p-4 text-center text-neutral-600 italic font-mono">NO RECORDS FOUND.</td>
                </tr>
              </tbody>
            </table>
        </div>
      </div>
    </div>

    <!-- Backups controls -->
    <div class="flex justify-between items-center border-t border-line pt-4 mt-2">
      <div class="flex gap-2">
        <input type="file" ref="fileInput" @change="handleImport" class="hidden" />
        <button @click="exportData" class="border border-border-dim px-3 py-1.5 text-[10px] bg-base text-neutral-400 hover:text-black transition-none font-bold cursor-pointer">
          EXPORT JSON
        </button>
        <button @click="triggerImport" class="border border-border-dim px-3 py-1.5 text-[10px] bg-base text-neutral-400 hover:text-black transition-none font-bold cursor-pointer">
          IMPORT JSON
        </button>
      </div>
    </div>
  </div>
</template>
