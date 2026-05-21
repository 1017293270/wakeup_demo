import { computed, nextTick, ref, watch } from 'vue';
const props = defineProps();
const emit = defineEmits();
const inputText = ref('');
const messagesRef = ref(null);
// Drag state
const dragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const position = ref({ x: 0, y: 0 }); // 0 = default (bottom-right)
const dialogStyle = computed(() => {
    if (position.value.x === 0 && position.value.y === 0) {
        return { bottom: '60px', right: '20px' };
    }
    return {
        left: `${position.value.x}px`,
        top: `${position.value.y}px`,
        bottom: 'auto',
        right: 'auto'
    };
});
function startDrag(e) {
    if (e.target.closest('.floating-chat-dialog__header-actions'))
        return;
    dragging.value = true;
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const onMove = (ev) => {
        position.value = { x: ev.clientX - dragOffset.value.x, y: ev.clientY - dragOffset.value.y };
    };
    const onUp = () => {
        dragging.value = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}
function startDragTouch(e) {
    if (e.target.closest('.floating-chat-dialog__header-actions'))
        return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.value = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    const onMove = (ev) => {
        const t = ev.touches[0];
        position.value = { x: t.clientX - dragOffset.value.x, y: t.clientY - dragOffset.value.y };
    };
    const onEnd = () => {
        dragging.value = false;
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
}
function autoResize() {
    nextTick(() => {
        if (messagesRef.value) {
            messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
        }
    });
}
function handleKeydown(e) {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
}
function handleSend() {
    const text = inputText.value.trim();
    if (!text)
        return;
    emit('send', text);
    inputText.value = '';
}
watch(() => props.messages.length, () => {
    nextTick(() => {
        if (messagesRef.value) {
            messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
        }
    });
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__send']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__send']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.visible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMousedown: (__VLS_ctx.startDrag) },
        ...{ onTouchstart: (__VLS_ctx.startDragTouch) },
        ...{ class: "floating-chat-dialog" },
        ...{ style: (__VLS_ctx.dialogStyle) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "floating-chat-dialog__header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "floating-chat-dialog__header-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "floating-chat-dialog__status-dot" },
        ...{ class: (__VLS_ctx.online ? 'floating-chat-dialog__statusdot--online' : 'floating-chat-dialog__statusdot--offline') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "floating-chat-dialog__title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "floating-chat-dialog__header-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.$emit('minimize');
            } },
        ...{ class: "floating-chat-dialog__btn" },
        title: "最小化",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        width: "16",
        height: "16",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "5",
        y1: "12",
        x2: "19",
        y2: "12",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.$emit('close');
            } },
        ...{ class: "floating-chat-dialog__btn" },
        title: "关闭",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        width: "16",
        height: "16",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "18",
        y1: "6",
        x2: "6",
        y2: "18",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        x1: "6",
        y1: "6",
        x2: "18",
        y2: "18",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "floating-chat-dialog__messages" },
        ref: "messagesRef",
    });
    /** @type {typeof __VLS_ctx.messagesRef} */ ;
    for (const [msg] of __VLS_getVForSourceType((__VLS_ctx.messages))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (msg.id),
            ...{ class: "floating-chat-dialog__msg" },
            ...{ class: (`floating-chat-dialog__msg--${msg.role}`) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (msg.text);
    }
    if (__VLS_ctx.isThinking) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "floating-chat-dialog__msg floating-chat-dialog__msg--assistant" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "floating-chat-dialog__thinking" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "floating-chat-dialog__dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "floating-chat-dialog__dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "floating-chat-dialog__dot" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "floating-chat-dialog__input-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        ...{ onKeydown: (__VLS_ctx.handleKeydown) },
        ...{ onInput: (__VLS_ctx.autoResize) },
        value: (__VLS_ctx.inputText),
        ...{ class: "floating-chat-dialog__input" },
        placeholder: "输入消息，Enter 发送...",
        disabled: (__VLS_ctx.disabled),
        rows: "1",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleSend) },
        ...{ class: "floating-chat-dialog__send" },
        disabled: (__VLS_ctx.disabled || !__VLS_ctx.inputText.trim()),
    });
}
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__header']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__status-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__title']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__messages']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__msg']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__msg']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__msg--assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__thinking']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__send']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            inputText: inputText,
            messagesRef: messagesRef,
            dialogStyle: dialogStyle,
            startDrag: startDrag,
            startDragTouch: startDragTouch,
            autoResize: autoResize,
            handleKeydown: handleKeydown,
            handleSend: handleSend,
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
//# sourceMappingURL=FloatingChatDialog.vue.js.map