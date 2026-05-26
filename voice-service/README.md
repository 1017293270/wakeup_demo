# 语音交互后端服务

## 🚀 快速开始（1分钟就能跑起来）

### 方式一：运行演示版本（无需安装AI模型，推荐                                                                                               先测试效果）
只需要2个依赖，快速看到完整交互效果：

1. **安装基础依赖**：
   ```bash
   pip install websockets asyncio
   ```

2. **启动演示服务**：
   ```bash
   python demo_server.py
   ```

3. **打开前端页面**：
   访问语音测试页面，点击右上角开关开启语音服务，服务会每10秒自动模拟一次唤醒、识别、播报的完整流程，测试所有交互效果。

---

### 方式二：运行完整功能版本（需要安装AI模型）
包含真实的语音唤醒、ASR、TTS功能：

1. **安装所有依赖**：
   ```bash
   pip install -r requirements.txt
   ```

   > 注意：Windows环境如果安装pyaudio失败，可以先下载预编译包：https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio

2. **准备 FunASR 本地模型**：
   ```text
   voice-service/models/funasr/
     paraformer-zh/
     fsmn-vad/
     ct-punc/
   ```

   默认配置会从上面的目录加载模型。Docker 部署时该目录会挂载到容器内 `/app/models/funasr`。

3. **配置本地 ASR**：
   ```bash
   VOICE_ASR_ENGINE=funasr
   VOICE_ASR_MODEL_DIR=./models/funasr
   VOICE_FUNASR_DEVICE=cpu
   ```

4. **启动完整服务**：
   ```bash
   python main.py
   ```

   如果模型目录不存在或依赖缺失，服务会记录明确错误并返回空识别结果，不会再默认调用百度 ASR。

## 📋 接口协议
### 前端→后端指令
```json
{
  "action": "startService",  // 指令类型：startService/stopService/tts/cancel
  "data": {}                 // 参数
}
```

### 后端→前端事件
```json
// 唤醒成功事件
{
  "event": "wakeup",
  "data": {
    "wakeWord": "小聚小聚",
    "timestamp": 1710768000000
  }
}

// 识别结果事件
{
  "event": "asrResult",
  "data": {
    "text": "今天数据概览",
    "isFinal": true,
    "timestamp": 1710768002000
  }
}

// 播报状态事件
{
  "event": "ttsStatus",
  "data": {
    "status": "start/end",
    "text": "今日总事件数128件"
  }
}
```

## 🔧 配置说明
- **唤醒词修改**：默认使用"小聚小聚"，需要训练自定义唤醒词模型替换现有模型
- **端口修改**：修改main.py中的WS_PORT变量即可
- **模型切换**：默认使用 FunASR 本地 `paraformer-zh`，可通过 `VOICE_ASR_MODEL_DIR` 指向其他模型目录
- **灵敏度调整**：修改WAKE_WORD_THRESHOLD调整唤醒灵敏度，值越高越不容易误唤醒

## 📦 打包部署
使用PyInstaller打包为exe可执行文件：
```bash
pyinstaller --onefile --windowed --name "语音助手" main.py
```

打包后生成的exe文件在dist目录下，双击即可运行，不需要Python环境。
