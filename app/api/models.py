import httpx
from fastapi import APIRouter, HTTPException
from app.core.config import settings

router = APIRouter(prefix="/api/models", tags=["models"])

# Метаданные моделей для UI
MODEL_META = {
    "qwen2.5vl:3b":      {"label": "Qwen2.5-VL 3B",  "speed": "medium", "note": "~5-20с · баланс"},
    "qwen2.5vl:7b-q4_K_M":      {"label": "Qwen2.5-VL 7B",  "speed": "slow",   "note": "~30-90с · максимум качества"},
    "minicpm-v:latest":  {"label": "MiniCPM-V",      "speed": "slow",   "note": "~20-40с · детальные описания"},
    "qwen3-vl:4b-instruct": {"label": "instruct", "speed": "idk",   "note": " детальные описания"}
}

SPEED_ORDER = {"fast": 0, "medium": 1, "slow": 2}


@router.get("/")
async def list_models():
    """Возвращает модели установленные в Ollama, отсортированные по скорости."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.OLLAMA_URL}/api/tags")
            response.raise_for_status()
            data = response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Ollama недоступна: {e}")

    result = []
    for m in data.get("models", []):
        name = m["name"]
        meta = MODEL_META.get(name, {
            "label": name.split(":")[0].replace("-", " ").title(),
            "speed": "medium",
            "note": "",
        })
        result.append({
            "name": name,
            "label": meta["label"],
            "speed": meta["speed"],
            "note": meta["note"],
            "size_gb": round(m.get("size", 0) / 1e9, 1),
        })

    result.sort(key=lambda x: (SPEED_ORDER.get(x["speed"], 1), x["size_gb"]))
    return result