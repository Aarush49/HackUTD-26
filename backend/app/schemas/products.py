from typing import Annotated, Literal, Union

from pydantic import Field

from app.assumptions.projection_assumptions import AssumptionModel, Fraction, Rate
from app.schemas.goals import Money, PositiveMoney, ResourceID

ProductKind = Literal["cd", "hysa", "balance_transfer", "rewards"]


class DepositProduct(AssumptionModel):
    kind: Literal["cd", "hysa"]
    account_id: ResourceID
    amount: PositiveMoney
    apy: Rate
    fee: Money
    term_months: int | None = Field(default=None, ge=1, le=360)


class BalanceTransferProduct(AssumptionModel):
    kind: Literal["balance_transfer"]
    debt_id: ResourceID
    amount: PositiveMoney
    promo_apr: Rate
    promo_months: int = Field(ge=1, le=360)
    post_promo_apr: Rate
    monthly_payment: PositiveMoney
    transfer_fee_rate: Fraction
    flat_fee: Money


class RewardsProduct(AssumptionModel):
    kind: Literal["rewards"]
    account_id: ResourceID
    eligible_spending_fraction: Fraction
    reward_rate: Fraction
    annual_fee: Money
    pay_statement_in_full: Literal[True]


ProductDecision = Annotated[Union[DepositProduct, BalanceTransferProduct, RewardsProduct], Field(discriminator="kind")]
