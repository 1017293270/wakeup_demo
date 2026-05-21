import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
const props = defineProps();
const canvasRef = ref();
const fallback = ref(false);
const loadMessage = ref('');
let app = null;
let model = null;
let resizeObserver = null;
async function initLive2D() {
    try {
        if (!canvasRef.value)
            return;
        const width = canvasRef.value.clientWidth || 520;
        const height = canvasRef.value.clientHeight || 620;
        app = new PIXI.Application({
            view: canvasRef.value,
            autoStart: true,
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            width,
            height,
        });
        window.PIXI = PIXI;
        Live2DModel.registerTicker(PIXI.Ticker);
        model = await Live2DModel.from('/robot/robot.model3.json');
        model.anchor.set(0.5, 0.5);
        model.x = width / 2;
        model.y = height / 2;
        const baseScale = Math.min(width / 1120, height / 1220);
        model.scale.set(Math.max(0.16, Math.min(0.28, baseScale)));
        app.stage.addChild(model);
        console.log('[Live2D] Robot loaded, size:', model.width.toFixed(0), 'x', model.height.toFixed(0));
        resizeObserver = new ResizeObserver(() => {
            if (!app || !model)
                return;
            const w = canvasRef.value.clientWidth || 520;
            const h = canvasRef.value.clientHeight || 620;
            app.renderer.resize(w, h);
            model.x = w / 2;
            model.y = h / 2;
        });
        resizeObserver.observe(canvasRef.value);
    }
    catch (error) {
        console.warn('Live2D runtime unavailable, using visual fallback.', error);
        const message = error instanceof Error ? error.message : '未知错误';
        loadMessage.value = `Live2D 加载失败：${message}`;
        fallback.value = true;
    }
}
function syncState() {
    if (!model)
        return;
    if (props.state === 'wakeup' || props.state === 'speaking') {
        void model.motion?.('Start', props.state === 'speaking' ? 1 : 0);
    }
    if (props.state === 'speaking') {
        model.expression?.('expression1');
    }
}
onMounted(initLive2D);
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    model?.destroy();
    app?.destroy(true);
});
watch(() => props.state, syncState);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "live2d-shell" },
    ...{ class: (`live2d-shell--${__VLS_ctx.state}`) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas)({
    ref: "canvasRef",
    ...{ class: "live2d-canvas" },
    'aria-label': "Live2D 数字人",
});
/** @type {typeof __VLS_ctx.canvasRef} */ ;
if (__VLS_ctx.fallback) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "live2d-fallback" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "live2d-face" },
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({});
    if (__VLS_ctx.loadMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "live2d-load-message" },
        });
        (__VLS_ctx.loadMessage);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "voice-orbit voice-orbit--outer" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "voice-orbit voice-orbit--middle" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "voice-orbit voice-orbit--inner" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "voice-wave-lane" },
    'aria-hidden': "true",
});
/** @type {__VLS_StyleScopedClasses['live2d-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['live2d-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['live2d-fallback']} */ ;
/** @type {__VLS_StyleScopedClasses['live2d-face']} */ ;
/** @type {__VLS_StyleScopedClasses['live2d-load-message']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-orbit--outer']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-orbit--middle']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-orbit']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-orbit--inner']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-wave-lane']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            canvasRef: canvasRef,
            fallback: fallback,
            loadMessage: loadMessage,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=Live2DAvatar.vue.js.map