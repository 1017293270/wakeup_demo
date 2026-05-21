import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
const props = defineProps();
const chartRef = ref();
let chart = null;
function render() {
    if (!chartRef.value)
        return;
    if (!chart)
        chart = echarts.init(chartRef.value);
    chart.setOption(props.option, true);
}
function resize() {
    chart?.resize();
}
onMounted(() => {
    render();
    window.addEventListener('resize', resize);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', resize);
    chart?.dispose();
});
watch(() => props.option, render, { deep: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ref: "chartRef",
    ...{ class: "chart-panel" },
});
/** @type {typeof __VLS_ctx.chartRef} */ ;
/** @type {__VLS_StyleScopedClasses['chart-panel']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chartRef: chartRef,
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
//# sourceMappingURL=DashboardChartPanel.vue.js.map