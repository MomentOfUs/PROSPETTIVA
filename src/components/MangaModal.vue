<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  show: boolean
  title: string
  maxWidthClass?: string
}>(), {
  maxWidthClass: 'max-w-lg'
})

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
}>()

const modalRef = ref<HTMLElement | null>(null)

function close() {
  emit('update:show', false)
}

function getFocusableElements(): HTMLElement[] {
  if (!modalRef.value) return []
  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(modalRef.value.querySelectorAll(selector)) as HTMLElement[]
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }

  if (e.key === 'Tab') {
    const focusable = getFocusableElements()
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (e.shiftKey) {
      if (active === first || !focusable.includes(active as HTMLElement)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !focusable.includes(active as HTMLElement)) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

function hasChinese(text: string): boolean {
  return /[一-鿿㐀-䶿]/.test(text)
}

watch(() => props.show, async (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      const firstInput = focusable.find(el => el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
      ;(firstInput || focusable[0]).focus()
    }
  } else {
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
  <div
    v-if="show"
    ref="modalRef"
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    @keydown="handleKeydown"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- Overlay -->
    <div
      @click="close"
      class="absolute inset-0 bg-black/80 z-0"
      aria-hidden="true"
    ></div>

    <!-- Modal Box -->
    <div :class="['relative bg-base border border-line p-6 w-full z-10 flex flex-col gap-4 text-neutral-300', maxWidthClass]" style="max-height: 95vh;">
      <!-- Header -->
      <div class="flex justify-between items-center border-b border-line pb-3">
        <h3 class="text-sm font-bold tracking-widest uppercase text-accent">
          <template v-if="hasChinese(title)">
            <span class="text-neutral-600 font-normal mr-1">[</span>
            {{ title }}
            <span class="text-neutral-600 font-normal ml-1">]</span>
          </template>
          <template v-else>
            {{ title }}
          </template>
        </h3>
        <button
          @click="close"
          class="border border-line bg-surface text-neutral-400 hover:bg-neutral-300 hover:text-base hover:border-neutral-300 w-7 h-7 flex items-center justify-center font-bold transition-none cursor-pointer"
          aria-label="CLOSE"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[80vh] py-2 text-neutral-300">
        <slot />
      </div>

      <!-- Footer (optional) -->
      <div v-if="$slots.footer" class="border-t border-line pt-3 flex justify-end gap-3">
        <slot name="footer" />
      </div>
    </div>
  </div>
  </Teleport>
</template>
