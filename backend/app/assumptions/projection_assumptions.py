from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.goals import Money, ResourceID

Fraction = Annotated[Decimal, Field(ge=0, le=1, max_digits=10, decimal_places=8)]
Rate = Annotated[Decimal, Field(ge=0, le=2, max_digits=10, decimal_places=8)]


class AssumptionModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AccountRate(AssumptionModel):
    apy: Rate
    variable: bool = False


class DebtTerms(AssumptionModel):
    apr: Rate | None = None
    variable: bool = False
    outstanding_principal: Money | None = None
    monthly_payment: Money | None = None


class ProjectionAssumptions(AssumptionModel):
    monthly_income: Money | None = None
    monthly_spending: Money | None = None
    monthly_unmatched_debt_bill_payments: Money | None = None
    account_rates: dict[ResourceID, AccountRate] = Field(default_factory=dict, max_length=100)
    debt_terms: dict[ResourceID, DebtTerms] = Field(default_factory=dict, max_length=100)


class ExposureAssumptions(AssumptionModel):
    rate_pass_through: Fraction | None = None
    rate_pass_through_range: tuple[Fraction, Fraction] | None = None
    spending_sensitivity: Fraction | None = None
    inflation_categories: list[str] = Field(default_factory=list, max_length=8)
    job_loss_fraction: Fraction | None = None
    job_loss_months: int | None = Field(default=None, ge=1, le=360)

    @model_validator(mode="after")
    def ordered_range(self):
        if self.rate_pass_through_range is not None:
            low, high = self.rate_pass_through_range
            if low > high or self.rate_pass_through is None or not low <= self.rate_pass_through <= high:
                raise ValueError("rate_pass_through_range must contain rate_pass_through")
        return self
