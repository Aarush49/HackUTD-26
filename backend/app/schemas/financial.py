from datetime import datetime

from pydantic import BaseModel

from app.models.financial import Transaction


class TransactionHistory(BaseModel):
    customer_id: str
    transactions: list[Transaction]
    retrieved_at: datetime
    data_gaps: list[str]
