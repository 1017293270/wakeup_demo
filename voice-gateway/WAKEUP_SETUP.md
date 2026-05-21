# 唤醒、ASR、TTS 配置说明

## 当前实现状态

当前 `voice-gateway` 已实现完整事件链路：

```txt
WebSocket 建连
  -> 接收浏览器麦克风 PCM 音频
  -> 唤醒
  -> ASR 语音转文字
  -> 调用对话 HTTP 服务
  -> TTS 文字转语音
  -> 返回前端事件
```

但默认配置是 `mock` 模式，适合先联调大屏状态和数字人动效。

## Mock 模式

默认配置：

```txt
VOICE_ASR_ENGINE=mock
```

行为：

- 前端开始监听并持续上传音频后，后台累计约 1 秒音频会模拟触发 `wakeup`。
- 唤醒后继续累计一段音频，会模拟 ASR 返回：`今天数据概览`。
- 然后调用 `http://101.43.17.8:5001`。
- 如果对话服务不可用，后台会返回本地兜底回答。
- TTS 默认使用 Edge TTS；如果网络不可用，会返回一段静音 WAV，保证前端流程不中断。

所以：默认模式可以跑通流程，但不是严格的真实关键词唤醒。

## 真实唤醒需要配置什么

真实唤醒有两种路线。

### 路线一：ASR 兜底唤醒

配置：

```txt
VOICE_ASR_ENGINE=baidu
VOICE_BAIDU_APP_ID=你的 App ID
VOICE_BAIDU_API_KEY=你的 API Key
VOICE_BAIDU_SECRET_KEY=你的 Secret Key
```

本地开发时，如果没有配置以上环境变量，`voice-gateway` 会尝试从旧服务 `voice-service/config.py` 读取现有百度 ASR 配置作为兜底。生产环境仍建议使用环境变量或密钥管理服务，不要依赖代码文件中的硬编码密钥。

行为：

- 后台把浏览器音频送到百度 ASR。
- ASR 返回文字后，判断是否包含 `小智小智` 或备用唤醒词。
- 命中后触发 `wakeup`。

优点：实现简单，方便先验证真实语音输入。

限制：延迟更高，误识别和漏识别要实测调参，不建议作为最终生产唤醒方案。

### 路线二：专用唤醒词模型

后续可以在 `app/wakeup/` 下新增专用 detector，例如：

```txt
app/wakeup/provider_onnx.py
app/wakeup/provider_vendor.py
```

行为：

- 音频帧直接进入唤醒模型。
- 命中后再开启 ASR 识别用户指令。

优点：延迟低、生产体验更好。

限制：需要训练或采购支持中文唤醒词的模型/SDK。

## 前端配置

配置页中需要关注：

- 语音 WebSocket 地址：默认 `ws://127.0.0.1:8766/api/v1/voice/ws`
- 主唤醒词：默认 `小智小智`
- 备用唤醒词：默认 `小智`、`小志小志`、`小知小知`
- ASR 引擎：`mock` 或 `baidu`
- 对话 HTTP 服务地址：默认 `http://101.43.17.8:5001`
- TTS 开关和音色参数

注意：当前大屏页的 WebSocket 地址和唤醒词先写在 `DashboardScreen.vue` 中，后续应改成读取配置接口，保证配置页保存后大屏立即生效。
