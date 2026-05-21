import { computed } from 'vue';
import StatusBadge from '../ui/StatusBadge.vue';
const props = defineProps();
const stateCopy = {
    idle: {
        status: '待机',
        headline: '机器人待命',
        detail: '点击开启监听，准备接入实时语音链路。',
        tone: 'idle'
    },
    requesting_permission: {
        status: '授权中',
        headline: '请求麦克风权限',
        detail: '请在浏览器弹窗中允许麦克风访问。',
        tone: 'warn'
    },
    connecting: {
        status: '连接中',
        headline: '建立语音服务通道',
        detail: '正在连接唤醒网关和实时音频流。',
        tone: 'warn'
    },
    listening: {
        status: '监听中',
        headline: '等待唤醒词',
        detail: '等待唤醒词后进入对话。',
        tone: 'ok'
    },
    wakeup: {
        status: '已唤醒',
        headline: '数字人已就绪',
        detail: '唤醒成功，正在等待你的语音指令。',
        tone: 'active'
    },
    recognizing: {
        status: '识别中',
        headline: '语音正在转写',
        detail: props.transcript || 'ASR 正在识别本轮语音内容。',
        tone: 'active'
    },
    thinking: {
        status: '思考中',
        headline: '生成业务回答',
        detail: props.transcript || '已收到问题，正在调用业务后端生成回复。',
        tone: 'active'
    },
    speaking: {
        status: '播报中',
        headline: '数字人正在回答',
        detail: props.answer || 'TTS 正在播报本轮回答。',
        tone: 'active'
    },
    error: {
        status: '异常',
        headline: '链路需要处理',
        detail: props.errorMessage || '语音服务出现异常，请检查网关或重新启动监听。',
        tone: 'error'
    },
    stopped: {
        status: '已停止',
        headline: '监听已关闭',
        detail: '麦克风和语音通道已释放，可随时重新开启。',
        tone: 'idle'
    }
};
const current = computed(() => stateCopy[props.state]);
const statusText = computed(() => current.value.status);
const headline = computed(() => current.value.headline);
const detail = computed(() => props.hint || current.value.detail);
const tone = computed(() => current.value.tone);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "wake-status" },
    ...{ class: (`wake-status--${__VLS_ctx.state}`) },
    'aria-live': "polite",
});
/** @type {[typeof StatusBadge, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(StatusBadge, new StatusBadge({
    text: (__VLS_ctx.statusText),
    tone: (__VLS_ctx.tone),
}));
const __VLS_1 = __VLS_0({
    text: (__VLS_ctx.statusText),
    tone: (__VLS_ctx.tone),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.headline);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.detail);
/** @type {__VLS_StyleScopedClasses['wake-status']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            StatusBadge: StatusBadge,
            statusText: statusText,
            headline: headline,
            detail: detail,
            tone: tone,
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
//# sourceMappingURL=WakeStatusPanel.vue.js.map