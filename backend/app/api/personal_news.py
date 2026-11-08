"""User-approved news interests; no banking records are sent to news or AI providers."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import DuplicateKeyError

from app.api.dependencies import DB, Nessie
from app.schemas.goals import ResourceID
from app.services.financial_aggregator import aggregate

from app.features.personal_news import Preferences, PersonalNewsService, purchase_suggestions, query_for

router = APIRouter(tags=["Personal news"])
NEWS_GOALS = ("Japan trip", "Buy a house", "New car")


@router.get("/news/customer")
async def news_customer(client: Nessie):
    if client.settings.nessie_customer_id:
        return {"customer_id": client.customer_id()}
    customers = await client.customers()
    if len(customers) == 1:
        return {"customer_id": customers[0].id}
    raise HTTPException(422, "Choose a Nessie customer in the frontend or backend configuration.")


class Setup(Preferences):
    customer_id: ResourceID


class NewsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_id: ResourceID


def read_preferences(db, customer):
    doc = db["news_preferences"].find_one({"_id": customer})
    return Preferences.model_validate({k: doc[k] for k in Preferences.model_fields if k in doc}) if doc else Preferences()


@router.get("/news/preferences/{customer_id}")
def preferences(customer_id: str, client: Nessie, db: DB):
    return read_preferences(db, client.customer_id(customer_id))


@router.post("/news/preferences")
async def save_preferences(body: Setup, client: Nessie, db: DB):
    customer = client.customer_id(body.customer_id)
    await client.customer(customer)
    prefs = Preferences.model_validate(body.model_dump(exclude={"customer_id"})).clean()
    data = prefs.model_dump()
    collection = db["news_preferences"]
    if collection.find_one({"_id": customer}):
        collection.update_one({"_id": customer}, {"$set": data})
    else:
        try:
            collection.insert_one({"_id": customer, **data})
        except DuplicateKeyError:
            collection.update_one({"_id": customer}, {"$set": data})
    return prefs


@router.get("/news/suggestions/{customer_id}")
async def suggestions(customer_id: str, client: Nessie):
    profile = await aggregate(client, client.customer_id(customer_id))
    return {"suggestions": purchase_suggestions(profile), "window_days": 60}


@router.post("/news/feed")
async def feed(body: NewsRequest, request: Request, client: Nessie, db: DB):
    customer = client.customer_id(body.customer_id)
    prefs = read_preferences(db, customer).model_copy(update={"goals": list(NEWS_GOALS)})
    return await request.app.state.personal_news.feed(customer, prefs)
