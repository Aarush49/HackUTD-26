import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    nessie_api_key: str = field(default="", repr=False)
    nessie_base_url: str = "https://prod-api.nessieisreal.com"
    nessie_customer_id: str = ""
    database_url: str = field(default="sqlite:///./financial_navigator.db", repr=False)
    news_api_key: str = field(default="", repr=False)
    gemini_api_key: str = field(default="", repr=False)
    gemini_model: str = "gemini-3.1-flash-lite"

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
        defaults = cls()
        return cls(
            nessie_api_key=os.getenv("NESSIE_API_KEY", "").strip(),
            nessie_base_url=os.getenv("NESSIE_BASE_URL", "").strip() or defaults.nessie_base_url,
            nessie_customer_id=os.getenv("NESSIE_CUSTOMER_ID", "").strip(),
            database_url=os.getenv("DATABASE_URL", "").strip() or defaults.database_url,
            news_api_key=os.getenv("NEWS_API_KEY", "").strip(),
            gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
            gemini_model=os.getenv("GEMINI_MODEL", "").strip() or defaults.gemini_model,
        )
