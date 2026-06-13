import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerTranslations, t } from './i18n'
import { zh } from './i18n/zh'
import { en } from './i18n/en'

registerTranslations(zh, en)

const app = createApp(App)
app.config.globalProperties.$t = t
app.mount('#app')
