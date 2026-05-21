<template>
  <div class="event-stream" aria-live="polite">
    <article v-for="event in events" :key="event.id" class="event-stream__item">
      <span>{{ event.type }}</span>
      <p>{{ event.text }}</p>
      <time>{{ new Date(event.timestamp).toLocaleTimeString() }}</time>
    </article>
    <div v-if="events.length === 0" class="event-stream__empty">
      等待语音链路事件
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VoiceEventItem } from '../../features/voice/voiceTypes'

defineProps<{
  events: VoiceEventItem[]
}>()
</script>
