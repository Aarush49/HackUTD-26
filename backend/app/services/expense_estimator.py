from collections import defaultdict
from datetime import date
from decimal import Decimal

from app.models.financial import Bill, Debt, ExpenseEstimate, Observation, Transaction, ZERO, cents
from app.services.income_estimator import MONTH_DAYS, in_window
from app.services.transaction_classifier import identity


def matches_payee(tx: Transaction, bill: Bill) -> bool:
    names = {identity(tx.merchant), identity(tx.description)} - {""}
    bill_names = {identity(bill.payee), identity(bill.nickname)} - {""}
    return tx.account_id == bill.account_id and bool(names & bill_names)


def estimate_expenses(
    transactions: list[Transaction], bills: list[Bill], debts: list[Debt],
    period: Observation, as_of: date,
) -> ExpenseEstimate:
    posted = [tx for tx in transactions if in_window(tx, period, as_of)]
    spending = [tx for tx in posted if tx.classification == "spending"]
    schedule = [bill for bill in bills if (bill.status or "").lower() == "recurring" and bill.category != "debt_payments"]
    payments = [debt.monthly_payment for debt in debts]
    unmatched_debt_bills = []
    covered_debts = set()
    for bill in bills:
        if (bill.status or "").lower() != "recurring" or bill.category != "debt_payments":
            continue
        matched = [debt.id for debt in debts if debt.account_id == bill.account_id and debt.monthly_payment is not None
                   and debt.monthly_payment == bill.amount and debt.id not in covered_debts]
        if len(matched) == 1:
            covered_debts.add(matched[0])
        else:
            unmatched_debt_bills.append(bill.id)
    known_payments = (sum(payments, ZERO) if not unmatched_debt_bills
                      and all(payment is not None for payment in payments) else None)
    observed_debt = sum((tx.amount for tx in posted if tx.classification == "loan_payment"), ZERO)
    totals = defaultdict(lambda: ZERO)
    forecast = defaultdict(lambda: ZERO)
    accounts = defaultdict(lambda: ZERO)
    purchases = defaultdict(lambda: ZERO)
    series = defaultdict(lambda: ZERO)
    gasoline = defaultdict(lambda: ZERO)
    for tx in spending:
        totals[tx.category] += tx.amount
        accounts[tx.account_id] += tx.amount
        if tx.transaction_type == "purchase":
            purchases[tx.account_id] += tx.amount
        series[tx.date.strftime("%Y-%m")] += tx.amount
        if not any(matches_payee(tx, bill) for bill in schedule):
            forecast[tx.category] += tx.amount
        if tx.gasoline:
            gasoline[tx.account_id] += tx.amount

    completed = [
        bill for bill in bills if (bill.status or "").lower() == "completed" and bill.category != "debt_payments"
        and bill.amount is not None and bill.payment_date is not None
        and period.start is not None and period.start <= bill.payment_date <= period.end
    ]
    for bill in completed:
        # Equal account, amount and payment date may be the same payment on two feeds.
        if any(tx.account_id == bill.account_id and tx.amount == bill.amount and (
                   tx.date == bill.payment_date or (matches_payee(tx, bill) and abs((tx.date - bill.payment_date).days) <= 2))
               for tx in spending):
            continue
        totals[bill.category] += bill.amount
        accounts[bill.account_id] += bill.amount
        series[bill.payment_date.strftime("%Y-%m")] += bill.amount
        if not any(other.account_id == bill.account_id and identity(other.payee) == identity(bill.payee)
                   and identity(bill.payee) for other in schedule):
            forecast[bill.category] += bill.amount

    # Apply refunds only to an identifiable expense stream, without counting them as income.
    for tx in posted:
        if tx.classification != "refund" or tx.category == "unclassified":
            continue
        matches = [p for p in spending if p.account_id == tx.account_id and p.category == tx.category and
                   (p.merchant == tx.merchant if tx.merchant else identity(tx.description) == identity(p.description))]
        if not matches:
            continue
        reduction = min(totals[tx.category], accounts[tx.account_id], tx.amount)
        totals[tx.category] -= reduction
        forecast[tx.category] = max(ZERO, forecast[tx.category] - reduction)
        accounts[tx.account_id] -= reduction
        series[tx.date.strftime("%Y-%m")] -= reduction
        if any(p.transaction_type == "purchase" for p in matches):
            purchases[tx.account_id] = max(ZERO, purchases[tx.account_id] - reduction)
        if any(p.gasoline for p in matches):
            gasoline[tx.account_id] = max(ZERO, gasoline[tx.account_id] - reduction)

    recurring = sum((bill.amount for bill in schedule), ZERO) if all(bill.amount is not None for bill in schedule) else None
    # Short histories are returned as evidence, with no extrapolated spend from a handful of days.
    factor = MONTH_DAYS / period.days if period.days >= 21 and totals else None
    breakdown = {key: cents(value * factor) for key, value in totals.items()} if factor is not None else {}
    forecast_breakdown = {key: cents(value * factor) for key, value in forecast.items()} if factor is not None else {}
    if factor is not None:
        for bill in schedule:
            if bill.amount is not None:
                forecast_breakdown[bill.category] = forecast_breakdown.get(bill.category, ZERO) + bill.amount
    gas_by_account = {key: cents(value * factor) for key, value in gasoline.items()} if factor is not None else {}
    return ExpenseEstimate(
        amount=sum(breakdown.values(), ZERO) if breakdown else None,
        confidence=("medium" if period.days >= 60 and period.days_since_latest_record <= 45 else "low") if breakdown else "unknown",
        observation=period, breakdown=breakdown, forecast_breakdown=forecast_breakdown,
        forecast_spending=sum(forecast_breakdown.values(), ZERO) if breakdown and recurring is not None else None,
        gasoline_monthly=sum(gas_by_account.values(), ZERO) if gas_by_account else None,
        gasoline_by_account=gas_by_account,
        spending_by_account={key: cents(value * factor) for key, value in accounts.items()} if factor is not None else {},
        purchase_spending_by_account={key: cents(value * factor) for key, value in purchases.items()} if factor is not None else {},
        series=dict(sorted(series.items())), recurring_bills=recurring, required_debt_payments=known_payments,
        unmatched_debt_bill_ids=unmatched_debt_bills,
        observed_debt_payments=cents(observed_debt * MONTH_DAYS / period.days) if period.days >= 21 else ZERO,
        explanation="Observed non-debt spending over the transaction window. Forecast replaces matched bill history with scheduled recurring bills."
        if breakdown else "Insufficient classified spending history. Supply monthly_spending to project.",
    )
