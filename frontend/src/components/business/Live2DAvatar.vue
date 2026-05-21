<template>
  <div class="live2d-shell" :class="`live2d-shell--${state}`">
    <canvas ref="canvasRef" class="live2d-canvas" aria-label="Live2D 数字人" />
    <div v-if="fallback" class="live2d-fallback">
      <div class="live2d-face" aria-hidden="true">
        <span />
      </div>
      <p v-if="loadMessage" class="live2d-load-message">{{ loadMessage }}</p>
    </div>
    <div class="voice-orbit voice-orbit--outer" aria-hidden="true" />
    <div class="voice-orbit voice-orbit--middle" aria-hidden="true" />
    <div class="voice-orbit voice-orbit--inner" aria-hidden="true" />
    <div class="voice-wave-lane" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import type { VoiceState } from '../../features/voice/voiceTypes'

const props = defineProps<{
  state: VoiceState
}>()

const canvasRef = ref<HTMLCanvasElement>()
const fallback = ref(false)
const loadMessage = ref('')
let app: PIXI.Application | null = null
let model: any = null
let resizeObserver: ResizeObserver | null = null

async function initLive2D() {
  try {
    if (!canvasRef.value) return

    const width = canvasRef.value.clientWidth || 520
    const height = canvasRef.value.clientHeight || 620

    app = new PIXI.Application({
      view: canvasRef.value,
      autoStart: true,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
      width,
      height,
    })

    ;(window as any).PIXI = PIXI
    Live2DModel.registerTicker(PIXI.Ticker)

    model = await Live2DModel.from('/robot/robot.model3.json')
    model.anchor.set(0.5, 0.5)
    model.x = width / 2
    model.y = height / 2

    const baseScale = Math.min(width / 1120, height / 1220)
    model.scale.set(Math.max(0.16, Math.min(0.28, baseScale)))

    app.stage.addChild(model)
    console.log('[Live2D] Robot loaded, size:', model.width.toFixed(0), 'x', model.height.toFixed(0))

    resizeObserver = new ResizeObserver(() => {
      if (!app || !model) return
      const w = canvasRef.value!.clientWidth || 520
      const h = canvasRef.value!.clientHeight || 620
      app.renderer.resize(w, h)
      model.x = w / 2
      model.y = h / 2
    })
    resizeObserver.observe(canvasRef.value)
  } catch (error) {
    console.warn('Live2D runtime unavailable, using visual fallback.', error)
    const message = error instanceof Error ? error.message : '未知错误'
    loadMessage.value = `Live2D 加载失败：${message}`
    fallback.value = true
  }
}

function syncState() {
  if (!model) return
  if (props.state === 'wakeup' || props.state === 'speaking') {
    void model.motion?.('Start', props.state === 'speaking' ? 1 : 0)
  }
  if (props.state === 'speaking') {
    model.expression?.('expression1')
  }
}

onMounted(initLive2D)
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  model?.destroy()
  app?.destroy(true)
})
watch(() => props.state, syncState)
</script>
