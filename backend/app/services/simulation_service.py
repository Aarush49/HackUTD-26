from app.schemas.simulation import ScenarioRequest
from app.services.projection_engine import project
from app.services.scenario_service import compare, summary_difference


def simulate(profile, goals, request):
    baseline = project(profile, goals, request.assumptions, request.horizon_months)
    if not request.strategies:
        comparison = compare(profile, goals, request, baseline=baseline)
        return {**comparison, "difference_from_baseline": summary_difference(baseline, comparison["scenario_projection"])}
    strategies = []
    for strategy in request.strategies:
        scenario = ScenarioRequest(
            customer_id=request.customer_id, horizon_months=request.horizon_months,
            assumptions=request.assumptions, exposure=request.exposure,
            headline=strategy.headline or request.headline,
            shock=strategy.shock if "shock" in strategy.model_fields_set else request.shock,
            decision=strategy.decision if "decision" in strategy.model_fields_set else request.decision,
        )
        comparison = compare(profile, goals, scenario, baseline=baseline)
        comparison.pop("baseline_projection")
        strategies.append({
            "name": strategy.name, "difference_from_baseline": summary_difference(baseline, comparison["scenario_projection"]),
            **comparison,
        })
    return {"baseline_projection": baseline, "strategies": strategies}
