"""Run the first reproducible POM-RX SWTK stress matrix and print JSON."""

from __future__ import annotations

import json
from dataclasses import replace

from model import EconomyConfig, StressScenario, allocation_for_burn, simulate


PRICE_MULTIPLIERS = (0.1, 0.5, 1.0, 2.0, 10.0)
USAGE_MULTIPLIERS = (0.1, 1.0, 10.0, 100.0)
BURN_RATES = (0.0, 0.10, 0.25, 0.50, 0.75, 1.0)
FEE_MODES = ("usd_indexed", "token_fixed")


def build_results() -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    base = EconomyConfig()

    for fee_mode in FEE_MODES:
        for burn_rate in BURN_RATES:
            security_share, treasury_share = allocation_for_burn(burn_rate)
            config = replace(
                base,
                fee_mode=fee_mode,
                burn_rate=burn_rate,
                security_fee_share=security_share,
                treasury_fee_share=treasury_share,
            )
            for price_multiplier in PRICE_MULTIPLIERS:
                for usage_multiplier in USAGE_MULTIPLIERS:
                    scenario = StressScenario(
                        name=(
                            f"fee={fee_mode};burn={burn_rate:.2f};"
                            f"price_x={price_multiplier:.1f};usage_x={usage_multiplier:.1f}"
                        ),
                        days=365,
                        price_multiplier=price_multiplier,
                        usage_multiplier=usage_multiplier,
                    )
                    results.append(simulate(config, scenario).to_dict())

    return results


def summarize(results: list[dict[str, object]]) -> dict[str, object]:
    total = len(results)
    survived = sum(bool(result["economic_survival"]) for result in results)
    security_failures = sum(
        not bool(result["security_budget_adequate"])
        for result in results
    )
    affordability_failures = sum(
        not bool(result["fee_affordable"])
        for result in results
    )
    depleted = sum(
        not bool(result["supply_positive"])
        for result in results
    )
    return {
        "scenario_count": total,
        "economic_survival_count": survived,
        "economic_survival_rate": survived / total if total else 0.0,
        "security_budget_failure_count": security_failures,
        "fee_affordability_failure_count": affordability_failures,
        "supply_depletion_count": depleted,
        "claim_boundary": (
            "mechanical stress output only; not a price forecast, investment return "
            "estimate, legal conclusion, or TOKEN_NECESSITY decision"
        ),
    }


def main() -> None:
    results = build_results()
    print(json.dumps({"summary": summarize(results), "results": results}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
