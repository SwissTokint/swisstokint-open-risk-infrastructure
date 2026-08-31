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

    def test_organic_fee_floor_must_be_finite_and_nonnegative(self) -> None:
        for invalid in (-1.0, float("inf"), float("nan")):
            with self.subTest(invalid=invalid):
                config = replace(
                    EconomyConfig(),
                    minimum_organic_fee_usd_per_day_for_survival=invalid,
                )
                with self.assertRaisesRegex(
                    ValueError,
                    "minimum_organic_fee_usd_per_day_for_survival",
                ):
                    simulate(config, StressScenario(name="invalid-organic-fee-floor"))

    def test_security_fee_realization_fraction_must_be_bounded(self) -> None:
        for invalid in (-0.01, 1.01):
            with self.subTest(invalid=invalid):
                config = replace(
                    EconomyConfig(),
                    security_fee_realization_fraction=invalid,
                )
                with self.assertRaisesRegex(
                    ValueError,
                    "security_fee_realization_fraction",
                ):
                    simulate(config, StressScenario(name="invalid-fee-realization"))

    def test_emission_realization_and_fee_turnover_share_velocity_budget(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000.0,
            staked_fraction=1.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=1_000.0,
            emission_realization_fraction=1.0,
            security_fee_realization_fraction=1.0,
            daily_actions=1_000.0,
            minimum_organic_actions_per_day_for_survival=1.0,
            minimum_organic_fee_usd_per_day_for_survival=1.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1_500.0,
            max_affordable_fee_usd_per_action=2.0,
        )
        result = simulate(config, StressScenario(name="shared-velocity", days=1))
        self.assertAlmostEqual(result.total_realizable_security_emission_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_emission_realization_velocity_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_fee_velocity_tokens, 0.0)
        self.assertAlmostEqual(result.total_security_fee_realization_velocity_tokens, 0.0)
        self.assertAlmostEqual(result.total_executed_actions, 0.0)
        self.assertAlmostEqual(result.average_security_budget_usd_per_day, 1_000.0)
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

    def test_returned_fee_rewards_require_a_distinct_realization_transfer(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000.0,
            staked_fraction=1.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=1_000.0,
            emission_realization_fraction=1.0,
            security_fee_realization_fraction=1.0,
            daily_actions=1_000.0,
            minimum_organic_actions_per_day_for_survival=1.0,
            minimum_organic_fee_usd_per_day_for_survival=1.0,
            max_daily_token_velocity=2.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1_500.0,
            max_affordable_fee_usd_per_action=2.0,
        )
        result = simulate(config, StressScenario(name="fee-reward-needs-third-flow", days=1))
        self.assertAlmostEqual(result.total_realizable_security_emission_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_fee_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_organic_security_fee_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_realizable_security_fee_tokens, 0.0)
        self.assertAlmostEqual(result.total_emission_realization_velocity_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_fee_velocity_tokens, 1_000.0)
        self.assertAlmostEqual(result.total_security_fee_realization_velocity_tokens, 0.0)
        self.assertAlmostEqual(result.average_security_budget_usd_per_day, 1_000.0)
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

        independently_realizable = simulate(
            replace(config, max_daily_token_velocity=3.0),
            StressScenario(name="fee-reward-third-flow", days=1),
        )
        self.assertAlmostEqual(
            independently_realizable.total_realizable_security_fee_tokens,
            1_000.0,
        )
        self.assertAlmostEqual(
            independently_realizable.average_security_budget_usd_per_day,
            2_000.0,
        )
        self.assertTrue(independently_realizable.security_budget_adequate)

    def test_organic_fee_floor_is_horizon_independent(self) -> None:
        config = replace(
            EconomyConfig(),
            daily_actions=1_000.0,
            fee_mode="usd_indexed",
            fee_usd_per_action=1e-12,
            emission_realization_fraction=1.0,
            minimum_organic_actions_per_day_for_survival=1_000.0,
            minimum_organic_fee_usd_per_day_for_survival=1.0,
            required_security_budget_usd_per_day=500.0,
        )
        one_day = simulate(config, StressScenario(name="dust-fee-1d", days=1))
        one_year = simulate(config, StressScenario(name="dust-fee-365d", days=365))
        self.assertTrue(one_day.organic_fee_demand_present)
        self.assertTrue(one_year.organic_fee_demand_present)
        self.assertAlmostEqual(
            one_day.average_organic_fee_usd_per_day,
            one_year.average_organic_fee_usd_per_day,
        )
        self.assertLess(
            one_day.average_organic_fee_usd_per_day,
            one_day.minimum_organic_fee_usd_per_day_for_survival,
        )
        self.assertFalse(one_day.organic_fee_revenue_adequate)
        self.assertFalse(one_year.organic_fee_revenue_adequate)
        self.assertFalse(one_day.organic_demand_adequate)
        self.assertFalse(one_year.organic_demand_adequate)
        self.assertFalse(one_day.economic_survival)
        self.assertFalse(one_year.economic_survival)

    def test_positive_extreme_price_reserve_cannot_be_covered_by_zero_inventory(self) -> None:
        token_price = 2e11
        fee_tokens_per_action = 0.10 / token_price
        daily_fee_tokens = 1_000.0 * fee_tokens_per_action
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=365.0 * daily_fee_tokens,
            initial_price_usd=token_price,
            staked_fraction=0.0,
            fee_mode="usd_indexed",
            fee_usd_per_action=0.10,
            burn_rate=1.0,
            security_fee_share=0.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=1_000.0,
            minimum_organic_actions_per_day_for_survival=1.0,
            minimum_organic_fee_usd_per_day_for_survival=1.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="extreme-price-liquidity", days=365))
        self.assertGreater(result.required_next_day_liquid_tokens, 0.0)
        self.assertLess(result.required_next_day_liquid_tokens, 1e-9)
        self.assertEqual(result.ending_realizable_liquid_tokens, 0.0)
        self.assertEqual(result.ending_realizable_liquidity_usd, 0.0)
        self.assertGreater(result.required_next_day_liquidity_usd, 0.0)
        self.assertFalse(result.ending_liquidity_adequate)
        self.assertFalse(result.economic_survival)

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
