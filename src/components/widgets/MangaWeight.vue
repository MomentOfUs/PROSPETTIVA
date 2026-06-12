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
  waist?: number // 腰围 cm
  hip?: number   // 臀围 cm
  note?: string
}

const records = ref<WeightRecord[]>([])
const height = ref(175) // cm
const targetWeight = ref(70) // kg
const birthYear = ref(1995) // 出生年份
const gender = ref<'male' | 'female'>('male')
const activityLevel = ref(1.375) // 活动系数

// Form states for adding (Card & Modal shared/synced)
const inputWeight = ref<number | null>(null)
const inputBodyFat = ref<number | null>(null)
const inputWaist = ref<number | null>(null)
const inputHip = ref<number | null>(null)
const inputDate = ref(new Date().toISOString().split('T')[0])
const inputNote = ref('')

// Form states for editing
const editingRecordId = ref<string | null>(null)
const editWeight = ref<number | null>(null)
const editBodyFat = ref<number | null>(null)
const editWaist = ref<number | null>(null)
const editHip = ref<number | null>(null)
const editDate = ref('')
const editNote = ref('')

// Search state
const searchQuery = ref('')

// Statistics Expand state

// Big Chart options in modal
const bigChartRange = ref<7 | 30 | 0>(7) // 7 days, 30 days, 0 (all)
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
    // Mock records: 7 days ago to today
    records.value = [
      { id: 'r1', date: '2026-06-06', weight: 75.2, bodyFat: 21.0, waist: 88, hip: 96, note: '文艺大餐了一顿' },
      { id: 'r2', date: '2026-06-07', weight: 74.8, bodyFat: 20.8, waist: 87, hip: 96, note: '负重急行3公里' },
      { id: 'r3', date: '2026-06-08', weight: 74.3, bodyFat: 20.5, waist: 86, hip: 95, note: '节食静修一日' },
      { id: 'r4', date: '2026-06-09', weight: 74.5, bodyFat: 20.6, waist: 87, hip: 95, note: '宵夜大危机' },
      { id: 'r5', date: '2026-06-10', weight: 73.8, bodyFat: 20.2, waist: 85, hip: 94, note: '健身房挥汗举铁' },
      { id: 'r6', date: '2026-06-11', weight: 73.4, bodyFat: 19.9, waist: 85, hip: 94, note: '重力势能降低！' },
      { id: 'r7', date: '2026-06-12', weight: 72.8, bodyFat: 19.5, waist: 84, hip: 93, note: '星轨大盘逼近目标' }
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

// Add new weight record
function handleAddRecord() {
  if (!inputWeight.value || inputWeight.value <= 0) {
    alert('请输入有效的体重数值')
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
  
  // Sort by date
  records.value.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Reset fields
  inputWeight.value = null
  inputBodyFat.value = null
  inputWaist.value = null
  inputHip.value = null
  inputNote.value = ''
  
}

function deleteRecord(id: string) {
  if (confirm('确定要删除这条体重记录吗？')) {
    records.value = records.value.filter(r => r.id !== id)
    if (editingRecordId.value === id) {
      editingRecordId.value = null
    }
  }
}

// Edit Record Helpers
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
    alert('请输入有效的体重数值')
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
    
    // Sort records by date
    records.value.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  editingRecordId.value = null
}

// Reset data to defaults
function resetToMock() {
  if (confirm('确定要重置并恢复经典测星轨 Mock 数据吗？当前记录将被覆盖。')) {
    localStorage.removeItem('manga_weight_records')
    loadData()
  }
}

// Clear all records
function clearAllRecords() {
  if (confirm('警告！确定要清空所有体重记录吗？此操作无法撤销！')) {
    records.value = []
  }
}

// Data search/filter
const filteredHistoryRecords = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return records.value
  return records.value.filter(r => 
    r.date.includes(query) || 
    (r.note && r.note.toLowerCase().includes(query)) ||
    r.weight.toString().includes(query)
  )
})

// Computations
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
  if (val <= 0) return { label: '无数据', class: 'text-status-neutral', desc: '暂无测定' }
  if (val < 18.5) return { label: '轻盈灵动', class: 'text-status-info', desc: '宜补充膳食营养' }
  if (val < 24.0) return { label: '匀称适中', class: 'text-status-good', desc: '完美状态，继续保持' }
  if (val < 28.0) return { label: '丰腴稳健', class: 'text-status-warn', desc: '重力势能微幅偏高' }
  return { label: '厚重超凡', class: 'text-status-bad', desc: '需控制星轨重力' }
})

// Age calculation
const age = computed(() => {
  const currentYear = new Date().getFullYear()
  return Math.max(1, currentYear - birthYear.value)
})

// BMR (Harris-Benedict Equation)
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

// TDEE (Total Daily Energy Expenditure)
const tdee = computed(() => {
  return Math.round(bmr.value * activityLevel.value)
})

// WHR (Waist to Hip Ratio)
const whr = computed(() => {
  if (!latestRecord.value || !latestRecord.value.waist || !latestRecord.value.hip) return 0
  return Number((latestRecord.value.waist / latestRecord.value.hip).toFixed(2))
})

const whrStatus = computed(() => {
  const val = whr.value
  if (val <= 0) return { label: '未测量', class: 'text-status-neutral', desc: '腰围及臀围未录入' }
  if (gender.value === 'male') {
    if (val < 0.90) return { label: '匀称对称', class: 'text-status-good', desc: '身段比例标准，健康度佳' }
    if (val <= 0.95) return { label: '比例微宽', class: 'text-status-warn', desc: '腹腔脂肪稍厚，宜有氧' }
    return { label: '浑圆沉重', class: 'text-status-bad', desc: '中心重力聚集，预警风险' }
  } else {
    if (val < 0.80) return { label: '黄金身型', class: 'text-status-good', desc: '优雅黄金比例，继续维持' }
    if (val <= 0.85) return { label: '丰姿微起', class: 'text-status-warn', desc: '身段微显丰盈，适度控糖' }
    return { label: '体态丰腴', class: 'text-status-bad', desc: '腰围占比偏高，宜力量训练' }
  }
})

// Progress percentage towards target
const targetProgressPercent = computed(() => {
  if (records.value.length === 0) return 0
  const start = records.value[0].weight
  const current = latestRecord.value ? latestRecord.value.weight : start
  const target = targetWeight.value
  
  if (start === target) return 100
  const totalNeed = start - target
  const achieved = start - current
  
  if (totalNeed > 0) {
    // weight loss
    if (current <= target) return 100
    if (current >= start) return 0
    return Math.min(100, Math.max(0, Math.round((achieved / totalNeed) * 100)))
  } else {
    // weight gain
    if (current >= target) return 100
    if (current <= start) return 0
    return Math.min(100, Math.max(0, Math.round((achieved / totalNeed) * 100)))
  }
})

// BIG CHART LOGIC (Modal view, quantative with coordinates)
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
  
  // Only show up to 6 date ticks to prevent overlapping
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
    // Always include last element
    if (!ticks.includes(pts[pts.length - 1])) {
      ticks.push(pts[pts.length - 1])
    }
    return ticks
  }
})

// Export / Import Data helpers
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
        alert('导入成功，星盘重力轨迹已合并更新！')
      } else {
        alert('格式错误，未能识别星盘记录数据。')
      }
    } catch {
      alert('解析失败，请确保导入有效的数据文件。')
    }
  }
  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <!-- Preview Mode -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1 font-serif py-1 text-cream w-full">
    <div v-if="latestRecord" class="flex flex-col items-center gap-0.5">
      <div class="text-xl font-bold font-mono tracking-tight text-gold">
        {{ latestRecord.weight }} <span class="text-[9px] font-serif opacity-75">kg</span>
      </div>
      <div class="flex gap-2 text-[9px] opacity-85 mt-0.5">
        <span class="bg-[#120e0c]/60 border border-[#d4af37]/15 px-1.5 py-0.2 rounded text-parchment">BMI: {{ bmi }}</span>
        <span v-if="latestRecord.bodyFat" class="bg-[#120e0c]/60 border border-[#d4af37]/15 px-1.5 py-0.2 rounded text-parchment">体脂: {{ latestRecord.bodyFat }}%</span>
      </div>
    </div>
    <div v-else class="text-center text-[9px] text-gold/40 py-2 italic">
      暂无星体运行记录。
    </div>
  </div>

  <!-- Full Mode -->
  <div v-else class="w-full flex flex-col gap-5 font-bold font-serif text-cream">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">⚖️ 天体重量运行规</span>
    </div>

    <!-- Top: Large Quantitative Astronomy Line Chart -->
    <div class="border border-[#d4af37]/35 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3">
      <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
        <span class="text-sm font-semibold tracking-wider text-[#d4af37] flex items-center gap-1.5">
          📈 星重轨迹大谱线 (Astronomical Plot Chart)
        </span>
        <div class="flex items-center gap-4">
          <!-- Metric switches -->
          <div class="flex border border-[#d4af37]/30 rounded bg-[#120e0c] overflow-hidden text-[9px]">
            <button 
              @click="bigChartType = 'weight'"
              class="px-2.5 py-0.5 cursor-pointer hover:bg-[#1a1512] transition-colors"
              :class="[bigChartType === 'weight' ? 'bg-[#d4af37]/20 text-[#f5f2eb] font-bold' : 'text-[#ebdcb9]/50']"
            >
              体重
            </button>
            <button 
              @click="bigChartType = 'bodyFat'"
              class="px-2.5 py-0.5 cursor-pointer border-l border-r border-[#d4af37]/25 hover:bg-[#1a1512] transition-colors"
              :class="[bigChartType === 'bodyFat' ? 'bg-[#d4af37]/20 text-[#f5f2eb] font-bold' : 'text-[#ebdcb9]/50']"
            >
              体脂
            </button>
            <button 
              @click="bigChartType = 'waist'"
              class="px-2.5 py-0.5 cursor-pointer hover:bg-[#1a1512] transition-colors"
              :class="[bigChartType === 'waist' ? 'bg-[#d4af37]/20 text-[#f5f2eb] font-bold' : 'text-[#ebdcb9]/50']"
            >
              腰围
            </button>
          </div>

          <!-- Range switches -->
          <div class="flex border border-[#d4af37]/30 rounded bg-[#120e0c] overflow-hidden text-[9px]">
            <button 
              @click="bigChartRange = 7"
              class="px-2 py-0.5 cursor-pointer hover:bg-[#1a1512] transition-colors"
              :class="[bigChartRange === 7 ? 'bg-[#ebdcb9] text-[#120e0c] font-bold' : 'text-[#ebdcb9]/60']"
            >
              近7次
            </button>
            <button 
              @click="bigChartRange = 30"
              class="px-2 py-0.5 cursor-pointer border-l border-r border-[#d4af37]/25 hover:bg-[#1a1512] transition-colors"
              :class="[bigChartRange === 30 ? 'bg-[#ebdcb9] text-[#120e0c] font-bold' : 'text-[#ebdcb9]/60']"
            >
              近30次
            </button>
            <button 
              @click="bigChartRange = 0"
              class="px-2 py-0.5 cursor-pointer hover:bg-[#1a1512] transition-colors"
              :class="[bigChartRange === 0 ? 'bg-[#ebdcb9] text-[#120e0c] font-bold' : 'text-[#ebdcb9]/60']"
            >
              全部
            </button>
          </div>
        </div>
      </div>

      <div class="w-full h-[200px] bg-[#120e0c]/90 border border-[#d4af37]/20 rounded relative overflow-hidden p-1 shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <div v-if="bigChartRecords.length < 2" class="text-center text-status-neutral/60 py-12">
          需要录入至少两条带有所选指标的数据以测定星图谱线...
        </div>
        
        <svg v-else class="w-full h-full" viewBox="0 0 580 200">
          <defs>
            <pattern id="big-chart-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
              <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(212, 175, 55, 0.04)" stroke-width="0.7" />
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
              stroke="rgba(212, 175, 55, 0.08)" 
              stroke-width="0.8" 
              stroke-dasharray="3,3"
            />
            <text 
              :x="bigSvgConfig.paddingLeft - 8" 
              :y="tick.y + 3" 
              fill="#ebdcb9" 
              font-size="8px" 
              text-anchor="end" 
              font-family="serif"
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
              stroke="rgba(212, 175, 55, 0.05)" 
              stroke-width="0.8"
            />
            <text
              :x="tick.x"
              :y="bigSvgConfig.height - bigSvgConfig.paddingBottom + 12"
              fill="#ebdcb9"
              font-size="9px"
              text-anchor="middle"
              font-family="serif"
            >
              {{ tick.record.date.substring(5) }}
            </text>
          </g>

          <!-- Graph main Path -->
          <path 
            :d="bigSvgPathString" 
            fill="none" 
            stroke="#d4af37" 
            stroke-width="1.8" 
            stroke-linecap="round"
            stroke-linejoin="round"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.5))"
          />

          <!-- Graph Nodes -->
          <g v-for="(p, idx) in bigSvgPoints" :key="'p-'+idx" :transform="`translate(${p.x}, ${p.y})`">
            <!-- Astronomical Star Points -->
            <line x1="-4" y1="0" x2="4" y2="0" stroke="#d4af37" stroke-width="0.8" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="#d4af37" stroke-width="0.8" />
            <circle cx="0" cy="0" r="2.5" fill="#120e0c" stroke="#d4af37" stroke-width="1.2" />
            <text
              x="0"
              y="-8"
              fill="#f5f2eb"
              font-size="9px"
              font-family="serif"
              text-anchor="middle"
              class="font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              {{ p.val }}{{ bigChartType === 'weight' ? '' : bigChartType === 'bodyFat' ? '%' : 'cm' }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Main Grid layout for wide viewport -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left side (1/3 width): Measurements and configurations -->
      <div class="flex flex-col gap-4">
        <!-- 1. Top Indexes and calculated properties -->
        <div class="border border-[#d4af37]/35 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3.5">
          <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
            <span class="text-xs font-semibold tracking-wider text-[#d4af37]">🪐 人体经纬与能量测算</span>
            <span class="text-[9px] bg-btn-base text-[#ebdcb9] border border-[#d4af37]/30 px-2 py-0.5 rounded font-mono">
              观测人：{{ gender === 'male' ? '绅士 (Male)' : '淑女 (Female)' }} / {{ age }} 岁
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="border border-[#d4af37]/20 p-2 rounded bg-[#1a1512]/60">
              <p class="text-[10px] text-[#ebdcb9]/60">最新星重 (Weight)</p>
              <p class="text-base font-bold text-[#f5f2eb] mt-1">{{ latestRecord ? latestRecord.weight : '--' }} <span class="text-[10px] text-[#ebdcb9]/70">kg</span></p>
            </div>
            <div class="border border-[#d4af37]/20 p-2 rounded bg-[#1a1512]/60">
              <p class="text-[10px] text-[#ebdcb9]/60">最新体脂率 (Body Fat)</p>
              <p class="text-base font-bold text-[#f5f2eb] mt-1">{{ (latestRecord && latestRecord.bodyFat) ? latestRecord.bodyFat : '--' }} <span class="text-[10px] text-[#ebdcb9]/70">%</span></p>
            </div>
            <div class="border border-[#d4af37]/20 p-2 rounded bg-[#1a1512]/60">
              <p class="text-[10px] text-[#ebdcb9]/60">基础代谢率 (BMR)</p>
              <p class="text-base font-bold text-[#d4af37] mt-1">{{ bmr || '--' }} <span class="text-[10px] text-[#ebdcb9]/70">kcal</span></p>
            </div>
            <div class="border border-[#d4af37]/20 p-2 rounded bg-[#1a1512]/60">
              <p class="text-[10px] text-[#ebdcb9]/60">每日总能消耗 (TDEE)</p>
              <p class="text-base font-bold text-[#ebdcb9] mt-1">{{ tdee || '--' }} <span class="text-[10px] text-[#ebdcb9]/70">kcal</span></p>
            </div>
          </div>

          <div class="flex flex-col gap-2.5 mt-1">
            <!-- BMI Section -->
            <div class="border border-[#d4af37]/20 p-2.5 rounded bg-[#1a1512]/40 flex justify-between items-center text-xs">
              <div>
                <span class="text-[10px] text-[#ebdcb9]/50 block">重力质量指数 (BMI)</span>
                <span class="text-sm font-bold text-[#f5f2eb]">{{ bmi }}</span>
                <span class="text-[9px] ml-1.5 font-mono" :class="bmiStatus.class">[{{ bmiStatus.label }}]</span>
              </div>
              <span class="text-[10px] text-[#ebdcb9]/70 text-right max-w-[140px] leading-tight">{{ bmiStatus.desc }}</span>
            </div>

            <!-- WHR Section -->
            <div class="border border-[#d4af37]/20 p-2.5 rounded bg-[#1a1512]/40 flex justify-between items-center text-xs">
              <div>
                <span class="text-[10px] text-[#ebdcb9]/50 block">腰臀比例度 (WHR)</span>
                <span class="text-sm font-bold text-[#f5f2eb]">{{ whr || '--' }}</span>
                <span class="text-[9px] ml-1.5 font-mono" :class="whrStatus.class">[{{ whrStatus.label }}]</span>
              </div>
              <span class="text-[10px] text-[#ebdcb9]/70 text-right max-w-[140px] leading-tight">{{ whrStatus.desc }}</span>
            </div>
          </div>

          <!-- Goal Progress Bar -->
          <div class="border border-[#d4af37]/20 p-2.5 rounded bg-[#1a1512]/40 flex flex-col gap-1.5">
            <div class="flex justify-between items-center text-[10px]">
              <span class="text-[#ebdcb9]/50">星轨减重修业目标进度 (目标: {{ targetWeight }} kg)</span>
              <span class="text-[#d4af37] font-bold">{{ targetProgressPercent }}%</span>
            </div>
            <div class="w-full h-3 border border-[#d4af37]/35 rounded bg-[#120e0c] relative overflow-hidden p-0.5">
              <div 
                class="h-full bg-gradient-to-r from-[#6e5020] to-[#d4af37] rounded-sm transition-all duration-500"
                :style="{ width: `${targetProgressPercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 2. Configurations (Birth, Sex, Height, TargetWeight, Activity level) -->
        <div class="border border-[#d4af37]/35 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3 text-xs md:text-sm">
          <div class="border-b border-[#d4af37]/20 pb-1.5">
            <span class="text-xs font-semibold tracking-wider text-[#ebdcb9]">⚖️ 个人法度修制</span>
          </div>

          <div class="flex flex-col gap-2.5 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-[#ebdcb9]/60">性别 (Gender):</span>
              <div class="flex gap-2">
                <button 
                  @click="gender = 'male'"
                  class="border px-2.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer bg-transparent"
                  :class="[gender === 'male' ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f5f2eb]' : 'border-[#d4af37]/20 text-[#ebdcb9]/40']"
                >
                  乾 (男)
                </button>
                <button 
                  @click="gender = 'female'"
                  class="border px-2.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer bg-transparent"
                  :class="[gender === 'female' ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#f5f2eb]' : 'border-[#d4af37]/20 text-[#ebdcb9]/40']"
                >
                  坤 (女)
                </button>
              </div>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-[#ebdcb9]/60">出生年份 (Birth Year):</span>
              <input 
                v-model.number="birthYear" 
                type="number" 
                min="1920" 
                max="2026"
                class="border border-[#d4af37]/35 p-1 rounded bg-[#120e0c] text-right text-[#f5f2eb] w-[70px] outline-none font-serif text-xs"
              />
            </div>

            <div class="flex justify-between items-center">
              <span class="text-[#ebdcb9]/60">测量身高 (Height, cm):</span>
              <input 
                v-model.number="height" 
                type="number" 
                class="border border-[#d4af37]/35 p-1 rounded bg-[#120e0c] text-right text-[#f5f2eb] w-[70px] outline-none font-serif"
              />
            </div>

            <div class="flex justify-between items-center">
              <span class="text-[#ebdcb9]/60">目标重力 (Target kg):</span>
              <input 
                v-model.number="targetWeight" 
                type="number" 
                step="0.1"
                class="border border-[#d4af37]/35 p-1 rounded bg-[#120e0c] text-right text-[#f5f2eb] w-[70px] outline-none font-serif"
              />
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-[#ebdcb9]/60">日常肉身劳作强度 (Activity):</span>
              <select 
                v-model.number="activityLevel"
                class="border border-[#d4af37]/35 p-1 rounded bg-[#120e0c] text-[#f5f2eb] outline-none w-full font-serif"
              >
                <option :value="1.2">静息少动 (静坐修道生活)</option>
                <option :value="1.375">轻度活动 (每周1-3次舒展)</option>
                <option :value="1.55">中度活动 (每周3-5次铁炼)</option>
                <option :value="1.725">重度活动 (每日高负荷苦力)</option>
              </select>
            </div>
          </div>

          <div class="border-t border-[#d4af37]/20 pt-2.5 flex flex-col gap-2 mt-auto">
            <span class="text-[9px] text-[#ebdcb9]/40 text-center leading-normal">
              ※ 本系统严格依照文艺复兴人体测绘及近代 Harris-Benedict 能量算法评估运行轨迹。
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button @click="resetToMock" class="border border-status-warn/50 text-status-warn hover:bg-status-warn/10 py-1 rounded text-[10px] cursor-pointer text-center font-bold">重置数据</button>
              <button @click="clearAllRecords" class="border border-status-bad/50 text-status-bad hover:bg-status-bad/10 py-1 rounded text-[10px] cursor-pointer text-center font-bold">清空记录</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Add / Edit Form & History Log Table -->
      <!-- Left: Quick Entry / Record Form -->
      <div class="border border-[#d4af37]/35 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-4">
          <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
            <span class="text-sm font-semibold tracking-wider text-[#d4af37]">✒️ 撰录天体运行轨道</span>
            <span class="text-[9px] text-[#ebdcb9]/50 font-serif">
              {{ editingRecordId ? '编辑墨记' : '录入新轨' }}
            </span>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex gap-3">
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-[#ebdcb9]/60">日期</label>
                <input 
                  v-model="inputDate" 
                  type="date" 
                  class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-[#f5f2eb] outline-none font-mono"
                />
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-[#ebdcb9]/60">体重 (kg) *</label>
                <input 
                  v-model.number="inputWeight" 
                  type="number" 
                  step="0.1" 
                  placeholder="如 72.5"
                  class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-[#f5f2eb] outline-none font-bold"
                />
              </div>
            </div>

            <div class="flex gap-3">
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-[#ebdcb9]/60">体脂率 (%)</label>
                <input 
                  v-model.number="inputBodyFat" 
                  type="number" 
                  step="0.1" 
                  placeholder="如 19.5"
                  class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-[#f5f2eb] outline-none"
                />
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-[#ebdcb9]/60">腰围 (cm)</label>
                <input 
                  v-model.number="inputWaist" 
                  type="number" 
                  step="0.5" 
                  placeholder="如 82"
                  class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-[#f5f2eb] outline-none"
                />
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-[#ebdcb9]/60">臀围 (cm)</label>
                <input 
                  v-model.number="inputHip" 
                  type="number" 
                  step="0.5" 
                  placeholder="如 94"
                  class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-[#f5f2eb] outline-none"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[#ebdcb9]/60">修业手札备注</label>
              <textarea 
                v-model="inputNote" 
                rows="2"
                placeholder="在此录入晨跑、饮食、状态手记..."
                class="border border-[#d4af37]/35 p-1.5 rounded bg-[#120e0c] text-[#f5f2eb] outline-none resize-none"
              ></textarea>
            </div>

            <button 
              @click="handleAddRecord"
              class="border border-[#d4af37]/45 px-4 py-2 mt-2 rounded text-xs bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] transition-all cursor-pointer text-center font-bold shadow-md"
            >
              登录大盘星历
            </button>
          </div>
        </div>

        <!-- Right: Log Chronicle Table -->
        <div class="border border-[#d4af37]/35 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col gap-3">
          <div class="border-b border-[#d4af37]/20 pb-1.5 flex justify-between items-center">
            <span class="text-sm font-semibold tracking-wider text-[#ebdcb9]">📜 星重编年修成史</span>
            <div class="flex border border-[#d4af37]/25 rounded bg-[#120e0c]/60 overflow-hidden text-[9px]">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="检索备注/数值..." 
                class="w-[120px] px-2 py-0.5 outline-none text-[#f5f2eb] bg-transparent placeholder-placeholder"
              />
            </div>
          </div>

          <!-- History Table -->
          <div class="flex-grow overflow-y-auto max-h-[200px] border border-[#d4af37]/15 rounded bg-[#120e0c]/40 shadow-inner">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[#1a1512]/90 border-b border-[#d4af37]/25 text-[10px] text-[#ebdcb9]">
                  <th class="p-2">日期</th>
                  <th class="p-2">体重</th>
                  <th class="p-2">体脂</th>
                  <th class="p-2">腰臀</th>
                  <th class="p-2">备注</th>
                  <th class="p-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#d4af37]/10 text-[10px]">
                <tr 
                  v-for="r in filteredHistoryRecords.slice().reverse()" 
                  :key="r.id"
                  class="hover:bg-[#1a1512]/30 transition-colors"
                >
                  <!-- Row normal mode -->
                  <template v-if="editingRecordId !== r.id">
                    <td class="p-2 font-mono whitespace-nowrap">{{ r.date }}</td>
                    <td class="p-2 font-bold">{{ r.weight }} kg</td>
                    <td class="p-2">{{ r.bodyFat ? `${r.bodyFat}%` : '--' }}</td>
                    <td class="p-2 font-mono">{{ (r.waist && r.hip) ? `${r.waist}/${r.hip}` : '--' }}</td>
                    <td class="p-2 text-[#ebdcb9]/70 truncate max-w-[90px]" :title="r.note">{{ r.note || '--' }}</td>
                    <td class="p-2 text-right whitespace-nowrap">
                      <button @click="startEdit(r)" class="text-[#d4af37] hover:text-[#f5f2eb] mr-2 cursor-pointer">✎ 编辑</button>
                      <button @click="deleteRecord(r.id)" class="text-status-bad hover:text-delete-hover font-bold cursor-pointer">× 删</button>
                    </td>
                  </template>
                  
                  <!-- Row inline edit mode -->
                  <template v-else>
                    <td class="p-1 whitespace-nowrap">
                      <input v-model="editDate" type="date" class="border border-[#d4af37]/35 bg-[#120e0c] text-[8px] p-0.5 rounded text-[#f5f2eb] w-[80px]" />
                    </td>
                    <td class="p-1">
                      <input v-model.number="editWeight" type="number" step="0.1" class="border border-[#d4af37]/35 bg-[#120e0c] text-[8px] p-0.5 rounded text-[#f5f2eb] w-[45px] font-bold" />
                    </td>
                    <td class="p-1">
                      <input v-model.number="editBodyFat" type="number" step="0.1" class="border border-[#d4af37]/35 bg-[#120e0c] text-[8px] p-0.5 rounded text-[#f5f2eb] w-[35px]" placeholder="%" />
                    </td>
                    <td class="p-1 whitespace-nowrap flex gap-0.5">
                      <input v-model.number="editWaist" type="number" step="0.5" class="border border-[#d4af37]/35 bg-[#120e0c] text-[8px] p-0.5 rounded text-[#f5f2eb] w-[25px]" placeholder="腰" />
                      <input v-model.number="editHip" type="number" step="0.5" class="border border-[#d4af37]/35 bg-[#120e0c] text-[8px] p-0.5 rounded text-[#f5f2eb] w-[25px]" placeholder="臀" />
                    </td>
                    <td class="p-1">
                      <input v-model="editNote" type="text" class="border border-[#d4af37]/35 bg-[#120e0c] text-[8px] p-0.5 rounded text-[#f5f2eb] w-full" placeholder="备注..." />
                    </td>
                    <td class="p-1 text-right whitespace-nowrap">
                      <button @click="saveEdit(r.id)" class="text-status-good hover:text-status-good/80 font-bold mr-1 cursor-pointer">保存</button>
                      <button @click="cancelEdit" class="text-status-neutral hover:text-parchment cursor-pointer">取消</button>
                    </td>
                  </template>
                </tr>
                <tr v-if="filteredHistoryRecords.length === 0">
                  <td colspan="6" class="p-4 text-center text-[#ebdcb9]/40 italic font-serif">未观测到任何天体运行历史记录。</td>
                </tr>
              </tbody>
            </table>
        </div>
      </div>
    </div>

    <!-- Backups controls -->
    <div class="flex justify-between items-center border-t border-[#d4af37]/20 pt-4 mt-2">
      <div class="flex gap-2">
        <input type="file" ref="fileInput" @change="handleImport" class="hidden" />
        <button @click="exportData" class="border border-[#d4af37]/45 px-3 py-1.5 rounded text-[10px] bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] transition-all font-bold cursor-pointer">
          📤 备份并导出星盘数据
        </button>
        <button @click="triggerImport" class="border border-[#d4af37]/45 px-3 py-1.5 rounded text-[10px] bg-btn-base text-[#ebdcb9] hover:bg-btn-hover hover:text-[#d4af37] transition-all font-bold cursor-pointer">
          📥 导入备份星盘数据
        </button>
      </div>
    </div>
  </div>
</template>
