"""HTTP REST API — 提供配置和历史记录的 CRUD 接口，与前端 configApi.ts 对接"""
from uuid import uuid4

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from db import ConfigManager, HistoryManager

router = APIRouter()


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


@router.get("/health")
async def health():
    return ok({"status": "ok"})


@router.get("/api/v1/config")
async def get_config():
    return ok(ConfigManager.get_all_config())


@router.put("/api/v1/config")
async def put_config(config: dict):
    try:
        for key, value in config.items():
            ConfigManager.set_config(key, value)
    except Exception as e:
        return fail(f"配置保存失败: {e}")
    return ok(ConfigManager.get_all_config())


@router.post("/api/v1/config/reload")
async def reload_config():
    return ok(ConfigManager.get_all_config())


@router.get("/api/v1/history")
async def list_history(keyword: str = Query(default="")):
    result = HistoryManager.get_history_list(page=1, page_size=200, keyword=keyword)
    return ok(result.get("list", []))


@router.delete("/api/v1/history")
async def clear_history():
    HistoryManager.clear_history()
    return ok({"cleared": True})
