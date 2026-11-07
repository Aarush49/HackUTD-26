from fastapi import APIRouter

from app.api.dependencies import Nessie
from app.schemas.simulation import TransferRequest
from app.services.financial_aggregator import customer_accounts
from app.services.projection_engine import ScenarioInputError

router = APIRouter(tags=["Transfers"])


@router.post("/transfers/simulate")
async def transfer(request: TransferRequest, client: Nessie) -> dict:
    if request.from_account_id == request.to_account_id:
        raise ScenarioInputError("Specify two distinct owned accounts.")
    accounts = {account.id: account for account in await customer_accounts(client, client.customer_id(request.customer_id))}
    sender = accounts.get(request.from_account_id)
    recipient = accounts.get(request.to_account_id)
    if not sender or not recipient or not sender.liquid or not recipient.liquid:
        raise ScenarioInputError("Both accounts must be owned checking or savings accounts.")
    if sender.balance is None or recipient.balance is None:
        raise ScenarioInputError("Nessie must provide balances for both accounts.")
    if sender.balance < request.amount:
        raise ScenarioInputError("The sending account has insufficient funds.")
    return {
        "simulated": True, "source": "nessie", "amount": request.amount,
        "opening_balances": {sender.id: sender.balance, recipient.id: recipient.balance},
        "resulting_balances": {sender.id: sender.balance - request.amount, recipient.id: recipient.balance + request.amount},
    }
