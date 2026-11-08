from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from app.assumptions.projection_assumptions import ProjectionAssumptions
from app.models.financial import FinancialProfile, ZERO, cents
from app.schemas.goals import Goal
from app.schemas.products import BalanceTransferProduct, DepositProduct, RewardsProduct
from app.schemas.simulation import Decision, Shock
from app.services.exposure_engine import Impact


class ScenarioInputError(ValueError):
    pass


@dataclass
class DebtLedger:
    balance: Decimal | None
    payment: Decimal | None
    apr: Decimal | None
    variable: bool


def monthly_apy(apy: Decimal) -> Decimal:
    return (1 + apy) ** (Decimal(1) / 12) - 1


def month_date(start: date, months: int) -> date:
    year, month = divmod(start.year * 12 + start.month - 1 + months, 12)
    return date(year, month + 1, min(start.day, monthrange(year, month + 1)[1]))


def total_or_unknown(values) -> Decimal | None:
    values = list(values)
    return None if any(value is None for value in values) else sum(values, ZERO)


def validate_inputs(profile: FinancialProfile, assumptions: ProjectionAssumptions, decision: Decision) -> None:
    liquid = {account.id for account in profile.accounts if account.liquid}
    savings = {account.id for account in profile.accounts if account.type.lower() == "savings"}
    debts = {debt.id: debt for debt in profile.debts}
    if set(assumptions.account_rates) - liquid:
        raise ScenarioInputError("account_rates must reference owned checking or savings accounts.")
    if (set(assumptions.debt_terms) | set(decision.extra_debt_payments)) - debts.keys():
        raise ScenarioInputError("Debt terms and extra payments must reference known debt IDs.")
    if decision.savings_account_id and decision.savings_account_id not in savings:
        raise ScenarioInputError("Extra savings must reference an owned savings account.")
    product = decision.product
    if isinstance(product, DepositProduct):
        if product.account_id not in liquid:
            raise ScenarioInputError("A deposit product must be funded by an owned liquid account.")
        if (product.kind == "cd") != (product.term_months is not None):
            raise ScenarioInputError("CDs require term_months. HYSAs have no term.")
    elif isinstance(product, BalanceTransferProduct):
        if product.debt_id not in debts or debts[product.debt_id].kind != "credit card":
            raise ScenarioInputError("A balance transfer requires an owned credit card debt ID.")
    elif isinstance(product, RewardsProduct) and product.account_id not in {account.id for account in profile.accounts}:
        raise ScenarioInputError("The rewards spending reference must be an owned Nessie account.")


def project(
    profile: FinancialProfile, goals: list[Goal], assumptions: ProjectionAssumptions, horizon: int,
    *, impact: Impact | None = None, shock: Shock | None = None, decision: Decision | None = None,
) -> dict:
    impact = impact or Impact()
    shock = shock or Shock()
    decision = decision or Decision()
    validate_inputs(profile, assumptions, decision)
    missing = set(impact.missing)
    notes = list(impact.explanations)
    inputs = {}
    cash = {account.id: account.balance for account in profile.accounts if account.liquid and account.balance is not None}
    primary = next((account.id for account in profile.accounts if account.type.lower() == "checking" and account.id in cash),
                   next(iter(cash), None))
    cash_covered = primary is not None and not any(a.liquid and a.balance is None for a in profile.accounts)
    if not cash_covered:
        missing.add("Known liquid account balances are required for a complete cash projection.")
    for account in profile.accounts:
        if account.id in cash and account.type.lower() == "savings" and account.id not in assumptions.account_rates:
            missing.add(f"Savings APY for {account.id}; its interest is omitted until supplied.")
    income = assumptions.monthly_income if assumptions.monthly_income is not None else profile.income.amount
    spending = assumptions.monthly_spending if assumptions.monthly_spending is not None else profile.expenses.forecast_spending
    full_income_loss = (
        shock.income_reduction == 1 and (shock.income_reduction_months is None or shock.income_reduction_months >= horizon)
    ) or (impact.income_reduction == 1 and impact.income_reduction_months >= horizon)
    if income is None and full_income_loss:
        income = ZERO
        income_source = "hypothetical_full_income_loss"
    else:
        income_source = "user_assumption" if assumptions.monthly_income is not None else "nessie_estimate"
    inputs["monthly_income"] = {"amount": income, "source": income_source}
    inputs["monthly_non_debt_spending"] = {"amount": spending, "source": "user_assumption" if assumptions.monthly_spending is not None else "nessie_estimate"}
    if income is None:
        missing.add("Monthly income or an explicit monthly_income assumption.")
    if spending is None:
        missing.add("Monthly non-debt spending or an explicit monthly_spending assumption.")
    unmatched_bills = profile.expenses.unmatched_debt_bill_ids
    unmatched_payment = assumptions.monthly_unmatched_debt_bill_payments
    if unmatched_payment is not None and not unmatched_bills:
        raise ScenarioInputError("There are no unmatched recurring debt bills in the Nessie snapshot.")
    if unmatched_bills and unmatched_payment is None:
        missing.add(f"Additional monthly cash payments for unmatched recurring debt bills: {', '.join(unmatched_bills)}.")
    if unmatched_bills:
        inputs["monthly_unmatched_debt_bill_payments"] = {
            "amount": unmatched_payment, "source": "user_assumption" if unmatched_payment is not None else None,
        }
    if assumptions.monthly_spending is None and any("Nessie purchase unavailable" in gap or "Nessie transfer unavailable" in gap for gap in profile.data_gaps):
        missing.add("Transaction feed coverage is incomplete; supply monthly spending and income assumptions for uncovered activity.")
    if assumptions.monthly_income is None and any("Nessie transfer unavailable" in gap for gap in profile.data_gaps):
        missing.add("Transfer feed coverage is incomplete; some mirrored deposits may be unidentified.")

    debts = {}
    for debt in profile.debts:
        terms = assumptions.debt_terms.get(debt.id)
        principal = debt.balance if debt.balance is not None else (terms.outstanding_principal if terms else None)
        payment = debt.monthly_payment if debt.monthly_payment is not None else (terms.monthly_payment if terms else None)
        apr = terms.apr if terms else None
        debts[debt.id] = DebtLedger(principal, payment, apr, bool(terms and terms.variable))
        inputs[f"debt:{debt.id}"] = {
            "principal": principal, "principal_source": "nessie" if debt.balance is not None else
            "user_assumption" if principal is not None else None,
            "monthly_payment": payment, "payment_source": "nessie" if debt.monthly_payment is not None else
            "user_assumption" if payment is not None else None,
            "apr": apr, "apr_source": "user_assumption" if apr is not None else None,
        }
        if principal == ZERO:
            continue
        if principal is None:
            missing.add(f"Current outstanding principal for debt {debt.id}.")
        if payment is None:
            missing.add(f"Required monthly payment for debt {debt.id}.")
        if apr is None:
            missing.add(f"APR for debt {debt.id}; its interest and future principal are unknown.")
    for bill in profile.bills:
        if (bill.status or "").lower() == "pending" and (bill.payment_date or bill.upcoming_payment_date) is None:
            missing.add(f"Payment date for pending bill {bill.id}.")

    start = profile.retrieved_at.date()
    ordered_goals = sorted(goals, key=lambda goal: (goal.priority, goal.id))
    goal_cash = {}
    goal_allocations = {}
    goal_complete = {}
    goal_reasons = {}
    for goal in ordered_goals:
        account_id = goal.funding_account_id
        dedicated = goal.initial_funded_amount
        amount = dedicated if dedicated is not None else (cash.get(account_id) if account_id else ZERO)
        if account_id and (account_id not in cash or amount is None or amount > max(ZERO, cash[account_id])):
            amount = None
            goal_reasons[goal.id] = "The funding account balance is unavailable or below the dedicated allocation."
            missing.add(f"Usable funding account balance for goal {goal.id}.")
        goal_cash[goal.id] = max(ZERO, amount) if amount is not None else None
        goal_allocations[goal.id] = ZERO
        goal_complete[goal.id] = 0 if amount is not None and amount >= goal.target_amount else None

    product = decision.product
    product_state = "scheduled" if product else None
    product_balance = ZERO
    product_debt_id = "simulated_balance_transfer"
    while product_debt_id in debts:
        product_debt_id += "_"
    opening_cash = sum(cash.values(), ZERO) if cash_covered else None
    card_credits = sum((max(ZERO, -account.balance) for account in profile.accounts
                        if account.credit_card and account.balance is not None), ZERO)
    required_known = (not unmatched_bills or unmatched_payment is not None) and all(
        ledger.payment is not None or ledger.balance == ZERO for ledger in debts.values()
    )
    flows_known = cash_covered and income is not None and spending is not None
    first_shortfall = 0 if opening_cash is not None and opening_cash < ZERO else None
    cumulative_earned = cumulative_paid = cumulative_fees = cumulative_rewards = ZERO
    partial_interest = False
    rows = []

    def debit(amount: Decimal, preferred: str | None = None) -> None:
        if primary is None:
            return
        first = preferred or primary
        for account_id in (first, *(key for key in cash if key != first)):
            drawn = min(amount, max(ZERO, cash[account_id]))
            cash[account_id] -= drawn
            amount -= drawn
        cash[primary] -= amount

    def accessible_product() -> Decimal:
        return product_balance if isinstance(product, DepositProduct) and product.kind == "hysa" else ZERO

    def draw_hysa(amount: Decimal) -> None:
        nonlocal product_balance
        if primary is not None:
            draw = min(accessible_product(), max(ZERO, amount - sum(cash.values(), ZERO)))
            cash[primary] += draw
            product_balance -= draw

    def reserved(account_id: str) -> Decimal:
        return sum((goal_cash[g.id] or ZERO for g in ordered_goals if g.funding_account_id == account_id), ZERO) + (
            sum(goal_allocations.values(), ZERO) if account_id == primary else ZERO
        )

    def available() -> Decimal:
        return max(ZERO, sum(cash.values(), ZERO) - sum((reserved(key) for key in cash), ZERO))

    def free_in(account_id: str) -> Decimal:
        return max(ZERO, min(available(), cash[account_id] - reserved(account_id)))

    def debit_unallocated(amount: Decimal) -> None:
        for account_id in cash:
            drawn = min(amount, max(ZERO, cash[account_id] - reserved(account_id)))
            cash[account_id] -= drawn
            amount -= drawn

    def record(month: int, earned: Decimal, paid: Decimal, payment: Decimal, cash_flow: Decimal | None,
               burn: Decimal | None, shortfall: Decimal | None) -> None:
        liquid = sum(cash.values(), ZERO)
        debt_total = total_or_unknown(ledger.balance for ledger in debts.values())
        quantified = cash_covered if month == 0 else flows_known and required_known
        restricted = product_balance if isinstance(product, DepositProduct) and product.kind == "cd" else ZERO
        rows.append({
            "month": month, "date": month_date(start, month),
            "liquid_balance": liquid + accessible_product() if quantified else None,
            "cash_flow_inputs_complete": quantified,
            "known_cash_subtotal": liquid if cash else None, "account_balances": dict(cash),
            "product_balance": product_balance, "restricted_balance": restricted,
            "debt_balance": debt_total, "debt_balances": {key: ledger.balance for key, ledger in debts.items()},
            "known_account_net_worth": liquid + product_balance + card_credits - debt_total
            if quantified and debt_total is not None else None,
            "interest_earned": earned, "interest_paid": paid, "debt_payment": payment,
            "net_cash_flow": cash_flow, "required_monthly_burn": burn, "liquidity_shortfall": shortfall,
            "goal_balances": dict(goal_cash),
        })

    record(0, ZERO, ZERO, ZERO, None, None, None)
    for month in range(1, horizon + 1):
        fee = reward = earned = paid = payment_total = unpaid = deposit_fee = ZERO
        accrued_interest = {}
        if isinstance(product, DepositProduct) and product_state == "active" and product.kind == "cd":
            if month == decision.product_start_month + product.term_months:
                cash[product.account_id] += product_balance
                product_balance = ZERO
                product_state = "matured"

        if month == decision.product_start_month:
            if isinstance(product, DepositProduct):
                if product.account_id in cash and free_in(product.account_id) >= product.amount + product.fee:
                    cash[product.account_id] -= product.amount + product.fee
                    product_balance = product.amount
                    fee = deposit_fee = product.fee
                    product_state = "active"
                else:
                    product_state = "insufficient_unallocated_funds"
            elif isinstance(product, BalanceTransferProduct):
                original = debts[product.debt_id]
                if original.balance is not None and original.balance >= product.amount:
                    original.balance -= product.amount
                    fee = cents(product.amount * product.transfer_fee_rate) + product.flat_fee
                    debts[product_debt_id] = DebtLedger(product.amount + fee, product.monthly_payment, product.promo_apr, False)
                    product_state = "active"
                else:
                    product_state = "insufficient_known_debt_balance"
            elif isinstance(product, RewardsProduct):
                product_state = "active" if product.account_id in profile.expenses.purchase_spending_by_account else "missing_eligible_spending_history"

        if product_state == "active" and isinstance(product, DepositProduct):
            product_earned = cents(product_balance * monthly_apy(product.apy))
            product_balance += product_earned
            earned += product_earned
        for account_id, terms in assumptions.account_rates.items():
            if account_id not in cash:
                continue
            rate = max(ZERO, terms.apy + impact.savings_rate_deltas.get(account_id, ZERO))
            interest = cents(max(ZERO, cash[account_id]) * monthly_apy(rate))
            cash[account_id] += interest
            earned += interest
            for goal in ordered_goals:
                if goal.funding_account_id == account_id and goal_cash[goal.id] is not None:
                    goal_cash[goal.id] += cents(goal_cash[goal.id] * monthly_apy(rate))

        scenario_income = income
        if income is not None:
            manual = shock.income_reduction if shock.income_reduction_months is None or month <= shock.income_reduction_months else ZERO
            headline = impact.income_reduction if month <= impact.income_reduction_months else ZERO
            scenario_income = cents(income * (1 - manual) * (1 - headline))
        scenario_spending = spending
        if spending is not None:
            increase = shock.monthly_spending_increase if (
                shock.monthly_spending_increase_months is None or month <= shock.monthly_spending_increase_months
            ) else ZERO
            scenario_spending = cents(max(ZERO, spending * (1 + shock.cost_of_living_increase)
                                          + impact.spending_delta + increase - decision.monthly_spending_reduction))
        one_off = shock.unexpected_expense if month == shock.expense_month else ZERO
        window_start, window_end = month_date(start, month - 1), month_date(start, month)
        for bill in profile.bills:
            due = bill.upcoming_payment_date or bill.payment_date
            if (bill.status or "").lower() == "pending" and due is not None and (
                window_start < due <= window_end or (month == 1 and due <= window_start)
            ):
                if bill.amount is None:
                    missing.add(f"Amount for pending bill {bill.id}.")
                elif bill.category != "debt_payments":
                    one_off += bill.amount
                else:
                    missing.add(f"Relationship between pending debt bill {bill.id} and required debt payments.")

        if isinstance(product, RewardsProduct) and product_state == "active":
            reward = cents(profile.expenses.purchase_spending_by_account[product.account_id]
                           * product.eligible_spending_fraction * product.reward_rate)
            if scenario_spending is not None:
                reward = min(reward, cents(scenario_spending * product.reward_rate))
            if (month - decision.product_start_month) % 12 == 0:
                fee = product.annual_fee
                one_off += fee
        if primary is not None:
            cash[primary] += (scenario_income or ZERO) + reward
            debit((scenario_spending or ZERO) + one_off + (unmatched_payment or ZERO))
            draw_hysa(ZERO)

        required_total = ZERO
        for debt_id, ledger in debts.items():
            if ledger.balance == ZERO:
                continue
            apr = ledger.apr
            if debt_id == product_debt_id and isinstance(product, BalanceTransferProduct):
                apr = product.promo_apr if month < decision.product_start_month + product.promo_months else product.post_promo_apr
            elif apr is not None:
                direct_delta = Decimal(shock.rate_increase_bps) / 10000 if ledger.variable else ZERO
                apr = max(ZERO, apr + impact.debt_rate_deltas.get(debt_id, ZERO) + direct_delta)
            interest = cents(ledger.balance * apr / 12) if ledger.balance is not None and apr is not None else None
            if interest is None:
                partial_interest = True
            due = ledger.balance + interest if ledger.balance is not None and interest is not None else None
            required = ledger.payment or ZERO
            if due is not None:
                required = min(required, due)
            draw_hysa(required)
            actual = min(required, max(ZERO, sum(cash.values(), ZERO)))
            debit(actual)
            required_total += required
            unpaid += required - actual
            payment_total += actual
            if interest is not None:
                paid += min(interest, actual)
                accrued_interest[debt_id] = max(ZERO, interest - actual)
            ledger.balance = due - actual if due is not None and ledger.payment is not None else None

        if flows_known and required_known and unpaid == ZERO and sum(cash.values(), ZERO) >= ZERO:
            for debt_id, extra in decision.extra_debt_payments.items():
                ledger = debts[debt_id]
                if ledger.balance is not None:
                    extra_paid = min(available(), ledger.balance, extra)
                    debit_unallocated(extra_paid)
                    ledger.balance -= extra_paid
                    payment_total += extra_paid
                    paid += min(accrued_interest.get(debt_id, ZERO), extra_paid)
            if decision.savings_account_id in cash and primary is not None:
                savings_id = decision.savings_account_id
                contribution = min(free_in(primary), decision.extra_monthly_savings)
                if savings_id != primary:
                    cash[primary] -= contribution
                    cash[savings_id] += contribution

        for goal in ordered_goals:
            current = goal_cash[goal.id]
            if current is None:
                continue
            account_id = goal.funding_account_id
            if account_id:
                current = min(current, max(ZERO, cash[account_id]))
            elif primary is not None:
                ceiling = max(ZERO, cash[primary] - reserved(primary) + goal_allocations[goal.id])
                recovered = min(ceiling, goal_allocations[goal.id])
                current -= goal_allocations[goal.id] - recovered
                goal_allocations[goal.id] = recovered
            if flows_known and required_known and primary is not None and unpaid == ZERO:
                funding = account_id or primary
                contribution = min(max(ZERO, goal.target_amount - current), goal.monthly_contribution, available())
                # Allocate free funds at the destination first, then move funds from other owned accounts.
                transferred = max(ZERO, contribution - free_in(funding))
                for donor in cash:
                    if donor != funding and transferred > ZERO:
                        moved = min(transferred, max(ZERO, cash[donor] - reserved(donor)))
                        cash[donor] -= moved
                        cash[funding] += moved
                        transferred -= moved
                contribution -= transferred
                if account_id is None:
                    goal_allocations[goal.id] += contribution
                current += contribution
                if goal_complete[goal.id] is None and current >= goal.target_amount:
                    goal_complete[goal.id] = month
            goal_cash[goal.id] = current

        if flows_known and required_known:
            shortfall = max(ZERO, -sum(cash.values(), ZERO)) + unpaid
            if first_shortfall is None and shortfall > ZERO:
                first_shortfall = month
            net = scenario_income + reward - scenario_spending - one_off - required_total - deposit_fee - (unmatched_payment or ZERO)
            burn = max(ZERO, -net)
        else:
            shortfall = net = burn = None
        cumulative_earned += earned
        cumulative_paid += paid
        cumulative_fees += fee
        cumulative_rewards += reward
        record(month, earned, paid, payment_total, net, burn, shortfall)

    if decision.product and product_state not in {"active", "matured", "scheduled"}:
        notes.append(f"The illustrative product could not be applied ({product_state}).")
    if any(goal.funding_account_id is None and goal.initial_funded_amount for goal in goals):
        notes.append("Dedicated goal funding without a linked account is tracked separately from known assets.")
    notes.extend([
        "Goal reserves can be drawn down for required expenses. Optional transfers and extra payments use unallocated funds.",
        "Account paths and interest totals show modeled components. The engine omits interest for accounts without a supplied rate.",
        "Modeled debt balances include capitalized interest when the payment falls below accrued interest.",
    ])
    goal_results = []
    for goal in ordered_goals:
        completion = goal_complete[goal.id]
        completion_date = month_date(start, completion) if completion is not None else None
        reason = goal_reasons.get(goal.id)
        if completion is None and reason is None:
            if not flows_known or not required_known:
                reason = "Income, spending, debt payments or liquid account balances are incomplete."
            elif goal.funding_account_id and any(goal.funding_account_id in gap and "APY" in gap for gap in missing):
                reason = "Target was not reached under modeled contributions. Funding-account interest is unknown."
            else:
                reason = "Target was not reached within the modeled horizon."
        goal_results.append({
            "goal_id": goal.id, "name": goal.name, "starting_amount": rows[0]["goal_balances"][goal.id],
            "ending_amount": goal_cash[goal.id], "target_amount": goal.target_amount, "target_date": goal.target_date,
            "completion_month": completion, "completion_date": completion_date, "explanation": reason,
            "on_track": completion_date <= goal.target_date if completion_date and goal.target_date else None,
        })
    return {
        "status": "incomplete" if missing else "complete", "missing_requirements": sorted(missing),
        "notes": notes, "inputs": inputs, "monthly": rows, "goals": goal_results,
        "financial_runway": {
            "current_liquid_reserves": opening_cash, "estimated_monthly_burn": rows[1]["required_monthly_burn"],
            "first_shortfall_month": first_shortfall,
            "first_shortfall_date": month_date(start, first_shortfall) if first_shortfall is not None else None,
            "status": "shortfall" if first_shortfall is not None else "no_shortfall_within_horizon"
            if flows_known and required_known and not missing else "incomplete",
        },
        "interest_earned": cumulative_earned, "interest_paid": cumulative_paid if not partial_interest else None,
        "product_fees": cumulative_fees, "product_rewards": cumulative_rewards, "product_status": product_state,
        "opening_known_net_worth": rows[0]["known_account_net_worth"],
    }
