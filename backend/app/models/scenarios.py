from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


@dataclass
class ScenarioRow:
    customer_id: str
    name: str
    parameters: dict
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "id": self.id,
            "customer_id": self.customer_id,
            "name": self.name,
            "created_at": self.created_at,
            "parameters": self.parameters,
        }
