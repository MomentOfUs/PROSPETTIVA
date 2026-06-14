<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { t, locale } from '../../i18n'

const props = withDefaults(defineProps<{
  preview?: boolean
}>(), { preview: false })

const city = ref(t('hitokoto.loading'))
const temp = ref('--')
const wind = ref('--')
const condition = ref('devtools.clear')
const loading = ref(true)

// Editable City States
const isEditingCity = ref(false)
const cityInput = ref('')
const cityInputRef = ref<HTMLInputElement | null>(null)
const geocodingError = ref(false)

const isCustomCityActive = computed(() => {
  return !!localStorage.getItem('manga_weather_custom_city')
})

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

// Helper to determine condition category for icon animation
const weatherCondition = computed(() => {
  const condKey = condition.value || 'devtools.clear'
  if (condKey.includes('rain') || condKey.includes('drizzle') || condKey.includes('showers')) {
    return 'rain'
  } else if (condKey.includes('cloudy') || condKey.includes('overcast') || condKey.includes('cloud')) {
    return 'cloud'
  } else if (condKey.includes('snow')) {
    return 'snow'
  } else if (condKey.includes('storm') || condKey.includes('thunderstorm')) {
    return 'storm'
  } else if (condKey.includes('fog')) {
    return 'fog'
  } else {
    return 'clear'
  }
})

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
  // Read custom city coordinates
  const customCityStr = localStorage.getItem('manga_weather_custom_city')
  let customCity: { name: string; lat: number; lon: number } | null = null
  if (customCityStr) {
    try {
      customCity = JSON.parse(customCityStr)
    } catch {}
  }

  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      const cacheMatches = customCity
        ? (parsed.city === customCity.name && parsed.lat === customCity.lat && parsed.lon === customCity.lon)
        : !parsed.isCustom

      if (cacheMatches && parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL) {
        city.value = parsed.city || 'UNKNOWN'
        temp.value = parsed.temp || '--'
        wind.value = parsed.wind || '--'
        condition.value = parsed.condition || 'devtools.clear'
        generateExtendedWeather(Number(temp.value) || 20)
        loading.value = false
        return
      }
    } catch {}
  }

  try {
    let lat: number
    let lon: number
    let cityName: string

    if (customCity) {
      lat = customCity.lat
      lon = customCity.lon
      cityName = customCity.name
    } else {
      const ipRes = await fetch('https://ip-api.com/json/?fields=status,message,city,lat,lon')
      const ipData = await ipRes.json()
      if (ipData && ipData.lat && ipData.lon) {
        lat = ipData.lat
        lon = ipData.lon
        cityName = ipData.city || t('clock.beijing')
      } else {
        lat = 39.9042
        lon = 116.4074
        cityName = t('clock.beijing')
      }
    }

    city.value = cityName
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
    const weatherData = await weatherRes.json()
    if (weatherData && weatherData.current_weather) {
      temp.value = String(Math.round(weatherData.current_weather.temperature))
      wind.value = String(weatherData.current_weather.windspeed)
      condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || 'devtools.clear'
    }

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      city: city.value,
      temp: temp.value,
      wind: wind.value,
      condition: condition.value,
      lat,
      lon,
      isCustom: !!customCity
    }))
    window.dispatchEvent(new CustomEvent('manga-weather-updated'))
    generateExtendedWeather(Number(temp.value) || 20)
  } catch {
    if (!customCity) {
      city.value = t('clock.beijing')
      try {
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true`)
        const weatherData = await weatherRes.json()
        if (weatherData && weatherData.current_weather) {
          temp.value = String(Math.round(weatherData.current_weather.temperature))
          wind.value = String(weatherData.current_weather.windspeed)
          condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || 'devtools.clear'
        }
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          city: city.value,
          temp: temp.value,
          wind: wind.value,
          condition: condition.value,
          lat: 39.9042,
          lon: 116.4074,
          isCustom: false
        }))
        window.dispatchEvent(new CustomEvent('manga-weather-updated'))
        generateExtendedWeather(Number(temp.value) || 20)
      } catch { city.value = 'ERROR' }
    } else {
      city.value = 'ERROR'
    }
  } finally { loading.value = false }
}

function startEditCity() {
  cityInput.value = city.value === 'ERROR' || city.value.includes('...') ? '' : city.value
  isEditingCity.value = true
  nextTick(() => {
    cityInputRef.value?.focus()
  })
}

function cancelEditCity() {
  setTimeout(() => {
    isEditingCity.value = false
    geocodingError.value = false
  }, 200)
}

async function saveCity() {
  const queryName = cityInput.value.trim()
  if (!queryName) {
    isEditingCity.value = false
    return
  }
  loading.value = true
  try {
    const lang = locale.value === 'zh' ? 'zh' : 'en'
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryName)}&count=1&language=${lang}`)
    const geoData = await geoRes.json()
    if (geoData && geoData.results && geoData.results.length > 0) {
      const match = geoData.results[0]
      const displayName = match.country_code ? `${match.name}, ${match.country_code}` : match.name
      const customCity = {
        name: displayName,
        lat: match.latitude,
        lon: match.longitude
      }
      localStorage.setItem('manga_weather_custom_city', JSON.stringify(customCity))
      sessionStorage.removeItem(CACHE_KEY)
      isEditingCity.value = false
      geocodingError.value = false
      await fetchWeather()
    } else {
      geocodingError.value = true
      loading.value = false
      setTimeout(() => {
        geocodingError.value = false
      }, 2000)
    }
  } catch (err) {
    console.error('Geocoding error:', err)
    geocodingError.value = true
    loading.value = false
    setTimeout(() => {
      geocodingError.value = false
    }, 2000)
  }
}

async function resetToAuto() {
  localStorage.removeItem('manga_weather_custom_city')
  sessionStorage.removeItem(CACHE_KEY)
  isEditingCity.value = false
  geocodingError.value = false
  loading.value = true
  await fetchWeather()
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
    <div class="flex items-center justify-between border-b border-line pb-2.5 w-full">
      <span class="text-[9px] text-neutral-600 uppercase tracking-widest">// WEATHER CONSOLE</span>
      
      <!-- Interactive City Selection -->
      <div class="flex items-center gap-2">
        <template v-if="isEditingCity">
          <input
            v-model="cityInput"
            @keydown.enter="saveCity"
            @keydown.esc="isEditingCity = false"
            @blur="cancelEditCity"
            ref="cityInputRef"
            type="text"
            class="text-[10px] bg-input border px-2 py-0.5 font-semibold font-mono focus:outline-none w-36 transition-colors duration-200"
            :class="geocodingError ? 'border-bad text-bad' : 'border-accent text-accent'"
            :placeholder="geocodingError ? $t('weather.city.notfound').toUpperCase() : $t('weather.city.placeholder').toUpperCase()"
          />
        </template>
        <template v-else>
          <button
            @click="startEditCity"
            class="text-[10px] bg-surface hover:bg-neutral-900 border border-line hover:border-accent text-accent px-2.5 py-0.5 font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
            :title="$t('weather.city.edit')"
          >
            <span>{{ city }}</span>
            <span class="text-neutral-500 text-[8px] font-normal">[EDIT]</span>
          </button>
        </template>

        <!-- Auto location fallback button -->
        <button
          v-if="isCustomCityActive"
          @mousedown.prevent="resetToAuto"
          class="text-[9px] bg-surface hover:bg-neutral-900 border border-line hover:border-accent text-neutral-400 hover:text-accent px-2 py-0.5 font-semibold cursor-pointer transition-colors"
        >
          📍 {{ $t('weather.city.auto').toUpperCase() }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-xs text-neutral-600 cursor-blink">{{ $t('weather.loading') }}</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Current weather card with large animated SVG -->
      <div class="border border-line p-4 bg-surface flex flex-col justify-between min-h-[280px]">
        <span class="text-[9px] text-neutral-600 tracking-wider uppercase font-bold">{{ $t('weather.current') }}</span>
        
        <div class="flex flex-col items-center py-2 text-center select-none">
          <!-- Animated Weather SVG -->
          <svg viewBox="0 0 40 40" class="w-16 h-16 text-accent mb-2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 晴天: 太阳 -->
            <template v-if="weatherCondition === 'clear'">
              <g class="animate-weather-sun">
                <circle cx="20" cy="20" r="6" stroke="currentColor" stroke-width="1.8" fill="none"/>
                <line x1="20" y1="4" x2="20" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="20" y1="32" x2="20" y2="36" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="4" y1="20" x2="8" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="32" y1="20" x2="36" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="8.1" y1="8.1" x2="11" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="29" y1="29" x2="31.9" y2="31.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="31.9" y1="8.1" x2="29" y2="11" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
                <line x1="11" y1="29" x2="8.1" y2="31.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>
              </g>
            </template>
            <!-- 阴天: 云朵 -->
            <template v-else-if="weatherCondition === 'cloud'">
              <g class="animate-weather-cloud">
                <path d="M8 28 Q8 20 16 20 Q16 13 24 13 Q32 13 32 21 Q37 21 37 27 Q37 33 31 33 L10 33 Q4 33 4 27 Q4 21 8 21 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </g>
            </template>
            <!-- 雨天: 云+雨 -->
            <template v-else-if="weatherCondition === 'rain'">
              <g class="animate-weather-cloud">
                <path d="M7 22 Q7 16 14 16 Q14 10 21 10 Q28 10 28 17 Q33 17 33 22 Q33 27 27 27 L8 27 Q3 27 3 22 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </g>
              <g class="animate-weather-rain-1">
                <line x1="11" y1="31" x2="9" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
              </g>
              <g class="animate-weather-rain-2">
                <line x1="18" y1="31" x2="16" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
              </g>
              <g class="animate-weather-rain-3">
                <line x1="25" y1="31" x2="23" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
              </g>
            </template>
            <!-- 雪天: 云+雪花 -->
            <template v-else-if="weatherCondition === 'snow'">
              <g class="animate-weather-cloud">
                <path d="M7 22 Q7 16 14 16 Q14 10 21 10 Q28 10 28 17 Q33 17 33 22 Q33 27 27 27 L8 27 Q3 27 3 22 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </g>
              <g class="animate-weather-snow-1">
                <line x1="11" y1="32" x2="11" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                <line x1="8" y1="35" x2="14" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
              </g>
              <g class="animate-weather-snow-2">
                <line x1="19" y1="32" x2="19" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                <line x1="16" y1="35" x2="22" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
              </g>
              <g class="animate-weather-snow-3">
                <line x1="27" y1="32" x2="27" y2="38" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
                <line x1="24" y1="35" x2="30" y2="35" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
              </g>
            </template>
            <!-- 雷暴: 云+闪电 -->
            <template v-else-if="weatherCondition === 'storm'">
              <g class="animate-weather-cloud-storm">
                <path d="M7 20 Q7 14 14 14 Q14 8 21 8 Q28 8 28 15 Q33 15 33 20 Q33 25 27 25 L8 25 Q3 25 3 20 Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </g>
              <g class="animate-weather-lightning">
                <polyline points="22,28 16,35 20,35 14,43" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" fill="none"/>
              </g>
            </template>
            <!-- 雾天 -->
            <template v-else>
              <g class="animate-weather-fog-1"><line x1="6" y1="14" x2="34" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></g>
              <g class="animate-weather-fog-2"><line x1="10" y1="20" x2="34" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></g>
              <g class="animate-weather-fog-3"><line x1="6" y1="26" x2="30" y2="26" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></g>
              <g class="animate-weather-fog-4"><line x1="10" y1="32" x2="34" y2="32" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></g>
            </template>
          </svg>

          <span class="text-3xl font-mono font-bold text-accent">{{ temp }}°C</span>
          <span class="bg-surface border border-line text-accent px-3 py-0.5 font-bold text-[10px] mt-1.5 inline-block uppercase">{{ $t(condition) }}</span>
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
