from __future__ import annotations

import unittest
from dataclasses import replace

from model import EconomyConfig, StressScenario, simulate
from run_scenarios import build_results, summarize


class ReviewRegressionTests(unittest.TestCase):
    def test_dust_organic_usage_cannot_legitimize_emission_funded_survival(self) -> None:
        config = replace(
            EconomyConfig(),
            emission_realization_fraction=1.0,
            organic_usage_fraction=1e-12,
            required_security_budget_usd_per_day=500.0,
        )
        result = simulate(config, StressScenario(name="dust-organic", days=365))
        self.assertTrue(result.security_budget_adequate)
        self.assertTrue(result.organic_fee_demand_present)
        self.assertLess(result.organic_usage_share, 1e-9)
        self.assertFalse(result.organic_usage_share_adequate)
        self.assertFalse(result.absolute_organic_demand_adequate)
        self.assertFalse(result.organic_demand_adequate)
        self.assertFalse(result.economic_survival)

    def test_absolute_organic_demand_floor_blocks_tiny_usage_with_realizable_emissions(self) -> None:
        config = replace(
            EconomyConfig(),
            emission_realization_fraction=1.0,
            required_security_budget_usd_per_day=500.0,
        )
        result = simulate(
            config,
            StressScenario(
                name="absolute-organic-demand-floor",
                days=365,
                usage_multiplier=1e-12,
            ),
        )
        self.assertTrue(result.security_budget_adequate)
        self.assertTrue(result.organic_usage_share_adequate)
        self.assertAlmostEqual(result.organic_usage_share, 1.0)
        self.assertLess(
            result.average_organic_executed_actions_per_day,
            result.minimum_organic_actions_per_day_for_survival,
        )
        self.assertFalse(result.absolute_organic_demand_adequate)
        self.assertFalse(result.organic_demand_adequate)
        self.assertFalse(result.economic_survival)

    def test_absolute_organic_demand_floor_must_be_finite_and_nonnegative(self) -> None:
        for invalid in (-1.0, float("inf"), float("nan")):
            with self.subTest(invalid=invalid):
                config = replace(
                    EconomyConfig(),
                    minimum_organic_actions_per_day_for_survival=invalid,
                )
                with self.assertRaisesRegex(
                    ValueError,
                    "minimum_organic_actions_per_day_for_survival",
                ):
                    simulate(config, StressScenario(name="invalid-organic-floor"))

    def test_validator_exit_unbonds_without_destroying_supply(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000.0,
            staked_fraction=0.50,
            validator_exit_rate_per_day=0.10,
            slashing_burn_rate_per_day=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=0.10,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=1.0,
            required_stake_value_usd=425.0,
            required_security_budget_usd_per_day=0.05,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="validator-exit", days=1))
        self.assertAlmostEqual(result.total_validator_exit_tokens, 50.0)
        self.assertAlmostEqual(result.total_slashing_burn_tokens, 0.0)
        self.assertAlmostEqual(result.ending_supply_tokens, 1_000.0)
        self.assertAlmostEqual(result.ending_staked_tokens, 450.0)
        self.assertAlmostEqual(result.ending_realizable_liquid_tokens, 550.0)
        self.assertAlmostEqual(result.next_day_staked_tokens, 405.0)
        self.assertTrue(result.stake_adequate)
        self.assertFalse(result.next_day_stake_adequate)
        self.assertFalse(result.economic_survival)

    def test_published_exit_profile_is_distinct_from_slashing(self) -> None:
        results = build_results()
        exit_results = [
            result
            for result in results
            if "stake_profile=exit" in str(result["scenario"])
        ]
        self.assertTrue(exit_results)
        self.assertTrue(
            any(float(result["total_validator_exit_tokens"]) > 0.0 for result in exit_results)
        )
        self.assertTrue(
            all(float(result["slashing_burn_rate_per_day"]) == 0.0 for result in exit_results)
        )
        self.assertTrue(
            all(float(result["total_slashing_burn_tokens"]) == 0.0 for result in exit_results)
        )
        summary = summarize(results)
        self.assertGreater(summary["insufficient_organic_demand_scenario_count"], 0)
        self.assertEqual(summary["accounting_failure_count"], 0)


if __name__ == "__main__":
    unittest.main()
