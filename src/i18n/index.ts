import { ref, watch } from 'vue'

export type Locale = 'zh' | 'en'

const STORAGE_KEY = 'manga_locale'

const locale = ref<Locale>((localStorage.getItem(STORAGE_KEY) as Locale) || 'zh')

watch(locale, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
})

export function useI18n() {
  function setLocale(l: Locale) {
    locale.value = l
  }

  function toggleLocale() {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
  }

  return { locale, setLocale, toggleLocale }
}

// Simple translation function — merges zh + en maps
const zhMap: Record<string, string> = {}
const enMap: Record<string, string> = {}

export function registerTranslations(zh: Record<string, string>, en: Record<string, string>) {
  Object.assign(zhMap, zh)
  Object.assign(enMap, en)
}

export function t(key: string): string {
  if (locale.value === 'zh') return zhMap[key] ?? key
  return enMap[key] ?? key
}

// Make t reactive — re-evaluates when locale changes
export { locale }
