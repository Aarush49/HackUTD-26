from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

EventKind = Literal["fed_rate", "inflation", "gas_prices", "market", "unemployment", "mortgage_rates", "unknown"]


class HeadlineInput(BaseModel):
    headline: str = Field(min_length=1, max_length=500)


class Event(BaseModel):
    type: EventKind
    direction: Literal["increase", "decrease", "unknown"]
    magnitude: Decimal | None = None
    unit: Literal["fraction", "rate_fraction", "usd_per_gallon"] | None = None
    explanation: str
