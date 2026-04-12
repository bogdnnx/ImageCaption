from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api.auth import router as auth_router
from app.api.images import router as images_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы при старте (в проде — через Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Image Captioning API",
    description="Веб-сервис генерации текстовых описаний к изображениям на основе Vision Transformers (BLIP-2)",
    version="0.1.0",
    lifespan=lifespan,
)

# Статика — для отдачи загруженных изображений
app.mount("/static", StaticFiles(directory="static"), name="static")

# Роуты
app.include_router(auth_router)
app.include_router(images_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
