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
    name: '古典日晷时计',
    description: '显示当前真实的时间和日期',
    icon: 'Clock',
    defaultEnabled: true,
    position: 'header',
    component: defineAsyncComponent(() => import('./widgets/MangaClock.vue'))
  },
  {
    id: 'search',
    name: '乾坤检索大堂',
    description: '多引擎切换的学术/网页检索栏',
    icon: 'Search',
    defaultEnabled: true,
    position: 'search',
    component: defineAsyncComponent(() => import('./widgets/MangaSearch.vue'))
  },
  {
    id: 'sysinfo',
    name: '天机仪性能监测',
    description: '模拟硬件CPU、内存和磁盘状态',
    icon: 'Cpu',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaSysInfo.vue'))
  },
  {
    id: 'weather',
    name: '观象气象测绘',
    description: '自动定位IP获取当前温度和天气',
    icon: 'CloudRain',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaWeather.vue'))
  },
  {
    id: 'hitokoto',
    name: '先哲经典箴言',
    description: '拉取每日一句哲理经典励志言语',
    icon: 'MessageSquare',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaHitokoto.vue'))
  },
  {
    id: 'ipcard',
    name: '网络出口星盘',
    description: '检测公网IP、国家和ISP运营商',
    icon: 'Globe',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaIpCard.vue'))
  },
  {
    id: 'aichat',
    name: '哲人对谈秘记',
    description: '支持自定义 DeepSeek/GPT API 的学者对话',
    icon: 'Bot',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaAiChat.vue'))
  },
  {
    id: 'todo',
    name: '每日待办修业',
    description: '随手记录与管理日常小任务',
    icon: 'CheckSquare',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaTodo.vue'))
  },
  {
    id: 'notes',
    name: '秘语手札便签',
    description: '自动保存灵感与加密便签小记',
    icon: 'FileText',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaNotes.vue'))
  },
  {
    id: 'weight',
    name: '天体重量运行规',
    description: '记录与监控体重体脂、BMI及历史趋势',
    icon: 'Activity',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaWeight.vue'))
  },
  {
    id: 'snippet',
    name: '秘法咒语快传',
    description: '快速保存与复制高频命令或常用话术片段',
    icon: 'FileCode',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaSnippet.vue'))
  },
  {
    id: 'devtools',
    name: '天工开物换算仪',
    description: '时间戳、JSON 美化与 Base64 编解码效率工具',
    icon: 'Wrench',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaDevTools.vue'))
  },
  {
    id: 'countdown',
    name: '命途星纪倒计时',
    description: '纪念日、节假日及重要上线 Deadline 计时盘',
    icon: 'Hourglass',
    defaultEnabled: true,
    position: 'dashboard',
    component: defineAsyncComponent(() => import('./widgets/MangaCountdown.vue'))
  }
]
