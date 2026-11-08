from datetime import date
from uuid import uuid4

from sqlalchemy import Date, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.database import Base


class GoalRow(Base):
    __tablename__ = "goals"
    __table_args__ = (UniqueConstraint("customer_id", "funding_account_id", name="one_goal_per_funding_account"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(120))
    target_amount: Mapped[str] = mapped_column(String(32))
    target_date: Mapped[date | None] = mapped_column(Date)
    monthly_contribution: Mapped[str] = mapped_column(String(32))
    priority: Mapped[int]
    funding_account_id: Mapped[str | None] = mapped_column(String(128))
    initial_funded_amount: Mapped[str | None] = mapped_column(String(32))
    version: Mapped[int] = mapped_column(default=1)

    __mapper_args__ = {"version_id_col": version}


class GoalContextRow(Base):
    """Separate table keeps existing goal databases compatible without column migrations."""
    __tablename__ = "goal_contexts"

    goal_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    news_context: Mapped[str] = mapped_column(String(500), default="")


class GoalContributionRow(Base):
    __tablename__ = "goal_contributions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    goal_id: Mapped[str] = mapped_column(String(36), index=True)
    source: Mapped[str] = mapped_column(String(100))
    amount: Mapped[str] = mapped_column(String(32))
    contributed_on: Mapped[date] = mapped_column(Date)
