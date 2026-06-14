import { defineAsyncComponent } from 'vue'

export interface WidgetDef {
  id: string
  name: string
  description: string
  icon: string // Lucide icon name
  defaultEnabled: boolean
  component: any
  position?: 'header' | 'search' | 'dashboard'
}

export const availableWidgets: WidgetDef[] = [
  {
    id: 'clock',
    name: 'CLOCK',
    description: 'Real-time system clock and world timezones',
    icon: 'Clock',
    defaultEnabled: true,
    position: 'header',
    component: defineAsyncComponent(() => import('./widgets/MangaClock.vue'))
  },
  {
    id: 'search',
    name: 'SEARCH',
    description: 'Multi-engine query routing terminal',
    icon: 'Search',
    defaultEnabled: true,
    position: 'search',
    component: defineAsyncComponent(() => import('./widgets/MangaSearch.vue'))
  },
  {
    id: 'sysinfo',
    name: 'SYS_MON',
    description: 'Hardware resource telemetry (CPU/RAM/DISK)',
    icon: 'Cpu',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaSysInfo.vue'))
  },
  {
    id: 'weather',
    name: 'WEATHER',
    description: 'Auto-locate IP for temperature and conditions',
    icon: 'CloudRain',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaWeather.vue'))
  },
  {
    id: 'hitokoto',
    name: 'QUOTE',
    description: 'Daily philosophical and motivational quote feed',
    icon: 'MessageSquare',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaHitokoto.vue'))
  },
  {
    id: 'ipcard',
    name: 'NET',
    description: 'Public IP, geolocation and ISP detection',
    icon: 'Globe',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaIpCard.vue'))
  },
  {
    id: 'aichat',
    name: 'CHAT',
    description: 'Custom DeepSeek/GPT API conversation node',
    icon: 'Bot',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaAiChat.vue'))
  },
  {
    id: 'todo',
    name: 'TASKS',
    description: 'Daily task tracking and kanban board',
    icon: 'CheckSquare',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaTodo.vue'))
  },
  {
    id: 'notes',
    name: 'NOTES',
    description: 'Encrypted notepad with auto-save',
    icon: 'FileText',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaNotes.vue'))
  },
  {
    id: 'weight',
    name: 'BIO',
    description: 'Weight, body fat, BMI and trend analytics',
    icon: 'Activity',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaWeight.vue'))
  },
  {
    id: 'snippet',
    name: 'SNIPPET',
    description: 'Quick-save and copy frequent command snippets',
    icon: 'FileCode',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaSnippet.vue'))
  },
  {
    id: 'devtools',
    name: 'DEVTOOLS',
    description: 'Timestamp, JSON, Base64, URL, hash, radix, JWT utilities',
    icon: 'Wrench',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaDevTools.vue'))
  },
  {
    id: 'countdown',
    name: 'TIMER',
    description: 'Event countdown and deadline tracking',
    icon: 'Hourglass',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaCountdown.vue'))
  },
  {
    id: 'radio',
    name: 'CHIP_TUNE',
    description: '8-Bit retro soundscapes and white noise synthesizer',
    icon: 'Radio',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaRadio.vue'))
  }
]
