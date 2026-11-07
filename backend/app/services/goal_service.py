from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.integrations.nessie_client import NessieClient
from app.models.financial import ZERO
from app.models.goals import GoalRow
from app.schemas.goals import Goal, GoalInput
from app.services.financial_aggregator import customer_accounts, customer_summary
from app.services.projection_engine import ScenarioInputError


class GoalConflict(ValueError):
    pass


def list_goals(db: Session, customer_id: str) -> list[Goal]:
    statement = select(GoalRow).where(GoalRow.customer_id == customer_id).order_by(GoalRow.priority, GoalRow.id)
    return [Goal.model_validate(row) for row in db.scalars(statement)]


async def validate_funding(client: NessieClient, customer_id: str, goal: GoalInput) -> None:
    if not goal.funding_account_id:
        await customer_summary(client, customer_id)
        return
    accounts = await customer_accounts(client, customer_id)
    account = next((account for account in accounts if account.id == goal.funding_account_id and account.liquid), None)
    if account is None:
        raise ScenarioInputError("funding_account_id must be an owned checking or savings account.")
    if account.balance is None:
        raise ScenarioInputError("Nessie does not provide the funding account balance.")
    if goal.initial_funded_amount is not None and goal.initial_funded_amount > max(ZERO, account.balance):
        raise ScenarioInputError("initial_funded_amount exceeds the Nessie funding account balance.")


def save_goal(db: Session, customer_id: str, data: GoalInput, row: GoalRow | None = None) -> Goal:
    fields = data.model_dump()
    for key in ("target_amount", "monthly_contribution", "initial_funded_amount"):
        if fields[key] is not None:
            fields[key] = str(fields[key])
    if row is None:
        row = GoalRow(customer_id=customer_id, **fields)
        db.add(row)
    else:
        for key, value in fields.items():
            setattr(row, key, value)
    try:
        db.commit()
    except (IntegrityError, StaleDataError) as error:
        db.rollback()
        message = "The funding account is already allocated to another goal." if isinstance(error, IntegrityError) else (
            "The goal was updated by another request. Reload it and retry."
        )
        raise GoalConflict(message) from None
    return Goal.model_validate(row)
