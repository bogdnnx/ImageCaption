import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, Field

from app.models.models import TaskStatus


# ── Auth ──────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: int


# ── Image ─────────────────────────────────────────────

class ImageResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    uploaded_at: datetime


class ImageWithCaptions(ImageResponse):
    captions: list["CaptionResponse"] = []


# ── Caption ───────────────────────────────────────────

class CaptionRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    user_prompt: str | None = Field(
        default=None,
        max_length=2000,
        description='Что именно нужно описать (например: "выдели материал и цвет")',
    )
    model_name: str | None = Field(
        default=None,
        description="Имя модели в Ollama. Если не указано — берётся из настроек.",
    )


class CaptionResponse(BaseModel):
    model_config = {
        "protected_namespaces": (),
        "from_attributes": True,
    }

    id: uuid.UUID
    text: str | None
    user_prompt: str | None  # ← новое
    model_name: str
    status: TaskStatus
    celery_task_id: str | None
    error_message: str | None
    processing_time_ms: int | None
    created_at: datetime
    completed_at: datetime | None
    image_id: uuid.UUID


