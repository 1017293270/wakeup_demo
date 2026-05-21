<template>
  <section class="data-panel">
    <header class="data-panel__header">
      <span>{{ title }}</span>
      <small v-if="meta">{{ meta }}</small>
    </header>
    <div class="data-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  meta?: string
}>()
</script>
