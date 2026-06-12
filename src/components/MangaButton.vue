<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  bgClass?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  bgClass: 'bg-btn-base',
  size: 'md'
})

const btnClasses = computed(() => {
  const sizeClass = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
    lg: 'px-6 py-2.5 text-base'
  }[props.size]

  return [
    'border border-[#d4af37]/50 font-bold rounded shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]',
    'active:scale-[0.97] active:shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
    'hover:border-[#d4af37] hover:shadow-[0_4px_12px_rgba(212,175,55,0.15)] hover:text-[#f5f2eb]',
    'transition-all duration-200 cursor-pointer text-[#ebdcb9] inline-flex items-center justify-center gap-1.5 font-serif',
    props.bgClass,
    sizeClass
  ].join(' ')
})
</script>

<template>
  <button :class="btnClasses">
    <slot />
  </button>
</template>

