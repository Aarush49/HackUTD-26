"""Run the live headline demonstration against a running Navigator API."""
import argparse
import json
from decimal import Decimal

import httpx

from app.config import Settings
from app.integrations.nessie_client import NessieError, safe_id


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--customer", default=Settings.from_env().nessie_customer_id)
    parser.add_argument("--savings-apy", type=Decimal)
    parser.add_argument("--pass-through", type=Decimal)
    parser.add_argument("--gas-sensitivity", type=Decimal)
    args = parser.parse_args()
    if not args.customer:
        parser.error("Set NESSIE_CUSTOMER_ID or pass --customer.")
    try:
        customer_id = safe_id(args.customer)
    except NessieError as error:
        parser.error(str(error))
    if args.gas_sensitivity is None and (args.savings_apy is None or args.pass_through is None):
        parser.error("Supply --savings-apy and --pass-through, or select the gasoline demo with --gas-sensitivity.")

    def read(response: httpx.Response):
        if response.is_error:
            raise SystemExit(f"Navigator returned HTTP {response.status_code}: {response.text}")
        return response.json()

    try:
        with httpx.Client(base_url=args.api, timeout=90) as client:
            profile = read(client.get(f"/api/financial-profile/{customer_id}"))
            body = {"customer_id": customer_id, "horizon_months": 12}
            if args.gas_sensitivity is not None:
                if Decimal(profile["expenses"]["gasoline_monthly"] or "0") <= 0:
                    raise SystemExit("Choose a Nessie customer with identifiable gasoline purchase history.")
                body.update(
                    headline="Gas prices increase by 10%",
                    exposure={"spending_sensitivity": str(args.gas_sensitivity)},
                )
            else:
                eligible = [account for account in profile["accounts"] if account["type"].lower() == "savings"
                            and Decimal(account["balance"] or "0") > 0]
                if not eligible:
                    raise SystemExit("Choose a Nessie customer with a positive savings balance, or use the gasoline demo.")
                savings = max(eligible, key=lambda account: Decimal(account["balance"]))
                body.update(
                    headline="Federal Reserve cuts rates by 50 basis points",
                    assumptions={"account_rates": {savings["id"]: {"apy": str(args.savings_apy), "variable": True}}},
                    exposure={"rate_pass_through": str(args.pass_through)},
                )
            result = read(client.post("/api/headlines/analyze", json=body))
    except httpx.RequestError:
        raise SystemExit("Could not reach Navigator. Start Uvicorn and check the API URL.") from None

    report = {
        **{key: result[key] for key in ("headline", "event", "affected_accounts", "financial_impacts",
                                       "assumptions", "exposure_explanations", "data_sources")},
        "baseline_missing": result["baseline_projection"]["missing_requirements"],
        "scenario_missing": result["scenario_projection"]["missing_requirements"],
    }
    print(json.dumps(report, indent=2))
    if not any(item["metric"] in {"first_month_interest_delta", "monthly_spending_exposure"}
               and item["change"] is not None and Decimal(str(item["change"])) != 0
               for item in result["financial_impacts"]):
        raise SystemExit("The live data and supplied assumptions did not produce a nonzero exposure at cent precision.")


if __name__ == "__main__":
    main()
