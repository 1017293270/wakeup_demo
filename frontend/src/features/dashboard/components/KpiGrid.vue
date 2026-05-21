<template>
  <div class="kpi-grid">
    <article
      v-for="(item, index) in items"
      :key="item.label"
      class="kpi-card"
      :class="[`kpi-card--${item.trend}`, { 'kpi-card--hero': index === 0 }]"
    >
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <em :class="item.trend">{{ item.delta }}</em>
    </article>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: string; delta: string; trend: string }>
}>()
</script>
