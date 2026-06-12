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

// Focus trap: find all focusable elements inside the modal
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
      // Shift+Tab: wrap to last if on first
      if (active === first || !focusable.includes(active as HTMLElement)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      // Tab: wrap to first if on last
      if (active === last || !focusable.includes(active as HTMLElement)) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

// Body scroll lock + auto-focus first element when modal opens
watch(() => props.show, async (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    // Auto-focus first focusable element (skip the close button, focus content)
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      // Focus the first input if available, otherwise the first element
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
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 isolate"
    @keydown="handleKeydown"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- Overlay -->
    <div
      @click="close"
      class="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity z-0"
      aria-hidden="true"
    ></div>

    <!-- Modal Box -->
    <div :class="['relative bg-bg-modal border border-gold/50 p-6 rounded shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_0_0_1px_rgba(212,175,55,0.15)] w-full z-10 flex flex-col gap-4 text-cream animate-in zoom-in-95 duration-250 overflow-hidden font-serif', maxWidthClass]" style="max-height: 90vh;">
      <!-- Double border inset container -->
      <div class="absolute inset-1.5 border border-gold/15 pointer-events-none rounded"></div>

      <!-- Classical manuscript corner marks -->
      <div class="absolute top-3.5 left-3.5 w-3 h-3 border-t border-l border-gold/30 pointer-events-none"></div>
      <div class="absolute top-3.5 right-3.5 w-3 h-3 border-t border-r border-gold/30 pointer-events-none"></div>
      <div class="absolute bottom-3.5 left-3.5 w-3 h-3 border-b border-l border-gold/30 pointer-events-none"></div>
      <div class="absolute bottom-3.5 right-3.5 w-3 h-3 border-b border-r border-gold/30 pointer-events-none"></div>

      <!-- Header -->
      <div class="flex justify-between items-center border-b border-gold/30 pb-3.5 relative z-10">
        <h3 class="text-xl font-bold tracking-widest font-serif text-gold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          {{ title }}
        </h3>
        <button
          @click="close"
          class="border border-gold/40 bg-btn-base text-parchment hover:bg-reset hover:text-gold w-7 h-7 rounded flex items-center justify-center font-bold transition-all shadow-[0_2px_6px_rgba(0,0,0,0.3)] cursor-pointer focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-modal focus-visible:outline-none"
          aria-label="关闭对话框"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[65vh] py-2 text-parchment font-serif relative z-10">
        <slot />
      </div>

      <!-- Footer (optional) -->
      <div v-if="$slots.footer" class="border-t border-gold/20 pt-4 flex justify-end gap-3 relative z-10">
        <slot name="footer" />
      </div>
    </div>
  </div>
  </Teleport>
</template>