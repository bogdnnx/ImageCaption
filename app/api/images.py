import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Image, Caption, TaskStatus
from app.schemas.schemas import ImageResponse, ImageWithCaptions, CaptionResponse, CaptionRequest
from app.tasks.caption_task import generate_caption_task

router = APIRouter(prefix="/api/images", tags=["images"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}



@router.post("/upload", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Валидация типа файла
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Тип файла {file.content_type} не поддерживается. Допустимо: {ALLOWED_TYPES}",
        )

    # Читаем содержимое и проверяем размер
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой. Максимум: {settings.MAX_FILE_SIZE_MB} MB",
        )

    # Сохраняем на диск
    ext = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = settings.upload_path / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    # Создаём запись в БД
    image = Image(
        filename=unique_name,
        original_name=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        mime_type=file.content_type,
        owner_id=current_user.id,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.get("/", response_model=list[ImageResponse])
async def list_images(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(Image)
        .where(Image.owner_id == current_user.id)
        .order_by(Image.uploaded_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.get("/{image_id}", response_model=ImageWithCaptions)
async def get_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Image)
        .options(selectinload(Image.captions))
        .where(Image.id == image_id, Image.owner_id == current_user.id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Изображение не найдено")
    return image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Image).where(Image.id == image_id, Image.owner_id == current_user.id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Изображение не найдено")

    # Удаляем файл с диска
    file_path = Path(image.file_path)
    if file_path.exists():
        file_path.unlink()

    await db.delete(image)
    await db.commit()



@router.post("/{image_id}/caption", response_model=CaptionResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_caption(
    image_id: uuid.UUID,
    body: CaptionRequest = CaptionRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создаёт задачу на генерацию описания. Возвращает 202 - обработка в Celery."""
    result = await db.execute(
        select(Image).where(Image.id == image_id, Image.owner_id == current_user.id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Изображение не найдено")

    model_name = body.model_name or settings.MODEL_NAME

    caption = Caption(
        image_id=image.id,
        model_name=model_name,
        user_prompt=body.user_prompt,
        status=TaskStatus.PENDING,
    )
    db.add(caption)
    await db.commit()
    await db.refresh(caption)

    task = generate_caption_task.delay(
        caption_id=str(caption.id),
        image_path=image.file_path,
        model_name=model_name,
        user_prompt=body.user_prompt,
    )

    caption.celery_task_id = task.id
    await db.commit()
    await db.refresh(caption)

    return caption


@router.get("/{image_id}/captions", response_model=list[CaptionResponse])
async def list_captions(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Проверяем, что изображение принадлежит пользователю
    img_result = await db.execute(
        select(Image).where(Image.id == image_id, Image.owner_id == current_user.id)
    )
    if not img_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Изображение не найдено")

    result = await db.execute(
        select(Caption)
        .where(Caption.image_id == image_id)
        .order_by(Caption.created_at.desc())
    )
    return result.scalars().all()
