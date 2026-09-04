"""Run the reproducible POM-RX SWTK stress matrix and print JSON."""

from __future__ import annotations

import json
from concurrent.futures import ProcessPoolExecutor
from dataclasses import replace
from os import cpu_count

from model import EconomyConfig, StressScenario, allocation_for_burn, simulate


PRICE_MULTIPLIERS = (0.1, 0.5, 1.0, 2.0, 10.0, 20.0)
USAGE_MULTIPLIERS = (0.0, 0.1, 1.0, 10.0, 100.0)
BURN_RATES = (0.0, 0.10, 0.25, 0.50, 0.75, 1.0)
STAKE_SHOCKS = (
    ("zero", 0.0, 0.0, 0.0),
    ("low", 0.10, 0.0, 0.0),
    ("baseline", 0.35, 0.0, 0.0),
    ("gradual-slash", 0.35, 0.001, 0.0),
    ("exit", 0.35, 0.0, 0.01),
)
FEE_MODES = ("usd_indexed", "token_fixed")
HORIZON_DAYS = (365, 1_825)
EPSILON = 1e-9
MAX_MATRIX_WORKERS = 4

MatrixCase = tuple[EconomyConfig, StressScenario]


def select_matrix_workers(available_cpus: int | None = None) -> int:
    """Return a bounded worker count for the CPU-heavy exact-rational matrix."""
    observed = cpu_count() if available_cpus is None else available_cpus
    return max(1, min(MAX_MATRIX_WORKERS, observed or 1))


def build_matrix_cases() -> list[MatrixCase]:
    """Build the canonical matrix in deterministic publication order."""
    cases: list[MatrixCase] = []
    base = EconomyConfig()

    for fee_mode in FEE_MODES:
        for burn_rate in BURN_RATES:
            security_share, treasury_share = allocation_for_burn(burn_rate)
            for (
                stake_profile,
                staked_fraction,
                slashing_burn_rate_per_day,
                validator_exit_rate_per_day,
            ) in STAKE_SHOCKS:
                config = replace(
                    base,
                    fee_mode=fee_mode,
                    burn_rate=burn_rate,
                    security_fee_share=security_share,
                    treasury_fee_share=treasury_share,
                    staked_fraction=staked_fraction,
                    slashing_burn_rate_per_day=slashing_burn_rate_per_day,
                    validator_exit_rate_per_day=validator_exit_rate_per_day,
                )
                for days in HORIZON_DAYS:
                    for price_multiplier in PRICE_MULTIPLIERS:
                        for usage_multiplier in USAGE_MULTIPLIERS:
                            scenario = StressScenario(
                                name=(
                                    f"fee={fee_mode};burn={burn_rate:.2f};"
                                    f"stake_profile={stake_profile};stake={staked_fraction:.2f};"
                                    f"slash_day={slashing_burn_rate_per_day:.4f};"
                                    f"exit_day={validator_exit_rate_per_day:.4f};days={days};"
                                    f"price_x={price_multiplier:.1f};"
                                    f"usage_x={usage_multiplier:.1f}"
                                ),
                                days=days,
                                price_multiplier=price_multiplier,
                                usage_multiplier=usage_multiplier,
                            )
                            cases.append((config, scenario))

    return cases


def _simulate_case(case: MatrixCase) -> dict[str, object]:
    config, scenario = case
    return simulate(config, scenario).to_dict()


def run_matrix_cases(
    cases: list[MatrixCase],
    *,
    max_workers: int,
) -> list[dict[str, object]]:
    """Execute cases exactly while preserving their deterministic input order."""
    if max_workers < 1:
        raise ValueError("max_workers must be >= 1")
    if max_workers == 1 or len(cases) <= 1:
        return [_simulate_case(case) for case in cases]

    worker_count = min(max_workers, len(cases))
    with ProcessPoolExecutor(max_workers=worker_count) as executor:
        return list(executor.map(_simulate_case, cases, chunksize=8))


def build_results(*, max_workers: int | None = None) -> list[dict[str, object]]:
    """Run every canonical matrix case, parallelizing only independent scenarios."""
    cases = build_matrix_cases()
    worker_count = (
        select_matrix_workers()
        if max_workers is None
        else max_workers
    )
    return run_matrix_cases(cases, max_workers=worker_count)


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
    insufficient_organic_demand = sum(
        not bool(result["organic_demand_adequate"])
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
        "insufficient_organic_demand_scenario_count": insufficient_organic_demand,
        "accounting_failure_count": accounting_failures,
        "horizons": horizon_counts,
        "claim_boundary": (
            "mechanical stress output only; token price is an exogenous scenario input; "
            "bonded stake is not fee liquidity; nominal emissions become realizable only "
            "to the configured realization fraction; emission realization and fee turnover "
            "share the configured daily token-velocity budget; validator exit is modeled as "
            "unbonding into liquid inventory and is distinct from destructive slashing; paid "
            "usage is organic only to the configured organic_usage_fraction; survival requires "
            "minimum organic usage share, average organic actions/day and average organic fee "
            "USD/day; not a price forecast, investment return estimate, legal conclusion, or "
            "TOKEN_NECESSITY decision"
        ),
    }


def main() -> None:
    results = build_results()
    print(json.dumps({"summary": summarize(results), "results": results}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
