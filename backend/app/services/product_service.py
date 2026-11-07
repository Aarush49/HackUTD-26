from app.models.financial import ZERO
from app.schemas.simulation import Decision
from app.services.projection_engine import project
from app.services.scenario_service import summary_difference

CATALOG = {
    "cd": ("Certificate of deposit", "Fixed modeled APY for the term", "Principal and interest are restricted until maturity"),
    "hysa": ("High-yield savings", "Liquid savings with explicitly supplied APY", "The modeled APY may change in practice"),
    "balance_transfer": ("Balance-transfer credit card", "A separately modeled promotional APR", "Transfer fees and post-promotion interest may offset savings"),
    "rewards": ("Rewards credit card", "Rewards on eligible modeled existing spending", "Fees and interest may exceed rewards"),
}


def catalog() -> list[dict]:
    return [
        {"kind": kind, "name": name, "source": "illustrative", "verified_offer": False,
         "rates_and_fees": None, "advantage": advantage, "risk": risk}
        for kind, (name, advantage, risk) in CATALOG.items()
    ]


def recommend(profile, goals, request) -> dict:
    name, advantage, risk = CATALOG[request.product.kind]
    baseline = project(profile, goals, request.assumptions, request.horizon_months)
    options = []
    choices = (
        ("take_action", 1, [advantage], [risk], "May fit if the modeled benefits justify its costs and liquidity effects."),
        ("do_nothing", None, ["Keeps the current account allocation and obligations"], ["Potential modeled benefits are forgone"],
         "May fit when preserving flexibility or paying existing obligations is the priority."),
        ("wait", request.wait_months + 1, ["Preserves the current allocation during the waiting period"],
         [risk, "Waiting delays potential benefits"], "May fit when more time is needed to build reserves or verify terms."),
    )
    for option, month, advantages, disadvantages, fit in choices:
        if month is None or month > request.horizon_months:
            run = baseline
        else:
            decision = Decision(product=request.product, product_start_month=month)
            run = project(profile, goals, request.assumptions, request.horizon_months, decision=decision)
        final = run["monthly"][-1]
        liquid = [row["liquid_balance"] for row in run["monthly"] if row["liquid_balance"] is not None]
        minimum = min(liquid) if len(liquid) == len(run["monthly"]) else None
        risks = []
        if request.minimum_liquid_reserve is not None and (minimum is None or minimum < request.minimum_liquid_reserve):
            risks.append("The modeled minimum reserve is below the requested floor or cannot be verified.")
        if run["financial_runway"]["first_shortfall_month"] is not None:
            risks.append("A liquidity shortfall occurs during the modeled horizon.")
        if run["product_status"] not in {None, "active", "matured", "scheduled"}:
            risks.append(f"Product application status is {run['product_status']}.")
        if month is not None and month > request.horizon_months:
            risks.append("The waiting period extends through the simulation horizon.")
        if run["status"] == "incomplete":
            risks.append("Missing projection inputs limit the comparison.")
        if request.risk_preference == "conservative" and (
            final["restricted_balance"] > ZERO or any(row["restricted_balance"] > ZERO for row in run["monthly"])
        ):
            risks.append("Restricted funds reduce flexibility under the conservative risk preference.")
        if any(goal["on_track"] is False for goal in run["goals"]):
            risks.append("A projected completion date misses a goal deadline.")
        options.append({
            "option": option, "start_month": month, "estimated_effects": summary_difference(baseline, run),
            "advantages": advantages, "disadvantages": disadvantages, "why_it_may_fit": fit,
            "risks": risks, "minimum_modeled_liquidity": minimum, "projection": run,
            "assumptions": {"projection": request.assumptions, "product": request.product if month else None,
                            "risk_preference": request.risk_preference, "minimum_liquid_reserve": request.minimum_liquid_reserve},
        })
    eligible = [option for option in options if not option["risks"]
                and option["estimated_effects"]["ending_known_account_net_worth"] is not None
                and option["minimum_modeled_liquidity"] is not None]
    conservative = request.risk_preference == "conservative"
    preference = ("minimum modeled liquidity first, then ending net worth" if conservative
                  else "ending net worth first, then minimum modeled liquidity")

    def score(option):
        net_worth = option["estimated_effects"]["ending_known_account_net_worth"]
        liquidity = option["minimum_modeled_liquidity"]
        retain_current = option["option"] == "do_nothing"
        return (liquidity, net_worth, retain_current) if conservative else (net_worth, liquidity, retain_current)

    preferred = max(eligible, key=score)["option"] if eligible else None
    return {"product": name, "terms_source": "user_supplied_illustrative_terms", "options": options,
            "preferred_option": preferred,
            "comparison_basis": f"Among options without flagged risks, rank by {preference}." if preferred else
            "No option has both comparable totals and a clear result under the requested constraints.",
            "data_sources": [{"name": "nessie", "retrieved_at": profile.retrieved_at, "gaps": profile.data_gaps}]}
