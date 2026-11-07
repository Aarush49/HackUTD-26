import re
from decimal import Decimal

from app.schemas.headlines import Event

RULES = (
    ("mortgage_rates", r"mortgage rates?|home loan rates?|refinancing rates?"),
    ("fed_rate", r"federal reserve|\bfed\b|\bfomc\b|federal funds"),
    ("gas_prices", r"gasoline|gas prices?|prices? at the pump|fuel prices?"),
    ("inflation", r"inflation|consumer price index|\bcpi\b|cost of living"),
    ("unemployment", r"unemployment|job losses|layoffs?|jobless|job cuts"),
    ("market", r"stock market|stocks|equities|s&p(?: 500)?|nasdaq|dow jones"),
)
UP = r"\b(?:ris(?:e|es|ing)|rose|rais(?:e|es|ed|ing)|hik(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|surge[sd]?|jump(?:s|ed)?|climb(?:s|ed)?|rall(?:y|ies|ied)|up|higher|spike[sd]?)\b"
DOWN = r"\b(?:cut(?:s|ting)?|slash(?:es|ed)?|reduc(?:e|es|ed|ing)|fall(?:s|ing)?|fell|drop(?:s|ped|ping)?|declin(?:e|es|ed|ing)|decreas(?:e|es|ed|ing)|down|lower(?:s|ed)?|plung(?:e|es|ed)|slid(?:e|es)?|cool(?:s|ed|ing)?)\b"
NUMBER = r"\d+(?:\.\d+)?"
CHANGE = rf"(?P<n>{NUMBER})\s*(?P<unit>basis points?|bps\b|percentage points?|pct points?|%)"


def classify(headline: str) -> Event:
    value = headline.lower().replace("–", "-").replace("−", "-")
    kind = next((name for name, pattern in RULES if re.search(pattern, value)), "unknown")
    if kind == "fed_rate" and not re.search(r"\brates?\b|basis points?|\bbps\b", value):
        kind = "unknown"
    up, down = re.search(UP, value), re.search(DOWN, value)
    direction = "increase" if up and not down else "decrease" if down and not up else "unknown"
    if kind == "unemployment" and direction == "unknown" and re.search(r"layoffs?|job losses|job cuts", value):
        direction = "increase"

    magnitude, unit = None, None
    level_change = re.search(rf"\bfrom\s+({NUMBER})\s*%\s+to\s+({NUMBER})\s*%", value)
    candidates = list(re.finditer(CHANGE, value))
    change = candidates[0] if len(candidates) == 1 else None
    if level_change and kind in {"fed_rate", "mortgage_rates", "inflation", "unemployment"}:
        delta = Decimal(level_change[2]) - Decimal(level_change[1])
        direction = "increase" if delta > 0 else "decrease" if delta < 0 else "unknown"
        magnitude, unit = abs(delta) / 100, "rate_fraction"
    elif change and kind not in {"unknown", "unemployment"}:
        token = change["unit"]
        prefix = value[:change.start()]
        is_level = re.search(r"\b(?:to|at|reaches|hits|of)\s*$", prefix)
        if not is_level:
            if token.startswith(("basis", "bps")):
                magnitude, unit = Decimal(change["n"]) / 10000, "rate_fraction"
            elif token != "%":
                magnitude, unit = Decimal(change["n"]) / 100, "rate_fraction"
            elif kind in {"gas_prices", "market"} or (
                kind == "inflation" and re.search(r"prices? (?:rose|rise|fell|fall|jump|increas|decreas)", value)
            ):
                magnitude, unit = Decimal(change["n"]) / 100, "fraction"
            elif kind in {"fed_rate", "mortgage_rates", "inflation"} and re.search(r"\bby\s*$", prefix):
                # A percent change is relative. Policy-rate deltas need bps, percentage points, or both levels.
                magnitude, unit = Decimal(change["n"]) / 100, "fraction"
    if kind == "gas_prices" and magnitude is None:
        dollars = re.search(rf"\bby\s+\$({NUMBER})\s+(?:a|per)\s+gallon", value)
        pennies = re.search(rf"\bby\s+({NUMBER})\s+cents?\s+(?:a|per)\s+gallon", value)
        if dollars or pennies:
            magnitude = Decimal((dollars or pennies)[1]) / (100 if pennies else 1)
            unit = "usd_per_gallon"
    if direction == "unknown" and change:
        sign = re.search(r"[+-]\s*$", value[:change.start()])
        if sign:
            direction = "increase" if sign[0].strip() == "+" else "decrease"
    if magnitude is not None and magnitude > Decimal(10):
        magnitude, unit = None, None
    if kind == "unknown":
        explanation = "No supported economic event was identified."
    elif magnitude is None:
        explanation = "Event recognized. The headline does not give an unambiguous change magnitude."
    else:
        explanation = "Rule-based extraction from the supplied headline. The headline is a scenario input."
    return Event(type=kind, direction=direction, magnitude=magnitude, unit=unit, explanation=explanation)
