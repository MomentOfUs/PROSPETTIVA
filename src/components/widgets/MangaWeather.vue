<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MangaCard from '../MangaCard.vue'
import { useCollapsible } from '../../composables/useCollapsible'

const { collapsed, toggle } = useCollapsible('weather')

const city = ref('加载中...')
const temp = ref('--')
const wind = ref('--')
const condition = ref('晴')
const loading = ref(true)

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

async function fetchWeather() {
  try {
    const ipRes = await fetch('https://ipapi.co/json/')
    const ipData = await ipRes.json()
    
    if (ipData && ipData.latitude && ipData.longitude) {
      city.value = ipData.city || '未知城市'
      
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ipData.latitude}&longitude=${ipData.longitude}&current_weather=true`)
      const weatherData = await weatherRes.json()
      
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        const code = weatherData.current_weather.weathercode
        condition.value = weatherCodeMap[code] || '☀️ 晴'
      }
    }
  } catch (error) {
    city.value = '北京市'
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true`)
      const weatherData = await weatherRes.json()
      if (weatherData && weatherData.current_weather) {
        temp.value = String(Math.round(weatherData.current_weather.temperature))
        wind.value = String(weatherData.current_weather.windspeed)
        condition.value = weatherCodeMap[weatherData.current_weather.weathercode] || '☀️ 晴'
      }
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
  <MangaCard class="w-full max-w-[280px] select-none flex flex-col gap-2 font-bold font-serif" :hover-shift="true">
    <div class="text-sm border-b border-[#d4af37]/20 pb-1.5 uppercase tracking-widest flex justify-between items-center font-serif text-[#ebdcb9]">
      <span>🌤️ 观象问晴雨</span>
      <div class="flex items-center gap-1.5">
        <span class="text-[9px] bg-[#120e0c] border border-[#d4af37]/35 text-[#d4af37]/80 px-2 py-0.5 rounded font-serif font-semibold">{{ city }}</span>
        <button @click="toggle" class="text-gold/40 hover:text-gold transition-all cursor-pointer p-0.5" :title="collapsed ? '展开' : '收起'">
          <span class="text-[10px] transition-transform duration-300 inline-block" :class="collapsed ? 'rotate-180' : ''">▼</span>
        </button>
      </div>
    </div>

    <Transition name="collapse">
    <div v-show="!collapsed" class="flex flex-col gap-2">
    <div v-if="loading" class="text-center py-6 text-xs text-[#d4af37]/50 animate-pulse">
      正在观测星象气流...
    </div>
    <div v-else class="flex items-center justify-between py-2">
      <div class="text-3xl font-bold font-serif text-[#d4af37] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
        {{ temp }}°C
      </div>
      <div class="flex flex-col text-right text-xs gap-0.5">
        <span class="bg-[#120e0c] border border-[#d4af37]/45 text-[#f5f2eb] px-2 py-0.5 rounded text-[9px] shadow-[0_2px_5px_rgba(0,0,0,0.4)] font-bold inline-block self-end font-serif">
          {{ condition }}
        </span>
        <span class="text-[#ebdcb9]/70 mt-1.5 font-medium font-serif">风速: {{ wind }} km/h</span>
      </div>
    </div>
    </div>
    </Transition>
  </MangaCard>
</template>

