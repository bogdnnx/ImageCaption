"""
Celery-задача генерации описания.

Работает в отдельном процессе (worker), синхронно:
  1. Обновляет статус → PROCESSING
  2. Вызывает ML-сервис
  3. Обновляет статус → COMPLETED / FAILED

Для доступа к БД используем синхронный SQLAlchemy —
Celery worker не async.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Caption, TaskStatus
from app.services.captioning import generate_caption
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Синхронный движок для Celery worker
SYNC_DB_URL = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
sync_engine = create_engine(SYNC_DB_URL)


def get_sync_session() -> Session:
    return Session(sync_engine)


@celery_app.task(bind=True, name="generate_caption", max_retries=2)
def generate_caption_task(self, caption_id: str, image_path: str, model_name: str):
    """Генерирует описание для изображения и обновляет запись в БД."""

    session = get_sync_session()
    try:
        caption = session.get(Caption, caption_id)
        if not caption:
            logger.error(f"Caption {caption_id} не найден в БД")
            return

        # Обновляем статус
        caption.status = TaskStatus.PROCESSING
        session.commit()

        # Генерируем описание
        result = generate_caption(image_path, model_name)

        # Сохраняем результат
        caption.text = result["caption"]
        caption.processing_time_ms = result["processing_time_ms"]
        caption.status = TaskStatus.COMPLETED
        caption.completed_at = datetime.now(timezone.utc)
        session.commit()

        logger.info(
            f"Caption {caption_id}: '{result['caption'][:50]}...' "
            f"({result['processing_time_ms']}ms)"
        )

    except Exception as exc:
        session.rollback()

        # Пишем ошибку в БД
        if caption:
            caption.status = TaskStatus.FAILED
            caption.error_message = str(exc)[:500]
            session.commit()

        logger.exception(f"Ошибка генерации caption {caption_id}")

        # Ретрай через Celery
        raise self.retry(exc=exc, countdown=30)

    finally:
        session.close()
