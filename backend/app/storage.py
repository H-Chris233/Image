from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile

from .settings import Settings


DATA_URL_RE = re.compile(r"^data:image/(?P<kind>png|jpeg|jpg|webp);base64,(?P<data>.+)$", re.I | re.S)

# 与前端 ACCEPTED_TYPES 对齐：CreateFlowWizard.tsx 只接受这三种。
ALLOWED_UPLOAD_CONTENT_TYPES = frozenset({"image/png", "image/jpeg", "image/webp"})


def _looks_like_supported_image(data: bytes) -> bool:
    """通过 magic bytes 判断是否为受支持的图像格式。客户端 content-type 可伪造，
    这是权威的内容判断；避免把 .exe 之流伪装成 .png 落盘。"""
    if len(data) < 12:
        return False
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    # JPEG: FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        return True
    # WEBP: "RIFF" + 4 字节大小 + "WEBP"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    return False


async def save_upload(settings: Settings, upload: UploadFile) -> dict[str, str]:
    # Content-type 初筛（客户端可伪造，但能挡掉明显错误的请求）。
    content_type_raw = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if content_type_raw and content_type_raw not in ALLOWED_UPLOAD_CONTENT_TYPES:
        # 回显前清洗换行/控制符并截断，防日志注入。
        safe_ct = (upload.content_type or "")[:80].replace("\n", " ").replace("\r", " ")
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported upload content type: {safe_ct}",
        )

    # 分块读 + 字节上限：避免一次性 await upload.read() 把超大文件全量装内存（DoS 面）。
    # 防御性 clamp：env 误配(负数/0/超大)不会让服务在边界态崩溃；上限 100MiB 是合理硬顶。
    max_bytes = max(1, min(settings.max_upload_bytes, 100 * 1024 * 1024))
    chunk_size = 64 * 1024
    buffer = bytearray()
    while True:
        chunk = await upload.read(chunk_size)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Upload exceeds maximum size of {max_bytes} bytes",
            )

    # Magic bytes 权威校验：拒绝伪装成 .png 的任意二进制 / 非白名单格式。
    content = bytes(buffer)
    if not _looks_like_supported_image(content):
        raise HTTPException(
            status_code=415,
            detail="Uploaded file is not a recognized PNG/JPEG/WEBP image",
        )

    suffix = _suffix_from_name(upload.filename, ".png")
    filename = f"{uuid4().hex}{suffix}"
    path = settings.uploads_dir / filename
    path.write_bytes(content)
    return {
        "path": str(path),
        "url": f"/storage/uploads/{filename}",
        "filename": upload.filename or filename,
        "content_type": upload.content_type or "application/octet-stream",
    }


def load_stored_image_as_upload(path_value: str, url_value: str | None = None) -> dict[str, str]:
    path = Path(path_value)
    filename = path.name
    return {
        "path": str(path),
        "url": url_value or "",
        "filename": filename,
        "content_type": _content_type_from_suffix(path.suffix),
    }


async def save_provider_image(settings: Settings, history_id: str, item: dict[str, Any]) -> dict[str, str | None]:
    b64_json = item.get("b64_json")
    if isinstance(b64_json, str) and b64_json.strip():
        extension, raw = _decode_base64_payload(b64_json)
        filename = f"{history_id}{extension}"
        path = settings.images_dir / filename
        path.write_bytes(raw)
        return {"path": str(path), "url": f"/storage/images/{filename}", "source_url": None}

    image_url = item.get("url")
    if isinstance(image_url, str) and image_url.strip():
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            response = await client.get(image_url)
            response.raise_for_status()
        extension = _suffix_from_content_type(response.headers.get("content-type")) or _suffix_from_name(image_url, ".png")
        filename = f"{history_id}{extension}"
        path = settings.images_dir / filename
        path.write_bytes(response.content)
        return {"path": str(path), "url": f"/storage/images/{filename}", "source_url": image_url}

    raise ValueError("Provider response did not contain b64_json or url")


async def cache_remote_image(settings: Settings, image_url: str, client: httpx.AsyncClient) -> dict[str, str] | None:
    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"}:
        return None

    settings.inspirations_dir.mkdir(parents=True, exist_ok=True)
    image_hash = hashlib.sha256(image_url.encode("utf-8")).hexdigest()[:32]
    for suffix in (".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"):
        path = settings.inspirations_dir / f"{image_hash}{suffix}"
        if path.exists() and path.stat().st_size > 0:
            return {"path": str(path), "url": f"/storage/inspirations/{path.name}", "source_url": image_url}

    response = await client.get(
        image_url,
        headers={
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "User-Agent": "aethergenix-image/1.0",
        },
    )
    response.raise_for_status()
    content_type = response.headers.get("content-type")
    normalized_type = content_type.split(";", 1)[0].strip().lower() if content_type else ""
    if normalized_type and not normalized_type.startswith("image/"):
        raise ValueError(f"Remote resource is not an image: {normalized_type}")

    extension = _suffix_from_content_type(content_type) or _suffix_from_name(image_url, ".jpg")
    filename = f"{image_hash}{extension}"
    path = settings.inspirations_dir / filename
    path.write_bytes(response.content)
    return {"path": str(path), "url": f"/storage/inspirations/{filename}", "source_url": image_url}


def _decode_base64_payload(value: str) -> tuple[str, bytes]:
    stripped = value.strip()
    match = DATA_URL_RE.match(stripped)
    if match:
        kind = match.group("kind").lower()
        extension = ".jpg" if kind == "jpeg" else f".{kind}"
        stripped = match.group("data").strip()
    else:
        extension = ".png"
    return extension, base64.b64decode(stripped)


def _suffix_from_content_type(content_type: str | None) -> str | None:
    if not content_type:
        return None
    normalized = content_type.split(";", 1)[0].strip().lower()
    return {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/avif": ".avif",
        "image/gif": ".gif",
    }.get(normalized)


def _suffix_from_name(name: str | None, default: str) -> str:
    if not name:
        return default
    suffix = Path(name.split("?", 1)[0]).suffix.lower()
    return suffix if suffix in {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"} else default


def _content_type_from_suffix(suffix: str) -> str:
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".gif": "image/gif",
    }.get(suffix.lower(), "application/octet-stream")
