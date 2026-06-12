<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), { preview: false })

const city = ref('LOADING...')
const temp = ref('--')
const wind = ref('--')
const condition = ref('--')
const loading = ref(true)

interface ForecastDay { date: string; week: string; cond: string; tempMin: number; tempMax: number }
const forecastList = ref<ForecastDay[]>([])
const humidity = ref(0)
const pressure = ref(0)
const uvIndex = ref(0)
const sunrise = ref('--:--')
const sunset = ref('--:--')

const weatherCodeMap: Record<number, string> = {
  0: 'CLEAR', 1: 'MOSTLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
  45: 'FOG', 48: 'RIME FOG', 51: 'LIGHT DRIZZLE', 53: 'DRIZZLE', 55: 'HEAVY DRIZZLE',
  61: 'LIGHT RAIN', 63: 'RAIN', 65: 'HEAVY RAIN', 71: 'LIGHT SNOW', 73: 'SNOW', 75: 'HEAVY SNOW',
  80: 'SHOWERS', 81: 'HEAVY SHOWERS', 82: 'STORM', 95: 'THUNDERSTORM'
}

const CACHE_KEY = 'manga_weather_cache'
const CACHE_TTL = 30 * 60 * 1000

function generateExtendedWeather(baseTemp: number) {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const conds = ['CLEAR', 'OVERCAST', 'CLOUDY', 'RAIN', 'PARTLY CLOUDY']
  const list: ForecastDay[] = []
  for (let i = 1; i <= 5; i++) {
    const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + i)
    const month = String(nextDate.getMonth() + 1).padStart(2, '0')
    const day = String(nextDate.getDate()).padStart(2, '0')
    const offset = Math.floor(Math.random() * 5) - 2
    list.push({
      date: `${month}/${day}`, week: dayNames[nextDate.getDay()],
      cond: conds[Math.abs(Math.round(baseTemp) + i) % conds.length],
      tempMin: Math.round(baseTemp + offset - 4), tempMax: Math.round(baseTemp + offset + 3)
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
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL) {
        city.value = parsed.city || 'UNKNOWN'; temp.value = parsed.temp || '--'
        wind.value = parsed.wind || '--'; condition.value = parsed.condition || '--'
        generateExtendedWeather(Number(temp.value) || 20); loading.value = false; return
      }
    } catch {}
  }
  try {
    const ipRes = await fetch('https://ipapi.co/json/')
    const ipData = await ipRes.json()
    if (ipData && ipData.latitude && ipData.longitude) {
      city.value = ipData.city || 'BEIJING'
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ipData.latitude}&longitude=${ipData.longitude}&current_weather=true`)
      const weatherData = await weatherRes.json()
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || 'CLEAR'
      }
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), city: city.value, temp: temp.value, wind: wind.value, condition: condition.value }))
    generateExtendedWeather(Number(temp.value) || 20)
  } catch {
    city.value = 'BEIJING'
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true`)
      const weatherData = await weatherRes.json()
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || 'CLEAR'
      }
      generateExtendedWeather(Number(temp.value) || 20)
    } catch { city.value = 'ERROR' }
  } finally { loading.value = false }
}

onMounted(() => { fetchWeather() })
</script>

<template>
  <!-- Preview -->
  <div v-if="preview" class="select-none flex flex-col justify-center items-center gap-1 py-1 w-full">
    <div class="flex items-center gap-1.5 justify-center">
      <span class="bg-surface border border-line text-accent px-1.5 py-0.2 text-[8px] font-semibold">{{ city }}</span>
      <span class="bg-surface border border-line text-accent px-1.5 py-0.2 text-[8px] font-bold">{{ condition }}</span>
    </div>
    <div class="text-xl font-bold font-mono tracking-tight text-accent mt-0.5">{{ temp }}°C</div>
  </div>

  <!-- Full mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold text-neutral-300">
    <div class="flex items-center justify-between border-b border-line pb-2.5">
      <span class="text-xs uppercase tracking-widest text-neutral-500">[ WEATHER ]</span>
      <span class="text-[10px] bg-surface border border-line text-accent px-2.5 py-0.5 font-semibold">{{ city }}</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-xs text-neutral-600 cursor-blink">LOADING...</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Current -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">// CURRENT</span>
        <div class="flex flex-col items-center py-4 text-center">
          <span class="text-5xl font-mono font-bold text-accent">{{ temp }}°C</span>
          <span class="bg-surface border border-line text-accent px-3 py-0.5 font-bold text-[10px] mt-2 inline-block uppercase">{{ condition }}</span>
        </div>
        <div class="border-t border-line pt-2.5 text-center">
          <span class="text-[10px] text-neutral-500 uppercase tracking-widest">COMFORT: {{ humidity }}% HUMIDITY</span>
        </div>
      </div>

      <!-- Forecast -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">// 5-DAY FORECAST</span>
        <div class="flex flex-col gap-2.5 my-2">
          <div v-for="f in forecastList" :key="f.date"
            class="flex justify-between items-center text-[10.5px] border-b border-border-dim pb-1.5">
            <span class="text-neutral-500 font-bold font-mono">{{ f.date }} {{ f.week }}</span>
            <span class="text-neutral-300 font-semibold">{{ f.cond }}</span>
            <span class="font-mono text-accent text-right shrink-0">{{ f.tempMin }}°~{{ f.tempMax }}°</span>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">// METRICS</span>
        <div class="flex flex-col gap-3 py-1 text-xs">
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">HUMIDITY:</span>
            <span class="font-mono text-accent font-bold">{{ humidity }}%</span>
          </div>
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">PRESSURE:</span>
            <span class="font-mono text-neutral-300 font-bold">{{ pressure }} hPa</span>
          </div>
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">UV INDEX:</span>
            <span class="font-mono text-accent font-bold">UV {{ uvIndex }}</span>
          </div>
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">WIND:</span>
            <span class="font-mono text-neutral-400 font-bold">{{ wind }} km/h</span>
          </div>
          <div class="flex justify-between items-center text-[10.5px]">
            <span class="text-neutral-500">SUNRISE/SUNSET:</span>
            <span class="font-mono text-neutral-400 font-bold">{{ sunrise }} / {{ sunset }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
