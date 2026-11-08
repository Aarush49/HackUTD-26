"""User-approved news interests; no banking records are sent to news or AI providers."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.exc import IntegrityError
from app.models.database import Base

from app.api.dependencies import DB, Nessie
from app.schemas.goals import ResourceID
from app.services.financial_aggregator import aggregate

from app.features.personal_news import Preferences, PersonalNewsService, purchase_suggestions, query_for

router = APIRouter(tags=["Personal news"])


class NewsPreferencesRow(Base):
    __tablename__ = "news_preferences"
    customer_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    preferences: Mapped[dict] = mapped_column(JSON)


class Setup(Preferences):
    customer_id: ResourceID


class NewsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_id: ResourceID


def read_preferences(db, customer):
    row = db.get(NewsPreferencesRow, customer)
    return Preferences.model_validate(row.preferences) if row else Preferences()


@router.get("/news/preferences/{customer_id}")
def preferences(customer_id: str, client: Nessie, db: DB):
    return read_preferences(db, client.customer_id(customer_id))


@router.post("/news/preferences")
async def save_preferences(body: Setup, client: Nessie, db: DB):
    customer = client.customer_id(body.customer_id)
    await client.customer(customer)
    prefs = Preferences.model_validate(body.model_dump(exclude={"customer_id"})).clean()
    data = prefs.model_dump()
    row = db.get(NewsPreferencesRow, customer)
    if row:
        row.preferences = data
    else:
        db.add(NewsPreferencesRow(customer_id=customer, preferences=data))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        row = db.get(NewsPreferencesRow, customer)
        if row is None:
            raise HTTPException(409, "Preferences changed. Please retry.") from None
        row.preferences = data
        db.commit()
    return prefs


@router.get("/news/suggestions/{customer_id}")
async def suggestions(customer_id: str, client: Nessie):
    profile = await aggregate(client, client.customer_id(customer_id))
    return {"suggestions": purchase_suggestions(profile), "window_days": 60}


@router.post("/news/feed")
async def feed(body: NewsRequest, request: Request, client: Nessie, db: DB):
    customer = client.customer_id(body.customer_id)
    return await request.app.state.personal_news.feed(customer, read_preferences(db, customer))
