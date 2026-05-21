# 数字人对话面板与配置入口设计

日期：2026-05-14

## 需求概述

三项改动：
1. 唤醒后底部弹出对话面板，支持文字 + 语音输入
2. 面板内含对话历史 + 文字输入框
3. 配置页入口在 header 右上角更显眼化

## 组件架构

### 新建 ChatPanel.vue

位置：`src/components/business/ChatPanel.vue`

**职责**：展示对话消息列表 + 提供文字输入发送能力

**Props**：
| Prop | 类型 | 说明 |
|------|------|------|
| `visible` | `boolean` | 控制面板展开/收起 |
| `events` | `Event[]` | 来自 voiceStore.events |
| `disabled` | `boolean` | 非唤醒状态时禁用输入 |

**Events**：
| Event | 载荷 | 说明 |
|-------|------|------|
| `send` | `string` | 用户发送文字，触发对话流程 |

**内部结构**：
- 顶部状态条（可选）：显示当前语音链路状态
- 中部消息列表：滚动区域，遍历 events 渲染消息气泡
- 底部输入区：`<textarea>` + 发送按钮，支持 Ctrl+Enter 发送

### 修改 voiceStore

新增 `sendText(text: string)` action：
- 构造与 `asrResult` 相同格式的事件注入 event 流
- 复用现有的 `recognizing → thinking → speaking → standby` 自动流转逻辑
- 通过 WebSocket 发送文字消息到后端（`ws.send({ type: 'textInput', text })`）

### 修改 DashboardScreen.vue

- 新增 `chatVisible` ref
- 当 `voice.state` 变为 `wakeup` 时，`chatVisible.value = true`（自动展开）
- 当 `voice.state` 变为 `idle` 或 `stopped` 时，`chatVisible.value = false`（自动收起）
- 在 `command-stage` 底部引入 `<ChatPanel>`
- 处理 `@send` 调用 `voice.sendText(text)`

### 配置入口

- header 右上角增加齿轮图标按钮（Ant Design `<SettingOutlined />`）
- 替代现有文字链接 "设置"，尺寸 24px，颜色与主题色一致
- 路由不变，仍指向 `/config`

## 消息渲染规则

面板内按 event 类型区分：

| Event 类型 | 气泡角色 | 对齐方式 |
|------------|----------|----------|
| `wakeup` | 状态提示 | 居中，浅色小字 |
| `asr` | 用户消息 | 右对齐 |
| `dialog` | 数字人回复 | 左对齐 |
| `tts` | 状态提示（"播报中..."） | 居中，浅色小字 |
| `ready` / `standby` | 状态提示 | 居中，浅色小字 |
| `error` | 状态提示 | 居中，红色小字 |

- 消息列表最多展示最近 50 条
- 新消息到达时自动滚动到底部
- 面板收起时不销毁组件，保持消息历史

## 动画规范

| 动画 | 参数 |
|------|------|
| 面板展开 | `translateY(100%)` → `translateY(0)`, 300ms ease-out |
| 面板收起 | 反向 |
| 消息气泡出现 | opacity 0→1 + translateY 8px, 150ms |

## 异常处理

- 发送失败：面板内显示红色提示气泡"发送失败，请重试"
- WebSocket 断开：输入框自动禁用，顶部状态条显示"服务已断开"
- 浏览器阻止自动播放：复用现有 fallback 逻辑，无需新增

## 文件变更清单

| 文件 | 变更类型 |
|------|----------|
| `src/components/business/ChatPanel.vue` | 新建 |
| `src/stores/voiceStore.ts` | 修改（新增 sendText action） |
| `src/features/dashboard/DashboardScreen.vue` | 修改（引入 ChatPanel + chatVisible 状态） |
| `src/features/dashboard/DashboardScreen.css` (或内联样式) | 修改（面板样式 + 动画） |
| `src/features/dashboard/DashboardScreen.vue` | 修改（配置按钮视觉升级） |
