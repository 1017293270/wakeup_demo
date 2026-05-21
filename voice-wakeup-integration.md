# 浏览器大屏语音唤醒服务接入方案

## 1. 背景与目标

合作方前端大屏运行在浏览器中，用户通过浏览器麦克风说出唤醒词。你们的语音唤醒服务部署在线上，负责检测音频流中的关键词，并在检测成功后返回唤醒事件，让前端大屏进入唤醒状态。

当前 `voice-service` 更接近“服务端本机麦克风监听”的模式，适合本地 Demo，不适合线上浏览器用户。线上场景中，麦克风属于用户浏览器，服务端无法直接读取用户设备麦克风，因此需要改为：

```txt
浏览器采集麦克风音频
  -> WebSocket 推送音频流到你们线上服务
  -> 服务端实时检测唤醒词
  -> 服务端返回 wakeup 事件
  -> 前端大屏触发唤醒 UI / 业务状态
```

本阶段只做唤醒检测与事件返回，不继续识别后续语音指令。

## 2. 推荐总体方案

推荐采用“前端采集音频 + 服务端检测唤醒词”的架构。

### 2.1 前端职责

前端合作方需要完成：

- 通过浏览器申请麦克风权限。
- 使用 `AudioWorklet` 或 `MediaStream` 采集音频。
- 将音频转换为服务端约定格式，推荐 `16kHz / mono / PCM int16`。
- 通过 `WSS` 持续发送音频帧到你们服务端。
- 监听服务端返回的 `wakeup` 事件。
- 在收到唤醒事件后触发大屏动画、状态切换或业务操作。
- 处理用户拒绝麦克风、浏览器不支持、网络断开、服务端错误等异常状态。

### 2.2 服务端职责

你们服务端需要完成：

- 提供线上 WebSocket 接口。
- 对连接做鉴权、来源校验和连接数限制。
- 接收浏览器上传的音频流。
- 对每个 WebSocket 连接维护独立的唤醒检测会话。
- 使用唤醒词检测模型或语音识别兜底策略判断是否命中关键词。
- 命中后返回标准化 `wakeup` 事件。
- 记录结构化日志与关键指标。
- 对异常音频、错误协议、超时连接、安全风险做保护。

## 3. 接口协议设计

### 3.1 连接地址

生产环境必须使用 `WSS`：

```txt
wss://voice.example.com/api/v1/wakeup/ws
```

如果由前端大屏系统发起连接，建议携带短期 token：

```txt
wss://voice.example.com/api/v1/wakeup/ws?token=短期访问凭证
```

不建议在前端写死长期密钥。

### 3.2 启动消息

WebSocket 建连后，前端先发送启动消息：

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

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sampleRate` | number | 音频采样率，推荐固定为 `16000` |
| `channels` | number | 声道数，推荐固定为 `1` |
| `format` | string | 音频编码，推荐 `pcm_s16le` |
| `wakeWords` | string[] | 唤醒词列表，首期可只支持一个 |

服务端返回：

```json
{
  "event": "ready",
  "requestId": "req_001",
  "data": {
    "sessionId": "sess_001",
    "message": "wakeup session ready"
  }
}
```

### 3.3 音频帧发送

启动成功后，前端持续发送二进制音频帧。

推荐参数：

- 采样率：`16000Hz`
- 声道：`mono`
- 编码：`PCM signed 16-bit little-endian`
- 帧长度：`40ms - 80ms`
- 单帧大小：约 `1280 - 2560 bytes`

不建议用 JSON Base64 传音频，会增加传输体积和编码开销。

### 3.4 唤醒事件

服务端检测到唤醒词后返回：

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

前端收到该事件后即可触发大屏唤醒。

### 3.5 错误事件

错误统一返回：

```json
{
  "event": "error",
  "requestId": "req_001",
  "data": {
    "code": "AUDIO_FORMAT_INVALID",
    "message": "音频格式不正确，请使用 16kHz mono PCM",
    "details": {}
  }
}
```

推荐错误码：

| 错误码 | 说明 |
| --- | --- |
| `UNAUTHORIZED` | token 无效或缺失 |
| `FORBIDDEN_ORIGIN` | 来源不在白名单 |
| `AUDIO_FORMAT_INVALID` | 音频格式不符合要求 |
| `SESSION_TIMEOUT` | 会话超时 |
| `RATE_LIMITED` | 请求过于频繁 |
| `MODEL_UNAVAILABLE` | 唤醒模型不可用 |
| `INTERNAL_ERROR` | 服务端内部错误 |

### 3.6 停止消息

前端停止监听时发送：

```json
{
  "type": "stop",
  "requestId": "req_002",
  "data": {
    "sessionId": "sess_001"
  }
}
```

服务端返回：

```json
{
  "event": "closed",
  "requestId": "req_002",
  "data": {
    "sessionId": "sess_001",
    "reason": "client_stop"
  }
}
```

## 4. 前端接入要点

### 4.1 浏览器权限

浏览器麦克风权限必须由用户主动授权：

```js
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});
```

注意事项：

- 页面必须运行在 HTTPS 下。
- 用户拒绝授权时，需要展示明确提示和重试入口。
- 页面关闭或停止监听时，必须释放 `MediaStreamTrack`。
- 浏览器自动播放、麦克风权限、后台标签页策略可能影响体验，需要前端做兼容处理。

### 4.2 前端状态设计

前端至少需要处理以下状态：

- `idle`：未开始监听。
- `requesting_permission`：正在请求麦克风权限。
- `connecting`：正在连接服务端。
- `listening`：正在监听唤醒词。
- `wakeup`：已唤醒。
- `error`：出现错误。
- `stopped`：用户或系统停止监听。

大屏不能让用户感觉“卡死”，需要明确展示监听中、重连中、失败可重试等状态。

## 5. 服务端改造建议

### 5.1 当前代码现状

当前 `voice-service` 中的主要模式是：

```txt
服务端启动
  -> 服务端读取本机麦克风
  -> ASR 识别文字
  -> 判断文字中是否包含唤醒词
  -> WebSocket 广播 wakeup
```

这不适合线上浏览器场景，因为线上服务端读取的是服务器麦克风，而不是用户浏览器麦克风。

### 5.2 推荐改造方向

服务端需要改造为：

```txt
WebSocket 建连
  -> 创建独立 session
  -> 接收浏览器音频帧
  -> 按 session 做流式唤醒检测
  -> 命中后向当前连接返回 wakeup
  -> 停止或超时后释放 session
```

核心变化：

- 不再依赖 `pyaudio` 读取服务端本机麦克风。
- 不再使用全局单例 `pipeline` 处理所有连接。
- 每个连接独立维护音频缓冲、状态、超时和检测结果。
- 返回事件只发给当前连接，避免误广播给其他用户。

### 5.3 唤醒检测实现选择

可选方案如下：

| 方案 | 优点 | 风险 |
| --- | --- | --- |
| 专用唤醒词模型 | 延迟低、成本可控、适合生产 | 需要训练或适配关键词 |
| openWakeWord / ONNX | 可本地部署、可流式检测 | 中文自定义词效果需要验证 |
| 云厂商语音唤醒 SDK | 效果稳定、支持中文 | 成本、私有化和供应商绑定 |
| ASR 文本包含关键词 | 实现简单、适合 Demo | 延迟高、成本高、误识别风险高 |

生产环境建议优先使用专用唤醒词模型。当前 ASR 判断关键词可作为演示或兜底，不建议作为最终生产方案。

## 6. 部署与安全

### 6.1 部署要求

- 必须使用 HTTPS/WSS。
- 建议 Docker 化部署。
- 前面接入 Nginx、Ingress 或云负载均衡。
- WebSocket 代理必须开启 Upgrade。
- 配置健康检查接口，例如 `/health`。
- 模型加载失败时服务应明确返回不可用状态。

### 6.2 Nginx 关键配置

示例：

```nginx
location /api/v1/wakeup/ws {
  proxy_pass http://voice-service:8765;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 3600s;
}
```

### 6.3 安全要求

必须考虑：

- token 鉴权。
- Origin 白名单。
- 单 IP / 单用户连接数限制。
- 单连接最大时长。
- 音频帧大小限制。
- 异常断连资源释放。
- 不在日志中记录 token、密钥、原始音频。
- 不把服务端密钥暴露给前端。

当前代码中的语音平台密钥应迁移到环境变量，并建议轮换一次。

## 7. 日志与监控

推荐记录结构化日志：

```json
{
  "requestId": "req_001",
  "sessionId": "sess_001",
  "action": "wakeup_detected",
  "durationMs": 420,
  "confidence": 0.92,
  "origin": "https://screen.example.com"
}
```

推荐监控指标：

- 当前 WebSocket 连接数。
- 每分钟音频帧数量。
- 唤醒成功次数。
- 平均唤醒延迟。
- 唤醒模型错误率。
- 鉴权失败次数。
- 异常断连次数。
- 服务端 CPU / 内存占用。

## 8. 测试与验收标准

### 8.1 前端测试

- 首次授权麦克风成功。
- 用户拒绝麦克风权限。
- 麦克风设备不存在。
- 网络断开后重连。
- 重复开始和停止监听。
- 页面刷新和关闭后释放资源。
- Chrome、Edge、Safari 基础兼容性。

### 8.2 服务端测试

- token 缺失或无效。
- 非白名单 Origin。
- 音频格式错误。
- 空音频帧。
- 超大音频帧。
- 多客户端并发连接。
- 客户端异常断开。
- 模型加载失败。

### 8.3 唤醒效果测试

- 正常说出唤醒词能触发 `wakeup`。
- 非唤醒词不触发。
- 嘈杂环境下误唤醒率可接受。
- 不同音量、不同距离、不同说话人可用。
- 唤醒延迟建议控制在 `300ms - 800ms`。

## 9. 建议交付物

建议最终给前端合作方提供：

- WebSocket 接入文档。
- 前端 JS SDK。
- Demo HTML 页面。
- 错误码说明。
- 联调环境地址。
- token 获取方式。
- 音频格式说明。

建议你们内部提供：

- 服务端接口实现。
- Dockerfile。
- `.env.example`。
- 部署文档。
- 监控指标说明。
- 唤醒模型配置说明。
- 测试用例与验收记录。

## 10. 结论

这个场景的关键点是：浏览器负责采集麦克风，线上服务负责检测唤醒词。不能沿用服务端读取本机麦克风的模式。

首期最稳妥的交付路径是：

```txt
先完成浏览器音频推流协议
  -> 服务端接收音频并完成唤醒检测
  -> 返回 wakeup 事件
  -> 前端大屏完成唤醒效果
  -> 再根据效果评估是否引入更专业的唤醒词模型
```

这样前后端边界清晰，线上部署可控，也方便后续扩展到语音指令识别、对话、TTS 播报等 AI Native 交互能力。
