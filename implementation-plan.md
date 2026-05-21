# 语音唤醒数据大屏项目实现方案

## 1. 目标与边界

本项目实现一套浏览器端语音唤醒数据大屏，包含两个主要页面：

1. **数据看板唤醒界面**
   - 中心展示 Live2D 数字人。
   - 周围展示高端数据大屏图表，首期数据允许写死。
   - 接入语音唤醒事件，唤醒后进入对话态。
   - 后台服务需要支持语音唤醒、语音转文字、对话接口转发。

2. **配置界面**
   - 参考根目录 `peizhi.vue`。
   - 保留现有配置项。
   - 采用专业控制台风格，和大屏保持同一暗色科技基调。

本方案遵守根目录 `AGENTS.md` 中的全局工程规范：信息优先、状态可感知、异常可恢复、前后端契约清晰、避免只实现 happy path。

## 2. 技术栈

### 2.1 前端

- Vue 3
- TypeScript
- Vite
- Ant Design Vue
- ECharts
- Pinia 或轻量 composable 状态
- Live2D Cubism Web SDK 或 `pixi-live2d-display`

说明：

- 页面结构以 Vue3 为主，和现有 `peizhi.vue` 技术风格保持一致。
- 图表使用 ECharts，方便快速实现大屏质感。
- Live2D 模型固定使用根目录 `robot/robot.model3.json`。

### 2.2 后台语音服务

建议独立新建一套服务，不直接改造现有 `voice-service`：

```txt
voice-gateway/
  app/
    main.py
    config.py
    ws_router.py
    wakeup/
    asr/
    dialog/
    tts/
    schemas/
    storage/
    observability/
  requirements.txt
  README.md
  .env.example
```

推荐技术：

- Python 3.11+
- FastAPI
- WebSocket
- Pydantic
- httpx
- 可选：edge-tts
- 可选：百度语音 / 云厂商 ASR / 本地 ASR 模型

后台服务定位为语音网关：

```txt
浏览器麦克风音频
  -> WebSocket 推送到 voice-gateway
  -> 唤醒检测
  -> ASR 语音转文字
  -> 调用业务对话后端 http://101.43.17.8:5001
  -> 返回对话结果
  -> TTS 文字转语音
  -> 前端数字人播报 / 嘴型动画 / 图表高亮
```

后台必须实现三项核心能力：

| 能力 | 说明 |
| --- | --- |
| 唤醒 | 检测唤醒词，命中后通知前端进入唤醒态 |
| 语音转文字 | 唤醒后识别用户语音，返回文本给前端并转发给对话后端 |
| 文字转语音 | 将欢迎语、对话回答等文本合成为可播放音频 |

## 3. 大屏 UI 设计方案

### 3.1 视觉原则

按照 `AGENTS.md`，大屏需要做到：

- 唯一视觉中心：中心 Live2D 数字人。
- 信息层级清晰：主 KPI、趋势图、分布图、事件流分层展示。
- 状态可感知：待机、监听、唤醒、识别、思考、回答、错误都要有明确反馈。
- 高端但不混乱：避免无意义光污染，背景炫酷但不能抢主信息。
- 排版整齐：左右对称布局，图表尺寸统一，面板边距一致。

### 3.2 页面布局

推荐使用 1920x1080 大屏优先布局，同时兼容 1366 宽度。

```txt
┌──────────────────────────────────────────────────────────────┐
│ 顶部：系统标题 / 当前时间 / 服务状态 / 麦克风状态              │
├───────────────┬──────────────────────────────┬───────────────┤
│ 左侧图表区     │ 中心 Live2D 数字人 + 唤醒态     │ 右侧图表区     │
│ KPI 卡片       │ 环形声波 / 对话气泡 / 状态提示   │ 模型质量指标   │
│ 趋势折线图     │                              │ 唤醒词分布图   │
│ 热力/排行      │                              │ 识别延迟图     │
├───────────────┴──────────────────────────────┴───────────────┤
│ 底部：实时事件流 / 最近识别文本 / 对话结果摘要                 │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 视觉风格

- 背景：深色科技背景，使用网格、扫描线、粒子星点、径向光晕，但控制透明度。
- 主色：沿用全局规范中的蓝色 `#4D8DFF`、青色 `#5CE1E6`、紫色 `#9B6BFF`。
- 面板：半透明深色玻璃面板，细边框，8px 以内圆角。
- 图表：统一冷色系，重点数据用青色或蓝色，不使用大面积高饱和色块。
- 动效：唤醒时中心声波扩散，图表短暂高亮，数字人切换表情或动作。

### 3.4 写死数据内容

首期大屏数据可以全部使用 mock 数据：

- 今日唤醒次数
- 累计唤醒次数
- 今日有效对话数
- 平均响应时长
- ASR 识别准确率
- 唤醒成功率
- 误唤醒率
- 唤醒词分布
- 小时级唤醒趋势
- 最近交互记录
- 服务健康状态

mock 数据应集中放在：

```txt
src/mock/dashboardData.ts
```

不要散落在组件内部。

## 4. Live2D 引入方案

### 4.1 模型资源路径

当前模型文件固定在根目录 `robot` 下：

```txt
robot/
  robot.model3.json
  robot.moc3
  robot.physics3.json
  robot.cdi3.json
  Scene1.motion3.json
  zuoyou1.motion3.json
  zui.exp3.json
  zui2.exp3.json
  robots/texture_00.png
```

前端项目中建议复制到：

```txt
public/robot/
```

浏览器加载路径固定为：

```txt
/robot/robot.model3.json
```

### 4.2 前端组件封装

封装独立组件：

```txt
src/components/business/Live2DAvatar.vue
```

组件职责：

- 初始化 Live2D canvas。
- 加载 `/robot/robot.model3.json`。
- 根据语音状态切换动作和表情。
- 支持 idle、listening、wakeup、thinking、speaking、error 状态。
- 暴露 `playMotion`、`setExpression`、`startLipSync`、`stopLipSync`。

### 4.3 动作映射

当前模型包含：

- `Scene1.motion3.json`
- `zuoyou1.motion3.json`
- `zui.exp3.json`
- `zui2.exp3.json`

建议映射：

| 前端状态 | Live2D 表现 |
| --- | --- |
| `idle` | 默认呼吸、轻微待机 |
| `listening` | 轻微左右动作，声波环启动 |
| `wakeup` | 播放明显动作，数字人高亮 |
| `thinking` | 中心光环旋转，对话框显示处理中 |
| `speaking` | 启用嘴型动画，播放播报动效 |
| `error` | 降低亮度，提示可重试 |

如果当前模型的 LipSync 参数为空，需要在方案实现时做兜底：播报时用轻微缩放、光效和文本流动代替真实嘴型同步。

## 5. 语音交互状态机

前端必须显式维护语音状态，不能让用户感觉系统卡死。

```txt
idle
  -> requesting_permission
  -> connecting
  -> listening
  -> wakeup
  -> recognizing
  -> thinking
  -> speaking
  -> listening
```

异常状态：

```txt
permission_denied
network_error
service_unavailable
asr_failed
dialog_failed
tts_failed
stopped
```

状态说明：

| 状态 | UI 表现 | 用户动作 |
| --- | --- | --- |
| `idle` | 显示待机态 | 可点击开启监听 |
| `requesting_permission` | 麦克风授权中 | 等待授权 |
| `connecting` | 服务连接中 | 可取消 |
| `listening` | 声波轻动，提示正在监听 | 可停止 |
| `wakeup` | 中心动效增强 | 自动进入识别 |
| `recognizing` | 显示语音转文字中 | 可取消 |
| `thinking` | 显示正在生成回答 | 可取消 |
| `speaking` | 数字人播报 | 可停止播报 |
| `error` | 明确错误原因和重试按钮 | 可重试 |

## 6. 后台语音服务设计

### 6.1 为什么独立新建服务

现有 `voice-service` 更适合本地 Demo：

- 服务端读取本机麦克风。
- 使用全局 pipeline。
- 对客户端广播事件。
- 配置、ASR、TTS、业务处理耦合较高。

新服务应面向浏览器大屏场景：

- 每个浏览器连接独立 session。
- 浏览器通过 WebSocket 上传麦克风音频。
- 服务端只向当前连接返回事件。
- 支持唤醒、ASR、对话接口转发。
- 配置和日志结构化。

### 6.2 WebSocket 协议

连接地址：

```txt
ws://127.0.0.1:8766/api/v1/voice/ws
```

生产环境使用：

```txt
wss://your-domain.com/api/v1/voice/ws
```

启动监听：

```json
{
  "type": "start",
  "requestId": "req_001",
  "data": {
    "sampleRate": 16000,
    "channels": 1,
    "format": "pcm_s16le",
    "wakeWords": ["小智小智"]
  }
}
```

服务端返回：

```json
{
  "event": "ready",
  "requestId": "req_001",
  "data": {
    "sessionId": "sess_001"
  }
}
```

音频帧：

- 启动成功后，前端持续发送二进制 PCM 音频帧。
- 推荐 `16kHz / mono / PCM signed 16-bit little-endian`。
- 推荐帧长度 `40ms - 80ms`。

唤醒成功：

```json
{
  "event": "wakeup",
  "data": {
    "sessionId": "sess_001",
    "wakeWord": "小智小智",
    "confidence": 0.92,
    "timestamp": 1778640000000
  }
}
```

语音转文字结果：

```json
{
  "event": "asrResult",
  "data": {
    "sessionId": "sess_001",
    "text": "今天数据概览",
    "isFinal": true,
    "timestamp": 1778640002000
  }
}
```

对话后端结果：

```json
{
  "event": "dialogResult",
  "data": {
    "sessionId": "sess_001",
    "question": "今天数据概览",
    "answer": "今日唤醒服务运行正常，整体指标稳定。",
    "timestamp": 1778640003000
  }
}
```

播报状态，可选：

```json
{
  "event": "ttsStatus",
  "data": {
    "sessionId": "sess_001",
    "status": "start",
    "text": "今日唤醒服务运行正常，整体指标稳定。"
  }
}
```

错误事件：

```json
{
  "event": "error",
  "requestId": "req_001",
  "data": {
    "code": "ASR_FAILED",
    "message": "语音识别失败，请重试",
    "details": {}
  }
}
```

### 6.3 后端对话 HTTP 接入

用户确认对话后端地址：

```txt
http://101.43.17.8:5001
```

待确认内容：

- 具体接口路径。
- 请求方法。
- 请求字段。
- 响应字段。
- 是否支持流式输出。
- 是否需要鉴权 token。
- 超时时间要求。

在接口未确认前，语音网关中先抽象 `DialogClient`：

```txt
dialog/
  client.py
```

建议内部统一契约：

```json
{
  "question": "今天数据概览",
  "sessionId": "sess_001",
  "metadata": {
    "source": "voice_dashboard"
  }
}
```

统一输出：

```json
{
  "answer": "今日唤醒服务运行正常，整体指标稳定。",
  "raw": {}
}
```

这样后续即使真实接口字段不同，也只需要改 `DialogClient`，不影响 WebSocket 协议和前端状态机。

### 6.4 ASR 语音转文字

后台服务需要实现语音转文字能力。

首期建议方案：

- 唤醒检测可以先用 ASR 文本包含唤醒词实现，便于快速跑通。
- 唤醒后继续收集一段用户语音，送 ASR 得到文字。
- 后续再替换为专用唤醒模型，降低延迟和误唤醒。

ASR 需要处理：

- 空语音。
- 环境噪声。
- 识别超时。
- 识别失败。
- 多次重复结果。
- 唤醒词残音被误当成指令。

建议参数：

| 参数 | 建议值 |
| --- | --- |
| 采样率 | `16000Hz` |
| 单次指令最长识别 | `8s` |
| 唤醒后忽略残音 | `1.5s` |
| 静默结束判定 | `800ms - 1500ms` |
| ASR 超时 | `10s - 15s` |

### 6.5 TTS 文字转语音

后台服务需要实现文字转语音能力，用于：

- 唤醒后的欢迎语播报。
- 对话后端返回答案后的语音播报。
- 配置页测试音色、语速、音量。

TTS 建议首期沿用现有 `voice-service` 中的 Edge TTS 思路，但在新服务中独立封装：

```txt
tts/
  synthesizer.py
  provider_edge.py
```

WebSocket TTS 事件：

```json
{
  "event": "ttsStatus",
  "data": {
    "sessionId": "sess_001",
    "status": "start",
    "text": "今日唤醒服务运行正常，整体指标稳定。"
  }
}
```

TTS 结果事件：

```json
{
  "event": "ttsResult",
  "data": {
    "sessionId": "sess_001",
    "success": true,
    "text": "今日唤醒服务运行正常，整体指标稳定。",
    "audio": "data:audio/mpeg;base64,...",
    "format": "mp3"
  }
}
```

TTS 结束事件：

```json
{
  "event": "ttsStatus",
  "data": {
    "sessionId": "sess_001",
    "status": "end",
    "text": "今日唤醒服务运行正常，整体指标稳定。"
  }
}
```

TTS 需要处理：

- 空文本。
- 文本过长。
- 合成超时。
- 第三方 TTS 不可用。
- 用户中途取消播报。
- 音色、语速、音量配置非法。

### 6.6 服务端模块划分

```txt
voice-gateway/
  app/
    main.py                       # FastAPI 启动入口
    config.py                     # 环境变量和默认配置
    ws_router.py                  # WebSocket 路由
    schemas/
      events.py                   # WS 事件 schema
      config.py                   # 配置 schema
    wakeup/
      detector.py                 # 唤醒检测接口
      asr_wakeup_detector.py       # 首期 ASR 唤醒实现
    asr/
      recognizer.py               # ASR 抽象接口
      provider_baidu.py            # 百度 ASR 实现，可选
      provider_mock.py             # 本地联调用 mock
    dialog/
      client.py                   # 调用 http://101.43.17.8:5001
    tts/
      synthesizer.py              # TTS 抽象接口
      provider_edge.py             # Edge TTS，可选
    storage/
      config_store.py             # 配置保存
      history_store.py            # 交互历史
    observability/
      logger.py                   # 结构化日志
      metrics.py                  # 指标预留
```

## 7. 配置界面设计

### 7.1 保留配置项

参考 `peizhi.vue`，配置页保留：

- 主唤醒词。
- 备用唤醒词。
- 唤醒超时时间。
- 唤醒欢迎语。
- 声纹验证开关。
- 声纹注册。
- 声纹删除。
- 已注册声纹列表。
- TTS 音色。
- TTS 语速。
- TTS 音量。
- 讲解词 JSON。
- 交互历史搜索。
- 清空历史。

### 7.2 新增建议配置项

为了支持新语音网关，建议增加：

- 语音服务 WebSocket 地址。
- 对话 HTTP 服务地址，默认 `http://101.43.17.8:5001`。
- ASR 引擎选择。
- ASR 超时时间。
- 是否启用 TTS。
- 是否启用自动进入监听。
- 是否显示调试事件流。

### 7.3 页面风格

配置页采用专业控制台风格：

- 暗色主题。
- 表单分组清晰。
- 使用 Ant Design Vue 组件。
- 关键危险操作二次确认，例如清空历史、删除声纹。
- 保存、重置、重载配置有 loading / success / error 状态。

## 8. 前端目录结构

```txt
src/
  app/
    App.vue
    router.ts
  assets/
  components/
    ui/
      DataPanel.vue
      StatusBadge.vue
      EmptyState.vue
      ErrorState.vue
    business/
      Live2DAvatar.vue
      WakeStatusPanel.vue
      VoiceEventStream.vue
      DashboardChartPanel.vue
      ConfigFormSection.vue
  features/
    dashboard/
      DashboardScreen.vue
      components/
        KpiGrid.vue
        WakeTrendChart.vue
        WakeWordPieChart.vue
        LatencyChart.vue
        InteractionTimeline.vue
      mockDashboardData.ts
    config/
      WakeConfigPage.vue
      configSchema.ts
    voice/
      useVoiceSocket.ts
      useMicrophoneStream.ts
      audioWorklet.ts
      voiceTypes.ts
  services/
    configApi.ts
    voiceGatewayApi.ts
  stores/
    voiceStore.ts
  styles/
    theme.css
    dashboard.css
  types/
```

## 9. 前端关键组件

### 9.1 `DashboardScreen.vue`

职责：

- 大屏主布局。
- 组织中心 Live2D、左右图表、顶部状态、底部事件流。
- 监听语音状态变化。
- 触发大屏动效。

### 9.2 `Live2DAvatar.vue`

职责：

- 加载 Live2D 模型。
- 映射状态到动作。
- 提供说话态动画。

### 9.3 `useVoiceSocket.ts`

职责：

- 连接后台语音网关。
- 发送启动、停止消息。
- 发送音频帧。
- 接收 `ready`、`wakeup`、`asrResult`、`dialogResult`、`ttsStatus`、`error`。
- 断线重连。

### 9.4 `useMicrophoneStream.ts`

职责：

- 申请麦克风权限。
- 采集音频。
- 转换成 `16kHz mono PCM int16`。
- 释放 `MediaStreamTrack`。
- 处理无权限、无设备、浏览器不支持。

### 9.5 `WakeConfigPage.vue`

职责：

- 配置表单。
- 配置保存和重载。
- 声纹管理。
- 历史记录。
- JSON 配置校验。

## 10. API 与配置保存

配置保存由新语音网关提供 HTTP API 或 WebSocket action。

推荐 HTTP API：

```txt
GET  /api/v1/config
PUT  /api/v1/config
POST /api/v1/config/reload
GET  /api/v1/history
DELETE /api/v1/history
```

统一响应格式：

```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "req_xxx"
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "配置格式不正确",
    "details": {}
  },
  "requestId": "req_xxx"
}
```

配置存储首期可以使用 JSON 文件：

```txt
voice-gateway/data/config.json
voice-gateway/data/history.jsonl
```

后续如需多用户、多租户，再迁移到数据库。

## 11. 安全与异常处理

### 11.1 前端

必须处理：

- 麦克风权限拒绝。
- 浏览器不支持音频采集。
- WebSocket 断开。
- 语音服务不可用。
- ASR 失败。
- 对话 HTTP 超时。
- TTS 失败。
- 用户主动停止。

### 11.2 后台

必须处理：

- 非法 WebSocket 消息。
- 超大音频帧。
- 空音频帧。
- ASR 超时。
- 对话后端超时。
- 多客户端并发。
- 客户端异常断开。
- 配置文件损坏。

生产环境必须补充：

- WSS。
- Origin 白名单。
- token 鉴权。
- 连接数限制。
- 日志脱敏。
- 不在代码中写死第三方密钥。

注意：现有 `voice-service/config.py` 中存在百度语音密钥示例，新服务必须改为环境变量，并建议轮换密钥。

## 12. 测试与验收

### 12.1 前端验收

- 大屏 1920x1080 下排版整齐，无文字重叠。
- 1366 宽度下主要信息不溢出。
- Live2D 模型能正常加载。
- 图表能渲染 mock 数据。
- 语音状态变化时中心动效正常。
- 断线、错误、无权限都有明确提示和重试入口。
- 配置页保存、重置、重载状态完整。

### 12.2 后台验收

- WebSocket 能建立连接并返回 `ready`。
- 能接收浏览器音频帧。
- 能触发 `wakeup`。
- 唤醒后能完成 ASR 并返回 `asrResult`。
- 能对指定文本完成 TTS 并返回 `ttsResult`。
- 唤醒欢迎语和对话回答均可播报。
- 能调用 `http://101.43.17.8:5001` 对话后端并返回 `dialogResult`。
- 对话后端不可用时返回可理解错误。
- 客户端断开后释放 session。
- 多客户端连接不互相串事件。

### 12.3 联调验收

完整链路：

```txt
打开大屏
  -> 授权麦克风
  -> 进入监听
  -> 说出“小智小智”
  -> 数字人唤醒
  -> 用户继续说问题
  -> 后台 ASR 返回文本
  -> 调用对话后端
  -> 大屏展示回答
  -> 数字人进入 speaking
  -> 超时后回到 listening 或 idle
```

## 13. 分阶段交付

### 阶段一：静态高端大屏

- 搭建 Vue3 项目。
- 完成大屏布局。
- 引入 ECharts mock 数据。
- 引入 Live2D 模型。
- 完成基础动效和状态展示。

### 阶段二：配置页

- 重构 `peizhi.vue` 为正式配置页。
- 保留现有配置项。
- 增加语音网关和对话服务配置项。
- 完成 loading / empty / error / success 状态。

### 阶段三：独立语音网关

- 新建 `voice-gateway`。
- 实现 WebSocket session。
- 实现浏览器音频接收。
- 实现唤醒检测。
- 实现 ASR。
- 实现 TTS。
- 实现对话 HTTP 转发。

### 阶段四：前后端联调

- 前端采集麦克风并推流。
- 后台返回 wakeup / asrResult / dialogResult。
- 大屏响应事件。
- 补齐错误恢复和重连。

### 阶段五：工程化与验收

- 补充 README。
- 补充 `.env.example`。
- 补充测试用例。
- 补充部署说明。
- 检查密钥、日志、异常和安全边界。

## 14. 待确认问题

以下问题不在本方案中擅自发散，后续实现前需要确认：

1. `http://101.43.17.8:5001` 的具体接口路径、请求方法和字段。
2. 对话后端是否支持流式输出。
3. 对话后端是否需要鉴权。
4. ASR 首期使用哪个提供商，是否继续沿用百度语音。
5. TTS 返回音频格式是否固定为 MP3 data URL，还是需要返回静态文件 URL / 二进制流。
6. 声纹验证首期是否真实实现，还是仅保留配置入口。
7. 生产部署目标是 Windows 本地服务、Linux 服务还是 Docker。

## 15. 结论

推荐采用：

```txt
Vue3 高端大屏
  + Live2D 中心数字人
  + ECharts 写死数据
  + 暗色科技配置台
  + 独立 Python voice-gateway
  + 浏览器音频推流
  + 唤醒检测
  + ASR 语音转文字
  + TTS 文字转语音
  + HTTP 对话服务转发
```

这样可以保证大屏第一阶段快速出视觉效果，同时后台语音能力有清晰边界，后续无论替换 ASR、唤醒模型、TTS 或对话接口，都不会大范围影响前端页面结构。
