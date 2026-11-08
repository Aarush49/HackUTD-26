from dataclasses import dataclass, field
from datetime import date
from uuid import uuid4


@dataclass
class GoalRow:
    customer_id: str
    name: str
    target_amount: str
    monthly_contribution: str
    priority: int = 1
    id: str = field(default_factory=lambda: str(uuid4()))
    target_date: date | str | None = None
    funding_account_id: str | None = None
    initial_funded_amount: str | None = None
    version: int = 1

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "id": self.id,
            "customer_id": self.customer_id,
            "name": self.name,
            "target_amount": self.target_amount,
            "target_date": str(self.target_date) if self.target_date is not None else None,
            "monthly_contribution": self.monthly_contribution,
            "priority": self.priority,
            "funding_account_id": self.funding_account_id,
            "initial_funded_amount": self.initial_funded_amount,
            "version": self.version,
        }
