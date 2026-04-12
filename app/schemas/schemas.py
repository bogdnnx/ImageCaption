import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


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
    id: uuid.UUID
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImageWithCaptions(ImageResponse):
    captions: list["CaptionResponse"] = []


# ── Caption ───────────────────────────────────────────

class CaptionResponse(BaseModel):
    id: uuid.UUID
    text: str | None
    model_name: str
    status: str
    celery_task_id: str | None
    error_message: str | None
    processing_time_ms: int | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class CaptionRequest(BaseModel):
    """Опционально можно указать конкретную модель."""
    model_name: str | None = None
