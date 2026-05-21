import { computed, nextTick, ref, watch } from 'vue';
const props = defineProps();
const emit = defineEmits();
const inputText = ref('');
const messagesRef = ref();
const messages = computed(() => {
    const result = [];
    // events are unshifted (newest first), reverse for chronological
    const chronological = [...props.events].reverse();
    for (const event of chronological) {
        if (event.type === 'asr') {
            result.push({ id: event.id, role: 'user', text: event.text });
        }
        else if (event.type === 'dialog') {
            result.push({ id: event.id, role: 'assistant', text: event.text });
        }
        else if (event.type === 'wakeup') {
            result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' });
        }
        else if (event.type === 'tts') {
            result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' });
        }
        else if (event.type === 'ready') {
            result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' });
        }
        else if (event.type === 'standby') {
            result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' });
        }
        else if (event.type === 'error') {
            result.push({ id: event.id, role: 'status', text: event.text, variant: 'error' });
        }
    }
    return result.slice(-50);
});
function handleSend() {
    const text = inputText.value.trim();
    if (!text)
        return;
    emit('send', text);
    inputText.value = '';
}
function handleKeydown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSend();
    }
}
watch(() => props.events.length, async () => {
    await nextTick();
    if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-panel" },
    ...{ class: ({ 'chat-panel--open': __VLS_ctx.visible }) },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.visible) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-panel__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "chat-panel__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('close');
        } },
    ...{ class: "chat-panel__close" },
    'aria-label': "关闭对话面板",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-panel__messages" },
    ref: "messagesRef",
});
/** @type {typeof __VLS_ctx.messagesRef} */ ;
for (const [msg] of __VLS_getVForSourceType((__VLS_ctx.messages))) {
    (msg.id);
    if (msg.role === 'user') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-panel__bubble chat-panel__bubble--user" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-panel__bubble-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (msg.text);
    }
    if (msg.role === 'assistant') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-panel__bubble chat-panel__bubble--assistant" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "chat-panel__bubble-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (msg.text);
    }
    if (msg.role === 'status') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chat-panel__status" },
            ...{ class: (msg.variant) },
        });
        (msg.text);
    }
}
if (__VLS_ctx.messages.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "chat-panel__empty" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-panel__input-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleKeydown) },
    value: (__VLS_ctx.inputText),
    ...{ class: "chat-panel__input" },
    disabled: (__VLS_ctx.disabled),
    placeholder: (__VLS_ctx.disabled ? '未处于对话状态' : '输入消息，Ctrl+Enter 发送'),
    rows: "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleSend) },
    ...{ class: "chat-panel__send" },
    disabled: (__VLS_ctx.disabled || !__VLS_ctx.inputText.trim()),
});
/** @type {__VLS_StyleScopedClasses['chat-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__header']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__title']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__close']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__messages']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__bubble--user']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__bubble-label']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__bubble--assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__bubble-label']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__status']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__empty']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__input']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-panel__send']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            inputText: inputText,
            messagesRef: messagesRef,
            messages: messages,
            handleSend: handleSend,
            handleKeydown: handleKeydown,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=ChatPanel.vue.js.map