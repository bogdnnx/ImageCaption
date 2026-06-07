import hashlib

def compute_image_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def cache_key(image_hash: str, prompt: str, model_name: str) -> str:
    # промт нормализуем, чтобы пробелы/регистр не плодили промахи
    norm_prompt = " ".join(prompt.lower().split())
    raw = f"{image_hash}|{norm_prompt}|{model_name}"
    return hashlib.sha256(raw.encode()).hexdigest()