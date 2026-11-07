import asyncio
from datetime import datetime, timezone

from app.integrations.nessie_client import NessieClient, NessieError
from app.models.financial import Account, Bill, Customer, Debt, FinancialProfile, ZERO
from app.services.expense_estimator import estimate_expenses
from app.services.income_estimator import estimate_income, observation
from app.services.transaction_classifier import category, deduplicate, normalize


async def customer_summary(client: NessieClient, customer_id: str) -> Customer:
    row = await client.customer(customer_id)
    if row.id != customer_id:
        raise NessieError("nessie_invalid_response", "Nessie returned a different customer ID.", 502)
    return Customer.model_validate(row.model_dump())


async def customer_accounts(client: NessieClient, customer_id: str) -> list[Account]:
    summary = await client.accounts(customer_id)
    rows = await asyncio.gather(*(client.account(account_id) for account_id in dict.fromkeys(row.id for row in summary)))
    for account_id, row in zip(dict.fromkeys(row.id for row in summary), rows):
        if row.id != account_id or row.customer_id not in {None, customer_id}:
            raise NessieError("nessie_invalid_response", "Nessie returned an unexpected account or owner.", 502)
    return [Account.model_validate(row.model_dump()) for row in rows]


async def aggregate(client: NessieClient, customer_id: str | None = None) -> FinancialProfile:
    customer_id = client.customer_id(customer_id)
    customer, accounts = await asyncio.gather(customer_summary(client, customer_id), customer_accounts(client, customer_id))
    owned = {account.id for account in accounts}
    gaps = set()
    optional = {"purchase", "transfer", "merchant"}

    async def fetch(operation, resource_id, resource):
        try:
            return await operation(resource_id)
        except NessieError as error:
            if resource in optional and error.upstream_status in {404, 405, 501}:
                gaps.add(f"Nessie {resource} unavailable for {resource_id} (HTTP {error.upstream_status}).")
                return None
            raise

    resources = {
        "deposit": client.deposits, "withdrawal": client.withdrawals, "purchase": client.purchases,
        "transfer": client.transfers, "bill": client.bills, "loan": client.loans,
    }
    requests = [(account.id, name, operation) for account in accounts for name, operation in resources.items()]
    results = await asyncio.gather(*(fetch(operation, account_id, name) for account_id, name, operation in requests))
    raw_transactions = []
    bills = {}
    debts = {
        account.id: Debt(
            id=account.id, account_id=account.id, kind="credit card",
            balance=max(ZERO, account.balance) if account.balance is not None else None,
        )
        for account in accounts if account.credit_card and (account.balance is None or account.balance > ZERO)
    }
    for (account_id, name, _), records in zip(requests, results):
        for row in records or []:
            if name == "bill":
                if row.account_id and row.account_id not in owned:
                    raise NessieError("nessie_invalid_response", "Nessie returned a bill for an unrelated account.", 502)
                bills[row.id] = Bill(
                    id=row.id, account_id=row.account_id or account_id, status=row.status, payee=row.payee,
                    nickname=row.nickname, amount=row.payment_amount, payment_date=row.payment_date,
                    upcoming_payment_date=row.upcoming_payment_date, recurring_day=row.recurring_date,
                    category=category(f"{row.payee or ''} {row.nickname or ''}"),
                )
            elif name == "loan":
                if (row.status or "").lower() in {"pending", "denied", "cancelled", "canceled", "closed", "paid", "paid off"}:
                    continue
                debts[row.id] = Debt(
                    id=row.id, account_id=account_id, kind=row.type or "loan", status=row.status,
                    reported_loan_amount=row.amount, monthly_payment=row.monthly_payment,
                )
                gaps.add(f"Nessie loan {row.id} does not identify outstanding principal.")
            else:
                raw_transactions.append((row, name, account_id))

    merchant_ids = sorted({row.merchant_id for row, _, _ in raw_transactions if row.merchant_id})
    merchant_data = await asyncio.gather(*(fetch(client.merchant, merchant_id, "merchant") for merchant_id in merchant_ids))
    merchants = dict(zip(merchant_ids, merchant_data))
    for merchant_id, merchant in merchants.items():
        if merchant and merchant.id != merchant_id:
            raise NessieError("nessie_invalid_response", "Nessie returned a different merchant ID.", 502)
    transactions = deduplicate([normalize(row, kind, account_id, owned, merchants.get(row.merchant_id))
                                for row, kind, account_id in raw_transactions])
    retrieved_at = datetime.now(timezone.utc)
    today = retrieved_at.date()
    bill_dates = [bill.payment_date for bill in bills.values() if (bill.status or "").lower() == "completed"
                  and bill.payment_date is not None and bill.payment_date <= today and bill.amount is not None]
    period = observation(transactions, today, bill_dates=bill_dates)
    if any(tx.date is None or tx.amount is None for tx in transactions):
        gaps.add("Some Nessie transactions omit a date or amount.")
    if any(account.balance is None for account in accounts):
        gaps.add("Some Nessie accounts omit their balance.")
    if any(not account.liquid and not account.credit_card for account in accounts):
        gaps.add("Some Nessie account types cannot be valued as cash or debt.")
    if not accounts:
        gaps.add("Nessie returned no accounts for this customer.")
    if period.days_since_latest_record is not None and period.days_since_latest_record > 45:
        gaps.add("Latest usable transaction is more than 45 days old.")
    return FinancialProfile(
        customer=customer, accounts=accounts, transactions=transactions, bills=list(bills.values()),
        debts=list(debts.values()), income=estimate_income(transactions, period, today),
        expenses=estimate_expenses(transactions, list(bills.values()), list(debts.values()), period, today),
        retrieved_at=retrieved_at, data_gaps=sorted(gaps),
    )
