from app.integrations.nessie_client import NessieClient, NessieError

ACCOUNT_NICKNAME = "Canopy demo inputs (metadata only)"
RECORD_PREFIX = "canopy:demo:v1:"


async def demo_account(client: NessieClient, customer_id: str) -> str | None:
    accounts = await client.accounts(customer_id)
    matches = [account for account in accounts if account.nickname == ACCOUNT_NICKNAME]
    if not matches:
        return None
    if len(matches) != 1 or matches[0].customer_id not in {None, customer_id}:
        raise NessieError("nessie_invalid_response", "Unexpected Canopy demo account.", 502)
    return matches[0].id


async def demo_records(client: NessieClient, account_id: str) -> dict[str, str]:
    records = {}
    for deposit in await client.deposits(account_id):
        description = deposit.description or ""
        if deposit.amount == 0 and description.startswith(RECORD_PREFIX):
            name, separator, payload = description[len(RECORD_PREFIX):].partition(":")
            if separator and name not in records:
                records[name] = payload
    return records
