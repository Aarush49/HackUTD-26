from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

ZERO = Decimal(0)
CENT = Decimal("0.01")


def cents(amount: Decimal) -> Decimal:
    return amount.quantize(CENT)


class Customer(BaseModel):
    id: str
    first_name: str | None = None
    last_name: str | None = None


class Account(BaseModel):
    id: str
    type: str
    nickname: str | None = None
    balance: Decimal | None = None

    @property
    def liquid(self) -> bool:
        return self.type.lower() in {"checking", "savings"}

    @property
    def credit_card(self) -> bool:
        return self.type.lower() == "credit card"


class Transaction(BaseModel):
    id: str
    account_id: str
    related_account_ids: list[str] = Field(default_factory=list)
    date: date | None
    amount: Decimal | None
    direction: Literal["inflow", "outflow", "internal", "unknown"]
    category: str
    merchant: str | None = None
    transaction_type: str
    classification: str
    status: str | None = None
    description: str | None = None
    source: str = "nessie"
    gasoline: bool = False
    duplicate_of: str | None = None

    def posted(self, as_of: date) -> bool:
        return (
            self.duplicate_of is None and self.amount is not None
            and self.date is not None and self.date <= as_of
            and (
                (self.status or "").lower() in {"completed", "posted", "executed"}
                or (self.status is None and self.transaction_type == "purchase")
            )
        )


class Bill(BaseModel):
    id: str
    account_id: str
    status: str | None = None
    payee: str | None = None
    nickname: str | None = None
    amount: Decimal | None = None
    payment_date: date | None = None
    upcoming_payment_date: date | None = None
    recurring_day: int | None = None
    category: str = "unclassified"


class Debt(BaseModel):
    id: str
    account_id: str
    kind: str
    status: str | None = None
    balance: Decimal | None = None
    reported_loan_amount: Decimal | None = None
    monthly_payment: Decimal | None = None


class Observation(BaseModel):
    start: date | None = None
    end: date | None = None
    days: int = 0
    transaction_count: int = 0
    days_since_latest_record: int | None = None


class Estimate(BaseModel):
    amount: Decimal | None = None
    confidence: Literal["unknown", "low", "medium", "high"] = "unknown"
    explanation: str
    observation: Observation
    series: dict[str, Decimal] = Field(default_factory=dict)


class IncomeEstimate(Estimate):
    streams: list[dict] = Field(default_factory=list)


class ExpenseEstimate(Estimate):
    breakdown: dict[str, Decimal] = Field(default_factory=dict)
    gasoline_monthly: Decimal | None = None
    spending_by_account: dict[str, Decimal] = Field(default_factory=dict)
    purchase_spending_by_account: dict[str, Decimal] = Field(default_factory=dict)
    gasoline_by_account: dict[str, Decimal] = Field(default_factory=dict)
    recurring_bills: Decimal | None = None
    forecast_spending: Decimal | None = None
    forecast_breakdown: dict[str, Decimal] = Field(default_factory=dict)
    required_debt_payments: Decimal | None = None
    unmatched_debt_bill_ids: list[str] = Field(default_factory=list)
    observed_debt_payments: Decimal = ZERO


class FinancialProfile(BaseModel):
    customer: Customer
    accounts: list[Account]
    transactions: list[Transaction]
    bills: list[Bill]
    debts: list[Debt]
    income: IncomeEstimate
    expenses: ExpenseEstimate
    retrieved_at: datetime
    data_gaps: list[str] = Field(default_factory=list)
