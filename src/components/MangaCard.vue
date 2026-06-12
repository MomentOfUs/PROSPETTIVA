<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  hoverShift?: boolean
  bgClass?: string
  paddingClass?: string
}>(), {
  hoverShift: false,
  bgClass: 'bg-surface',
  paddingClass: 'p-3'
})

const cardClasses = computed(() => {
  return [
    'relative border border-line text-neutral-300 transition-none overflow-hidden',
    props.paddingClass,
    props.bgClass,
  ].join(' ')
})
</script>

<template>
  <div :class="cardClasses">
    <div class="relative z-10 h-full flex flex-col justify-between">
      <slot />
    </div>
  </div>
</template>
