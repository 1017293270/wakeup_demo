import { computed, onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import { clearHistory, getConfig, getHistory, reloadConfig, saveConfig } from '../../services/configApi';
import { defaultWakeConfig } from './configSchema';
const form = reactive({ ...defaultWakeConfig });
const loading = ref(false);
const saving = ref(false);
const reloading = ref(false);
const loadingHistory = ref(false);
const error = ref('');
const keyword = ref('');
const history = ref([]);
const historyColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 120 },
    { title: '唤醒词', dataIndex: 'wake_word', key: 'wake_word', width: 140 },
    { title: '识别文本', dataIndex: 'instruction_text', key: 'instruction_text', ellipsis: true },
    { title: '播报内容', dataIndex: 'tts_text', key: 'tts_text', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 190 }
];
const alternativesText = computed({
    get: () => form.wake_word_alternatives.join('\n'),
    set: (value) => {
        form.wake_word_alternatives = value.split('\n').map((item) => item.trim()).filter(Boolean);
    }
});
const ttsRateValue = computed({
    get: () => Number.parseInt(form.tts_rate.replace('%', ''), 10),
    set: (value) => {
        form.tts_rate = `${value > 0 ? '+' : ''}${value}%`;
    }
});
const ttsVolumeValue = computed({
    get: () => Number.parseInt(form.tts_volume.replace('%', ''), 10),
    set: (value) => {
        form.tts_volume = `${value > 0 ? '+' : ''}${value}%`;
    }
});
const explanationWordsText = computed({
    get: () => JSON.stringify(form.explanation_words, null, 2),
    set: (value) => {
        try {
            form.explanation_words = value ? JSON.parse(value) : {};
            error.value = '';
        }
        catch {
            error.value = '讲解词配置不是合法 JSON';
        }
    }
});
function assignConfig(config) {
    Object.assign(form, { ...defaultWakeConfig, ...config });
}
async function loadConfig() {
    loading.value = true;
    error.value = '';
    try {
        assignConfig(await getConfig());
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : '加载配置失败';
    }
    finally {
        loading.value = false;
    }
}
async function handleSave() {
    if (error.value)
        return;
    saving.value = true;
    try {
        assignConfig(await saveConfig({ ...form }));
        message.success('配置已保存');
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : '保存配置失败';
    }
    finally {
        saving.value = false;
    }
}
async function handleReload() {
    reloading.value = true;
    try {
        assignConfig(await reloadConfig());
        message.success('配置已重载');
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : '重载配置失败';
    }
    finally {
        reloading.value = false;
    }
}
async function loadHistory() {
    loadingHistory.value = true;
    try {
        history.value = await getHistory(keyword.value);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : '加载历史失败';
    }
    finally {
        loadingHistory.value = false;
    }
}
function confirmClearHistory() {
    Modal.confirm({
        title: '确认清空历史',
        content: '清空后不可恢复，确定继续吗？',
        async onOk() {
            await clearHistory();
            history.value = [];
            message.success('历史已清空');
        }
    });
}
function removeVoiceprint(user) {
    form.voiceprint_users = form.voiceprint_users.filter((item) => item !== user);
}
onMounted(() => {
    void loadConfig();
    void loadHistory();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "config-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "config-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/",
    ...{ class: "screen-link" },
}));
const __VLS_2 = __VLS_1({
    to: "/",
    ...{ class: "screen-link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
var __VLS_3;
if (__VLS_ctx.error) {
    const __VLS_4 = {}.AAlert;
    /** @type {[typeof __VLS_components.AAlert, typeof __VLS_components.aAlert, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ 'onClose': {} },
        ...{ class: "config-alert" },
        type: "error",
        showIcon: true,
        message: (__VLS_ctx.error),
        closable: true,
    }));
    const __VLS_6 = __VLS_5({
        ...{ 'onClose': {} },
        ...{ class: "config-alert" },
        type: "error",
        showIcon: true,
        message: (__VLS_ctx.error),
        closable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    let __VLS_8;
    let __VLS_9;
    let __VLS_10;
    const __VLS_11 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.error))
                return;
            __VLS_ctx.error = '';
        }
    };
    var __VLS_7;
}
const __VLS_12 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    layout: "vertical",
    model: (__VLS_ctx.form),
    ...{ class: "config-layout" },
}));
const __VLS_14 = __VLS_13({
    layout: "vertical",
    model: (__VLS_ctx.form),
    ...{ class: "config-layout" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
const __VLS_16 = {}.ARow;
/** @type {[typeof __VLS_components.ARow, typeof __VLS_components.aRow, typeof __VLS_components.ARow, typeof __VLS_components.aRow, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    gutter: (24),
}));
const __VLS_18 = __VLS_17({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    xs: (24),
    md: (12),
}));
const __VLS_22 = __VLS_21({
    xs: (24),
    md: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
const __VLS_24 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "主唤醒词",
}));
const __VLS_26 = __VLS_25({
    label: "主唤醒词",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    value: (__VLS_ctx.form.wake_word),
    placeholder: "例如：小智小智",
}));
const __VLS_30 = __VLS_29({
    value: (__VLS_ctx.form.wake_word),
    placeholder: "例如：小智小智",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
var __VLS_27;
var __VLS_23;
const __VLS_32 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    xs: (24),
    md: (12),
}));
const __VLS_34 = __VLS_33({
    xs: (24),
    md: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "唤醒超时时间（秒）",
}));
const __VLS_38 = __VLS_37({
    label: "唤醒超时时间（秒）",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.AInputNumber;
/** @type {[typeof __VLS_components.AInputNumber, typeof __VLS_components.aInputNumber, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    value: (__VLS_ctx.form.active_timeout),
    min: (5),
    max: (60),
    ...{ class: "full-control" },
}));
const __VLS_42 = __VLS_41({
    value: (__VLS_ctx.form.active_timeout),
    min: (5),
    max: (60),
    ...{ class: "full-control" },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
var __VLS_39;
var __VLS_35;
var __VLS_19;
const __VLS_44 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "备用唤醒词",
}));
const __VLS_46 = __VLS_45({
    label: "备用唤醒词",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ATextarea;
/** @type {[typeof __VLS_components.ATextarea, typeof __VLS_components.aTextarea, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    value: (__VLS_ctx.alternativesText),
    rows: (3),
    placeholder: "多个唤醒词用换行分隔",
}));
const __VLS_50 = __VLS_49({
    value: (__VLS_ctx.alternativesText),
    rows: (3),
    placeholder: "多个唤醒词用换行分隔",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
const __VLS_52 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "唤醒欢迎语",
}));
const __VLS_54 = __VLS_53({
    label: "唤醒欢迎语",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    value: (__VLS_ctx.form.greeting_text),
    placeholder: "唤醒后自动播报",
}));
const __VLS_58 = __VLS_57({
    value: (__VLS_ctx.form.greeting_text),
    placeholder: "唤醒后自动播报",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
const __VLS_60 = {}.ARow;
/** @type {[typeof __VLS_components.ARow, typeof __VLS_components.aRow, typeof __VLS_components.ARow, typeof __VLS_components.aRow, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    gutter: (24),
}));
const __VLS_62 = __VLS_61({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    xs: (24),
    md: (12),
}));
const __VLS_66 = __VLS_65({
    xs: (24),
    md: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "语音 WebSocket 地址",
}));
const __VLS_70 = __VLS_69({
    label: "语音 WebSocket 地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    value: (__VLS_ctx.form.voice_ws_url),
}));
const __VLS_74 = __VLS_73({
    value: (__VLS_ctx.form.voice_ws_url),
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
var __VLS_71;
var __VLS_67;
const __VLS_76 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    xs: (24),
    md: (12),
}));
const __VLS_78 = __VLS_77({
    xs: (24),
    md: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "对话 HTTP 服务地址",
}));
const __VLS_82 = __VLS_81({
    label: "对话 HTTP 服务地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    value: (__VLS_ctx.form.dialog_service_root),
}));
const __VLS_86 = __VLS_85({
    value: (__VLS_ctx.form.dialog_service_root),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
var __VLS_83;
var __VLS_79;
var __VLS_63;
const __VLS_88 = {}.ARow;
/** @type {[typeof __VLS_components.ARow, typeof __VLS_components.aRow, typeof __VLS_components.ARow, typeof __VLS_components.aRow, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    gutter: (24),
}));
const __VLS_90 = __VLS_89({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
const __VLS_92 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    xs: (24),
    md: (8),
}));
const __VLS_94 = __VLS_93({
    xs: (24),
    md: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    label: "ASR 引擎",
}));
const __VLS_98 = __VLS_97({
    label: "ASR 引擎",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.ASelect;
/** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    value: (__VLS_ctx.form.asr_engine),
}));
const __VLS_102 = __VLS_101({
    value: (__VLS_ctx.form.asr_engine),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
const __VLS_104 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    value: "mock",
}));
const __VLS_106 = __VLS_105({
    value: "mock",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
var __VLS_107;
const __VLS_108 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    value: "baidu",
}));
const __VLS_110 = __VLS_109({
    value: "baidu",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
var __VLS_111;
var __VLS_103;
var __VLS_99;
var __VLS_95;
const __VLS_112 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    xs: (24),
    md: (8),
}));
const __VLS_114 = __VLS_113({
    xs: (24),
    md: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "ASR 超时（秒）",
}));
const __VLS_118 = __VLS_117({
    label: "ASR 超时（秒）",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
const __VLS_120 = {}.AInputNumber;
/** @type {[typeof __VLS_components.AInputNumber, typeof __VLS_components.aInputNumber, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    value: (__VLS_ctx.form.asr_timeout_seconds),
    min: (5),
    max: (30),
    ...{ class: "full-control" },
}));
const __VLS_122 = __VLS_121({
    value: (__VLS_ctx.form.asr_timeout_seconds),
    min: (5),
    max: (30),
    ...{ class: "full-control" },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
var __VLS_119;
var __VLS_115;
const __VLS_124 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    xs: (24),
    md: (8),
}));
const __VLS_126 = __VLS_125({
    xs: (24),
    md: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
const __VLS_128 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "启用文字转语音",
}));
const __VLS_130 = __VLS_129({
    label: "启用文字转语音",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
const __VLS_132 = {}.ASwitch;
/** @type {[typeof __VLS_components.ASwitch, typeof __VLS_components.aSwitch, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    checked: (__VLS_ctx.form.tts_enabled),
}));
const __VLS_134 = __VLS_133({
    checked: (__VLS_ctx.form.tts_enabled),
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
var __VLS_131;
var __VLS_127;
var __VLS_91;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
const __VLS_136 = {}.ARow;
/** @type {[typeof __VLS_components.ARow, typeof __VLS_components.aRow, typeof __VLS_components.ARow, typeof __VLS_components.aRow, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    gutter: (24),
}));
const __VLS_138 = __VLS_137({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
const __VLS_140 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    xs: (24),
    md: (8),
}));
const __VLS_142 = __VLS_141({
    xs: (24),
    md: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
const __VLS_144 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    label: "选择音色",
}));
const __VLS_146 = __VLS_145({
    label: "选择音色",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.ASelect;
/** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    value: (__VLS_ctx.form.tts_voice),
}));
const __VLS_150 = __VLS_149({
    value: (__VLS_ctx.form.tts_voice),
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
const __VLS_152 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    value: "zh-CN-XiaoxiaoNeural",
}));
const __VLS_154 = __VLS_153({
    value: "zh-CN-XiaoxiaoNeural",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
var __VLS_155;
const __VLS_156 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    value: "zh-CN-YunxiNeural",
}));
const __VLS_158 = __VLS_157({
    value: "zh-CN-YunxiNeural",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
var __VLS_159;
const __VLS_160 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    value: "zh-CN-XiaoyiNeural",
}));
const __VLS_162 = __VLS_161({
    value: "zh-CN-XiaoyiNeural",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
var __VLS_163;
const __VLS_164 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    value: "zh-CN-YunyangNeural",
}));
const __VLS_166 = __VLS_165({
    value: "zh-CN-YunyangNeural",
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
var __VLS_167;
var __VLS_151;
var __VLS_147;
var __VLS_143;
const __VLS_168 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    xs: (24),
    md: (8),
}));
const __VLS_170 = __VLS_169({
    xs: (24),
    md: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
const __VLS_172 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    label: "语速调节",
}));
const __VLS_174 = __VLS_173({
    label: "语速调节",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
__VLS_175.slots.default;
const __VLS_176 = {}.ASlider;
/** @type {[typeof __VLS_components.ASlider, typeof __VLS_components.aSlider, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    value: (__VLS_ctx.ttsRateValue),
    min: (-50),
    max: (100),
}));
const __VLS_178 = __VLS_177({
    value: (__VLS_ctx.ttsRateValue),
    min: (-50),
    max: (100),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
var __VLS_175;
var __VLS_171;
const __VLS_180 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    xs: (24),
    md: (8),
}));
const __VLS_182 = __VLS_181({
    xs: (24),
    md: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
__VLS_183.slots.default;
const __VLS_184 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    label: "音量调节",
}));
const __VLS_186 = __VLS_185({
    label: "音量调节",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
__VLS_187.slots.default;
const __VLS_188 = {}.ASlider;
/** @type {[typeof __VLS_components.ASlider, typeof __VLS_components.aSlider, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    value: (__VLS_ctx.ttsVolumeValue),
    min: (-50),
    max: (100),
}));
const __VLS_190 = __VLS_189({
    value: (__VLS_ctx.ttsVolumeValue),
    min: (-50),
    max: (100),
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
var __VLS_187;
var __VLS_183;
var __VLS_139;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
const __VLS_192 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
    label: "启用声纹验证",
}));
const __VLS_194 = __VLS_193({
    label: "启用声纹验证",
}, ...__VLS_functionalComponentArgsRest(__VLS_193));
__VLS_195.slots.default;
const __VLS_196 = {}.ASwitch;
/** @type {[typeof __VLS_components.ASwitch, typeof __VLS_components.aSwitch, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    checked: (__VLS_ctx.form.voiceprint_enabled),
}));
const __VLS_198 = __VLS_197({
    checked: (__VLS_ctx.form.voiceprint_enabled),
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
var __VLS_195;
const __VLS_200 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    label: "已注册声纹",
}));
const __VLS_202 = __VLS_201({
    label: "已注册声纹",
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
__VLS_203.slots.default;
for (const [user] of __VLS_getVForSourceType((__VLS_ctx.form.voiceprint_users))) {
    const __VLS_204 = {}.ATag;
    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
    // @ts-ignore
    const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
        ...{ 'onClose': {} },
        key: (user),
        closable: true,
    }));
    const __VLS_206 = __VLS_205({
        ...{ 'onClose': {} },
        key: (user),
        closable: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_205));
    let __VLS_208;
    let __VLS_209;
    let __VLS_210;
    const __VLS_211 = {
        onClose: (...[$event]) => {
            __VLS_ctx.removeVoiceprint(user);
        }
    };
    __VLS_207.slots.default;
    (user);
    var __VLS_207;
}
if (__VLS_ctx.form.voiceprint_users.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "muted-text" },
    });
}
var __VLS_203;
const __VLS_212 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
    label: "讲解词配置 JSON",
}));
const __VLS_214 = __VLS_213({
    label: "讲解词配置 JSON",
}, ...__VLS_functionalComponentArgsRest(__VLS_213));
__VLS_215.slots.default;
const __VLS_216 = {}.ATextarea;
/** @type {[typeof __VLS_components.ATextarea, typeof __VLS_components.aTextarea, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    value: (__VLS_ctx.explanationWordsText),
    rows: (6),
}));
const __VLS_218 = __VLS_217({
    value: (__VLS_ctx.explanationWordsText),
    rows: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
var __VLS_215;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "config-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-toolbar" },
});
const __VLS_220 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    ...{ 'onKeyup': {} },
    value: (__VLS_ctx.keyword),
    placeholder: "搜索指令或播报内容",
}));
const __VLS_222 = __VLS_221({
    ...{ 'onKeyup': {} },
    value: (__VLS_ctx.keyword),
    placeholder: "搜索指令或播报内容",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
let __VLS_224;
let __VLS_225;
let __VLS_226;
const __VLS_227 = {
    onKeyup: (__VLS_ctx.loadHistory)
};
var __VLS_223;
const __VLS_228 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingHistory),
}));
const __VLS_230 = __VLS_229({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.loadingHistory),
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
let __VLS_232;
let __VLS_233;
let __VLS_234;
const __VLS_235 = {
    onClick: (__VLS_ctx.loadHistory)
};
__VLS_231.slots.default;
var __VLS_231;
const __VLS_236 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
    ...{ 'onClick': {} },
    danger: true,
}));
const __VLS_238 = __VLS_237({
    ...{ 'onClick': {} },
    danger: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
let __VLS_240;
let __VLS_241;
let __VLS_242;
const __VLS_243 = {
    onClick: (__VLS_ctx.confirmClearHistory)
};
__VLS_239.slots.default;
var __VLS_239;
const __VLS_244 = {}.ATable;
/** @type {[typeof __VLS_components.ATable, typeof __VLS_components.aTable, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    dataSource: (__VLS_ctx.history),
    columns: (__VLS_ctx.historyColumns),
    rowKey: "id",
    pagination: ({ pageSize: 8 }),
}));
const __VLS_246 = __VLS_245({
    dataSource: (__VLS_ctx.history),
    columns: (__VLS_ctx.historyColumns),
    rowKey: "id",
    pagination: ({ pageSize: 8 }),
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "config-footer" },
});
const __VLS_248 = {}.ASpace;
/** @type {[typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, typeof __VLS_components.ASpace, typeof __VLS_components.aSpace, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({}));
const __VLS_250 = __VLS_249({}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
const __VLS_252 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.saving),
}));
const __VLS_254 = __VLS_253({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.saving),
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
let __VLS_256;
let __VLS_257;
let __VLS_258;
const __VLS_259 = {
    onClick: (__VLS_ctx.handleSave)
};
__VLS_255.slots.default;
var __VLS_255;
const __VLS_260 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
}));
const __VLS_262 = __VLS_261({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
let __VLS_264;
let __VLS_265;
let __VLS_266;
const __VLS_267 = {
    onClick: (__VLS_ctx.loadConfig)
};
__VLS_263.slots.default;
var __VLS_263;
const __VLS_268 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.reloading),
}));
const __VLS_270 = __VLS_269({
    ...{ 'onClick': {} },
    loading: (__VLS_ctx.reloading),
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
let __VLS_272;
let __VLS_273;
let __VLS_274;
const __VLS_275 = {
    onClick: (__VLS_ctx.handleReload)
};
__VLS_271.slots.default;
var __VLS_271;
var __VLS_251;
var __VLS_15;
/** @type {__VLS_StyleScopedClasses['config-page']} */ ;
/** @type {__VLS_StyleScopedClasses['config-header']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['screen-link']} */ ;
/** @type {__VLS_StyleScopedClasses['config-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['config-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['full-control']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['full-control']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-text']} */ ;
/** @type {__VLS_StyleScopedClasses['config-section']} */ ;
/** @type {__VLS_StyleScopedClasses['history-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['config-footer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            form: form,
            loading: loading,
            saving: saving,
            reloading: reloading,
            loadingHistory: loadingHistory,
            error: error,
            keyword: keyword,
            history: history,
            historyColumns: historyColumns,
            alternativesText: alternativesText,
            ttsRateValue: ttsRateValue,
            ttsVolumeValue: ttsVolumeValue,
            explanationWordsText: explanationWordsText,
            loadConfig: loadConfig,
            handleSave: handleSave,
            handleReload: handleReload,
            loadHistory: loadHistory,
            confirmClearHistory: confirmClearHistory,
            removeVoiceprint: removeVoiceprint,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=WakeConfigPage.vue.js.map