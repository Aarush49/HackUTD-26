from collections import defaultdict

from app.models.financial import FinancialProfile, ZERO, cents


def transaction_activity(profile: FinancialProfile) -> list[dict]:
    totals = defaultdict(lambda: {"inflow": ZERO, "outflow": ZERO})
    as_of = profile.retrieved_at.date()
    for item in profile.transactions:
        if item.posted(as_of) and item.direction in {"inflow", "outflow"}:
            totals[item.date][item.direction] += item.amount
    return [{"date": date, **amounts} for date, amounts in sorted(totals.items())]


def dashboard(profile: FinancialProfile, goals: list) -> dict:
    assets = [account.balance for account in profile.accounts if account.liquid and account.balance is not None]
    card_credits = [max(ZERO, -account.balance) for account in profile.accounts if account.credit_card and account.balance is not None]
    liquid = sum(assets, ZERO) if assets else None
    total_assets = sum(assets + card_credits, ZERO) if assets or card_credits else None
    balances = [debt.balance for debt in profile.debts if debt.balance is not None]
    liabilities = sum(balances, ZERO) if balances or (profile.accounts and not profile.debts) else None
    income = profile.income.amount
    spending = profile.expenses.amount
    observed_debt = profile.expenses.observed_debt_payments
    spending_breakdown = dict(profile.expenses.breakdown)
    if observed_debt:
        spending_breakdown["debt_payments"] = observed_debt
    recurring = profile.expenses.forecast_spending
    debt_payment = profile.expenses.required_debt_payments
    committed = recurring + debt_payment if recurring is not None and debt_payment is not None else None
    flow = income - committed if income is not None and committed is not None else None
    emergency = cents(max(ZERO, liquid) / committed) if liquid is not None and committed is not None and committed > ZERO else None
    burden = cents(debt_payment / income) if debt_payment is not None and income is not None and income > ZERO else None
    savings_rate = cents(flow / income) if flow is not None and income is not None and income > ZERO else None
    return {
        "customer": profile.customer, "accounts": profile.accounts,
        "total_assets": total_assets, "total_known_liabilities": liabilities,
        "known_account_net_worth": total_assets - liabilities if total_assets is not None and liabilities is not None else None,
        "net_worth_scope": "Only balances valued by the Nessie snapshot. Unreported loan principal and outside holdings are excluded.",
        "liquid_reserves": liquid, "monthly_income": income,
        "monthly_spending": (spending or ZERO) + observed_debt if spending is not None or observed_debt else None,
        "forecast_non_debt_spending": recurring, "monthly_cash_flow": flow,
        "debts": profile.debts, "monthly_debt_payments": debt_payment,
        "observed_monthly_debt_payments": profile.expenses.observed_debt_payments,
        "monthly_recurring_bills": profile.expenses.recurring_bills, "savings_rate": savings_rate,
        "emergency_fund_months": emergency,
        "health_indicators": {
            "cash_flow": {"value": flow, "status": "unknown" if flow is None else "positive" if flow > ZERO else "negative" if flow < ZERO else "even"},
            "debt_burden": {"value": burden, "status": "unknown" if burden is None else "measured"},
            "emergency_fund": {"value": emergency, "status": "unknown" if emergency is None else "measured"},
        },
        "metric_explanations": {
            "monthly_cash_flow": "Requires identifiable income, forecast non-debt spending and known required debt payments.",
            "savings_rate": "Requires estimated cash flow and positive estimated income.",
            "emergency_fund_months": "Requires known liquid balances and positive monthly commitments.",
            "debt_burden": "Requires known debt payments and positive estimated income.",
            "total_assets": "Requires at least one balance valued as an asset.",
            "total_known_liabilities": "Null when debt is reported without any current principal or when no accounts were returned.",
            "monthly_income": profile.income.explanation, "monthly_spending": profile.expenses.explanation,
            "monthly_debt_payments": "Null when a reported debt lacks a required payment or a recurring debt bill cannot be reconciled.",
        },
        "spending_breakdown": spending_breakdown,
        "income_trends": profile.income.series,
        "transactions": profile.transactions, "bills": profile.bills, "goals": goals,
        "transaction_activity": transaction_activity(profile),
        "data_completeness": {
            "retrieved_at": profile.retrieved_at, "source": "nessie", "gaps": profile.data_gaps,
            "observation": profile.income.observation, "income_confidence": profile.income.confidence,
            "spending_confidence": profile.expenses.confidence,
            "all_reported_debt_balances_known": all(debt.balance is not None for debt in profile.debts),
        },
    }
