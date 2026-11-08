import asyncio
import os

import pytest

from app.config import Settings
from app.integrations.canopy_demo import ACCOUNT_NICKNAME
from app.integrations.nessie_client import NessieClient
from app.services.financial_aggregator import aggregate


def test_live_nessie_customer():
    if os.getenv("RUN_LIVE_NESSIE") != "1":
        pytest.skip("Set RUN_LIVE_NESSIE=1 to enable the read-only live test.")
    settings = Settings.from_env()
    if not settings.nessie_api_key or not settings.nessie_customer_id:
        pytest.skip("Live test requires NESSIE_API_KEY and NESSIE_CUSTOMER_ID.")

    async def run():
        client = NessieClient(settings)
        try:
            profile = await aggregate(client)
            assert profile.customer.id == settings.nessie_customer_id
            listed = await client.accounts()
            assert {account.id for account in profile.accounts} == {
                account.id for account in listed if account.nickname != ACCOUNT_NICKNAME
            }
        finally:
            await client.close()

    asyncio.run(run())
