<script setup lang="ts">
// NEXUS - Neo-Brutalism SVG Logo
</script>

<template>
  <div class="flex items-center justify-center select-none logo-container cursor-pointer">
    <svg class="w-5 h-5 text-accent transition-all duration-200 hover:scale-110 active:scale-95" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <!-- 外层粗野主义框体 -->
      <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" fill="currentColor" fill-opacity="0.08" stroke-width="2.5" />
      <!-- 命令行提示符 > (工具属性) -->
      <path d="M7 8l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M11 16h3" stroke-linecap="round" />
      <!-- 导航箭头 ↗ (导航属性) -->
      <path d="M18 6l-5 0m5 0l0 5m0-5l-6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</template>

<style scoped>
.logo-container:hover svg {
  filter: drop-shadow(2px 2px 0px currentColor);
}
</style>
