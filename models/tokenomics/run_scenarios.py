"""Run the reproducible POM-RX SWTK stress matrix and print JSON."""

from __future__ import annotations

import json
from dataclasses import replace

from model import EconomyConfig, StressScenario, allocation_for_burn, simulate


PRICE_MULTIPLIERS = (0.1, 0.5, 1.0, 2.0, 10.0, 20.0)
USAGE_MULTIPLIERS = (0.0, 0.1, 1.0, 10.0, 100.0)
BURN_RATES = (0.0, 0.10, 0.25, 0.50, 0.75, 1.0)
STAKE_SHOCKS = (
    ("zero", 0.0, 0.0),
    ("low", 0.10, 0.0),
    ("baseline", 0.35, 0.0),
    ("gradual-slash", 0.35, 0.001),
    ("exit", 0.35, 0.01),
)
FEE_MODES = ("usd_indexed", "token_fixed")
HORIZON_DAYS = (365, 1_825)
EPSILON = 1e-9


def build_results() -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    base = EconomyConfig()

    for fee_mode in FEE_MODES:
        for burn_rate in BURN_RATES:
            security_share, treasury_share = allocation_for_burn(burn_rate)
            for stake_profile, staked_fraction, slashing_burn_rate_per_day in STAKE_SHOCKS:
                config = replace(
                    base,
                    fee_mode=fee_mode,
                    burn_rate=burn_rate,
                    security_fee_share=security_share,
                    treasury_fee_share=treasury_share,
                    staked_fraction=staked_fraction,
                    slashing_burn_rate_per_day=slashing_burn_rate_per_day,
                )
                for days in HORIZON_DAYS:
                    for price_multiplier in PRICE_MULTIPLIERS:
                        for usage_multiplier in USAGE_MULTIPLIERS:
                            scenario = StressScenario(
                                name=(
                                    f"fee={fee_mode};burn={burn_rate:.2f};"
                                    f"stake_profile={stake_profile};stake={staked_fraction:.2f};"
                                    f"slash_day={slashing_burn_rate_per_day:.4f};days={days};"
                                    f"price_x={price_multiplier:.1f};"
                                    f"usage_x={usage_multiplier:.1f}"
                                ),
                                days=days,
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
    current_stake_failures = sum(
        not bool(result["stake_adequate"])
        for result in results
    )
    next_day_stake_failures = sum(
        not bool(result["next_day_stake_adequate"])
        for result in results
    )
    stake_failures = sum(
        not bool(result["stake_adequate"])
        or not bool(result["next_day_stake_adequate"])
        for result in results
    )
    affordability_failures = sum(
        not bool(result["fee_affordable"])
        for result in results
    )
    total_supply_depleted = sum(
        not bool(result["supply_positive"])
        for result in results
    )
    # Nominal liquid supply can remain positive while the fee-paying inventory is
    # economically unrealizable. Keep both signals separate.
    liquid_supply_depleted = sum(
        float(result["ending_liquid_supply_tokens"]) <= EPSILON
        and float(result["requested_actions_per_day"]) > EPSILON
        for result in results
    )
    realizable_liquidity_failures = sum(
        not bool(result["ending_liquidity_adequate"])
        for result in results
    )
    unmet_demand = sum(
        not bool(result["usage_served"])
        for result in results
    )
    no_organic_demand = sum(
        not bool(result["organic_fee_demand_present"])
        for result in results
    )
    accounting_failures = sum(
        not bool(result["accounting_valid"])
        for result in results
    )

    horizon_counts: dict[str, dict[str, int]] = {}
    for days in HORIZON_DAYS:
        scoped = [result for result in results if int(result["days"]) == days]
        horizon_counts[str(days)] = {
            "scenario_count": len(scoped),
            "economic_survival_count": sum(
                bool(result["economic_survival"]) for result in scoped
            ),
        }

    return {
        "scenario_count": total,
        "economic_survival_count": survived,
        "economic_survival_rate": survived / total if total else 0.0,
        "security_budget_failure_count": security_failures,
        "stake_failure_count": stake_failures,
        "current_stake_failure_count": current_stake_failures,
        "next_day_stake_failure_count": next_day_stake_failures,
        "fee_affordability_failure_count": affordability_failures,
        "total_supply_depletion_count": total_supply_depleted,
        "liquid_supply_depletion_count": liquid_supply_depleted,
        "realizable_liquidity_failure_count": realizable_liquidity_failures,
        "unmet_demand_scenario_count": unmet_demand,
        "no_organic_demand_scenario_count": no_organic_demand,
        "accounting_failure_count": accounting_failures,
        "horizons": horizon_counts,
        "claim_boundary": (
            "mechanical stress output only; token price is an exogenous scenario input; "
            "bonded stake is not fee liquidity; nominal emissions enter fee-paying "
            "inventory only to the configured realization fraction; the matrix includes "
            "zero stake, low stake, gradual slashing and validator-exit paths; paid usage "
            "is organic only to the configured organic_usage_fraction; not a price "
            "forecast, investment return estimate, legal conclusion, or TOKEN_NECESSITY "
            "decision"
        ),
    }


def main() -> None:
    results = build_results()
    print(json.dumps({"summary": summarize(results), "results": results}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
