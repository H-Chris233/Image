from __future__ import annotations

import hashlib
import logging
from typing import Any

import httpx

from .branding import UPSTREAM_SERVICE_LABEL
from .provider import ProviderError, _friendly_upstream_error, _looks_like_html

logger = logging.getLogger(__name__)


class Sub2APIAuthClient:
    def __init__(self, timeout_seconds: float = 60):
        self.timeout = httpx.Timeout(timeout_seconds, connect=20)

    async def public_settings(self, base_url: str) -> dict[str, Any]:
        return await self._request(base_url, "GET", "/api/v1/settings/public")

    async def send_verify_code(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request(base_url, "POST", "/api/v1/auth/send-verify-code", json=payload)

    async def register(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request(base_url, "POST", "/api/v1/auth/register", json=payload)

    async def login(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request(base_url, "POST", "/api/v1/auth/login", json=payload)

    async def login_2fa(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._request(base_url, "POST", "/api/v1/auth/login/2fa", json=payload)

    async def list_keys(self, base_url: str, access_token: str) -> list[dict[str, Any]]:
        data = await self._request(
            base_url,
            "GET",
            "/api/v1/keys?page=1&page_size=100&sort_by=created_at&sort_order=desc",
            access_token=access_token,
        )
        if isinstance(data, dict):
            items = data.get("items")
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]
        return []

    async def list_available_groups(self, base_url: str, access_token: str) -> list[dict[str, Any]]:
        data = await self._request(
            base_url,
            "GET",
            "/api/v1/groups/available",
            access_token=access_token,
        )
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        return []

    async def create_key(self, base_url: str, access_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "POST",
            "/api/v1/keys",
            json=payload,
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的 API Key 数据格式不正确", data)
        return data

    async def list_usage(self, base_url: str, access_token: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        data = await self._request(
            base_url,
            "GET",
            "/api/v1/usage",
            params=params or {},
            access_token=access_token,
        )
        if isinstance(data, dict):
            items = data.get("items")
            if isinstance(items, list):
                return [item for item in items if isinstance(item, dict)]
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        return []

    async def payment_checkout_info(self, base_url: str, access_token: str) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "GET",
            "/api/v1/payment/checkout-info",
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的支付配置数据格式不正确", data)
        return data

    async def payment_create_order(self, base_url: str, access_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "POST",
            "/api/v1/payment/orders",
            json=payload,
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的支付订单数据格式不正确", data)
        return data

    async def payment_list_orders(self, base_url: str, access_token: str, params: dict[str, Any]) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "GET",
            "/api/v1/payment/orders/my",
            params=params,
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的支付订单列表格式不正确", data)
        return data

    async def payment_get_order(self, base_url: str, access_token: str, order_id: int) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "GET",
            f"/api/v1/payment/orders/{order_id}",
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的支付订单详情格式不正确", data)
        return data

    async def payment_cancel_order(self, base_url: str, access_token: str, order_id: int) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "POST",
            f"/api/v1/payment/orders/{order_id}/cancel",
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的取消订单数据格式不正确", data)
        return data

    async def payment_verify_order(self, base_url: str, access_token: str, out_trade_no: str) -> dict[str, Any]:
        data = await self._request(
            base_url,
            "POST",
            "/api/v1/payment/orders/verify",
            json={"out_trade_no": out_trade_no},
            access_token=access_token,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的支付验证数据格式不正确", data)
        return data

    async def admin_update_user_balance(
        self,
        base_url: str,
        admin_token: str,
        user_id: int,
        payload: dict[str, Any],
        *,
        token_type: str = "api_key",
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {"json": payload}
        if token_type == "jwt":
            kwargs["access_token"] = admin_token
        else:
            kwargs["headers"] = {"x-api-key": admin_token}
        data = await self._request(
            base_url,
            "POST",
            f"/api/v1/admin/users/{user_id}/balance",
            **kwargs,
        )
        if not isinstance(data, dict):
            raise ProviderError(502, f"{UPSTREAM_SERVICE_LABEL} 返回的用户余额数据格式不正确", data)
        return data

    async def _request(
        self,
        base_url: str,
        method: str,
        path: str,
        *,
        access_token: str | None = None,
        **kwargs: Any,
    ) -> Any:
        url = _join_base(base_url, path)
        headers = kwargs.pop("headers", {})
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.request(method, url, headers=headers, **kwargs)

        payload = _safe_json(response)
        if response.status_code >= 400:
            raise ProviderError(response.status_code, _extract_error_message(payload, response), payload)

        if isinstance(payload, dict) and payload.get("code") not in (None, 0):
            raise ProviderError(response.status_code, _extract_error_message(payload, response), payload)

        if isinstance(payload, dict) and "data" in payload:
            return payload["data"]
        return payload


class MockAuthClient(Sub2APIAuthClient):
    def __init__(self, mock_base_url: str = "mock://sub2api", timeout_seconds: float = 60):
        super().__init__(timeout_seconds)
        self.mock_base_url = mock_base_url.strip() or "mock://sub2api"
        self._keys_by_access_token: dict[str, str] = {}

    async def public_settings(self, base_url: str) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] public settings returned without contacting sub2api")
        return {
            "registration_enabled": True,
            "email_verify_enabled": False,
            "backend_mode_enabled": False,
            "site_name": "AetherGenix Dev Mock",
            "turnstile_enabled": False,
        }

    async def send_verify_code(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        email = _mock_email(payload)
        logger.warning("[DEV-MOCK] verify code bypassed for %s", email or "unknown")
        return {"message": "dev mock verification bypassed", "countdown": 0}

    async def register(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        email = _mock_email(payload)
        logger.warning("[DEV-MOCK] register bypassed for %s", email)
        return self._auth_result(email)

    async def login(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        email = _mock_email(payload)
        logger.warning("[DEV-MOCK] login bypassed for %s", email)
        return self._auth_result(email)

    async def login_2fa(self, base_url: str, payload: dict[str, Any]) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] 2FA bypassed")
        return self._auth_result("mock-2fa@example.com")

    async def list_keys(self, base_url: str, access_token: str) -> list[dict[str, Any]]:
        logger.warning("[DEV-MOCK] key list returned without contacting sub2api")
        key = self._keys_by_access_token.get(access_token) or "mock-key-for-dev@example.com"
        return [{"id": "mock-managed-key", "key": key, "name": "AetherGenix dev mock key", "status": "active"}]

    async def list_available_groups(self, base_url: str, access_token: str) -> list[dict[str, Any]]:
        logger.warning("[DEV-MOCK] available groups returned without contacting sub2api")
        return [{"id": 1, "name": "dev-mock-openai", "platform": "openai", "status": "active"}]

    async def create_key(self, base_url: str, access_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] key creation bypassed for %s", payload.get("name") or "unnamed key")
        key = self._keys_by_access_token.get(access_token) or "mock-key-for-dev@example.com"
        return {"id": "mock-managed-key", "key": key, "name": payload.get("name") or "dev mock key", "status": "active"}

    async def list_usage(self, base_url: str, access_token: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        logger.warning("[DEV-MOCK] usage list returned empty; mock mode charges 0 credits")
        return []

    async def payment_checkout_info(self, base_url: str, access_token: str) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] payment checkout info returned without contacting sub2api")
        return {"methods": {}, "plans": [], "balance_disabled": True, "help_text": "dev mock mode", "help_image_url": ""}

    async def payment_create_order(self, base_url: str, access_token: str, payload: dict[str, Any]) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] payment order creation bypassed")
        return {"order_id": "mock-order", "status": "COMPLETED", "amount": payload.get("amount", 0), "payment_type": payload.get("payment_type")}

    async def payment_list_orders(self, base_url: str, access_token: str, params: dict[str, Any]) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] payment order list returned empty")
        return {"items": [], "total": 0, "page": params.get("page", 1), "page_size": params.get("page_size", 20)}

    async def payment_get_order(self, base_url: str, access_token: str, order_id: int) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] payment order detail returned for %s", order_id)
        return {"id": order_id, "status": "COMPLETED", "amount": 0, "payment_type": "mock"}

    async def payment_cancel_order(self, base_url: str, access_token: str, order_id: int) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] payment order cancel bypassed for %s", order_id)
        return {"message": "mock order cancelled"}

    async def payment_verify_order(self, base_url: str, access_token: str, out_trade_no: str) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] payment order verify bypassed for %s", out_trade_no)
        return {"id": "mock-order", "status": "COMPLETED", "out_trade_no": out_trade_no, "amount": 0, "payment_type": "mock"}

    async def admin_update_user_balance(
        self,
        base_url: str,
        admin_token: str,
        user_id: int,
        payload: dict[str, Any],
        *,
        token_type: str = "api_key",
    ) -> dict[str, Any]:
        logger.warning("[DEV-MOCK] admin balance update bypassed for user %s", user_id)
        return {"id": user_id, "balance": payload.get("balance", 0)}

    def _auth_result(self, email: str) -> dict[str, Any]:
        normalized = email.strip().lower() or "dev@example.com"
        digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        user_id = int(digest[:12], 16) % 2_000_000_000
        owner_id = f"mock:{digest[:16]}"
        managed_api_key = f"mock-key-for-{normalized}"
        access_token = f"mock-access-{digest[:24]}"
        self._keys_by_access_token[access_token] = managed_api_key
        return {
            "access_token": access_token,
            "refresh_token": f"mock-refresh-{digest[24:48]}",
            "token_type": "Bearer",
            "owner_id": owner_id,
            "managed_api_key": managed_api_key,
            "provider_base_url": self.mock_base_url,
            "user": {
                "id": user_id,
                "email": normalized,
                "username": normalized.split("@", 1)[0],
                "role": "admin",
            },
        }


def _mock_email(payload: dict[str, Any]) -> str:
    return str(payload.get("email") or "dev@example.com").strip().lower()


def _join_base(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text[:1000]


def _extract_error_message(payload: Any, response: httpx.Response) -> str:
    if isinstance(payload, dict):
        if payload.get("message"):
            return str(payload["message"])
        if payload.get("reason"):
            return str(payload["reason"])
        error = payload.get("error")
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])
        if error:
            return str(error)
    text = response.text or ""
    if _looks_like_html(response, text):
        return _friendly_upstream_error(response, text)
    return text[:1000] or f"{UPSTREAM_SERVICE_LABEL} 返回 HTTP {response.status_code}"
