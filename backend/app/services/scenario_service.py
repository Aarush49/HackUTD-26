from app.integrations.nessie_client import NessieClient
from app.schemas.simulation import Decision, ScenarioRequest, Shock
from app.services.exposure_engine import Impact, map_exposure
from app.services.financial_aggregator import aggregate
from app.services.goal_service import list_goals
from app.services.headline_classifier import classify
from app.services.projection_engine import project


async def load_context(client: NessieClient, customer_id, db):
    profile = await aggregate(client, customer_id)
    return profile, list_goals(db, profile.customer.id)


def difference(before, after):
    return after - before if before is not None and after is not None else None


def summary_difference(baseline: dict, scenario: dict) -> dict:
    start, end = baseline["monthly"][-1], scenario["monthly"][-1]
    return {
        "ending_liquid_balance": difference(start["liquid_balance"], end["liquid_balance"]),
        "ending_known_account_net_worth": difference(start["known_account_net_worth"], end["known_account_net_worth"]),
        "ending_debt_balance": difference(start["debt_balance"], end["debt_balance"]),
        "interest_earned": difference(baseline["interest_earned"], scenario["interest_earned"]),
        "interest_paid": difference(baseline["interest_paid"], scenario["interest_paid"]),
        "product_fees": scenario["product_fees"],
        "product_rewards": scenario["product_rewards"],
    }


def compare(profile, goals, request: ScenarioRequest, *, baseline: dict | None = None) -> dict:
    assumptions = request.assumptions
    event = classify(request.headline) if request.headline else None
    impact = map_exposure(profile, event, assumptions, request.exposure) if event else Impact()
    if request.shock.rate_increase_bps and not any(
        terms.variable and terms.apr is not None for terms in assumptions.debt_terms.values()
    ):
        impact.explanations.append("No variable-rate debt with a supplied APR was available for the direct rate shock.")
    if baseline is None:
        baseline = project(profile, goals, assumptions, request.horizon_months)
    scenario = project(
        profile, goals, assumptions, request.horizon_months, impact=impact,
        shock=request.shock, decision=request.decision,
    )
    impacts = [
        {"metric": key, "change": value, "scope": "modeled_components"}
        for key, value in summary_difference(baseline, scenario).items()
    ]
    impacts.extend({
        "metric": "first_month_interest_delta", "change": row["first_month_interest_delta"],
        "account_id": row["account_id"], "debt_id": row.get("debt_id"),
        "scope": "isolated_opening_balance_exposure",
    } for row in impact.affected if "first_month_interest_delta" in row)
    if impact.spending_delta:
        impacts.append({"metric": "monthly_spending_exposure", "change": impact.spending_delta})
    uncertainty = None
    if event and event.type in {"fed_rate", "mortgage_rates"} and impact.affected and request.exposure.rate_pass_through_range:
        estimates = []
        for bound in request.exposure.rate_pass_through_range:
            bound_exposure = request.exposure.model_copy(update={"rate_pass_through": bound})
            bound_impact = map_exposure(profile, event, assumptions, bound_exposure)
            bound_run = project(profile, goals, assumptions, request.horizon_months, impact=bound_impact,
                                shock=request.shock, decision=request.decision)
            estimates.append(summary_difference(baseline, bound_run))
        uncertainty = {}
        for key, first in estimates[0].items():
            second = estimates[1][key]
            if first is not None and second is not None:
                uncertainty[key] = {"low": min(first, second), "high": max(first, second)}
    goal_changes = [
        {"goal_id": before["goal_id"], "baseline": before, "scenario": after,
         "completion_month_change": difference(before["completion_month"], after["completion_month"])}
        for before, after in zip(baseline["goals"], scenario["goals"])
    ]
    recommendations = []
    if scenario["financial_runway"]["first_shortfall_month"] is not None:
        recommendations.append("Review required spending and preserve accessible cash ahead of the modeled shortfall.")
    if any("first_month_interest_delta" in account for account in impact.affected):
        recommendations.append("Check the rate terms for the affected accounts before relying on the modeled rate change.")
    if event and event.type in {"gas_prices", "inflation"} and impact.spending_delta:
        recommendations.append("Compare recent purchases in the affected categories with the modeled spending change.")
    if scenario["missing_requirements"]:
        recommendations.append("Review missing projection inputs and enter only assumptions you can support.")
    if not recommendations:
        recommendations.append("Review the baseline forecast and update the scenario if new financial exposure becomes available.")
    if event is None:
        exposure_status = None
    elif impact.missing:
        exposure_status = "inputs_required"
    elif impact.affected or impact.spending_delta or impact.income_reduction:
        exposure_status = "modeled"
    else:
        exposure_status = "no_identified_exposure"
    return {
        "headline": request.headline, "event": event, "affected_accounts": impact.affected,
        "headline_exposure_status": exposure_status,
        "financial_impacts": impacts, "uncertainty_range": uncertainty,
        "exposure_explanations": impact.explanations, "baseline_projection": baseline, "scenario_projection": scenario,
        "goal_changes": goal_changes, "risk_changes": {
            "baseline": baseline["financial_runway"], "scenario": scenario["financial_runway"],
        },
        "recommended_actions": recommendations,
        "assumptions": [
            {"source": "user", "projection": assumptions.model_dump(exclude_unset=True),
             "exposure": request.exposure.model_dump(exclude_unset=True),
             "shock": request.shock.model_dump(exclude_unset=True), "decision": request.decision.model_dump(exclude_unset=True)},
            {"source": "model", "description": "Monthly steps, nominal APR divided by 12, effective monthly APY, constant baseline cash flow, and no automatic headline pass-through."},
        ],
        "data_sources": [{"name": "nessie", "retrieved_at": profile.retrieved_at, "gaps": profile.data_gaps},
                         {"name": "application_goals", "stored_in": "mongodb"}],
    }
