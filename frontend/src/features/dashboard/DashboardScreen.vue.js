import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import DataPanel from '../../components/ui/DataPanel.vue';
import StatusBadge from '../../components/ui/StatusBadge.vue';
import DashboardChartPanel from '../../components/business/DashboardChartPanel.vue';
import Live2DAvatar from '../../components/business/Live2DAvatar.vue';
import WakeStatusPanel from '../../components/business/WakeStatusPanel.vue';
import VoiceEventStream from '../../components/business/VoiceEventStream.vue';
import FloatingChatDialog from '../../components/business/FloatingChatDialog.vue';
import KpiGrid from './components/KpiGrid.vue';
import { kpis, latencyBuckets, qualityRows, wakeTrend, wakeWordDistribution } from './mockDashboardData';
import { useVoiceSocket } from '../voice/useVoiceSocket';
import { useVoiceStore } from '../../stores/voiceStore';
import { getConfig } from '../../services/configApi';
import { defaultWakeConfig } from '../config/configSchema';
const voice = useVoiceStore();
const clockText = ref(formatClock());
const starting = ref(false);
const dashboardScale = ref(1);
let voiceSocket = null;
let timer = 0;
let recognizingTimer = 0;
let activeSpeechAudio = null;
const DASHBOARD_DESIGN_WIDTH = 1920;
const DASHBOARD_DESIGN_HEIGHT = 1080;
const startLabel = computed(() => {
    if (starting.value)
        return '启动中';
    return voice.state === 'listening' ? '监听中' : '开启监听';
});
const isStartDisabled = computed(() => starting.value || voice.serviceOnline || ['connecting'].includes(voice.state));
const isStopDisabled = computed(() => voice.state === 'idle' || voice.state === 'stopped');
const stageMetric = computed(() => {
    if (voice.state === 'error')
        return { label: '链路告警', value: '检查' };
    if (voice.state === 'speaking')
        return { label: '本轮播报', value: 'TTS' };
    if (voice.state === 'thinking')
        return { label: 'AI 生成', value: 'RUN' };
    if (voice.state === 'wakeup' || voice.state === 'recognizing')
        return { label: '声纹命中', value: '0.94' };
    return { label: '今日唤醒', value: '2,324' };
});
const signalSteps = computed(() => {
    const order = ['wakeup', 'recognizing', 'thinking', 'speaking', 'listening'];
    const activeIndex = order.indexOf(voice.state);
    const isError = voice.state === 'error';
    return [
        { key: 'wakeup', label: 'Wakeup', detail: '唤醒命中' },
        { key: 'asr', label: 'ASR', detail: '语音转写' },
        { key: 'dialog', label: 'Dialog', detail: '业务回答' },
        { key: 'tts', label: 'TTS', detail: '语音播报' },
        { key: 'standby', label: 'Standby', detail: '回到监听' }
    ].map((step, index) => {
        let state = 'idle';
        if (isError)
            state = index <= 3 ? 'error' : 'idle';
        else if (activeIndex === index)
            state = 'active';
        else if (activeIndex > index || voice.state === 'listening')
            state = 'done';
        return { ...step, state };
    });
});
const chartTextColor = '#dbe7ff';
const axisStyle = { color: 'rgba(219, 231, 255, 0.18)' };
const splitStyle = { color: 'rgba(219, 231, 255, 0.1)' };
const trendOption = computed(() => ({
    color: ['#56f0ff', '#f7c873'],
    grid: { left: 38, right: 18, top: 30, bottom: 28 },
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(6, 10, 18, 0.94)',
        borderColor: 'rgba(86, 240, 255, 0.32)',
        textStyle: { color: '#fff' }
    },
    xAxis: {
        type: 'category',
        data: wakeTrend.hours,
        axisLine: { lineStyle: axisStyle },
        axisTick: { show: false },
        axisLabel: { color: chartTextColor }
    },
    yAxis: {
        type: 'value',
        splitLine: { lineStyle: splitStyle },
        axisLabel: { color: chartTextColor }
    },
    series: [
        {
            name: '唤醒',
            type: 'line',
            smooth: true,
            showSymbol: false,
            areaStyle: { opacity: 0.2 },
            data: wakeTrend.wakeups
        },
        {
            name: '对话',
            type: 'line',
            smooth: true,
            showSymbol: false,
            areaStyle: { opacity: 0.12 },
            data: wakeTrend.dialogs
        }
    ]
}));
const pieOption = computed(() => ({
    color: ['#56f0ff', '#f7c873', '#7cffc8', '#ff8aa0'],
    tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(6, 10, 18, 0.94)',
        borderColor: 'rgba(247, 200, 115, 0.28)',
        textStyle: { color: '#fff' }
    },
    series: [
        {
            type: 'pie',
            radius: ['54%', '74%'],
            center: ['50%', '52%'],
            label: { color: chartTextColor, formatter: '{b}\n{d}%' },
            labelLine: { lineStyle: { color: 'rgba(219, 231, 255, 0.34)' } },
            data: wakeWordDistribution
        }
    ]
}));
const latencyOption = computed(() => ({
    color: ['#7cffc8'],
    grid: { left: 36, right: 16, top: 20, bottom: 28 },
    tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(6, 10, 18, 0.94)',
        borderColor: 'rgba(124, 255, 200, 0.3)',
        textStyle: { color: '#fff' }
    },
    xAxis: {
        type: 'category',
        data: latencyBuckets.map((item) => item.name),
        axisLine: { lineStyle: axisStyle },
        axisTick: { show: false },
        axisLabel: { color: chartTextColor }
    },
    yAxis: {
        type: 'value',
        splitLine: { lineStyle: splitStyle },
        axisLabel: { color: chartTextColor }
    },
    series: [
        {
            type: 'bar',
            barWidth: 18,
            itemStyle: { borderRadius: [8, 8, 2, 2] },
            data: latencyBuckets.map((item) => item.value)
        }
    ]
}));
function formatClock() {
    return new Date().toLocaleString('zh-CN', { hour12: false });
}
function updateDashboardScale() {
    dashboardScale.value = Math.min(window.innerWidth / DASHBOARD_DESIGN_WIDTH, window.innerHeight / DASHBOARD_DESIGN_HEIGHT);
}
function scheduleThinkingState() {
    window.clearTimeout(recognizingTimer);
    recognizingTimer = window.setTimeout(() => {
        if (voice.state === 'recognizing')
            voice.setState('thinking');
    }, 520);
}
function settleAfterSpeech() {
    if (voice.state === 'speaking') {
        voice.setState('listening');
        voice.pushEvent('standby', '语音播报完成，已回到监听');
    }
}
function playGatewayAudio(audio) {
    activeSpeechAudio?.pause();
    activeSpeechAudio = new Audio(audio);
    activeSpeechAudio.onended = () => {
        activeSpeechAudio = null;
        settleAfterSpeech();
    };
    activeSpeechAudio.onerror = () => {
        activeSpeechAudio = null;
        voice.pushEvent('tts', '语音播放失败，已继续监听');
        settleAfterSpeech();
    };
    void activeSpeechAudio.play().catch(() => {
        activeSpeechAudio = null;
        voice.pushEvent('tts', '浏览器阻止了自动播放，已继续监听');
        settleAfterSpeech();
    });
}
function handleGatewayEvent(event) {
    const hint = String(event.data.hint || '');
    if (hint)
        voice.hint = hint;
    if (event.event === 'ready') {
        voice.serviceOnline = true;
        voice.sessionId = String(event.data.sessionId || '');
        voice.setState('listening');
        voice.pushEvent('ready', '语音服务已就绪');
    }
    if (event.event === 'wakeup') {
        const wakeWord = String(event.data.wakeWord || voice.wakeWord);
        voice.setState('wakeup');
        voice.conversationActive = true;
        voice.setDialogVisible(true);
        voice.clearDialogMessages();
        voice.pushEvent('wakeup', `唤醒成功：${wakeWord}`);
    }
    if (event.event === 'asrResult') {
        voice.transcript = String(event.data.text || '');
        voice.setState('recognizing');
        voice.hint = '';
        voice.pushEvent('asr', voice.transcript || '语音转写完成');
        voice.addDialogMessage('user', voice.transcript);
        scheduleThinkingState();
    }
    if (event.event === 'dialogResult') {
        window.clearTimeout(recognizingTimer);
        const answer = String(event.data.answer || '');
        voice.answer = answer;
        voice.hint = '';
        voice.setState('speaking');
        voice.pushEvent('dialog', answer || '业务回答已生成');
        voice.addDialogMessage('assistant', answer);
    }
    if (event.event === 'ttsStatus') {
        const status = String(event.data.status || '');
        if (status === 'start') {
            voice.setState('speaking');
            voice.pushEvent('tts', '语音合成中');
        }
        if (status === 'end' && !activeSpeechAudio) {
            settleAfterSpeech();
        }
    }
    if (event.event === 'ttsResult') {
        const audio = String(event.data.audio || '');
        voice.setState('speaking');
        voice.pushEvent('tts', '语音播报开始');
        if (audio)
            playGatewayAudio(audio);
        else
            settleAfterSpeech();
    }
    if (event.event === 'standby') {
        if (voice.state === 'stopped')
            return;
        voice.setState('listening');
        voice.conversationActive = false;
        voice.setDialogVisible(false);
        voice.pushEvent('standby', '已回到监听');
    }
    if (event.event === 'error') {
        voice.setError(String(event.data.message || '语音服务错误'));
    }
    if (event.event === 'configUpdate') {
        const config = event.data.config;
        if (config) {
            voice.updateWakeConfig(config);
            voice.pushEvent('config', '配置已更新');
        }
    }
}
async function startListening() {
    if (starting.value || voice.serviceOnline)
        return;
    starting.value = true;
    voice.setState('connecting');
    try {
        voiceSocket = useVoiceSocket({
            wsUrl: 'ws://127.0.0.1:8766/ws',
            wakeWords: [],
            sampleRate: 16000
        }, {
            onOpen: () => {
                voice.serviceOnline = true;
                voice.setState('listening');
                voice.pushEvent('ready', `语音服务已就绪，请说"${voice.wakeWord}"唤醒`);
            },
            onClose: () => {
                voice.serviceOnline = false;
                if (voice.state !== 'stopped')
                    voice.setError('语音服务连接已断开');
            },
            onError: (message) => voice.setError(message),
            onEvent: handleGatewayEvent
        });
        voiceSocket.connect();
    }
    catch (error) {
        voice.setError(error instanceof Error ? error.message : '语音服务启动失败');
    }
    finally {
        starting.value = false;
    }
}
function stopListening() {
    window.clearTimeout(recognizingTimer);
    activeSpeechAudio?.pause();
    activeSpeechAudio = null;
    voiceSocket?.cancel();
    voiceSocket?.stop();
    voiceSocket = null;
    voice.serviceOnline = false;
    voice.conversationActive = false;
    voice.setDialogVisible(false);
    voice.clearDialogMessages();
    voice.setState('stopped');
    voice.pushEvent('stop', '监听已停止');
}
async function loginDialogWorkflow() {
    // voice-service 后端自动处理登录，无需前端调用
}
function simulateWakeup() {
    window.clearTimeout(recognizingTimer);
    voiceSocket?.manualWakeup();
}
function handleDialogSend(text) {
    voice.sendText(text);
    voiceSocket?.sendText(text);
}
function handleDialogClose() {
    voice.conversationActive = false;
    voice.setDialogVisible(false);
    voice.clearDialogMessages();
    voiceSocket?.cancel();
    voice.setState('listening');
    voice.pushEvent('standby', '对话已关闭，回到监听');
}
function handleDialogMinimize() {
    voice.setDialogVisible(false);
}
onMounted(async () => {
    void loginDialogWorkflow();
    updateDashboardScale();
    window.addEventListener('resize', updateDashboardScale);
    timer = window.setInterval(() => {
        clockText.value = formatClock();
    }, 1000);
    try {
        const config = await getConfig();
        voice.setWakeWord(config.wake_word || defaultWakeConfig.wake_word);
        voice.updateWakeConfig(config);
    }
    catch {
        // Use default wake word if config load fails
    }
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', updateDashboardScale);
    window.clearInterval(timer);
    stopListening();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "dashboard-screen" },
    ...{ class: (`dashboard-screen--${__VLS_ctx.voice.state}`) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "screen-bg" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "screen-vignette" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-canvas" },
    ...{ style: ({ '--dashboard-scale': __VLS_ctx.dashboardScale }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "screen-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "screen-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "screen-actions" },
    'aria-label': "大屏操作",
});
/** @type {[typeof StatusBadge, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(StatusBadge, new StatusBadge({
    text: (__VLS_ctx.voice.serviceOnline ? '语音服务在线' : '语音服务未连接'),
    tone: (__VLS_ctx.voice.serviceOnline ? 'ok' : 'warn'),
}));
const __VLS_1 = __VLS_0({
    text: (__VLS_ctx.voice.serviceOnline ? '语音服务在线' : '语音服务未连接'),
    tone: (__VLS_ctx.voice.serviceOnline ? 'ok' : 'warn'),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
/** @type {[typeof StatusBadge, ]} */ ;
// @ts-ignore
const __VLS_3 = __VLS_asFunctionalComponent(StatusBadge, new StatusBadge({
    text: (__VLS_ctx.clockText),
    tone: "active",
}));
const __VLS_4 = __VLS_3({
    text: (__VLS_ctx.clockText),
    tone: "active",
}, ...__VLS_functionalComponentArgsRest(__VLS_3));
const __VLS_6 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
    to: "/config",
    ...{ class: "screen-link" },
    'aria-label': "配置中心",
}));
const __VLS_8 = __VLS_7({
    to: "/config",
    ...{ class: "screen-link" },
    'aria-label': "配置中心",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
__VLS_9.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    ...{ class: "settings-icon" },
    viewBox: "0 0 24 24",
    width: "20",
    height: "20",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "12",
    cy: "12",
    r: "3",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
});
var __VLS_9;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "command-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "dashboard-rail dashboard-rail--left" },
    'aria-label': "核心指标",
});
/** @type {[typeof DataPanel, typeof DataPanel, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(DataPanel, new DataPanel({
    title: "核心指标",
    meta: "今日实时",
}));
const __VLS_11 = __VLS_10({
    title: "核心指标",
    meta: "今日实时",
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
__VLS_12.slots.default;
/** @type {[typeof KpiGrid, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(KpiGrid, new KpiGrid({
    items: (__VLS_ctx.kpis),
}));
const __VLS_14 = __VLS_13({
    items: (__VLS_ctx.kpis),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_12;
/** @type {[typeof DataPanel, typeof DataPanel, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(DataPanel, new DataPanel({
    title: "唤醒趋势",
    meta: "24 小时",
}));
const __VLS_17 = __VLS_16({
    title: "唤醒趋势",
    meta: "24 小时",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
/** @type {[typeof DashboardChartPanel, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(DashboardChartPanel, new DashboardChartPanel({
    option: (__VLS_ctx.trendOption),
}));
const __VLS_20 = __VLS_19({
    option: (__VLS_ctx.trendOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
var __VLS_18;
/** @type {[typeof DataPanel, typeof DataPanel, ]} */ ;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent(DataPanel, new DataPanel({
    title: "响应时长分布",
    meta: "P95 1.9s",
}));
const __VLS_23 = __VLS_22({
    title: "响应时长分布",
    meta: "P95 1.9s",
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
__VLS_24.slots.default;
/** @type {[typeof DashboardChartPanel, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(DashboardChartPanel, new DashboardChartPanel({
    option: (__VLS_ctx.latencyOption),
}));
const __VLS_26 = __VLS_25({
    option: (__VLS_ctx.latencyOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
var __VLS_24;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "command-stage" },
    'aria-label': "Live2D 数字人状态",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stage-metrics" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.stageMetric.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stageMetric.value);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stage-core" },
});
/** @type {[typeof Live2DAvatar, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(Live2DAvatar, new Live2DAvatar({
    state: (__VLS_ctx.voice.state),
}));
const __VLS_29 = __VLS_28({
    state: (__VLS_ctx.voice.state),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
/** @type {[typeof WakeStatusPanel, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(WakeStatusPanel, new WakeStatusPanel({
    state: (__VLS_ctx.voice.state),
    transcript: (__VLS_ctx.voice.transcript),
    answer: (__VLS_ctx.voice.answer),
    errorMessage: (__VLS_ctx.voice.errorMessage),
    hint: (__VLS_ctx.voice.hint),
    wakeWord: (__VLS_ctx.voice.wakeWord),
}));
const __VLS_32 = __VLS_31({
    state: (__VLS_ctx.voice.state),
    transcript: (__VLS_ctx.voice.transcript),
    answer: (__VLS_ctx.voice.answer),
    errorMessage: (__VLS_ctx.voice.errorMessage),
    hint: (__VLS_ctx.voice.hint),
    wakeWord: (__VLS_ctx.voice.wakeWord),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
if (__VLS_ctx.voice.answer && !__VLS_ctx.voice.dialogVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "answer-subtitle" },
        'aria-live': "polite",
    });
    if (__VLS_ctx.voice.transcript) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "answer-subtitle__q" },
        });
        (__VLS_ctx.voice.transcript);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "answer-subtitle__a" },
    });
    (__VLS_ctx.voice.answer);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "voice-controls" },
    'aria-label': "语音控制",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.startListening) },
    ...{ class: "voice-control voice-control--primary" },
    disabled: (__VLS_ctx.isStartDisabled),
});
(__VLS_ctx.startLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.stopListening) },
    ...{ class: "voice-control voice-control--secondary" },
    disabled: (__VLS_ctx.isStopDisabled),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.simulateWakeup) },
    ...{ class: "voice-control voice-control--secondary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "dashboard-rail dashboard-rail--right" },
    'aria-label': "链路追踪",
});
/** @type {[typeof DataPanel, typeof DataPanel, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(DataPanel, new DataPanel({
    title: "唤醒词分布",
    meta: "今日",
}));
const __VLS_35 = __VLS_34({
    title: "唤醒词分布",
    meta: "今日",
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
__VLS_36.slots.default;
/** @type {[typeof DashboardChartPanel, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(DashboardChartPanel, new DashboardChartPanel({
    option: (__VLS_ctx.pieOption),
}));
const __VLS_38 = __VLS_37({
    option: (__VLS_ctx.pieOption),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_36;
/** @type {[typeof DataPanel, typeof DataPanel, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(DataPanel, new DataPanel({
    title: "模型质量",
}));
const __VLS_41 = __VLS_40({
    title: "模型质量",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
__VLS_42.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quality-list" },
});
for (const [row] of __VLS_getVForSourceType((__VLS_ctx.qualityRows))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (row.label),
        ...{ class: (`quality-list__item--${row.status}`) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (row.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (row.value);
}
var __VLS_42;
/** @type {[typeof DataPanel, typeof DataPanel, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(DataPanel, new DataPanel({
    title: "实时事件",
}));
const __VLS_44 = __VLS_43({
    title: "实时事件",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
__VLS_45.slots.default;
/** @type {[typeof VoiceEventStream, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(VoiceEventStream, new VoiceEventStream({
    events: (__VLS_ctx.voice.events),
}));
const __VLS_47 = __VLS_46({
    events: (__VLS_ctx.voice.events),
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
var __VLS_45;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "signal-strip" },
    'aria-label': "AI 执行链路",
});
for (const [step] of __VLS_getVForSourceType((__VLS_ctx.signalSteps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (step.key),
        ...{ class: "signal-step" },
        ...{ class: (`signal-step--${step.state}`) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (step.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (step.detail);
}
/** @type {[typeof FloatingChatDialog, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(FloatingChatDialog, new FloatingChatDialog({
    ...{ 'onClose': {} },
    ...{ 'onMinimize': {} },
    ...{ 'onSend': {} },
    visible: (__VLS_ctx.voice.dialogVisible),
    online: (__VLS_ctx.voice.serviceOnline),
    disabled: (!__VLS_ctx.voice.serviceOnline),
    messages: (__VLS_ctx.voice.dialogMessages),
    isThinking: (__VLS_ctx.voice.isThinking),
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClose': {} },
    ...{ 'onMinimize': {} },
    ...{ 'onSend': {} },
    visible: (__VLS_ctx.voice.dialogVisible),
    online: (__VLS_ctx.voice.serviceOnline),
    disabled: (!__VLS_ctx.voice.serviceOnline),
    messages: (__VLS_ctx.voice.dialogMessages),
    isThinking: (__VLS_ctx.voice.isThinking),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_52;
let __VLS_53;
let __VLS_54;
const __VLS_55 = {
    onClose: (__VLS_ctx.handleDialogClose)
};
const __VLS_56 = {
    onMinimize: (__VLS_ctx.handleDialogMinimize)
};
const __VLS_57 = {
    onSend: (__VLS_ctx.handleDialogSend)
};
var __VLS_51;
/** @type {__VLS_StyleScopedClasses['dashboard-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-bg']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-vignette']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-header']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-title']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-link']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['command-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-rail--left']} */ ;
/** @type {__VLS_StyleScopedClasses['command-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-metrics']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-core']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-subtitle__q']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-subtitle__a']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-control']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-control--primary']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-control']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-control--secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-control']} */ ;
/** @type {__VLS_StyleScopedClasses['voice-control--secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-rail']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-rail--right']} */ ;
/** @type {__VLS_StyleScopedClasses['quality-list']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-step']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DataPanel: DataPanel,
            StatusBadge: StatusBadge,
            DashboardChartPanel: DashboardChartPanel,
            Live2DAvatar: Live2DAvatar,
            WakeStatusPanel: WakeStatusPanel,
            VoiceEventStream: VoiceEventStream,
            FloatingChatDialog: FloatingChatDialog,
            KpiGrid: KpiGrid,
            kpis: kpis,
            qualityRows: qualityRows,
            voice: voice,
            clockText: clockText,
            dashboardScale: dashboardScale,
            startLabel: startLabel,
            isStartDisabled: isStartDisabled,
            isStopDisabled: isStopDisabled,
            stageMetric: stageMetric,
            signalSteps: signalSteps,
            trendOption: trendOption,
            pieOption: pieOption,
            latencyOption: latencyOption,
            startListening: startListening,
            stopListening: stopListening,
            simulateWakeup: simulateWakeup,
            handleDialogSend: handleDialogSend,
            handleDialogClose: handleDialogClose,
            handleDialogMinimize: handleDialogMinimize,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=DashboardScreen.vue.js.map