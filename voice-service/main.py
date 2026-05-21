#!/usr/bin/env python3
"""
语音交互后端服务（HTTP REST API + WebSocket 统一版）
- HTTP REST：配置、历史记录 CRUD（与前端 configApi.ts 对接）
- WebSocket：语音唤醒 pipeline（与前端 useVoiceSocket 对接）
- 数据库：MySQL 持久化存储

启动方式：
    python main.py
    uvicorn main:app --host 0.0.0.0 --port 8766
"""
import logging
import sys

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from config import WS_PORT
from http_api import router as http_router
from ws_server import voice_server

# -------------------- 日志 --------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("voice_server.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

# -------------------- FastAPI 应用 --------------------
app = FastAPI(title="Voice Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP REST API（/api/v1/config, /api/v1/history 等）
app.include_router(http_router)


# WebSocket 语音管道端点（兼容新旧路径）
@app.websocket("/ws")
@app.websocket("/api/v1/voice/ws")
async def voice_ws(websocket: WebSocket):
    await voice_server.handle_client(websocket)


# -------------------- 启动 --------------------
def check_dependencies():
    missing = []
    try:
        import speech_recognition  # noqa
    except ImportError:
        missing.append("SpeechRecognition")
    try:
        import edge_tts  # noqa
    except ImportError:
        missing.append("edge-tts")
    if missing:
        print("缺少以下依赖，请先安装：")
        for dep in missing:
            print(f"   pip install {dep}")
        sys.exit(1)
    print("所有依赖检查通过")


if __name__ == "__main__":
    import uvicorn

    print("=" * 55)
    print("  语音交互服务（HTTP + WebSocket 统一版）")
    print(f"  HTTP REST:  http://0.0.0.0:{WS_PORT}/api/v1/config")
    print(f"  WebSocket:   ws://0.0.0.0:{WS_PORT}/ws")
    print("=" * 55)

    check_dependencies()

    uvicorn.run(app, host="0.0.0.0", port=WS_PORT)
