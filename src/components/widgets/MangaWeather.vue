<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t, locale } from '../../i18n'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), { preview: false })

const city = ref(t('hitokoto.loading'))
const temp = ref('--')
const wind = ref('--')
const condition = ref('devtools.clear')
const loading = ref(true)

interface ForecastDay { date: string; week: string; cond: string; tempMin: number; tempMax: number }
const forecastList = ref<ForecastDay[]>([])
const humidity = ref(0)
const pressure = ref(0)
const uvIndex = ref(0)
const sunrise = ref('--:--')
const sunset = ref('--:--')

const weatherCodeMap: Record<number, string> = {
  0: 'devtools.clear', 1: 'weather.mostly.clear', 2: 'weather.partly.cloudy', 3: 'weather.overcast',
  45: 'weather.fog', 48: 'weather.fog', 51: 'weather.drizzle', 53: 'weather.drizzle', 55: 'weather.drizzle',
  61: 'weather.rain', 63: 'weather.rain', 65: 'weather.heavy.rain', 71: 'weather.snow', 73: 'weather.snow', 75: 'weather.heavy.snow',
  80: 'weather.showers', 81: 'weather.showers', 82: 'weather.storm', 95: 'weather.thunderstorm'
}

const CACHE_KEY = 'manga_weather_cache'
const CACHE_TTL = 30 * 60 * 1000

function generateExtendedWeather(baseTemp: number) {
  const dayNames = locale.value === 'zh'
    ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const conds = ['devtools.clear', 'weather.overcast', 'weather.cloudy', 'weather.rain', 'weather.partly.cloudy']
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
        wind.value = parsed.wind || '--'; condition.value = parsed.condition || 'devtools.clear'
        generateExtendedWeather(Number(temp.value) || 20); loading.value = false; return
      }
    } catch {}
  }
  try {
    const ipRes = await fetch('https://ip-api.com/json/?fields=status,message,city,lat,lon')
    const ipData = await ipRes.json()
    if (ipData && ipData.lat && ipData.lon) {
      city.value = ipData.city || t('clock.beijing')
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ipData.lat}&longitude=${ipData.lon}&current_weather=true`)
      const weatherData = await weatherRes.json()
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || 'devtools.clear'
      }
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), city: city.value, temp: temp.value, wind: wind.value, condition: condition.value }))
    window.dispatchEvent(new CustomEvent('manga-weather-updated'))
    generateExtendedWeather(Number(temp.value) || 20)
  } catch {
    city.value = t('clock.beijing')
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true`)
      const weatherData = await weatherRes.json()
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || 'devtools.clear'
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), city: city.value, temp: temp.value, wind: wind.value, condition: condition.value }))
      window.dispatchEvent(new CustomEvent('manga-weather-updated'))
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
      <span class="bg-surface border border-line text-accent px-1.5 py-0.2 text-[8px] font-bold">{{ $t(condition) }}</span>
    </div>
    <div class="text-xl font-bold font-mono tracking-tight text-accent mt-0.5">{{ temp }}°C</div>
  </div>

  <!-- Full mode -->
  <div v-else class="w-full flex flex-col gap-3 font-bold text-neutral-300">
    <div class="flex items-center justify-end border-b border-line pb-2.5">
      <span class="text-[10px] bg-surface border border-line text-accent px-2.5 py-0.5 font-semibold">{{ city }}</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-xs text-neutral-600 cursor-blink">{{ $t('hitokoto.loading') }}</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Current -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">{{ $t('weather.current') }}</span>
        <div class="flex flex-col items-center py-4 text-center">
          <span class="text-5xl font-mono font-bold text-accent">{{ temp }}°C</span>
          <span class="bg-surface border border-line text-accent px-3 py-0.5 font-bold text-[10px] mt-2 inline-block uppercase">{{ $t(condition) }}</span>
        </div>
        <div class="border-t border-line pt-2.5 text-center">
          <span class="text-[10px] text-neutral-500 uppercase tracking-widest">{{ $t('weather.comfort') }}: {{ humidity }}% {{ $t('weather.humidity') }}</span>
        </div>
      </div>

      <!-- Forecast -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">// {{ $t('weather.5day') }} {{ $t('weather.forecast') }}</span>
        <div class="flex flex-col gap-2.5 my-2">
          <div v-for="f in forecastList" :key="f.date"
            class="flex justify-between items-center text-[10.5px] border-b border-border-dim pb-1.5">
            <span class="text-neutral-500 font-bold font-mono">{{ f.date }} {{ f.week }}</span>
            <span class="text-neutral-300 font-semibold">{{ $t(f.cond) }}</span>
            <span class="font-mono text-accent text-right shrink-0">{{ f.tempMin }}°~{{ f.tempMax }}°</span>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">{{ $t('weather.metrics') }}</span>
        <div class="flex flex-col gap-3 py-1 text-xs">
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">{{ $t('weather.humidity') }}:</span>
            <span class="font-mono text-accent font-bold">{{ humidity }}%</span>
          </div>
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">{{ $t('weather.pressure') }}:</span>
            <span class="font-mono text-neutral-300 font-bold">{{ pressure }} hPa</span>
          </div>
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">{{ $t('weather.uv') }}:</span>
            <span class="font-mono text-accent font-bold">UV {{ uvIndex }}</span>
          </div>
          <div class="flex justify-between items-center border-b border-border-dim pb-1.5">
            <span class="text-neutral-500">{{ $t('weather.wind') }}:</span>
            <span class="font-mono text-neutral-400 font-bold">{{ wind }} km/h</span>
          </div>
          <div class="flex justify-between items-center text-[10.5px]">
            <span class="text-neutral-500">{{ $t('weather.sunrise.sunset') }}:</span>
            <span class="font-mono text-neutral-400 font-bold">{{ sunrise }} / {{ sunset }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
