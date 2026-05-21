<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <i />
    {{ text }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  tone: 'idle' | 'ok' | 'warn' | 'error' | 'active'
}>()
</script>
