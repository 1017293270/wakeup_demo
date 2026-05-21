# 语音唤醒 AI 指挥舱 — 对话体验增强设计

**日期**: 2026-05-15
**状态**: 已批准

## 需求概述

1. 对话弹窗放大为可拖拽悬浮窗口，数字人和大屏数据仍可见
2. 弹窗内支持文字输入框直接发送（语音输入由大屏按钮触发）
3. 唤醒后持续多轮对话，手动退出 + 超时自动退出结合
4. 配置重载后实时更新运行中的 WebSocket 会话

## 架构设计

### 前端变更

| 文件 | 变更 |
|------|------|
| `FloatingChatDialog.vue` | **新增**。可拖拽悬浮弹窗组件，含消息列表和文字输入 |
| `DashboardScreen.vue` | 集成 FloatingChatDialog，移除旧 ChatPanel 的展示逻辑 |
| `voiceStore.ts` | 新增 `dialogVisible` 状态、超时计时器管理、配置实时更新 |
| `useVoiceSocket.ts` | 处理 `configUpdate` 事件，支持文字输入直接发送到 dialog 服务 |

### 后端变更

| 文件 | 变更 |
|------|------|
| `ws_router.py` | `reload_config` 时广播 `configUpdate` 给所有活跃会话；`VoiceSession` 接收事件后重载配置 |
| `main.py` | `reload_config` 端点触发广播 |

### 数据流

```
用户点击"重载配置" → POST /api/v1/config/reload
  → 后端保存并广播 configUpdate WebSocket 事件
    → 所有活跃 VoiceSession 接收 → self.config = config_store.load()
    → 前端 voiceStore 同步更新

用户发送文字 → FloatingChatDialog → WebSocket textInput → VoiceSession
  → ASR → Dialog → TTS → 回答
  → 每次回答完成后重置超时计时器

用户点击关闭/说"退出" → cancel → standby → dialogVisible = false
```

## 弹窗规格

- 默认位置：右下角，距底部 60px，距右侧 20px
- 尺寸：宽 380px，高 ~380px（消息区自适应）
- 可拖拽：鼠标/触摸拖动 header 区域
- 状态指示灯：绿色在线 / 灰色离线
- 最小化/关闭按钮

## 多轮对话逻辑

- 唤醒后 `conversationActive = true`，`dialogVisible = true`
- 每次对话完成（speaking → listening）后重置 40s 超时计时器
- 超时或用户手动关闭 → `dialogVisible = false`，`conversationActive = false`
- 文字输入发送后走相同的 ASR → Dialog → TTS 管线

## 配置实时更新

- `VoiceSession` 添加 `handle_config_update(new_config)` 方法
- `main.py` 的 `reload_config` 端点遍历所有活跃 session 广播
- 前端 `useVoiceSocket` 收到 `configUpdate` 后更新 voiceStore
