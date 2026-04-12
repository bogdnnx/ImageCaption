"""
Сервис генерации описаний к изображениям.

Используем BLIP-2 (Salesforce) — Vision-Language модель,
которая соединяет ViT (vision encoder) с LLM через Q-Former.

Пайплайн:
  1. ViT извлекает визуальные фичи из изображения
  2. Q-Former сжимает их в набор query-токенов
  3. LLM (OPT-2.7B) генерирует текстовое описание

Для лёгкого деплоя можно переключиться на blip2-opt-2.7b (≈5GB VRAM)
или blip-image-captioning-base (≈1GB, попроще).
"""

import time
import logging
from functools import lru_cache

import torch
from PIL import Image
from transformers import Blip2Processor, Blip2ForConditionalGeneration

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_model(model_name: str, device: str):
    """
    Загружает модель один раз и кэширует в памяти процесса.
    Celery worker будет держать модель загруженной между задачами.
    """
    logger.info(f"Загружаю модель {model_name} на {device}...")
    start = time.time()

    processor = Blip2Processor.from_pretrained(model_name)
    model = Blip2ForConditionalGeneration.from_pretrained(
        model_name,
        torch_dtype=torch.float16 if device != "cpu" else torch.float32,
    )
    model.to(device)
    model.eval()

    elapsed = time.time() - start
    logger.info(f"Модель загружена за {elapsed:.1f}s")
    return processor, model


def generate_caption(image_path: str, model_name: str | None = None) -> dict:
    """
    Генерирует текстовое описание для изображения.

    Returns:
        {"caption": str, "processing_time_ms": int, "model_name": str}
    """
    model_name = model_name or settings.MODEL_NAME
    device = settings.DEVICE

    processor, model = load_model(model_name, device)

    # Загружаем изображение
    image = Image.open(image_path).convert("RGB")

    start = time.time()

    # Прогоняем через пайплайн
    inputs = processor(images=image, return_tensors="pt").to(device)

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=50,
            num_beams=5,
            early_stopping=True,
        )

    caption = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

    processing_time_ms = int((time.time() - start) * 1000)

    return {
        "caption": caption,
        "processing_time_ms": processing_time_ms,
        "model_name": model_name,
    }
