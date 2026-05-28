from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import httpx

from .branding import UPSTREAM_SERVICE_LABEL

logger = logging.getLogger(__name__)
MOCK_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="


class ProviderError(Exception):
    def __init__(self, status_code: int, message: str, payload: Any | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.payload = payload


class OpenAICompatibleImageClient:
    def __init__(
        self,
        timeout_seconds: float = 300,
        *,
        dev_mock_enabled: bool = False,
        dev_mock_base_url: str = "mock://sub2api",
    ):
        self.timeout = httpx.Timeout(timeout_seconds, connect=20)
        self.dev_mock_enabled = dev_mock_enabled
        self.dev_mock_base_url = dev_mock_base_url.strip() or "mock://sub2api"

    async def test_connection(self, config: dict[str, Any]) -> dict[str, Any]:
        if self.dev_mock_enabled:
            logger.warning("[DEV-MOCK] provider connection test bypassed")
            return {"ok": True, "models": ["gpt-image-2", "gpt-5.5"], "raw": {"mock": True}}
        response = await self._request(config, "GET", "/models")
        data = response.json()
        models = [item.get("id") for item in data.get("data", []) if isinstance(item, dict)]
        return {"ok": True, "models": models[:30], "raw": data}

    async def usage(self, config: dict[str, Any]) -> dict[str, Any]:
        if self.dev_mock_enabled:
            logger.warning("[DEV-MOCK] provider usage returned fixed demo balance")
            return {"ok": True, "remaining": 999999.0, "raw": {"mock": True, "remaining": 999999.0, "unit": "USD"}}
        usage_path = config.get("usage_path") or "/v1/usage"
        response = await self._request(config, "GET", usage_path, absolute_path=True)
        data = response.json()
        return {"ok": True, "remaining": _extract_remaining(data), "raw": data}

    async def generate_image(self, config: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        if self.dev_mock_enabled:
            return _mock_image_response("generate_image", payload)
        response = await self._request(config, "POST", "/images/generations", json=payload)
        return response.json()

    async def chat_completion(self, config: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        if self.dev_mock_enabled:
            return _mock_chat_completion(payload)
        response = await self._request(config, "POST", "/chat/completions", json=payload)
        return response.json()

    async def edit_image(
        self,
        config: dict[str, Any],
        fields: dict[str, Any],
        images: list[tuple[str, bytes, str]],
        mask: tuple[str, bytes, str] | None = None,
    ) -> dict[str, Any]:
        if self.dev_mock_enabled:
            return _mock_image_response("edit_image", fields)
        files: list[tuple[str, tuple[str, bytes, str]]] = [
            ("image", (filename, content, content_type)) for filename, content, content_type in images
        ]
        if mask is not None:
            files.append(("mask", mask))
        response = await self._request(config, "POST", "/images/edits", data=fields, files=files)
        return response.json()

    async def _request(
        self,
        config: dict[str, Any],
        method: str,
        path: str,
        *,
        absolute_path: bool = False,
        **kwargs: Any,
    ) -> httpx.Response:
        api_key = (config.get("api_key") or "").strip()
        if not api_key:
            raise ProviderError(400, "请先在配置页保存访问密钥")

        url = _join_absolute_path(config["base_url"], path) if absolute_path else _join_base(config["base_url"], path)
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {api_key}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.request(method, url, headers=headers, **kwargs)
        except httpx.TimeoutException as exc:
            raise ProviderError(504, f"{UPSTREAM_SERVICE_LABEL} 上游请求超时，请稍后重试或降低批量张数") from exc
        except httpx.RequestError as exc:
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 上游请求失败：{exc.__class__.__name__}") from exc

        if response.status_code >= 400:
            raise ProviderError(response.status_code, _extract_error_message(response), _safe_json(response))
        return response


def _join_base(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _join_absolute_path(base_url: str, path: str) -> str:
    if not path.startswith("/"):
        return _join_base(base_url, path)
    parsed = httpx.URL(base_url)
    return str(parsed.copy_with(path=path, query=None))


def _mock_image_response(kind: str, payload: dict[str, Any]) -> dict[str, Any]:
    prompt = str(payload.get("prompt") or "").strip()
    logger.warning("[DEV-MOCK] %s returned placeholder image for prompt: %s", kind, prompt[:160])
    return {
        "created": int(time.time()),
        "data": [
            {
                "b64_json": MOCK_IMAGE_B64,
                "revised_prompt": f"{prompt} (dev mock placeholder)".strip(),
            }
        ],
        "usage": {"mock": True, "total_tokens": 0},
    }


def _mock_chat_completion(payload: dict[str, Any]) -> dict[str, Any]:
    system_prompt = _message_text(_first_message_by_role(payload, "system"))
    user_prompt = _message_text(_first_message_by_role(payload, "user"))
    if "benchmark 模板召回排序" in system_prompt:
        ids = _candidate_ids_from_user_message(user_prompt)[:3]
        logger.warning("[DEV-MOCK] benchmark rerank returned ids: %s", ids)
        return _mock_chat_response(json.dumps({"ids": ids}, ensure_ascii=False), "chatcmpl-dev-mock-rerank")
    if "detected_smb_categories" in system_prompt:
        logger.warning("[DEV-MOCK] ecommerce analysis returned deterministic mock JSON")
        return _mock_chat_response(
            json.dumps(_mock_ecommerce_analysis(_image_count_from_user_message(user_prompt)), ensure_ascii=False),
            "chatcmpl-dev-mock-ecommerce-analysis",
        )
    if "提示词优化器" in system_prompt or "prompt optimizer" in system_prompt.lower():
        brief = _brief_from_user_message(user_prompt)
        logger.warning("[DEV-MOCK] prompt optimization returned deterministic rewrite")
        return _mock_chat_response(f"{brief} (mock改写)", "chatcmpl-dev-mock-prompt-optimize")
    logger.warning("[DEV-MOCK] generic chat completion returned deterministic response")
    return _mock_chat_response("这是 DEV-MOCK 的占位回复。", "chatcmpl-dev-mock-generic")


def _mock_chat_response(content: str, response_id: str) -> dict[str, Any]:
    return {
        "id": response_id,
        "object": "chat.completion",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
        "usage": {"mock": True, "total_tokens": 0},
    }


def _first_message_by_role(payload: dict[str, Any], role: str) -> Any:
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return None
    for message in messages:
        if isinstance(message, dict) and message.get("role") == role:
            return message
    return None


def _message_text(message: Any) -> str:
    if not isinstance(message, dict):
        return ""
    return _content_text(message.get("content"))


def _content_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                parts.append(_content_text(item.get("text") or item.get("content")))
        return "\n".join(part for part in parts if part)
    return ""


def _candidate_ids_from_user_message(text: str) -> list[str]:
    try:
        payload = json.loads(text[text.index("{") : text.rindex("}") + 1])
    except (ValueError, json.JSONDecodeError):
        return []
    candidates = payload.get("candidates") if isinstance(payload, dict) else None
    if not isinstance(candidates, list):
        return []
    return [str(item.get("id") or "").strip() for item in candidates if isinstance(item, dict) and str(item.get("id") or "").strip()]


def _image_count_from_user_message(text: str) -> int:
    match = re.search(r'"image_count"\s*:\s*(\d+)', text)
    if match:
        return max(1, min(9, int(match.group(1))))
    return 4


def _brief_from_user_message(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return "mock prompt"
    try:
        payload = json.loads(stripped[stripped.index("{") : stripped.rindex("}") + 1])
    except (ValueError, json.JSONDecodeError):
        return stripped[:400]
    for key in ("prompt", "brief", "input"):
        value = payload.get(key) if isinstance(payload, dict) else None
        if isinstance(value, str) and value.strip():
            return value.strip()
    return stripped[:400]


def _mock_ecommerce_analysis(image_count: int) -> dict[str, Any]:
    layouts = ["hero", "scene_lifestyle", "material_closeup", "detail_callout", "spec_table", "comparison", "multi_angle", "social_cover", "conversion"]
    return {
        "product_type": "商品",
        "appearance": "mock 商品主体清晰，适合电商详情页演示",
        "visible_material": "mock 材质",
        "colors": ["mock lime", "charcoal"],
        "shape": "标准商品轮廓",
        "details": ["主体完整", "边缘清晰", "适合多屏详情页"],
        "selling_points": ["高清展示", "风格统一", "可快速出 demo"],
        "target_audience": ["普通电商商家"],
        "use_scenarios": ["跨境电商详情页", "社媒种草", "主图测试"],
        "style_suggestions": ["premium_studio", "clean_white_bg", "lifestyle"],
        "generation_constraints": "DEV-MOCK：保持商品主体、颜色、材质和比例一致，输出仅用于本地演示。",
        "detected_smb_categories": ["domestic_ecommerce"],
        "detected_product_categories": ["home_living"],
        "detected_style_tags": ["premium_studio"],
        "recommended_plans": [
            _mock_recommended_plan("跨境详情页转化方案", "Amazon", "premium_studio", image_count, layouts),
            _mock_recommended_plan("社媒种草内容方案", "小红书", "lifestyle", image_count, layouts),
            _mock_recommended_plan("白底主图测试方案", "独立站", "clean_white_bg", image_count, layouts),
        ],
    }


def _mock_recommended_plan(name: str, platform: str, style: str, image_count: int, layouts: list[str]) -> dict[str, Any]:
    return {
        "name": name,
        "platform": platform,
        "style": style,
        "image_count": image_count,
        "materials": "mock 材质",
        "selling_points": "高清展示、风格统一、快速演示",
        "scenarios": "本地端到端 demo",
        "extra_requirements": "DEV-MOCK 占位内容，不代表真实模型分析。",
        "reason": "用于 sub2api 不可用时的本地演示。",
        "screens": [
            {
                "title": f"Mock 第{index + 1}屏",
                "copy": f"Mock demo copy {index + 1}",
                "layout_type": layouts[index % len(layouts)],
                "visual_goal": "展示稳定的 mock 详情页结构。",
                "copy_density": "medium",
                "needs_model": False,
                "needs_specs": index % 3 == 0,
                "needs_closeup": index % 3 == 1,
                "reference_focus": ["mock 商品主体"],
            }
            for index in range(image_count)
        ],
    }


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text[:1000]


_HTML_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def _looks_like_html(response: httpx.Response, text: str) -> bool:
    content_type = (response.headers.get("content-type") or "").lower()
    if "html" in content_type:
        return True
    head = text.lstrip()[:64].lower()
    return head.startswith(("<!doctype", "<html", "<!--"))


def _friendly_upstream_error(response: httpx.Response, text: str) -> str:
    match = _HTML_TITLE_RE.search(text)
    if match:
        title = re.sub(r"\s+", " ", match.group(1)).strip()
        if title:
            return f"{UPSTREAM_SERVICE_LABEL} 暂时不可用（HTTP {response.status_code} · {title}），请稍后重试。"
    return f"{UPSTREAM_SERVICE_LABEL} 暂时不可用（HTTP {response.status_code}），请稍后重试。"


def _extract_error_message(response: httpx.Response) -> str:
    payload = _safe_json(response)
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])
        if payload.get("message"):
            return str(payload["message"])
        if payload.get("error"):
            return str(payload["error"])
    text = response.text or ""
    if _looks_like_html(response, text):
        return _friendly_upstream_error(response, text)
    return text[:1000] or f"{UPSTREAM_SERVICE_LABEL} 返回 HTTP {response.status_code}"


def _extract_remaining(payload: Any) -> float | None:
    if not isinstance(payload, dict):
        return None
    for key in ("remaining", "balance"):
        value = payload.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    quota = payload.get("quota")
    if isinstance(quota, dict) and isinstance(quota.get("remaining"), (int, float)):
        return float(quota["remaining"])
    return None
