from celery import shared_task
from datetime import datetime, timezone
import logging

from app.core.database import sync_session
from app.models.models import Caption, TaskStatus
from app.services.captioning import generate_caption

logger = logging.getLogger(__name__)


@shared_task(name="generate_caption", bind=True, max_retries=3, default_retry_delay=30)
def generate_caption_task(
    self,
    caption_id: str,
    image_path: str,
    model_name: str | None = None,
    user_prompt: str | None = None,
):
    """Генерирует caption и обновляет запись в БД."""
    with sync_session() as db:
        caption = db.get(Caption, caption_id)
        if not caption:
            logger.error(f"Caption {caption_id} не найден")
            return

        try:
            caption.status = TaskStatus.PROCESSING
            db.commit()

            result = generate_caption(
                image_path=image_path,
                model_name=model_name,
                user_prompt=user_prompt,
            )

            caption.text = result["caption"]
            caption.processing_time_ms = result["processing_time_ms"]
            caption.model_name = result["model_name"]
            caption.status = TaskStatus.COMPLETED
            caption.completed_at = datetime.now(timezone.utc)
            db.commit()

            logger.info(f"Caption {caption_id} готов ({result['processing_time_ms']}ms)")
            return {"caption_id": caption_id, "status": "completed"}

        except Exception as exc:
            logger.error(f"Ошибка генерации caption {caption_id}", exc_info=True)
            caption.status = TaskStatus.FAILED
            caption.error_message = str(exc)[:500]
            db.commit()
            raise self.retry(exc=exc)