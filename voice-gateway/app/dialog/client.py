import logging
import time
from typing import Any

import httpx

from app.config import settings
from app.schemas.config import WakeConfig

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 50 * 60


class DialogClient:
    _shared_token = ""
    _shared_token_expires_at = 0.0

    def __init__(
        self,
        base_url: str | None = None,
        username: str | None = None,
        password: str | None = None,
    ) -> None:
        self.base_url = (base_url or settings.workflow_base_url).rstrip("/")
        self.username = username if username is not None else settings.workflow_username
        self.password = password if password is not None else settings.workflow_password

    async def login(self, force: bool = False) -> dict[str, Any]:
        if self._shared_token and not force and time.time() < self._shared_token_expires_at:
            return {"success": True, "token": self._shared_token}

        if not self.password:
            return {"success": False, "error": "WORKFLOW_PASSWORD_MISSING"}

        payload = {"username": self.username, "password": self.password}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(f"{self.base_url}/sys/mLogin", json=payload)
                response.raise_for_status()
                data = response.json()
        except Exception as exc:
            logger.warning("Workflow login unavailable: %s", exc)
            return {"success": False, "error": "WORKFLOW_LOGIN_FAILED", "details": str(exc)}

        token = self._extract_token(data)
        if not token:
            logger.warning("Workflow login response did not include a token")
            return {"success": False, "error": "WORKFLOW_TOKEN_MISSING", "raw": data}

        DialogClient._shared_token = token
        DialogClient._shared_token_expires_at = time.time() + TOKEN_TTL_SECONDS
        return {"success": True, "token": token}

    async def ask(self, question: str, session_id: str, config: WakeConfig, retried_auth: bool = False) -> dict[str, Any]:
        login_result = await self.login(force=retried_auth)
        if not login_result.get("success"):
            return {
                "answer": f"我已识别到“{question}”。当前对话服务登录失败，请检查网关配置后重试。",
                "raw": login_result,
            }

        token = str(login_result["token"])
        payload = {"content": question}
        headers = {"X-Access-Token": token, "Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in {401, 403} and not retried_auth:
                DialogClient._shared_token = ""
                return await self.ask(question, session_id, config, retried_auth=True)
            logger.warning("Workflow backend returned an error: %s", exc)
            return {
                "answer": f"我已识别到“{question}”。当前对话服务暂不可用，请稍后重试。",
                "raw": {"fallback": True, "error": str(exc)},
            }
        except Exception as exc:
            logger.warning("Workflow backend unavailable: %s", exc)
            return {
                "answer": f"我已识别到“{question}”。当前对话服务暂不可用，请稍后重试。",
                "raw": {"fallback": True, "error": str(exc)},
            }

        answer = data.get("message") or data.get("result") or data.get("data") or str(data)
        return {"answer": str(answer), "raw": data}

    @staticmethod
    def _extract_token(data: dict[str, Any]) -> str:
        candidates = [
            data.get("token"),
            data.get("accessToken"),
            data.get("result", {}).get("token") if isinstance(data.get("result"), dict) else None,
            data.get("result", {}).get("accessToken") if isinstance(data.get("result"), dict) else None,
            data.get("data", {}).get("token") if isinstance(data.get("data"), dict) else None,
            data.get("data", {}).get("accessToken") if isinstance(data.get("data"), dict) else None,
        ]
        return next((str(item) for item in candidates if item), "")
