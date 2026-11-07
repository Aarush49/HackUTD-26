from decimal import Decimal
from typing import Annotated

from pydantic import Field, model_validator

from app.assumptions.projection_assumptions import (
    AssumptionModel, ExposureAssumptions, Fraction, ProjectionAssumptions,
)
from app.schemas.goals import Money, PositiveMoney, ResourceID
from app.schemas.products import ProductDecision


class Shock(AssumptionModel):
    income_reduction: Fraction = Decimal(0)
    income_reduction_months: int | None = Field(default=None, ge=1, le=360)
    unexpected_expense: Money = Decimal(0)
    expense_month: int = Field(default=1, ge=1, le=360)
    cost_of_living_increase: Fraction = Decimal(0)
    rate_increase_bps: int = Field(default=0, ge=0, le=20000)


class Decision(AssumptionModel):
    savings_account_id: ResourceID | None = None
    extra_monthly_savings: PositiveMoney | None = None
    extra_debt_payments: dict[ResourceID, PositiveMoney] = Field(default_factory=dict, max_length=100)
    monthly_spending_reduction: Money = Decimal(0)
    product: ProductDecision | None = None
    product_start_month: int = Field(default=1, ge=1, le=360)

    @model_validator(mode="after")
    def savings_needs_amount_and_account(self):
        if (self.savings_account_id is None) != (self.extra_monthly_savings is None):
            raise ValueError("Supply both savings_account_id and extra_monthly_savings")
        return self


class ProjectionRequest(AssumptionModel):
    customer_id: ResourceID | None = None
    horizon_months: int = Field(default=12, ge=1, le=360)
    assumptions: ProjectionAssumptions = Field(default_factory=ProjectionAssumptions)
    exposure: ExposureAssumptions = Field(default_factory=ExposureAssumptions)


class ScenarioRequest(ProjectionRequest):
    headline: str | None = Field(default=None, min_length=1, max_length=500)
    shock: Shock = Field(default_factory=Shock)
    decision: Decision = Field(default_factory=Decision)


class HeadlineAnalysis(ScenarioRequest):
    headline: str = Field(min_length=1, max_length=500)


class Strategy(AssumptionModel):
    name: str = Field(min_length=1, max_length=100)
    headline: str | None = Field(default=None, min_length=1, max_length=500)
    shock: Shock = Field(default_factory=Shock)
    decision: Decision = Field(default_factory=Decision)


class SimulationRequest(ScenarioRequest):
    strategies: list[Strategy] = Field(default_factory=list, max_length=10)


class ProductRequest(ProjectionRequest):
    product: ProductDecision
    wait_months: int = Field(default=3, ge=1, le=359)
    minimum_liquid_reserve: Money | None = None
    risk_preference: Annotated[str, Field(pattern="^(conservative|balanced|aggressive)$")] = "balanced"


class SavedScenarioRequest(ScenarioRequest):
    name: str = Field(min_length=1, max_length=120)


class TransferRequest(AssumptionModel):
    customer_id: ResourceID | None = None
    from_account_id: ResourceID
    to_account_id: ResourceID
    amount: PositiveMoney
