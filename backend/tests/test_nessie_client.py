import asyncio

import httpx
import pytest

from app.config import Settings
from app.integrations.nessie_client import NessieClient, NessieError


def test_retries_rate_limit_without_disclosing_key():
    count = 0

    def handler(request):
        nonlocal count
        count += 1
        assert request.url.params["key"] == "secret"
        if count == 1:
            return httpx.Response(429, headers={"Retry-After": "0"})
        return httpx.Response(200, json={"_id": "one"})

    async def run():
        client = NessieClient(Settings(nessie_api_key="secret"), httpx.MockTransport(handler))
        try:
            assert (await client.customer("one")).id == "one"
            assert count == 2
            with pytest.raises(NessieError, match="Supply a customer ID"):
                await client.customer()
        finally:
            await client.close()

    asyncio.run(run())


@pytest.mark.parametrize(("response", "code"), [
    (httpx.Response(200, json={"error": "secret"}), "nessie_invalid_response"),
    (httpx.Response(200, text="<html>secret</html>"), "nessie_invalid_response"),
    (httpx.Response(429, headers={"Retry-After": "600"}), "nessie_rate_limited"),
    (httpx.Response(403, text="secret"), "nessie_access_denied"),
])
def test_invalid_responses(response, code):
    async def run():
        client = NessieClient(Settings(nessie_api_key="secret"), httpx.MockTransport(lambda _: response))
        try:
            with pytest.raises(NessieError) as info:
                await client.customer("one")
            assert info.value.code == code
            assert "secret" not in str(info.value)
        finally:
            await client.close()

    asyncio.run(run())
