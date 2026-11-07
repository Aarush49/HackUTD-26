from dataclasses import dataclass, field
from decimal import Decimal

from app.assumptions.exposure_rules import SPENDING_CATEGORIES
from app.assumptions.projection_assumptions import ExposureAssumptions, ProjectionAssumptions
from app.models.financial import FinancialProfile, ZERO, cents
from app.schemas.headlines import Event


@dataclass
class Impact:
    savings_rate_deltas: dict[str, Decimal] = field(default_factory=dict)
    debt_rate_deltas: dict[str, Decimal] = field(default_factory=dict)
    spending_delta: Decimal = ZERO
    income_reduction: Decimal = ZERO
    income_reduction_months: int = 0
    affected: list[dict] = field(default_factory=list)
    explanations: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)


def map_exposure(
    profile: FinancialProfile, event: Event, assumptions: ProjectionAssumptions,
    exposure: ExposureAssumptions,
) -> Impact:
    result = Impact()
    if event.type == "unknown":
        result.missing.append("A supported economic event is needed.")
        return result
    if event.type == "market":
        result.explanations.append("Nessie exposes no market-valued investment account for this customer.")
        return result
    if event.type == "unemployment":
        if event.direction == "decrease":
            result.explanations.append("An improving labor headline supplies no evidence of a change to this customer's income.")
        elif exposure.job_loss_fraction is None or exposure.job_loss_months is None:
            result.missing.append("A hypothetical income-loss fraction and duration are required.")
        else:
            result.income_reduction = exposure.job_loss_fraction
            result.income_reduction_months = exposure.job_loss_months
            result.explanations.append("Income disruption is hypothetical and does not predict an individual layoff.")
        return result
    if event.magnitude is None or event.direction == "unknown":
        result.missing.append("The headline must specify a measurable change and direction.")
        return result

    delta = event.magnitude if event.direction == "increase" else -event.magnitude
    if event.type in {"fed_rate", "mortgage_rates"}:
        if event.unit != "rate_fraction":
            result.missing.append("Supply a change in basis points or percentage points for rate scenarios.")
            return result
        if exposure.rate_pass_through is None:
            result.missing.append("Supply rate_pass_through for a hypothetical rate response.")
            return result
        rate_delta = delta * exposure.rate_pass_through
        for account in profile.accounts:
            terms = assumptions.account_rates.get(account.id)
            if event.type == "fed_rate" and account.type.lower() == "savings" and terms and terms.variable and account.balance is not None:
                result.savings_rate_deltas[account.id] = rate_delta
                adjusted = max(ZERO, terms.apy + rate_delta)
                eligible_balance = max(ZERO, account.balance)
                baseline_interest = cents(eligible_balance * ((1 + terms.apy) ** (Decimal(1) / 12) - 1))
                adjusted_interest = cents(eligible_balance * ((1 + adjusted) ** (Decimal(1) / 12) - 1))
                result.affected.append({
                    "account_id": account.id, "exposure": "variable_savings", "opening_balance": account.balance,
                    "opening_balance_source": "nessie", "assumed_baseline_apy": terms.apy, "adjusted_apy": adjusted,
                    "first_month_interest_delta": adjusted_interest - baseline_interest,
                })
        for debt in profile.debts:
            terms = assumptions.debt_terms.get(debt.id)
            if event.type == "mortgage_rates" and not any(word in debt.kind.lower() for word in ("mortgage", "home")):
                continue
            if terms and terms.variable:
                if terms.apr is None:
                    result.missing.append(f"APR is required for variable debt {debt.id}.")
                    continue
                result.debt_rate_deltas[debt.id] = rate_delta
                principal = debt.balance if debt.balance is not None else terms.outstanding_principal
                adjusted = max(ZERO, terms.apr + rate_delta)
                result.affected.append({
                    "account_id": debt.account_id, "debt_id": debt.id, "exposure": "variable_debt",
                    "opening_balance": principal, "opening_balance_source": "nessie" if debt.balance is not None else
                    "user_assumption" if principal is not None else None,
                    "assumed_baseline_apr": terms.apr, "adjusted_apr": adjusted,
                    "first_month_interest_delta": cents(principal * adjusted / 12) - cents(principal * terms.apr / 12)
                    if principal is not None else None,
                })
        if not result.affected:
            result.explanations.append("No eligible variable-rate savings or debt was identified by the supplied terms.")
        return result

    if exposure.spending_sensitivity is None:
        result.missing.append("Supply spending_sensitivity for the selected spending exposure.")
        return result
    if event.type == "gas_prices":
        if event.unit != "fraction":
            result.missing.append("A relative gasoline price change is needed because Nessie does not report gallons purchased.")
            return result
        amount = profile.expenses.gasoline_monthly
        if amount is None:
            result.explanations.append("There is insufficient Nessie spending identified as gasoline.")
            return result
        result.affected.extend({
            "account_id": account_id, "exposure": "gasoline_spending",
            "baseline_monthly_spending": baseline_spending, "baseline_spending_source": "nessie_estimate",
        } for account_id, baseline_spending in profile.expenses.gasoline_by_account.items())
    else:
        selected = set(exposure.inflation_categories) & SPENDING_CATEGORIES
        if not selected:
            result.missing.append("Choose inflation_categories to model category-specific price exposure.")
            return result
        amounts = [amount for category, amount in profile.expenses.forecast_breakdown.items() if category in selected]
        if not amounts:
            result.explanations.append("No Nessie spending forecast was identified in the selected categories.")
            return result
        amount = sum(amounts, ZERO)
    result.spending_delta = cents(amount * max(Decimal(-1), delta * exposure.spending_sensitivity))
    result.explanations.append(f"Spending impact uses {amount} in monthly Nessie-derived category spending.")
    return result
