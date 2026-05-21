# Voice Gateway

独立语音网关服务，提供三项核心能力：

- 唤醒
- 语音转文字
- 文字转语音

## 启动

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8766
```

## 前端 WebSocket

```txt
ws://127.0.0.1:8766/api/v1/voice/ws
```

首期默认 `mock` ASR：收到一段音频后模拟唤醒，再模拟识别“今天数据概览”，用于联调大屏状态流。

真实部署时可在 `.env` 中切换 ASR/TTS Provider，并配置密钥。
