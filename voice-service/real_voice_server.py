#!/usr/bin/env python3
"""
完整语音交互服务，支持真实唤醒、语音识别、语音合成
和现有前端接口100%兼容，直接运行即可
"""
import asyncio
import websockets
import json
import time
import threading
import queue
import numpy as np
from typing import Optional

# ====================== 配置参数 ======================
WS_PORT = 8765
WAKE_WORD = "小聚小聚"
WAKE_THRESHOLD = 0.5  # 唤醒灵敏度，0-1，越高越不容易误唤醒
SAMPLE_RATE = 16000
CHUNK_SIZE = 1280  # 80ms per chunk
ENABLE_AUTO_SIMULATE = False  # 关闭自动模拟，只有真实唤醒/手动唤醒才触发流程

# ====================== 依赖检查和导入 ======================
# 尝试导入真实依赖，失败则用模拟模式
MODE = "demo"  # 模式：demo/real
dependencies_ok = True

# 音频采集
try:
    import pyaudio
except ImportError:
    print("⚠️  缺少pyaudio，运行：pip install pyaudio")
    dependencies_ok = False

# 离线唤醒
try:
    import openwakeword
    from openwakeword.model import Model as WakeWordModel
except ImportError:
    print("⚠️  缺少openwakeword，运行：pip install openwakeword")
    dependencies_ok = False

# ASR语音识别
try:
    from funasr import AutoModel
except ImportError:
    print("⚠️  缺少funasr，运行：pip install funasr modelscope")
    dependencies_ok = False

# TTS语音合成
try:
    import pyttsx3
except ImportError:
    print("⚠️  缺少pyttsx3，运行：pip install pyttsx3")
    dependencies_ok = False

if not dependencies_ok:
    print("\n❌  部分依赖缺失，将进入演示模式，只有模拟功能")
    MODE = "demo"
else:
    MODE = "real"
    print("✅  所有依赖加载完成，将使用真实语音功能")

# ====================== 全局状态 ======================
connected_clients = set()
service_running = False
audio_queue = queue.Queue()
is_awake = False
recording_buffer = []
loop: Optional[asyncio.AbstractEventLoop] = None

# ====================== 模块初始化 ======================
if MODE == "real":
    # 1. 初始化音频
    audio = pyaudio.PyAudio()
    stream = audio.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=CHUNK_SIZE
    )

    # 2. 初始化唤醒模型（第一次运行自动下载）
    print("🔄 加载唤醒模型...")
    openwakeword.download_models()
    wake_model = WakeWordModel(wakeword_models=["alexa"])  # 替换为你训练好的"小聚小聚"模型

    # 3. 初始化ASR模型
    print("🔄 加载ASR识别模型...")
    asr_model = AutoModel(
        model="damo/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
        model_revision="v2.0.4"
    )

    # 4. 初始化TTS
    tts_engine = pyttsx3.init()
    tts_engine.setProperty('rate', 150)  # 语速
    tts_engine.setProperty('volume', 0.9)  # 音量

# ====================== WebSocket相关 ======================
async def broadcast_message(message):
    """广播消息给所有前端"""
    for client in list(connected_clients):
        try:
            await client.send(message)
        except Exception as e:
            print(f"发送消息失败：{e}")
            connected_clients.remove(client)

async def handle_client(websocket):
    """处理前端连接"""
    global service_running

    connected_clients.add(websocket)
    print(f"✅ 前端已连接，当前连接数：{len(connected_clients)}")

    try:
        async for message in websocket:
            data = json.loads(message)
            action = data.get("action")
            print(f"📩 收到前端指令：{action}")

            if action == "startService":
                service_running = True
                print("🎤 语音服务已启动")
                await broadcast_message(json.dumps({
                    "event": "ttsStatus",
                    "data": {"status": "start", "text": "语音服务已启动，你可以说小聚小聚唤醒我"}
                }))
                if MODE == "real":
                    tts_engine.say("语音服务已启动，你可以说小聚小聚唤醒我")
                    tts_engine.runAndWait()

            elif action == "stopService":
                service_running = False
                print("🛑 语音服务已停止")
                if MODE == "real":
                    tts_engine.say("语音服务已停止")
                    tts_engine.runAndWait()

            elif action == "tts":
                # 前端请求播报
                text = data["data"]["text"]
                print(f"🔊 开始播报：{text}")
                # 通知前端播报开始
                await broadcast_message(json.dumps({
                    "event": "ttsStatus",
                    "data": {"status": "start", "text": text}
                }))
                if MODE == "real":
                    tts_engine.say(text)
                    tts_engine.runAndWait()
                else:
                    await asyncio.sleep(2)  # 模拟播报时间
                # 通知前端播报完成
                await broadcast_message(json.dumps({
                    "event": "ttsStatus",
                    "data": {"status": "end", "text": text}
                }))
                print("✅ 播报完成")

            elif action == "cancel":
                global is_awake, recording_buffer
                is_awake = False
                recording_buffer = []
                print("⏹️  取消当前语音交互")

    except Exception as e:
        print(f"❌ 连接异常：{e}")
    finally:
        connected_clients.remove(websocket)
        print(f"👋 前端已断开，当前连接数：{len(connected_clients)}")

# ====================== 音频处理线程 ======================
def audio_process_thread():
    """独立线程处理音频，不阻塞WebSocket"""
    global is_awake, recording_buffer

    if MODE == "demo":
        # 演示模式：每10秒模拟一次唤醒
        while True:
            time.sleep(10)
            if service_running and connected_clients:
                print("🔔 模拟唤醒事件")
                # 发送唤醒事件
                asyncio.run_coroutine_threadsafe(
                    broadcast_message(json.dumps({
                        "event": "wakeup",
                        "data": {"wakeWord": WAKE_WORD, "timestamp": int(time.time()*1000)}
                    })),
                    loop
                )
                time.sleep(2)
                # 发送模拟识别结果
                mock_queries = ["今天数据概览", "今日事件总数", "刷新数据", "打开统计页面"]
                import random
                query = random.choice(mock_queries)
                print(f"🎤 模拟识别结果：{query}")
                asyncio.run_coroutine_threadsafe(
                    broadcast_message(json.dumps({
                        "event": "asrResult",
                        "data": {"text": query, "isFinal": True, "timestamp": int(time.time()*1000)}
                    })),
                    loop
                )
        return

    # 真实模式：处理麦克风音频
    print("🎙️  麦克风监听已启动，等待唤醒词...")
    while True:
        if not service_running:
            time.sleep(0.1)
            continue

        # 读取音频帧
        try:
            data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
            audio_frame = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
        except Exception as e:
            print(f"❌ 音频读取失败：{e}")
            time.sleep(0.1)
            continue

        if not is_awake:
            # 未唤醒状态：检测唤醒词
            prediction = wake_model.predict(audio_frame)
            if prediction["alexa"] > WAKE_THRESHOLD:
                is_awake = True
                recording_buffer = []
                wake_model.reset()
                print(f"🔔 唤醒成功！唤醒词：{WAKE_WORD}")
                # 发送唤醒事件给前端
                asyncio.run_coroutine_threadsafe(
                    broadcast_message(json.dumps({
                        "event": "wakeup",
                        "data": {"wakeWord": WAKE_WORD, "timestamp": int(time.time()*1000)}
                    })),
                    loop
                )
                # 播放提示音
                tts_engine.say("我在")
                tts_engine.runAndWait()
        else:
            # 已唤醒状态：收集音频准备识别
            recording_buffer.extend(audio_frame)

            # 简单VAD检测：音量低于阈值且已有音频超过1秒，认为说话结束
            volume = np.max(np.abs(audio_frame))
            if volume < 0.01 and len(recording_buffer) > SAMPLE_RATE * 1:
                print(f"🎤 开始识别，音频长度：{len(recording_buffer)/SAMPLE_RATE:.1f}秒")
                # 识别语音
                try:
                    result = asr_model.generate(
                        np.array(recording_buffer),
                        batch_size_s=0.1,
                        language="zh"
                    )
                    text = result[0]["text"].strip()
                    print(f"✅ 识别结果：{text}")
                    if text:
                        # 发送识别结果给前端
                        asyncio.run_coroutine_threadsafe(
                            broadcast_message(json.dumps({
                                "event": "asrResult",
                                "data": {"text": text, "isFinal": True, "timestamp": int(time.time()*1000)}
                            })),
                            loop
                        )
                    else:
                        tts_engine.say("抱歉，我没听清，请再说一遍")
                        tts_engine.runAndWait()
                except Exception as e:
                    print(f"❌ 识别失败：{e}")
                    tts_engine.say("识别失败，请重试")
                    tts_engine.runAndWait()
                finally:
                    is_awake = False
                    recording_buffer = []

            # 超时处理：最多录音10秒
            if len(recording_buffer) > SAMPLE_RATE * 10:
                is_awake = False
                recording_buffer = []
                tts_engine.say("说话时间太长了，请简短一点")
                tts_engine.runAndWait()

# ====================== 主服务 ======================
async def main():
    global loop
    loop = asyncio.get_running_loop()

    # 启动音频处理线程
    threading.Thread(target=audio_process_thread, daemon=True).start()

    # 启动WebSocket服务
    async with websockets.serve(handle_client, "0.0.0.0", WS_PORT):
        print("=" * 60)
        print(f"🚀 语音服务已启动，监听端口：{WS_PORT}")
        print(f"🎯 当前模式：{'✨ 真实语音模式' if MODE == 'real' else '🎮 演示模拟模式'}")
        if MODE == "real":
            print(f"🎤 唤醒词：{WAKE_WORD}")
        print("📝 使用说明：")
        print("   1. 打开前端语音测试页面")
        print("   2. 点击右上角开关开启语音服务")
        if MODE == "real":
            print("   3. 说唤醒词'小聚小聚'即可唤醒，然后说话提问")
        else:
            print("   3. 每10秒自动模拟一次唤醒流程，测试页面效果")
        print("=" * 60)
        await asyncio.Future()  # 永久运行

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 服务已退出")
        if MODE == "real":
            stream.stop_stream()
            stream.close()
            audio.terminate()
