import re
from collections import defaultdict

from app.models.financial import Transaction
from app.schemas.nessie import MerchantRecord, TransactionRecord

CATEGORIES = {
    "housing": r"rent|mortgage|property management",
    "food": r"grocer(?:y|ies)|supermarket|restaurants?|dining|food|cafe",
    "transportation": r"gas stations?|fuel|gasoline|transit|parking|rideshare|transportation",
    "utilities": r"utilities|utility|electricity|water bill|natural gas|internet bill",
    "insurance": r"insurance",
    "entertainment": r"entertainment|cinema|movie theater|streaming|concert",
    "debt_payments": r"loan payment|credit card payment|debt repayment|mortgage payment",
    "other": r"retail|department stores?|clothing|merchandise",
}
FUEL = r"gas stations?|gasoline|fuel"


def contains(value: str, pattern: str) -> bool:
    return re.search(r"\b(?:" + pattern + r")\b", value.lower()) is not None


def category(text: str) -> str:
    if contains(text, CATEGORIES["debt_payments"]):
        return "debt_payments"
    return next((name for name, pattern in CATEGORIES.items() if contains(text, pattern)), "unclassified")


def identity(text: str | None) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", (text or "").lower()))


def normalize(
    row: TransactionRecord, kind: str, account_id: str, owned: set[str],
    merchant: MerchantRecord | None = None,
) -> Transaction:
    text = row.description or ""
    merchant_tags = merchant.category if merchant else None
    tags = " ".join(merchant_tags) if isinstance(merchant_tags, list) else (merchant_tags or "")
    evidence = f"{tags} {merchant.name or '' if merchant else ''} {text}".replace("_", " ").replace("-", " ")
    label = category(evidence)
    related = [account for account in (row.payer_id, row.payee_id) if account in owned]
    direction = "inflow" if kind == "deposit" else "outflow"
    if kind == "transfer":
        if row.payer_id in owned and row.payee_id in owned:
            account_id, direction = row.payer_id, "internal"
        elif row.payer_id in owned:
            account_id, direction = row.payer_id, "outflow"
        elif row.payee_id in owned:
            account_id, direction = row.payee_id, "inflow"
        else:
            direction = "unknown"

    if contains(text, r"reversal|reversed|chargeback"):
        classification = "reversal"
    elif direction == "internal":
        classification = "internal_transfer"
    elif contains(text, r"refund|returned purchase") or (kind == "purchase" and row.amount is not None and row.amount < 0):
        classification = "refund"
        direction = "inflow"
    elif row.amount is not None and row.amount < 0:
        classification = "reversal"
    elif contains(text, r"loan proceeds|loan disbursement|cash advance"):
        classification = "loan_proceeds"
    elif label == "debt_payments" and direction == "outflow":
        classification = "loan_payment"
    elif kind == "transfer" or contains(text, r"transfer|account sweep"):
        classification = "external_transfer"
    elif kind == "deposit" and contains(text, r"payroll|paycheck|salary|wages|direct deposit|freelance|contract income|bonus|commission"):
        classification = "income"
    elif kind in {"purchase", "withdrawal"}:
        classification = "spending"
    else:
        classification = "unclassified"
    if classification not in {"spending", "loan_payment", "refund"}:
        label = "unclassified"
    return Transaction(
        id=row.id, account_id=account_id, related_account_ids=list(dict.fromkeys(related)),
        date=row.transaction_date or row.purchase_date, amount=abs(row.amount) if row.amount is not None else None,
        direction=direction, category=label, merchant=merchant.name if merchant else None,
        transaction_type=kind, classification=classification, description=row.description, status=row.status,
        gasoline=label == "transportation" and contains(evidence, FUEL),
    )


def deduplicate(transactions: list[Transaction]) -> list[Transaction]:
    ranked = sorted(transactions, key=lambda tx: ({"transfer": 0, "purchase": 1}.get(tx.transaction_type, 2), tx.id))
    by_id: dict[str, Transaction] = {}
    possible = defaultdict(list)
    for tx in ranked:
        if tx.id in by_id:
            continue
        by_id[tx.id] = tx
        if tx.date is None or tx.amount is None:
            continue
        text = identity(tx.description)
        if tx.transaction_type in {"transfer", "purchase"} and text:
            accounts = tx.related_account_ids if tx.transaction_type == "transfer" else [tx.account_id]
            for account in accounts:
                possible[(account, tx.date, tx.amount, text)].append(tx)
    claimed = set()
    for tx in by_id.values():
        if tx.transaction_type not in {"deposit", "withdrawal"}:
            continue
        key = (tx.account_id, tx.date, tx.amount, identity(tx.description))
        matches = [
            candidate for candidate in possible[key]
            if (candidate.id, tx.account_id, tx.transaction_type) not in claimed
            and (candidate.status or "").lower() == (tx.status or "").lower()
            and (candidate.direction == tx.direction or candidate.direction == "internal")
        ]
        if len(matches) == 1:
            tx.duplicate_of = matches[0].id
            claimed.add((matches[0].id, tx.account_id, tx.transaction_type))
    return sorted(by_id.values(), key=lambda tx: (tx.date is not None, tx.date, tx.id), reverse=True)
