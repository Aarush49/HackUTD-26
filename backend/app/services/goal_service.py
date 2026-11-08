from uuid import uuid4
from pymongo.errors import DuplicateKeyError

from app.integrations.nessie_client import NessieClient
from app.models.financial import ZERO
from app.models.goals import GoalRow
from app.schemas.goals import Goal, GoalInput
from app.services.financial_aggregator import customer_accounts, customer_summary
from app.services.projection_engine import ScenarioInputError


class GoalConflict(ValueError):
    pass


def _doc_to_goal(doc: dict) -> Goal:
    data = dict(doc)
    data["id"] = data.get("id") or str(data.get("_id"))
    data.pop("_id", None)
    data.pop("version", None)
    return Goal.model_validate(data)


def list_goals(db, customer_id: str) -> list[Goal]:
    cursor = db["goals"].find({"customer_id": customer_id}).sort([("priority", 1), ("id", 1)])
    return [_doc_to_goal(doc) for doc in cursor]


def get_goal(db, goal_id: str) -> Goal | None:
    doc = db["goals"].find_one({"id": goal_id}) or db["goals"].find_one({"_id": goal_id})
    if doc is None:
        return None
    return _doc_to_goal(doc)


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


def save_goal(db, customer_id: str, data: GoalInput, row=None, goal_id: str | None = None) -> Goal:
    fields = data.model_dump()
    for key in ("target_amount", "monthly_contribution", "initial_funded_amount"):
        if fields[key] is not None:
            fields[key] = str(fields[key])
    if fields.get("target_date") is not None:
        fields["target_date"] = str(fields["target_date"])

    target_id = goal_id
    if target_id is None and row is not None:
        if isinstance(row, str):
            target_id = row
        elif hasattr(row, "id"):
            target_id = row.id
        elif isinstance(row, dict):
            target_id = row.get("id") or row.get("_id")

    funding_account_id = fields.get("funding_account_id")
    if funding_account_id:
        conflict_query = {
            "customer_id": customer_id,
            "funding_account_id": funding_account_id,
        }
        if target_id:
            conflict_query["id"] = {"$ne": target_id}
        if db["goals"].find_one(conflict_query):
            raise GoalConflict("The funding account is already allocated to another goal.")

    if target_id is None:
        new_id = str(uuid4())
        doc = {
            "_id": new_id,
            "id": new_id,
            "customer_id": customer_id,
            "version": 1,
            **fields,
        }
        try:
            db["goals"].insert_one(doc)
        except DuplicateKeyError:
            raise GoalConflict("The funding account is already allocated to another goal.") from None
        return _doc_to_goal(doc)
    else:
        existing = db["goals"].find_one({"id": target_id}) or db["goals"].find_one({"_id": target_id})
        current_version = existing.get("version", 1) if existing else 1
        new_version = current_version + 1
        update_data = {**fields, "version": new_version, "customer_id": customer_id, "id": target_id}
        try:
            result = db["goals"].update_one(
                {"$or": [{"id": target_id}, {"_id": target_id}], "version": current_version},
                {"$set": update_data},
            )
        except DuplicateKeyError:
            raise GoalConflict("The funding account is already allocated to another goal.") from None

        if result.matched_count == 0:
            raise GoalConflict("The goal was updated by another request. Reload it and retry.")

        updated_doc = db["goals"].find_one({"id": target_id}) or db["goals"].find_one({"_id": target_id})
        return _doc_to_goal(updated_doc)
