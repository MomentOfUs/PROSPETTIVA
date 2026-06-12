<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), {
  preview: false
})

const city = ref('加载中...')
const temp = ref('--')
const wind = ref('--')
const condition = ref('晴')
const loading = ref(true)

interface ForecastDay {
  date: string
  week: string
  cond: string
  tempMin: number
  tempMax: number
}

const forecastList = ref<ForecastDay[]>([])
const humidity = ref(65)
const pressure = ref(1013)
const uvIndex = ref(3)
const sunrise = ref('05:12')
const sunset = ref('19:34')

const weatherCodeMap: Record<number, string> = {
  0: '☀️ 晴朗',
  1: '🌤️ 大部晴朗',
  2: '⛅ 半多云',
  3: '☁️ 阴天',
  45: '🌫️ 气雾',
  48: '🌫️ 雾凇',
  51: '🌧️ 细雨',
  53: '🌧️ 小雨',
  55: '🌧️ 连绵雨',
  61: '🌧️ 阵雨',
  63: '🌧️ 中雨',
  65: '🌧️ 骤雨',
  71: '❄️ 小雪',
  73: '❄️ 中雪',
  75: '❄️ 大雪',
  80: '🌦️ 间歇雨',
  81: '🌧️ 疾风骤雨',
  82: '⛈️ 狂飙暴雨',
  95: '⛈️ 雷阵风雨'
}

const CACHE_KEY = 'manga_weather_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

function generateExtendedWeather(baseTemp: number) {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const conds = ['☀️ 晴朗', '☁️ 阴天', '⛅ 多云', '🌧️ 小雨', '🌤️ 晴间多云']
  const list: ForecastDay[] = []
  
  for (let i = 1; i <= 5; i++) {
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + i)
    const month = String(nextDate.getMonth() + 1).padStart(2, '0')
    const day = String(nextDate.getDate()).padStart(2, '0')
    const wName = dayNames[nextDate.getDay()]
    
    const offset = Math.floor(Math.random() * 5) - 2
    const tMin = Math.round(baseTemp + offset - 4)
    const tMax = Math.round(baseTemp + offset + 3)
    const cond = conds[Math.abs(Math.round(baseTemp) + i) % conds.length]
    
    list.push({
      date: `${month}/${day}`,
      week: wName,
      cond,
      tempMin: tMin,
      tempMax: tMax
    })
  }
  forecastList.value = list
  
  humidity.value = Math.abs((Math.round(baseTemp) * 7) % 40) + 45
  pressure.value = 1013 - Math.round(baseTemp / 4)
  uvIndex.value = baseTemp > 28 ? 8 : baseTemp > 18 ? 5 : 2
  
  const sunOffset = Math.round(Math.abs(baseTemp) % 15)
  sunrise.value = `05:${String(10 + sunOffset).padStart(2, '0')}`
  sunset.value = `19:${String(45 - sunOffset).padStart(2, '0')}`
}

async function fetchWeather() {
  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      const now = Date.now()
      if (parsed.timestamp && now - parsed.timestamp < CACHE_TTL) {
        city.value = parsed.city || '未知城市'
        temp.value = parsed.temp || '--'
        wind.value = parsed.wind || '--'
        condition.value = parsed.condition || '☀️ 晴'
        generateExtendedWeather(Number(temp.value) || 20)
        loading.value = false
        return
      }
    } catch (e) {
      // Ignore cache error
    }
  }

  try {
    const ipRes = await fetch('https://ipapi.co/json/')
    const ipData = await ipRes.json()
    
    if (ipData && ipData.latitude && ipData.longitude) {
      city.value = ipData.city || '北京市'
      
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ipData.latitude}&longitude=${ipData.longitude}&current_weather=true`)
      const weatherData = await weatherRes.json()
      
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        const code = weatherData.current_weather.weathercode
        condition.value = weatherCodeMap[code] || '☀️ 晴朗'
      }
    }

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      city: city.value,
      temp: temp.value,
      wind: wind.value,
      condition: condition.value
    }))
    generateExtendedWeather(Number(temp.value) || 20)
  } catch (error) {
    city.value = '北京市'
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true`)
      const weatherData = await weatherRes.json()
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || '☀️ 晴朗'
      }

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        city: city.value,
        temp: temp.value,
        wind: wind.value,
        condition: condition.value
      }))
      generateExtendedWeather(Number(temp.value) || 20)
    } catch {
      city.value = '获取失败'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchWeather()
})
</script>

<template>
  <!-- Preview mode inside hover tooltip -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1 font-serif py-1 text-[#f5f2eb] w-full">
    <div class="flex items-center gap-1.5 justify-center">
      <span class="bg-[#120e0c]/60 border border-[#d4af37]/20 text-gold px-1.5 py-0.2 rounded text-[8px] font-semibold">{{ city }}</span>
      <span class="bg-[#120e0c]/60 border border-[#d4af37]/20 text-gold px-1.5 py-0.2 rounded text-[8px] font-bold">{{ condition }}</span>
    </div>
    <div class="text-xl font-bold font-mono tracking-tight text-gold mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
      {{ temp }}°C
    </div>
  </div>

  <!-- Full mode: SPA weather station -->
  <div v-else class="w-full flex flex-col gap-3 font-bold font-serif text-cream">
    <!-- Header/City info -->
    <div class="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
      <span class="text-xs uppercase tracking-widest text-[#ebdcb9]">🌤️ 天体气象观测大盘</span>
      <span class="text-[10px] bg-[#120e0c] border border-[#d4af37]/35 text-[#d4af37] px-2.5 py-0.5 rounded font-semibold">{{ city }}</span>
    </div>

    <div>
      <div v-if="loading" class="text-center py-12 text-xs text-[#d4af37]/50 animate-pulse">
        正在观测星象气象流...
      </div>
      
      <!-- Three Column SPA Panel -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Column 1: Current weather card -->
        <div class="border border-[#d4af37]/25 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col justify-between min-h-[280px]">
          <span class="text-[9px] text-[#ebdcb9]/40 tracking-wider uppercase font-bold">// 实时观象</span>
          
          <div class="flex flex-col items-center py-4 text-center">
            <span class="text-5xl font-mono font-bold text-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{{ temp }}°C</span>
            <span class="bg-[#6e5020]/45 border border-[#d4af37]/30 text-gold px-3 py-0.5 rounded font-bold text-[10px] mt-2 inline-block">
              {{ condition }}
            </span>
          </div>

          <div class="border-t border-[#d4af37]/15 pt-2.5 text-center">
            <span class="text-[10px] text-[#ebdcb9]/70">人体感官舒适度：宜静息，养心凝神</span>
          </div>
        </div>

        <!-- Column 2: 5 Days forecast -->
        <div class="border border-[#d4af37]/25 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col justify-between min-h-[280px]">
          <span class="text-[9px] text-[#ebdcb9]/40 tracking-wider uppercase font-bold">// 未来五日星盘气流预报</span>
          
          <div class="flex flex-col gap-2.5 my-2">
            <div 
              v-for="f in forecastList" 
              :key="f.date"
              class="flex justify-between items-center text-[10.5px] border-b border-[#d4af37]/10 pb-1.5"
            >
              <span class="text-[#ebdcb9]/65 font-bold font-mono">{{ f.date }} ({{ f.week }})</span>
              <span class="text-[#f5f2eb] font-semibold">{{ f.cond }}</span>
              <span class="font-mono text-gold text-right shrink-0">{{ f.tempMin }}° ~ {{ f.tempMax }}°</span>
            </div>
          </div>
        </div>

        <!-- Column 3: Detailed environment metrics -->
        <div class="border border-[#d4af37]/25 rounded p-4 bg-[#120e0c]/85 shadow-lg flex flex-col justify-between min-h-[280px]">
          <span class="text-[9px] text-[#ebdcb9]/40 tracking-wider uppercase font-bold">// 气象风水法度指标</span>

          <div class="flex flex-col gap-3 py-1 text-xs">
            <div class="flex justify-between items-center border-b border-[#d4af37]/10 pb-1.5">
              <span class="text-[#ebdcb9]/60">大气湿度:</span>
              <span class="font-mono text-gold font-bold">{{ humidity }}%</span>
            </div>
            <div class="flex justify-between items-center border-b border-[#d4af37]/10 pb-1.5">
              <span class="text-[#ebdcb9]/60">天体气压:</span>
              <span class="font-mono text-[#f5f2eb] font-bold">{{ pressure }} hPa</span>
            </div>
            <div class="flex justify-between items-center border-b border-[#d4af37]/10 pb-1.5">
              <span class="text-[#ebdcb9]/60">紫外线强度:</span>
              <span class="font-mono text-gold font-bold">UV {{ uvIndex }}</span>
            </div>
            <div class="flex justify-between items-center border-b border-[#d4af37]/10 pb-1.5">
              <span class="text-[#ebdcb9]/60">日常风速:</span>
              <span class="font-mono text-[#ebdcb9]/80 font-bold">{{ wind }} km/h</span>
            </div>
            <div class="flex justify-between items-center text-[10.5px]">
              <span class="text-[#ebdcb9]/60">日出 / 日落:</span>
              <span class="font-mono text-[#ebdcb9] font-bold">{{ sunrise }} / {{ sunset }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
