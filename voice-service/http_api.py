"""HTTP REST API for auth, chat, config, and history."""
import base64
import hashlib
import hmac
import io
import json
import random
import re
import secrets
import time
from datetime import datetime, timezone
from uuid import uuid4

import bcrypt
import pymysql
import requests
from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse

from config import (
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_USER,
    WORKFLOW_BASE_URL,
    WORKFLOW_PASSWORD,
    WORKFLOW_USERNAME,
)
from db import ConfigManager, HistoryManager

router = APIRouter()
_captcha_store: dict[str, dict] = {}
_revoked_tokens: set[str] = set()
_token_secret = secrets.token_hex(32)


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


def _db():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def _fmt(value) -> str:
    if not value:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return str(value)


def _json_b64(data: dict) -> str:
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _sign(data: str) -> str:
    return hmac.new(_token_secret.encode("utf-8"), data.encode("utf-8"), hashlib.sha256).hexdigest()


def _create_token(user: dict) -> str:
    data = _json_b64(
        {
            "sub": user["id"],
            "phone": user["phone"],
            "name": user.get("name", ""),
            "exp": int(time.time()) + 24 * 3600,
        }
    )
    return f"{data}.{_sign(data)}"


def _verify_token(token: str) -> dict | None:
    if not token or token in _revoked_tokens or "." not in token:
        return None
    data, signature = token.rsplit(".", 1)
    if not hmac.compare_digest(signature, _sign(data)):
        return None
    try:
        padded = data + "=" * (-len(data) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except Exception:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload


def _current_user(authorization: str | None) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return _verify_token(authorization[7:])


def _user_response(row: dict) -> dict:
    return {
        "id": row["user_id"],
        "phone": row["phone"],
        "name": row.get("name") or "",
        "created_at": _fmt(row.get("created_at")),
    }


def _find_user_by_phone(phone: str) -> dict | None:
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, phone, name, password_hash, created_at FROM users WHERE phone=%s", (phone,))
            return cur.fetchone()


def _find_user_by_id(user_id: str) -> dict | None:
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, phone, name, password_hash, created_at FROM users WHERE user_id=%s", (user_id,))
            return cur.fetchone()


def _verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    if password_hash.startswith("$2"):
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    return hmac.compare_digest(password_hash, hashlib.sha256(password.encode("utf-8")).hexdigest())


def _validate_password(password: str) -> list[str]:
    errors = []
    if len(password) < 8:
        errors.append("密码长度至少8位")
    if not re.search(r"[A-Z]", password):
        errors.append("密码必须包含大写字母")
    if not re.search(r"[a-z]", password):
        errors.append("密码必须包含小写字母")
    if not re.search(r"[^a-zA-Z0-9\s]", password):
        errors.append("密码必须包含特殊字符")
    return errors


def _clean_captcha() -> None:
    now = time.time()
    for token in [key for key, value in _captcha_store.items() if value["expires_at"] < now]:
        _captcha_store.pop(token, None)


def _captcha_image(text: str) -> str:
    try:
        from PIL import Image, ImageDraw, ImageFont

        image = Image.new("RGB", (200, 80), color=(240, 240, 240))
        draw = ImageDraw.Draw(image)
        for _ in range(6):
            draw.line(
                [(random.randint(0, 200), random.randint(0, 80)), (random.randint(0, 200), random.randint(0, 80))],
                fill=(180, 180, 180),
                width=1,
            )
        try:
            font = ImageFont.truetype("arial.ttf", 32)
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), text, font=font)
        draw.text(((200 - (bbox[2] - bbox[0])) // 2, (80 - (bbox[3] - bbox[1])) // 2), text, fill=(40, 40, 40), font=font)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    except Exception:
        return ""


def _verify_captcha(token: str, code: str) -> bool:
    _clean_captcha()
    entry = _captcha_store.pop(token, None)
    return bool(entry and entry["answer"] == str(code).strip())


def _extract_workflow_token(data: dict) -> str:
    candidates = [
        data.get("token"),
        data.get("accessToken"),
        data.get("result", {}).get("token") if isinstance(data.get("result"), dict) else None,
        data.get("result", {}).get("accessToken") if isinstance(data.get("result"), dict) else None,
        data.get("data", {}).get("token") if isinstance(data.get("data"), dict) else None,
        data.get("data", {}).get("accessToken") if isinstance(data.get("data"), dict) else None,
    ]
    return next((str(item) for item in candidates if item), "")


def _extract_dialog_answer(data) -> str:
    if data is None:
        return ""
    if isinstance(data, str):
        return data
    if isinstance(data, (int, float, bool)):
        return str(data)
    if isinstance(data, list):
        parts = [_extract_dialog_answer(item) for item in data]
        return "\n".join(part for part in parts if part)
    if not isinstance(data, dict):
        return str(data)

    for key in ("message", "result", "data", "answer", "reply", "content", "text", "output"):
        answer = _extract_dialog_answer(data.get(key))
        if answer:
            return answer
    return ""


def _dialog_answer(text: str) -> str:
    if not WORKFLOW_PASSWORD:
        return "对话服务未配置登录密码，请配置 VOICE_WORKFLOW_PASSWORD 后重试。"
    try:
        login = requests.post(
            f"{WORKFLOW_BASE_URL.rstrip('/')}/sys/mLogin",
            json={"username": WORKFLOW_USERNAME, "password": WORKFLOW_PASSWORD},
            timeout=8,
            proxies={"http": None, "https": None},
        )
        login.raise_for_status()
        data = login.json()
        token = _extract_workflow_token(data)
        if not token:
            return "对话服务登录成功但未返回令牌，请检查问数服务响应。"
        response = requests.post(
            f"{WORKFLOW_BASE_URL.rstrip('/')}/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
            json={"content": text},
            headers={"X-Access-Token": token, "Authorization": f"Bearer {token}"},
            timeout=30,
            proxies={"http": None, "https": None},
        )
        response.raise_for_status()
        body = response.json()
        answer = _extract_dialog_answer(body)
        if answer:
            return answer
        return "问数服务已响应，但未返回可展示内容。"
    except Exception:
        return "对话服务暂时不可用，请稍后重试。"


@router.get("/health")
async def health():
    return ok({"status": "ok"})


@router.get("/api/v1/auth/captcha")
async def auth_captcha():
    _clean_captcha()
    a = random.randint(1, 20)
    b = random.randint(1, 20)
    op = random.choice(["+", "-"])
    if op == "-" and a < b:
        a, b = b, a
    answer = str(a + b if op == "+" else a - b)
    text = f"{a} {op} {b} = ?"
    token = secrets.token_hex(16)
    _captcha_store[token] = {"answer": answer, "expires_at": time.time() + 300}
    return ok({"captcha_token": token, "captcha_image": _captcha_image(text), "captcha_text": text})


@router.post("/api/v1/auth/login")
async def auth_login(req: dict):
    if not _verify_captcha(req.get("captcha_token", ""), req.get("captcha_code", "")):
        return fail("验证码错误", "CAPTCHA_INVALID", 400)
    user = _find_user_by_phone(str(req.get("phone", "")).strip())
    if not user or not _verify_password(str(req.get("password", "")), user.get("password_hash") or ""):
        return fail("手机号或密码错误", "AUTH_FAILED", 401)
    user_data = _user_response(user)
    return ok({"token": _create_token(user_data), "user": user_data})


@router.post("/api/v1/auth/register")
async def auth_register(req: dict):
    if not _verify_captcha(req.get("captcha_token", ""), req.get("captcha_code", "")):
        return fail("验证码错误", "CAPTCHA_INVALID", 400)
    phone = str(req.get("phone", "")).strip()
    password = str(req.get("password", ""))
    name = str(req.get("name", "")).strip()
    if _find_user_by_phone(phone):
        return fail("该手机号已注册", "PHONE_EXISTS", 409)
    errors = _validate_password(password)
    if errors:
        return fail("密码不符合要求：" + "；".join(errors), "WEAK_PASSWORD", 400)
    user_id = f"user_{uuid4().hex[:12]}"
    now = datetime.now()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (user_id, phone, password_hash, name, created_at) VALUES (%s, %s, %s, %s, %s)",
                (user_id, phone, password_hash, name, now),
            )
        conn.commit()
    user_data = {"id": user_id, "phone": phone, "name": name, "created_at": _fmt(now)}
    return ok({"token": _create_token(user_data), "user": user_data})


@router.get("/api/v1/auth/me")
async def auth_me(authorization: str = Header(None)):
    payload = _current_user(authorization)
    if not payload:
        return fail("请先登录", "UNAUTHORIZED", 401)
    user = _find_user_by_id(payload["sub"])
    if not user:
        return fail("用户不存在", "USER_NOT_FOUND", 404)
    return ok(_user_response(user))


@router.post("/api/v1/auth/logout")
async def auth_logout(authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        _revoked_tokens.add(authorization[7:])
    return ok({"success": True})


@router.get("/api/v1/chat/sessions")
async def chat_sessions(authorization: str = Header(None)):
    user = _current_user(authorization)
    if not user:
        return fail("请先登录", "UNAUTHORIZED", 401)
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.session_id, s.title, s.created_at, COUNT(m.id) AS message_count
                FROM chat_sessions s
                LEFT JOIN chat_messages m ON m.session_id = s.session_id AND m.user_id = s.user_id
                WHERE s.user_id = %s
                GROUP BY s.id, s.session_id, s.title, s.created_at
                ORDER BY s.created_at DESC
                """,
                (user["sub"],),
            )
            rows = cur.fetchall()
    return ok([{"id": r["session_id"], "title": r["title"], "created_at": _fmt(r["created_at"]), "message_count": int(r["message_count"] or 0)} for r in rows])


@router.get("/api/v1/chat/sessions/{session_id}/messages")
async def chat_messages(session_id: str, authorization: str = Header(None)):
    user = _current_user(authorization)
    if not user:
        return fail("请先登录", "UNAUTHORIZED", 401)
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT message_id, role, text, created_at FROM chat_messages WHERE user_id=%s AND session_id=%s ORDER BY created_at ASC",
                (user["sub"], session_id),
            )
            rows = cur.fetchall()
    return ok([{"id": r["message_id"], "role": r["role"], "text": r["text"], "timestamp": _fmt(r["created_at"])} for r in rows])


@router.post("/api/v1/chat/send")
async def chat_send(req: dict, authorization: str = Header(None)):
    user = _current_user(authorization)
    if not user:
        return fail("请先登录", "UNAUTHORIZED", 401)
    text = str(req.get("text", "")).strip()
    session_id = str(req.get("session_id", "") or f"session_{uuid4().hex[:10]}")
    if not text:
        return fail("消息不能为空", "EMPTY_MESSAGE", 400)
    now = datetime.now()
    user_msg_id = f"msg_{uuid4().hex[:10]}"
    assistant_msg_id = f"msg_{uuid4().hex[:10]}"
    answer = _dialog_answer(text)
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM chat_sessions WHERE user_id=%s AND session_id=%s", (user["sub"], session_id))
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO chat_sessions (session_id, user_id, title, created_at) VALUES (%s, %s, %s, %s)",
                    (session_id, user["sub"], text[:30], now),
                )
            cur.execute(
                "INSERT INTO chat_messages (message_id, session_id, user_id, role, text, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_msg_id, session_id, user["sub"], "user", text, now),
            )
            cur.execute(
                "INSERT INTO chat_messages (message_id, session_id, user_id, role, text, created_at) VALUES (%s, %s, %s, %s, %s, %s)",
                (assistant_msg_id, session_id, user["sub"], "assistant", answer, now),
            )
        conn.commit()
    return ok({
        "user_message": {"id": user_msg_id, "role": "user", "text": text, "timestamp": _fmt(now)},
        "assistant_message": {"id": assistant_msg_id, "role": "assistant", "text": answer, "timestamp": _fmt(now)},
    })


@router.delete("/api/v1/chat/sessions/{session_id}")
async def chat_delete_session(session_id: str, authorization: str = Header(None)):
    user = _current_user(authorization)
    if not user:
        return fail("请先登录", "UNAUTHORIZED", 401)
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM chat_messages WHERE user_id=%s AND session_id=%s", (user["sub"], session_id))
            cur.execute("DELETE FROM chat_sessions WHERE user_id=%s AND session_id=%s", (user["sub"], session_id))
        conn.commit()
    return ok({"deleted": True})


@router.get("/api/v1/config")
async def get_config():
    return ok(ConfigManager.get_all_config())


@router.put("/api/v1/config")
async def put_config(config: dict):
    try:
        for key, value in config.items():
            ConfigManager.set_config(key, value)
    except Exception as exc:
        return fail(f"配置保存失败: {exc}")
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
