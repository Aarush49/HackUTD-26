from datetime import date
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Money = Annotated[Decimal, Field(ge=0, le=1_000_000_000_000, decimal_places=2)]
PositiveMoney = Annotated[Money, Field(gt=0)]
ResourceID = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{1,128}$")]


class GoalInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    target_amount: PositiveMoney
    target_date: date | None = None
    monthly_contribution: Money
    priority: int = Field(default=1, ge=1, le=100)
    funding_account_id: ResourceID | None = None
    initial_funded_amount: Money | None = None
    news_context: str = Field(default="", max_length=500)


class GoalCreate(GoalInput):
    customer_id: ResourceID | None = None
    opening_source: str = Field(default="Opening balance", min_length=1, max_length=100)


class GoalPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_amount: PositiveMoney | None = None
    target_date: date | None = None
    monthly_contribution: Money | None = None
    priority: int | None = Field(default=None, ge=1, le=100)
    funding_account_id: ResourceID | None = None
    initial_funded_amount: Money | None = None
    news_context: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for key in self.model_fields_set & {"name", "target_amount", "monthly_contribution", "priority", "news_context"}:
            if getattr(self, key) is None:
                raise ValueError(f"{key} cannot be null")
        return self


class Goal(GoalInput):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    customer_id: str


class ContributionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    customer_id: ResourceID
    request_id: UUID
    source: str = Field(min_length=1, max_length=100)
    amount: PositiveMoney
    contributed_on: date

    @model_validator(mode="after")
    def reject_future(self):
        if self.contributed_on > date.today():
            raise ValueError("A contribution cannot be dated in the future.")
        return self
