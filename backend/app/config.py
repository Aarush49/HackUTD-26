import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    nessie_api_key: str = field(default="", repr=False)
    nessie_base_url: str = "https://prod-api.nessieisreal.com"
    nessie_customer_id: str = ""
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "financial_navigator"
    database_url: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        defaults = cls()
        uri = (
            os.getenv("MONGO_URI", "").strip()
            or os.getenv("DATABASE_URL", "").strip()
            or defaults.mongo_uri
        )
        return cls(
            nessie_api_key=os.getenv("NESSIE_API_KEY", "").strip(),
            nessie_base_url=os.getenv("NESSIE_BASE_URL", "").strip() or defaults.nessie_base_url,
            nessie_customer_id=os.getenv("NESSIE_CUSTOMER_ID", "").strip(),
            mongo_uri=uri,
            mongo_db_name=os.getenv("MONGO_DB_NAME", "").strip() or defaults.mongo_db_name,
            database_url=uri,
        )
