import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    nessie_api_key: str = field(default="", repr=False)
    nessie_base_url: str = "https://prod-api.nessieisreal.com"
    nessie_customer_id: str = ""
    database_url: str = "sqlite:///./financial_navigator.db"

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        defaults = cls()
        return cls(
            nessie_api_key=os.getenv("NESSIE_API_KEY", "").strip(),
            nessie_base_url=os.getenv("NESSIE_BASE_URL", "").strip() or defaults.nessie_base_url,
            nessie_customer_id=os.getenv("NESSIE_CUSTOMER_ID", "").strip(),
            database_url=os.getenv("DATABASE_URL", "").strip() or defaults.database_url,
        )
