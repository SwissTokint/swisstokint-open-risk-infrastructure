from __future__ import annotations

import unittest
from dataclasses import replace

from model import EconomyConfig, StressScenario
from run_scenarios import (
    build_matrix_cases,
    run_matrix_cases,
    select_matrix_workers,
)


class TokenomicsMatrixExecutionTests(unittest.TestCase):
    def test_canonical_matrix_case_count_is_preserved(self) -> None:
        self.assertEqual(len(build_matrix_cases()), 3_600)

    def test_worker_selection_is_bounded_and_never_zero(self) -> None:
        self.assertEqual(select_matrix_workers(0), 1)
        self.assertEqual(select_matrix_workers(1), 1)
        self.assertEqual(select_matrix_workers(2), 2)
        self.assertEqual(select_matrix_workers(64), 4)

    def test_parallel_execution_matches_exact_sequential_order(self) -> None:
        base = replace(
            EconomyConfig(),
            initial_supply_tokens=10_000.0,
            daily_actions=50.0,
            minimum_organic_actions_per_day_for_survival=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            emission_realization_fraction=1.0,
            security_fee_realization_fraction=1.0,
        )
        cases = [
            (
                replace(base, validator_exit_rate_per_day=0.01),
                StressScenario(
                    name="parallel-exit",
                    days=3,
                    price_multiplier=0.5,
                    usage_multiplier=1.0,
                ),
            ),
            (
                replace(base, slashing_burn_rate_per_day=0.001),
                StressScenario(
                    name="parallel-slash",
                    days=3,
                    price_multiplier=2.0,
                    usage_multiplier=0.1,
                ),
            ),
            (
                base,
                StressScenario(
                    name="parallel-control",
                    days=3,
                    price_multiplier=1.0,
                    usage_multiplier=10.0,
                ),
            ),
        ]

        sequential = run_matrix_cases(cases, max_workers=1)
        parallel = run_matrix_cases(cases, max_workers=2)

        self.assertEqual(parallel, sequential)
        self.assertEqual(
            [result["scenario"] for result in parallel],
            [scenario.name for _, scenario in cases],
        )

    def test_invalid_worker_count_fails_closed(self) -> None:
        with self.assertRaisesRegex(ValueError, "max_workers must be >= 1"):
            run_matrix_cases([], max_workers=0)


if __name__ == "__main__":
    unittest.main()
