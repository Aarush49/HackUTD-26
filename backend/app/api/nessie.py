from fastapi import APIRouter

from app.api.dependencies import Nessie

router = APIRouter(tags=["Nessie"])


@router.get("/nessie/status")
async def status(client: Nessie):
    configured = bool(client.settings.nessie_api_key)
    return {
        "configured": configured,
        "default_customer_configured": bool(client.settings.nessie_customer_id),
        "read_only": True,
        "reachable": (await _check(client)) if configured else None,
    }


async def _check(client: Nessie) -> bool:
    if client.settings.nessie_customer_id:
        await client.customer()
    else:
        await client.customers()
    return True
