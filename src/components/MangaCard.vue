<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  hoverShift?: boolean
  bgClass?: string
  rotateClass?: string
  paddingClass?: string
}>(), {
  hoverShift: true,
  bgClass: 'bg-[#1a1816]',
  rotateClass: 'rotate-0',
  paddingClass: 'p-4.5'
})

const cardClasses = computed(() => {
  return [
    'relative border border-[#d4af37]/50 rounded text-[#f5f2eb] shadow-[0_6px_20px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(212,175,55,0.15)] transition-all duration-300 overflow-hidden',
    props.paddingClass,
    props.bgClass,
    props.rotateClass,
    props.hoverShift ? 'hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(0,0,0,0.85),inset_0_0_0_1.5px_rgba(212,175,55,0.35)] hover:border-[#d4af37]/80' : ''
  ].join(' ')
})
</script>

<template>
  <div :class="cardClasses">
    <!-- Double border inset container -->
    <div class="absolute inset-1 border border-[#d4af37]/20 pointer-events-none rounded"></div>
    
    <!-- Classical manuscript corner marks -->
    <div class="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t border-l border-[#d4af37]/40 pointer-events-none"></div>
    <div class="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t border-r border-[#d4af37]/40 pointer-events-none"></div>
    <div class="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b border-l border-[#d4af37]/40 pointer-events-none"></div>
    <div class="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b border-r border-[#d4af37]/40 pointer-events-none"></div>
    
    <!-- Content Slot (keep z-10 for pointer events correctness) -->
    <div class="relative z-10 h-full flex flex-col justify-between">
      <slot />
    </div>
  </div>
</template>

