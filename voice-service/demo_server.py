#!/usr/bin/env python3
"""
演示版本后端服务，不需要安装任何AI模型依赖，直接运行就能看到效果
"""
import asyncio
import websockets
import json
import time
import random

connected_clients = set()
service_running = False

# 模拟指令响应
MOCK_RESPONSES = {
    "今天数据概览": "今日总事件数128件，较昨日增长15%，告警事件3件，已全部处理。",
    "今日事件总数": "今日事件总数为128件。",
    "刷新数据": "数据已刷新。",
    "关闭语音服务": "语音服务已关闭。",
    "默认": "抱歉，我还听不懂这个指令，请换个说法试试。"
}

async def broadcast_message(message):
    """广播消息给所有客户端"""
    for client in list(connected_clients):
        try:
            await client.send(message)
        except Exception as e:
            print(f"发送消息失败：{e}")
            connected_clients.remove(client)

async def simulate_wakeup_flow():
    """模拟完整的唤醒-识别-播报流程"""
    while True:
        if not service_running or not connected_clients:
            await asyncio.sleep(1)
            continue

        # 每10秒模拟一次唤醒（测试用）
        await asyncio.sleep(10)

        # 1. 发送唤醒事件
        print("模拟唤醒事件")
        wakeup_event = json.dumps({
            "event": "wakeup",
            "data": {
                "wakeWord": "小聚小聚",
                "timestamp": int(time.time() * 1000)
            }
        })
        await broadcast_message(wakeup_event)

        # 2. 等待2秒，发送识别结果
        await asyncio.sleep(2)
        mock_queries = list(MOCK_RESPONSES.keys())[:-1]
        query = random.choice(mock_queries)
        print(f"模拟识别结果：{query}")
        asr_event = json.dumps({
            "event": "asrResult",
            "data": {
                "text": query,
                "isFinal": True,
                "timestamp": int(time.time() * 1000)
            }
        })
        await broadcast_message(asr_event)

async def handle_client(websocket):
    """处理客户端连接"""
    global service_running

    connected_clients.add(websocket)
    print(f"前端已连接，当前连接数：{len(connected_clients)}")

    try:
        async for message in websocket:
            data = json.loads(message)
            action = data.get("action")
            print(f"收到前端指令：{action}")

            if action == "startService":
                service_running = True
                print("语音服务已启动")

            elif action == "tts":
                # 模拟TTS播报
                text = data["data"]["text"]
                print(f"收到TTS请求：{text}")
                # 通知开始播报
                start_event = json.dumps({
                    "event": "ttsStatus",
                    "data": {"status": "start", "text": text}
                })
                await broadcast_message(start_event)
                # 模拟播报3秒
                await asyncio.sleep(3)
                # 通知播报完成
                end_event = json.dumps({
                    "event": "ttsStatus",
                    "data": {"status": "end", "text": text}
                })
                await broadcast_message(end_event)
                print("播报完成")

            elif action == "stopService":
                service_running = False
                print("语音服务已停止")

    except Exception as e:
        print(f"连接异常：{e}")
    finally:
        connected_clients.remove(websocket)
        print(f"前端已断开，当前连接数：{len(connected_clients)}")

async def main():
    # 启动模拟唤醒协程
    asyncio.create_task(simulate_wakeup_flow())

    # 启动WebSocket服务
    async with websockets.serve(handle_client, "0.0.0.0", 8765):
        print("=" * 50)
        print("🎤 语音服务演示版已启动")
        print("📍 监听端口：8765")
        print("📝 使用说明：")
        print("   1. 打开前端语音测试页面")
        print("   2. 点击右上角开关开启语音服务")
        print("   3. 每10秒会自动模拟一次唤醒流程，测试页面效果")
        print("   4. 不需要安装任何AI模型依赖")
        print("=" * 50)
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n服务已退出")
