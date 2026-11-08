from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.integrations.nessie_client import NessieClient
from app.models.financial import ZERO
from app.models.goals import GoalRow, GoalContextRow, GoalContributionRow
from app.schemas.goals import Goal, GoalInput, ContributionCreate
from app.services.financial_aggregator import customer_accounts, customer_summary
from app.services.projection_engine import ScenarioInputError


class GoalConflict(ValueError):
    pass


def list_goals(db: Session, customer_id: str) -> list[Goal]:
    statement = select(GoalRow).where(GoalRow.customer_id == customer_id).order_by(GoalRow.priority, GoalRow.id)
    return [goal_record(db, row) for row in db.scalars(statement)]


def goal_record(db: Session, row: GoalRow) -> Goal:
    with db.no_autoflush:
        context = db.get(GoalContextRow, row.id)
    return Goal.model_validate(row).model_copy(update={"news_context": context.news_context if context else ""})


def owned_goal(db: Session, goal_id: str, customer_id: str) -> GoalRow:
    row = db.get(GoalRow, goal_id)
    if row is None or row.customer_id != customer_id:
        raise HTTPException(404, "Goal not found for this customer")
    return row


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


def save_goal(db: Session, customer_id: str, data: GoalInput, row: GoalRow | None = None,
              opening_source: str = "Opening balance") -> Goal:
    fields = data.model_dump()
    news_context = fields.pop("news_context")
    for key in ("target_amount", "monthly_contribution", "initial_funded_amount"):
        if fields[key] is not None:
            fields[key] = str(fields[key])
    if row is None:
        row = GoalRow(id=str(uuid4()), customer_id=customer_id, **fields)
        db.add(row)
        if not row.funding_account_id and data.initial_funded_amount:
            db.add(GoalContributionRow(id=str(uuid4()), goal_id=row.id, source=opening_source,
                                      amount=str(data.initial_funded_amount), contributed_on=date.today()))
    else:
        for key, value in fields.items():
            setattr(row, key, value)
    with db.no_autoflush:
        context = db.get(GoalContextRow, row.id)
    if context:
        context.news_context = news_context
    else:
        db.add(GoalContextRow(goal_id=row.id, news_context=news_context))
    try:
        db.commit()
    except (IntegrityError, StaleDataError) as error:
        db.rollback()
        message = "The funding account is already allocated to another goal." if isinstance(error, IntegrityError) else (
            "The goal was updated by another request. Reload it and retry."
        )
        raise GoalConflict(message) from None
    return goal_record(db, row)


def add_contribution(db: Session, row: GoalRow, data: ContributionCreate) -> Goal:
    if row.funding_account_id:
        raise HTTPException(422, "Linked goals use the live account balance. Record deposits through your bank.")
    previous = db.get(GoalContributionRow, str(data.request_id))
    if previous:
        if (previous.goal_id, previous.source, Decimal(previous.amount), previous.contributed_on) != (
            row.id, data.source, data.amount, data.contributed_on
        ):
            raise GoalConflict("This contribution request ID was already used with different values.")
        return goal_record(db, row)
    total = Decimal(row.initial_funded_amount or "0") + data.amount
    if total > Decimal("1000000000000"):
        raise HTTPException(422, "The funded amount exceeds the supported limit.")
    row.initial_funded_amount = str(total)
    db.add(GoalContributionRow(id=str(data.request_id), goal_id=row.id, source=data.source,
                              amount=str(data.amount), contributed_on=data.contributed_on))
    try:
        db.commit()
    except (IntegrityError, StaleDataError):
        db.rollback()
        raise GoalConflict("The goal changed. Reload it and retry the same contribution.") from None
    return goal_record(db, row)
