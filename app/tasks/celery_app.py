from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "image_captioning",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.caption_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Один воркер - одна задача (модель жрёт память)
    worker_concurrency=1,
    worker_prefetch_multiplier=1,
)