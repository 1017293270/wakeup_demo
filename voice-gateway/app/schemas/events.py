from typing import Any

from pydantic import BaseModel, Field


class StartMessageData(BaseModel):
    sampleRate: int = Field(default=16000)
    channels: int = Field(default=1)
    format: str = Field(default="pcm_s16le")
    wakeWords: list[str] = Field(default_factory=list)


class ClientMessage(BaseModel):
    type: str
    requestId: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    error: dict[str, Any] | None = None
    requestId: str
