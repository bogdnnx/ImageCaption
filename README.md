# Image Captioning API

Веб-сервис генерации текстовых описаний к изображениям 

## Архитектура

```
Client → FastAPI (async) → PostgreSQL
                ↓
            Celery Task → BLIP-2 (ViT + Q-Former + OPT-2.7B) → caption
                ↑
              Redis (broker)
```

## Стек

- **API**: FastAPI + SQLAlchemy 2.0  + Pydantic v2
- **БД**: PostgreSQL 16 (asyncpg)
- **Очередь задач**: Celery + Redis
- **ML**: BLIP-2 (Salesforce/blip2-opt-2.7b) через HuggingFace Transformers
- **Авторизация**: JWT (HS256)

## старт

```bash
# 1. Клонируем и настраиваем
cp .env.example .env

# 2. Запускаем всё через Docker
docker compose up -d

# 3. API доступен на http://localhost:8000
# 4. Swagger UI → http://localhost:8000/docs
# 5. Flower (мониторинг Celery) → http://localhost:5555
```

## API эндпоинты

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login` 

### Images
- `POST /api/images/upload` — загрузка изображения
- `GET /api/images/` — список изображений пользователя
- `GET /api/images/{id}` — детали изображения с описаниями
- `DELETE /api/images/{id}` — удаление изображения

### Captions
- `POST /api/images/{id}/caption` — запуск генерации описания (async, 202)
- `GET /api/images/{id}/captions` — список описаний для изображения

## Запуск без Docker (dev)

```bash
# Терминал 1: API
uvicorn app.main:app --reload

# Терминал 2: Celery worker
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=1

# Терминал 3: Flower (опционально)
celery -A app.tasks.celery_app flower
```

## Модели

По умолчанию используется `Salesforce/blip2-opt-2.7b` (~5GB).
Можно переключить на более лёгкую модель через `.env`:

```
MODEL_NAME=Salesforce/blip-image-captioning-base
```
