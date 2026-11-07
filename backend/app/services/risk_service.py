from app.services.scenario_service import compare


def predict_risk(profile, goals, request):
    comparison = compare(profile, goals, request)
    scenario = comparison["scenario_projection"]
    drivers = []
    if request.shock.income_reduction:
        drivers.append("Hypothetical income reduction")
    if request.shock.unexpected_expense:
        drivers.append("One-time unexpected expense")
    if request.shock.cost_of_living_increase:
        drivers.append("Higher recurring spending")
    if request.shock.rate_increase_bps:
        drivers.append("Higher modeled variable debt APR")
    if comparison["event"]:
        drivers.extend(comparison["exposure_explanations"])
    if scenario["financial_runway"]["first_shortfall_month"] is not None:
        drivers.append("Modeled obligations exceed accessible liquid funds")
    return {
        **scenario["financial_runway"],
        "interpretation": "Liquidity shortfall measures when accessible funds cannot cover modeled obligations.",
        "drivers": drivers, "monthly": scenario["monthly"], "goal_changes": comparison["goal_changes"],
        "baseline_runway": comparison["risk_changes"]["baseline"],
        "missing_requirements": scenario["missing_requirements"], "assumptions": comparison["assumptions"],
        "data_sources": comparison["data_sources"],
    }
