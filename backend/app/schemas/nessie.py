from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field

RecordID = Annotated[str, Field(alias="_id", min_length=1)]


class CustomerRecord(BaseModel):
    id: RecordID
    first_name: str | None = None
    last_name: str | None = None


class AccountRecord(BaseModel):
    id: RecordID
    type: str
    balance: Decimal | None = None
    nickname: str | None = None
    customer_id: str | None = None


class TransactionRecord(BaseModel):
    id: RecordID
    amount: Decimal | None = None
    transaction_date: date | None = None
    purchase_date: date | None = None
    status: str | None = None
    description: str | None = None
    payer_id: str | None = None
    payee_id: str | None = None
    merchant_id: str | None = None


class BillRecord(BaseModel):
    id: RecordID
    status: str | None = None
    payee: str | None = None
    nickname: str | None = None
    payment_date: date | None = None
    upcoming_payment_date: date | None = None
    recurring_date: int | None = Field(default=None, ge=1, le=31)
    payment_amount: Decimal | None = Field(default=None, ge=0)
    account_id: str | None = None


class LoanRecord(BaseModel):
    id: RecordID
    type: str | None = None
    status: str | None = None
    amount: Decimal | None = Field(default=None, ge=0)
    monthly_payment: Decimal | None = Field(default=None, ge=0)
    description: str | None = None


class MerchantRecord(BaseModel):
    id: RecordID
    name: str | None = None
    category: str | list[str] | None = None
