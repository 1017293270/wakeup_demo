from uuid import uuid4

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.observability.logger import configure_logging
from app.dialog.client import DialogClient
from app.schemas.config import WakeConfig
from app.storage.config_store import config_store
from app.storage.history_store import history_store
from app.ws_router import router as ws_router

configure_logging()

app = FastAPI(title="Voice Wakeup Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ws_router)
dialog_client = DialogClient()


def ok(data):
    return {"success": True, "data": data, "error": None, "requestId": f"req_{uuid4().hex[:10]}"}


def fail(message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "error": {"code": code, "message": message, "details": {}},
            "requestId": f"req_{uuid4().hex[:10]}",
        },
    )


@app.get("/health")
async def health():
    return ok({"status": "ok"})


@app.get("/api/v1/config")
async def get_config():
    return ok(config_store.load().model_dump())


@app.put("/api/v1/config")
async def put_config(config: WakeConfig):
    saved = config_store.save(config)
    return ok(saved.model_dump())


@app.post("/api/v1/config/reload")
async def reload_config():
    return ok(config_store.load().model_dump())


@app.get("/api/v1/history")
async def list_history(keyword: str = Query(default="")):
    return ok(history_store.list(keyword))


@app.delete("/api/v1/history")
async def clear_history():
    history_store.clear()
    return ok({"cleared": True})


@app.post("/api/v1/dialog/login")
async def login_dialog():
    result = await dialog_client.login(force=True)
    if not result.get("success"):
        return fail("对话服务登录失败，请检查网关环境变量。", str(result.get("error") or "WORKFLOW_LOGIN_FAILED"), 502)
    return ok({"authenticated": True})
