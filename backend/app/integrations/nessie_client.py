import asyncio
import json
import re
from datetime import datetime, timezone
from decimal import Decimal
from email.utils import parsedate_to_datetime

import httpx
from pydantic import BaseModel, TypeAdapter, ValidationError

from app.config import Settings
from app.schemas.nessie import (
    AccountRecord, BillRecord, CustomerRecord, LoanRecord, MerchantRecord, TransactionRecord,
)


class NessieError(Exception):
    def __init__(self, code: str, message: str, status: int, upstream_status: int | None = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.upstream_status = upstream_status


def safe_id(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", value):
        raise NessieError("invalid_id", "A valid Nessie resource ID is required.", 422)
    return value


def retry_delay(header: str | None, attempt: int) -> float:
    if header:
        try:
            return max(0, int(header))
        except ValueError:
            try:
                return max(0, (parsedate_to_datetime(header) - datetime.now(timezone.utc)).total_seconds())
            except (TypeError, ValueError, OverflowError):
                pass
    return 0.25 * 2**attempt


class NessieClient:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.nessie_base_url.rstrip("/") + "/",
            transport=transport,
            timeout=8,
            follow_redirects=False,
            limits=httpx.Limits(max_connections=12, max_keepalive_connections=8),
        )
        self._slots = asyncio.Semaphore(8)

    async def close(self) -> None:
        await self._client.aclose()

    def customer_id(self, value: str | None = None) -> str:
        if not (customer := value or self.settings.nessie_customer_id):
            raise NessieError("missing_customer", "Supply a customer ID or set NESSIE_CUSTOMER_ID.", 422)
        return safe_id(customer)

    async def _get(self, path: str):
        if not self.settings.nessie_api_key:
            raise NessieError("nessie_not_configured", "Set NESSIE_API_KEY to use Nessie.", 503)
        for attempt in range(3):
            delay = 0.25 * 2**attempt
            try:
                async with self._slots:
                    response = await self._client.get(path, params={"key": self.settings.nessie_api_key})
            except httpx.TimeoutException:
                error = NessieError("nessie_timeout", "Nessie did not respond in time.", 504)
            except httpx.RequestError:
                error = NessieError("nessie_network_error", "Could not connect to Nessie.", 503)
            else:
                status = response.status_code
                if response.is_success:
                    try:
                        return json.loads(response.content, parse_float=Decimal)
                    except (ValueError, UnicodeError):
                        raise NessieError("nessie_invalid_response", f"Invalid JSON from Nessie at {path}.", 502) from None
                if status == 429:
                    delay = retry_delay(response.headers.get("Retry-After"), attempt)
                    error = NessieError("nessie_rate_limited", "Nessie rate limit reached. Try again later.", 503, status)
                elif status in (401, 403):
                    raise NessieError("nessie_access_denied", "Check the Nessie key and resource access.", 502, status)
                elif status in (408, 500, 502, 503, 504):
                    error = NessieError("nessie_unavailable", f"Nessie returned HTTP {status} at {path}.", 503, status)
                else:
                    raise NessieError(
                        "nessie_not_found" if status == 404 else "nessie_http_error",
                        f"Nessie returned HTTP {status} at {path}.", 404 if status == 404 else 502, status,
                    )
            if attempt == 2 or delay > 3:
                raise error from None
            await asyncio.sleep(delay)

    async def _read(self, path: str, model: type[BaseModel], *, many: bool = False):
        # These banking collections are documented as arrays without page parameters.
        payload = await self._get(path)
        try:
            if many:
                return TypeAdapter(list[model]).validate_python(payload)
            return model.model_validate(payload)
        except ValidationError:
            raise NessieError("nessie_invalid_response", f"Unexpected Nessie response at {path}.", 502) from None

    async def customers(self) -> list[CustomerRecord]:
        return await self._read("customers", CustomerRecord, many=True)

    async def customer(self, customer_id: str | None = None) -> CustomerRecord:
        return await self._read(f"customers/{self.customer_id(customer_id)}", CustomerRecord)

    async def accounts(self, customer_id: str | None = None) -> list[AccountRecord]:
        return await self._read(f"customers/{self.customer_id(customer_id)}/accounts", AccountRecord, many=True)

    async def account(self, account_id: str) -> AccountRecord:
        return await self._read(f"accounts/{safe_id(account_id)}", AccountRecord)

    async def deposits(self, account_id: str) -> list[TransactionRecord]:
        return await self._read(f"accounts/{safe_id(account_id)}/deposits", TransactionRecord, many=True)

    async def create_demo_record(self, path: str, payload: dict) -> None:
        if not self.settings.nessie_api_key:
            raise NessieError("nessie_not_configured", "Set NESSIE_API_KEY to use Nessie.", 503)
        try:
            response = await self._client.post(path, params={"key": self.settings.nessie_api_key}, json=payload)
        except httpx.RequestError:
            raise NessieError("nessie_network_error", "Could not confirm the Nessie write. Check existing records before retrying.", 503) from None
        if not response.is_success:
            raise NessieError("nessie_write_failed", f"Nessie rejected the demo record (HTTP {response.status_code}).", 502, response.status_code)

    async def withdrawals(self, account_id: str) -> list[TransactionRecord]:
        return await self._read(f"accounts/{safe_id(account_id)}/withdrawals", TransactionRecord, many=True)

    async def purchases(self, account_id: str) -> list[TransactionRecord]:
        return await self._read(f"accounts/{safe_id(account_id)}/purchases", TransactionRecord, many=True)

    async def transfers(self, account_id: str) -> list[TransactionRecord]:
        return await self._read(f"accounts/{safe_id(account_id)}/transfers", TransactionRecord, many=True)

    async def bills(self, account_id: str) -> list[BillRecord]:
        return await self._read(f"accounts/{safe_id(account_id)}/bills", BillRecord, many=True)

    async def loans(self, account_id: str) -> list[LoanRecord]:
        return await self._read(f"accounts/{safe_id(account_id)}/loans", LoanRecord, many=True)

    async def merchant(self, merchant_id: str) -> MerchantRecord:
        return await self._read(f"merchants/{safe_id(merchant_id)}", MerchantRecord)
