import re
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from statistics import median

from app.models.financial import IncomeEstimate, Observation, Transaction, ZERO, cents
from app.services.transaction_classifier import identity

MONTH_DAYS = Decimal("30.4375")


def observation(transactions: list[Transaction], as_of: date, *, bill_dates: list[date] | None = None) -> Observation:
    dates = [tx.date for tx in transactions if tx.posted(as_of)]
    activity_dates = dates + (bill_dates or [])
    if not activity_dates:
        return Observation()
    end = max(activity_dates)
    start = max(min(activity_dates), end - timedelta(days=179))
    return Observation(
        start=start, end=end, days=(end - start).days + 1,
        transaction_count=sum(day >= start for day in dates), days_since_latest_record=(as_of - end).days,
    )


def in_window(tx: Transaction, period: Observation, as_of: date) -> bool:
    return tx.posted(as_of) and period.start is not None and period.start <= tx.date <= period.end


def cadence(dates: list[date]) -> tuple[str, Decimal | None]:
    dates = sorted(set(dates))
    gaps = [(b - a).days for a, b in zip(dates, dates[1:])]
    if len(gaps) < 2:
        return "irregular", None
    if all(5 <= gap <= 9 for gap in gaps):
        return "weekly", Decimal(52) / 12
    if all(26 <= gap <= 35 for gap in gaps):
        return "monthly", Decimal(1)
    if all(11 <= gap <= 19 for gap in gaps):
        month_counts = defaultdict(int)
        for day in dates:
            month_counts[day.strftime("%Y-%m")] += 1
        if len(gaps) >= 3 and all(count <= 2 for count in month_counts.values()) and (
            max(gaps) - min(gaps) >= 3 or (
                len({day.strftime("%Y-%m") for day in dates if 13 <= day.day <= 17}) >= 2
                and any(day.day <= 2 or day.day >= 27 for day in dates)
            )
        ):
            return "semimonthly", Decimal(2)
        if all(12 <= gap <= 16 for gap in gaps):
            return "biweekly", Decimal(26) / 12
    return "irregular", None


def estimate_income(transactions: list[Transaction], period: Observation, as_of: date) -> IncomeEstimate:
    groups = defaultdict(list)
    totals = defaultdict(lambda: ZERO)
    for tx in transactions:
        if tx.classification == "income" and in_window(tx, period, as_of):
            stream = re.sub(r"\b\d+\b", "", identity(tx.description)).strip()
            groups[(tx.account_id, stream)].append(tx)
            totals[tx.date.strftime("%Y-%m")] += tx.amount
    streams = []
    for (account, description), records in sorted(groups.items()):
        pattern, factor = cadence([tx.date for tx in records])
        amounts = [tx.amount for tx in records]
        typical = median(amounts)
        if factor is not None and (max(amounts) > typical * Decimal("1.5") or min(amounts) < typical * Decimal("0.5")):
            pattern, factor = "irregular", None
        amount = typical * factor if factor is not None else None
        if amount is None and period.days >= 30:
            amount = sum(amounts, ZERO) * MONTH_DAYS / period.days
        streams.append({
            "account_id": account, "description": description, "cadence": pattern,
            "samples": len(records), "monthly_amount": cents(amount) if amount is not None else None,
        })
    usable = [stream["monthly_amount"] for stream in streams if stream["monthly_amount"] is not None]
    confidence = "unknown"
    if usable:
        confidence = "low" if period.days_since_latest_record > 45 or any(
            stream["cadence"] == "irregular" for stream in streams
        ) else "high" if min(stream["samples"] for stream in streams) >= 6 else "medium"
    return IncomeEstimate(
        amount=cents(sum(usable, ZERO)) if usable else None, confidence=confidence, observation=period,
        series=dict(sorted(totals.items())), streams=streams,
        explanation="Explicitly identified income deposits; recurring streams use cadence and median pay."
        if usable else "Insufficient posted deposits identified as income. Supply monthly_income to project.",
    )
