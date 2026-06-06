"""
Сервис генерации описаний к изображениям через Ollama.

Ollama запускает Qwen2.5-VL локально через llama.cpp с GGUF-квантизацией.

Поток данных:
  image_path → base64 → POST /api/generate → JSON с описанием
"""

import base64
import logging
import time
from pathlib import Path

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


DEFAULT_PROMPT = (
    "Опиши этот товар на русском языке"
    "Выдели ключевые характеристики, материал и назначение."
    "Сделай описание как для карточки товара"
)


def _build_full_prompt(user_prompt: str | None) -> str:
    """
    Оборачиваем пользовательский запрос в системные инструкции,
    чтобы модель не сваливалась в английский и не добавляла мусор.
    """
    user_request = (user_prompt or DEFAULT_PROMPT).strip()
    return (
        "Ты описываешь фотографии. Отвечай только на русском, "
        "без markdown и вводных фраз."
        f"Запрос пользователя: {user_request}"
    )


def generate_caption(
    image_path: str,
    model_name: str | None = None,
    user_prompt: str | None = None,
) -> dict:
    """
    Генерирует текстовое описание для изображения через Ollama.

    Args:
        image_path: путь к изображению на диске
        model_name: имя модели в Ollama (qwen2.5vl:7b и т.п.)
        user_prompt: пользовательский запрос (что именно описать)

    Returns:
        {"caption": str, "processing_time_ms": int, "model_name": str}
    """
    model_name = model_name or settings.MODEL_NAME
    full_prompt = _build_full_prompt(user_prompt)

    # Читаем файл и кодируем в base64
    image_bytes = Path(image_path).read_bytes()
    image_b64 = base64.b64encode(image_bytes).decode()

    logger.info(
        f"Запрос к Ollama: model={model_name}, image_size={len(image_bytes)} bytes"
    )

    start = time.time()

    try:
        response = httpx.post(
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": model_name,
                "prompt": full_prompt,
                "images": [image_b64],
                "stream": False,
                "options": {
                    "temperature": 0.4,
                    "num_predict": 150,
                    "top_p": 0.9,
                },
            },
            timeout=settings.OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama HTTP {e.response.status_code}: {e.response.text}")
        raise RuntimeError(f"Ollama вернула ошибку: {e.response.status_code}")
    except httpx.TimeoutException:
        logger.error(f"Ollama не ответила за {settings.OLLAMA_TIMEOUT}s")
        raise RuntimeError("Превышено время ожидания генерации")

    data = response.json()
    caption = data.get("response", "").strip()

    processing_time_ms = int((time.time() - start) * 1000)
    logger.info(
        f"Генерация завершена за {processing_time_ms}ms, "
        f"длина текста: {len(caption)} символов"
    )

    return {
        "caption": caption,
        "processing_time_ms": processing_time_ms,
        "model_name": model_name,
    }