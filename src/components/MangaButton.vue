<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md'
})

const btnClasses = computed(() => {
  const sizeClass = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
  }[props.size]

  return [
    'border border-line bg-base text-neutral-300',
    'uppercase tracking-widest',
    'hover:bg-neutral-200 hover:text-black hover:border-neutral-200',
    'active:translate-y-[1px]',
    'transition-none flex items-center gap-2 cursor-pointer',
    sizeClass
  ].join(' ')
})
</script>

<template>
  <button :class="btnClasses">
    <slot />
  </button>
</template>
