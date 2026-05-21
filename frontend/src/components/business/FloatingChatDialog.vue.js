import { computed, nextTick, ref, watch } from 'vue';
const props = defineProps();
const emit = defineEmits();
const inputText = ref('');
const messagesRef = ref(null);
const isRecording = ref(false);
const inputMode = ref('voice');
// Drag state
const dragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const position = ref({ x: 0, y: 0 });
// Cancel gesture state
const isCanceling = ref(false);
const recordStartY = ref(0);
const recordCurrentY = ref(0);
const CANCEL_THRESHOLD = 60;
const cancelProgress = computed(() => {
    if (!isRecording.value)
        return 0;
    const dy = recordStartY.value - recordCurrentY.value;
    return Math.min(1, Math.max(0, dy / CANCEL_THRESHOLD));
});
const dialogStyle = computed(() => {
    if (props.expanded) {
        return {}; // CSS handles expanded position
    }
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
function getBarHeight(index) {
    const base = 8;
    const voiceBoost = props.volumeLevel * 24;
    return Math.max(4, Math.min(28, base + voiceBoost));
}
function startDrag(e) {
    if (isRecording.value)
        return;
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
    if (isRecording.value)
        return;
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
// ---- Push-to-talk with cancel gesture ----
let _recordCleanup = null;
function startRecord(e) {
    if (props.disabled)
        return;
    isRecording.value = true;
    isCanceling.value = false;
    recordStartY.value = e.clientY;
    recordCurrentY.value = e.clientY;
    emit('record-start');
    bindRecordTracking('mouse');
}
function startRecordTouch(e) {
    if (props.disabled)
        return;
    isRecording.value = true;
    isCanceling.value = false;
    recordStartY.value = e.touches[0].clientY;
    recordCurrentY.value = e.touches[0].clientY;
    emit('record-start');
    bindRecordTracking('touch');
}
function bindRecordTracking(kind) {
    unbindRecordTracking();
    if (kind === 'mouse') {
        const onMove = (ev) => {
            if (!isRecording.value)
                return;
            recordCurrentY.value = ev.clientY;
            const dy = recordStartY.value - ev.clientY;
            isCanceling.value = dy > CANCEL_THRESHOLD;
        };
        const onUp = () => {
            unbindRecordTracking();
            finishRecord();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        _recordCleanup = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }
    else {
        const onMove = (ev) => {
            if (!isRecording.value)
                return;
            recordCurrentY.value = ev.touches[0].clientY;
            const dy = recordStartY.value - ev.touches[0].clientY;
            isCanceling.value = dy > CANCEL_THRESHOLD;
        };
        const onEnd = () => {
            unbindRecordTracking();
            finishRecord();
        };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onEnd);
        _recordCleanup = () => {
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('touchcancel', onEnd);
        };
    }
}
function unbindRecordTracking() {
    if (_recordCleanup) {
        _recordCleanup();
        _recordCleanup = null;
    }
}
function finishRecord() {
    if (!isRecording.value)
        return;
    const shouldCancel = isCanceling.value;
    isRecording.value = false;
    isCanceling.value = false;
    if (shouldCancel) {
        emit('record-cancel');
    }
    else {
        emit('record-stop');
    }
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
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog--expanded']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog--recording']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__messages']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__switch-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-btn--recording']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-btn']} */ ;
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
        ...{ class: ({
                'floating-chat-dialog--recording': __VLS_ctx.isRecording,
                'floating-chat-dialog--canceling': __VLS_ctx.isCanceling,
                'floating-chat-dialog--expanded': __VLS_ctx.expanded
            }) },
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
                __VLS_ctx.$emit('expand');
            } },
        ...{ class: "floating-chat-dialog__btn" },
        title: (__VLS_ctx.expanded ? '收起' : '放大'),
    });
    if (!__VLS_ctx.expanded) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "15 3 21 3 21 9",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "9 21 3 21 3 15",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "21",
            y1: "3",
            x2: "14",
            y2: "10",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "3",
            y1: "21",
            x2: "10",
            y2: "14",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            width: "16",
            height: "16",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "4 8 4 4 8 4",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
            points: "20 16 20 20 16 20",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "4",
            y1: "4",
            x2: "9",
            y2: "9",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "20",
            y1: "20",
            x2: "15",
            y2: "15",
        });
    }
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
    if (__VLS_ctx.inputMode === 'voice') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "floating-chat-dialog__voice-area" },
        });
        const __VLS_0 = {}.Transition;
        /** @type {[typeof __VLS_components.Transition, typeof __VLS_components.Transition, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            name: "cancel-zone",
        }));
        const __VLS_2 = __VLS_1({
            name: "cancel-zone",
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_3.slots.default;
        if (__VLS_ctx.isRecording) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "floating-chat-dialog__cancel-zone" },
                ...{ class: ({ 'floating-chat-dialog__cancel-zone--active': __VLS_ctx.isCanceling }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                ...{ class: "floating-chat-dialog__cancel-arrow" },
                ...{ class: ({ 'floating-chat-dialog__cancelarrow--active': __VLS_ctx.isCanceling }) },
                viewBox: "0 0 24 24",
                width: "28",
                height: "28",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
                'stroke-linecap': "round",
                'stroke-linejoin': "round",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
                x1: "12",
                y1: "19",
                x2: "12",
                y2: "5",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
                points: "5 12 12 5 19 12",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "floating-chat-dialog__cancel-hint" },
            });
            (__VLS_ctx.isCanceling ? '松开取消' : '上滑取消');
        }
        var __VLS_3;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "floating-chat-dialog__ptt-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.visible))
                        return;
                    if (!(__VLS_ctx.inputMode === 'voice'))
                        return;
                    __VLS_ctx.inputMode = 'text';
                } },
            ...{ class: "floating-chat-dialog__switch-btn" },
            title: "切换文字输入",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            width: "18",
            height: "18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "2",
            y: "4",
            width: "20",
            height: "16",
            rx: "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M6 8h.01",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M10 8h.01",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M14 8h.01",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M18 8h.01",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M8 12h8",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M8 16h6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onMousedown: (__VLS_ctx.startRecord) },
            ...{ onTouchstart: (__VLS_ctx.startRecordTouch) },
            ...{ class: "floating-chat-dialog__ptt-btn" },
            ...{ class: ({
                    'floating-chat-dialog__ptt-btn--recording': __VLS_ctx.isRecording,
                    'floating-chat-dialog__ptt-btn--cancel': __VLS_ctx.isCanceling
                }) },
            disabled: (__VLS_ctx.disabled),
        });
        if (!__VLS_ctx.isRecording) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "floating-chat-dialog__ptt-icon" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                viewBox: "0 0 24 24",
                width: "20",
                height: "20",
                fill: "currentColor",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        else if (__VLS_ctx.isCanceling) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "floating-chat-dialog__cancel-text" },
            });
        }
        else {
            for (const [i] of __VLS_getVForSourceType((5))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                    key: (i),
                    ...{ class: "floating-chat-dialog__volume-bar" },
                    ...{ style: ({ height: __VLS_ctx.getBarHeight(i) + 'px', animationDelay: (i * 0.08) + 's' }) },
                });
            }
        }
    }
    if (__VLS_ctx.inputMode === 'text') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "floating-chat-dialog__input-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.visible))
                        return;
                    if (!(__VLS_ctx.inputMode === 'text'))
                        return;
                    __VLS_ctx.inputMode = 'voice';
                } },
            ...{ class: "floating-chat-dialog__switch-btn" },
            title: "切换语音输入",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            viewBox: "0 0 24 24",
            width: "18",
            height: "18",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M19 10v2a7 7 0 0 1-14 0v-2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "12",
            y1: "19",
            x2: "12",
            y2: "23",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
            x1: "8",
            y1: "23",
            x2: "16",
            y2: "23",
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
}
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__header']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__status-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__title']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__btn']} */ ;
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
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__voice-area']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__cancel-zone']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__cancel-arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__cancel-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__switch-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__ptt-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__cancel-text']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__volume-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__switch-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__input']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-chat-dialog__send']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            inputText: inputText,
            messagesRef: messagesRef,
            isRecording: isRecording,
            inputMode: inputMode,
            isCanceling: isCanceling,
            dialogStyle: dialogStyle,
            getBarHeight: getBarHeight,
            startDrag: startDrag,
            startDragTouch: startDragTouch,
            autoResize: autoResize,
            handleKeydown: handleKeydown,
            handleSend: handleSend,
            startRecord: startRecord,
            startRecordTouch: startRecordTouch,
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