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

    def test_nonfinite_positive_economic_inputs_fail_closed(self) -> None:
        for field in (
            "initial_supply_tokens",
            "initial_price_usd",
            "daily_actions",
            "required_security_budget_usd_per_day",
            "required_stake_value_usd",
            "max_affordable_fee_usd_per_action",
            "max_daily_token_velocity",
        ):
            with self.subTest(field=field):
                config = replace(EconomyConfig(), **{field: float("inf")})
                with self.assertRaisesRegex(ValueError, f"{field} must be finite and > 0"):
                    simulate(config, StressScenario(name=f"nonfinite-{field}"))

        with self.assertRaisesRegex(ValueError, "usage_multiplier must be finite and >= 0"):
            simulate(
                EconomyConfig(),
                StressScenario(name="nonfinite-usage", usage_multiplier=float("inf")),
            )

        with self.assertRaisesRegex(ValueError, "price_multiplier must be finite and > 0"):
            simulate(
                EconomyConfig(),
                StressScenario(name="nonfinite-price", price_multiplier=float("nan")),
            )

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

    def test_horizon_liquidity_uses_token_quantities_before_usd_overflow(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=5.0,
            initial_price_usd=1e308,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=1.0,
            security_fee_share=0.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=3.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e308,
        )
        result = simulate(config, StressScenario(name="liquidity-usd-overflow", days=1))
        self.assertAlmostEqual(result.ending_realizable_liquid_tokens, 2.0)
        self.assertAlmostEqual(result.required_next_day_liquid_tokens, 3.0)
        self.assertEqual(result.ending_realizable_liquidity_usd, float("inf"))
        self.assertEqual(result.required_next_day_liquidity_usd, float("inf"))
        self.assertFalse(result.ending_liquidity_adequate)
        self.assertFalse(result.economic_survival)

    def test_infinite_observed_security_budget_is_not_confused_with_empty_sentinel(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=2_000.0,
            initial_price_usd=1e308,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            security_fee_realization_fraction=1.0,
            daily_actions=10.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            max_daily_token_velocity=2.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e308,
        )
        result = simulate(config, StressScenario(name="security-budget-overflow", days=1))
        self.assertEqual(result.average_security_budget_usd_per_day, float("inf"))
        self.assertEqual(result.minimum_security_budget_usd_per_day, float("inf"))
        self.assertTrue(result.security_budget_adequate)

    def test_fractional_material_usage_shortage_fails_on_first_day(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=999.9999999995,
            initial_price_usd=1e20,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=1_000.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e20,
        )
        one_day = simulate(config, StressScenario(name="usage-shortage-1d", days=1))
        two_days = simulate(config, StressScenario(name="usage-shortage-2d", days=2))
        self.assertGreater(one_day.total_unmet_actions, 0.0)
        self.assertGreater(two_days.total_unmet_actions, 0.0)
        self.assertFalse(one_day.usage_served)
        self.assertFalse(two_days.usage_served)
        self.assertFalse(one_day.economic_survival)
        self.assertFalse(two_days.economic_survival)

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


    def test_fee_capacity_shortfall_cannot_round_back_to_full_service(self) -> None:
        daily_actions = 73_045_222.46897346
        fee_tokens_per_action = 1.0125910683765252e18
        velocity = 5.812721407133143
        requested_fee_tokens = daily_actions * fee_tokens_per_action
        capacity_tokens = requested_fee_tokens - 8_589_934_592.0
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=capacity_tokens / velocity,
            initial_price_usd=1.0,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=fee_tokens_per_action,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=daily_actions,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            max_daily_token_velocity=velocity,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=fee_tokens_per_action,
        )
        result = simulate(config, StressScenario(name="fee-capacity-ulp-shortfall", days=1))
        self.assertLess(result.total_fee_tokens, requested_fee_tokens)
        self.assertFalse(result.usage_served)
        self.assertFalse(result.economic_survival)

    def test_fee_allocation_cannot_exceed_collected_fees_within_epsilon(self) -> None:
        config = replace(
            EconomyConfig(),
            burn_rate=0.5,
            security_fee_share=0.5000000005,
            treasury_fee_share=0.0,
        )
        with self.assertRaisesRegex(ValueError, "must equal 1 exactly"):
            simulate(config, StressScenario(name="fee-allocation-overflow", days=1))

    def test_sub_ulp_validator_exits_accumulate_into_bonded_balance(self) -> None:
        required_stake = 999_999_999_999.95
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=2_000_000_000_000.0,
            staked_fraction=0.5,
            validator_exit_rate_per_day=5e-17,
            slashing_burn_rate_per_day=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=0.10,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            security_fee_realization_fraction=1.0,
            daily_actions=1_000.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            max_daily_token_velocity=2.0,
            required_stake_value_usd=required_stake,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="sub-ulp-validator-exit", days=1_825))
        self.assertGreater(result.total_validator_exit_tokens, 0.09)
        self.assertLess(result.ending_staked_tokens, required_stake)
        self.assertLess(result.minimum_staked_tokens, required_stake)
        self.assertFalse(result.stake_adequate)
        self.assertFalse(result.economic_survival)


    def test_sub_ulp_fee_share_cannot_create_value_after_full_burn(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000.0,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=1.0,
            security_fee_share=4e-19,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=10.0,
            minimum_organic_usage_fraction_for_survival=0.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="sub-ulp-fee-share", days=1))
        self.assertAlmostEqual(result.total_fee_tokens, 10.0)
        self.assertAlmostEqual(result.total_burn_tokens, 10.0)
        self.assertEqual(result.total_security_fee_tokens, 0.0)
        self.assertEqual(result.total_treasury_tokens, 0.0)
        self.assertLessEqual(
            result.total_burn_tokens
            + result.total_security_fee_tokens
            + result.total_treasury_tokens,
            result.total_fee_tokens,
        )

    def test_sub_ulp_slashing_accumulates_into_stake_and_supply(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=2_000_000_000.0,
            initial_price_usd=1e15,
            staked_fraction=0.5,
            slashing_burn_rate_per_day=4e-19,
            validator_exit_rate_per_day=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=0.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=1.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="sub-ulp-slashing", days=1_825))
        self.assertGreater(result.total_slashing_burn_tokens, 5e-7)
        self.assertLess(result.ending_staked_tokens, 1_000_000_000.0)
        self.assertLess(result.ending_supply_tokens, 2_000_000_000.0)
        self.assertTrue(result.accounting_valid)

    def test_sub_ulp_fee_burn_accumulates_into_liquid_inventory(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000_000_000.0,
            initial_price_usd=1e18,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.6e-9,
            burn_rate=0.25,
            security_fee_share=0.5625,
            treasury_fee_share=0.1875,
            daily_security_emission_tokens=0.0,
            daily_actions=1.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            max_daily_token_velocity=2.5000000000000013e-18,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=2e9,
        )
        result = simulate(config, StressScenario(name="sub-ulp-fee-burn", days=1_825))
        self.assertGreater(result.total_burn_tokens, 5e-7)
        self.assertLess(result.ending_supply_tokens, 1_000_000_000.0)
        self.assertLess(result.ending_realizable_liquid_tokens, 1_000_000_000.0)
        self.assertTrue(result.accounting_valid)

    def test_hard_organic_survival_floors_do_not_accept_relative_shortfall(self) -> None:
        actions_floor = 1e300
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1e8,
            daily_actions=9.999999999995e299,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1e-300,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            minimum_organic_usage_fraction_for_survival=1.0,
            minimum_organic_actions_per_day_for_survival=actions_floor,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="strict-organic-actions-floor", days=1))
        self.assertLess(result.average_organic_executed_actions_per_day, actions_floor)
        self.assertFalse(result.absolute_organic_demand_adequate)

        fee_floor = 1e300
        fee_config = replace(
            EconomyConfig(),
            initial_supply_tokens=1e300,
            staked_fraction=0.0,
            daily_actions=1.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=9.999999999995e299,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            minimum_organic_usage_fraction_for_survival=0.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=fee_floor,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e300,
        )
        fee_result = simulate(
            fee_config,
            StressScenario(name="strict-organic-fee-floor", days=1),
        )
        self.assertLess(fee_result.average_organic_fee_usd_per_day, fee_floor)
        self.assertFalse(fee_result.organic_fee_revenue_adequate)

    def test_security_budget_gate_cannot_round_token_value_up_to_requirement(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1e200,
            initial_price_usd=1e100,
            staked_fraction=0.0,
            daily_actions=1.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1e200,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            security_fee_realization_fraction=1.0,
            minimum_organic_usage_fraction_for_survival=0.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            max_daily_token_velocity=2.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1e300,
            max_affordable_fee_usd_per_action=1e300,
        )
        result = simulate(config, StressScenario(name="security-product-round-up", days=1))
        self.assertEqual(result.minimum_security_budget_usd_per_day, 1e300)
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)


if __name__ == "__main__":
    unittest.main()
