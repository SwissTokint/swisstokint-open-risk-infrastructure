from __future__ import annotations

import unittest
from dataclasses import replace

from model import EconomyConfig, StressScenario, allocation_for_burn, simulate
from run_scenarios import build_results, summarize


class TokenomicsModelTests(unittest.TestCase):
    def test_fee_allocation_must_sum_to_one(self) -> None:
        config = replace(
            EconomyConfig(),
            burn_rate=0.50,
            security_fee_share=0.40,
            treasury_fee_share=0.20,
        )
        with self.assertRaisesRegex(ValueError, "must equal 1"):
            simulate(config, StressScenario(name="invalid-allocation"))

    def test_usd_indexed_fee_does_not_become_more_expensive_when_token_price_rises(self) -> None:
        config = EconomyConfig(fee_mode="usd_indexed", fee_usd_per_action=0.10)
        low = simulate(config, StressScenario(name="low", price_multiplier=0.5))
        high = simulate(config, StressScenario(name="high", price_multiplier=20.0))
        self.assertAlmostEqual(low.actual_fee_usd_per_action, 0.10)
        self.assertAlmostEqual(high.actual_fee_usd_per_action, 0.10)

    def test_fixed_token_fee_exposes_high_price_affordability_failure(self) -> None:
        config = replace(
            EconomyConfig(),
            fee_mode="token_fixed",
            fixed_token_fee_per_action=0.10,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(
            config,
            StressScenario(name="price-x20", price_multiplier=20.0),
        )
        self.assertAlmostEqual(result.actual_fee_usd_per_action, 2.0)
        self.assertFalse(result.fee_affordable)
        self.assertFalse(result.economic_survival)

    def test_low_price_can_expose_realizable_security_budget_failure(self) -> None:
        config = replace(
            EconomyConfig(),
            emission_realization_fraction=1.0,
            required_security_budget_usd_per_day=1_200.0,
        )
        baseline = simulate(config, StressScenario(name="price-flat"))
        shocked = simulate(
            config,
            StressScenario(name="price-minus-90", price_multiplier=0.1),
        )
        self.assertTrue(baseline.security_budget_adequate)
        self.assertFalse(shocked.security_budget_adequate)
        self.assertFalse(shocked.economic_survival)

    def test_full_burn_removes_fee_funded_security_share(self) -> None:
        security_share, treasury_share = allocation_for_burn(1.0)
        self.assertEqual(security_share, 0.0)
        self.assertEqual(treasury_share, 0.0)
        config = replace(
            EconomyConfig(),
            burn_rate=1.0,
            security_fee_share=security_share,
            treasury_fee_share=treasury_share,
            daily_security_emission_tokens=0.0,
        )
        result = simulate(config, StressScenario(name="full-burn"))
        self.assertEqual(result.total_security_fee_tokens, 0.0)
        self.assertEqual(result.average_security_budget_usd_per_day, 0.0)
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

    def test_zero_usage_does_not_turn_nominal_emissions_into_realizable_budget(self) -> None:
        result = simulate(
            EconomyConfig(),
            StressScenario(name="zero-usage", usage_multiplier=0.0),
        )
        self.assertEqual(result.total_fee_tokens, 0.0)
        self.assertEqual(result.total_burn_tokens, 0.0)
        self.assertEqual(result.total_security_fee_tokens, 0.0)
        self.assertGreater(result.total_security_emission_tokens, 0.0)
        self.assertEqual(result.total_realizable_security_emission_tokens, 0.0)
        self.assertEqual(result.total_realizable_security_emission_usd, 0.0)
        self.assertFalse(result.organic_fee_demand_present)
        self.assertFalse(result.economic_survival)

    def test_unrealizable_emissions_cannot_reenter_as_fee_inventory(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=100.0,
            staked_fraction=0.99,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=100.0,
            emission_realization_fraction=0.0,
            daily_actions=50.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=2.0,
        )
        unrealizable = simulate(
            config,
            StressScenario(name="unrealizable-emissions", days=1),
        )
        realizable = simulate(
            replace(
                config,
                emission_realization_fraction=1.0,
                max_daily_token_velocity=2.0,
            ),
            StressScenario(name="realizable-emissions", days=1),
        )
        self.assertAlmostEqual(unrealizable.ending_liquid_supply_tokens, 101.0)
        self.assertAlmostEqual(unrealizable.ending_realizable_liquid_tokens, 1.0)
        self.assertAlmostEqual(unrealizable.total_executed_actions, 1.0)
        self.assertAlmostEqual(unrealizable.total_unmet_actions, 49.0)
        self.assertEqual(unrealizable.total_realizable_security_emission_tokens, 0.0)
        self.assertAlmostEqual(realizable.total_executed_actions, 50.0)
        self.assertFalse(unrealizable.economic_survival)

    def test_supply_exhaustion_caps_burn_and_records_unmet_actions(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=100.0,
            staked_fraction=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=1.0,
            security_fee_share=0.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=1_000.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=10.0,
        )
        result = simulate(config, StressScenario(name="depletion", days=2))
        self.assertAlmostEqual(result.total_burn_tokens, 100.0)
        self.assertAlmostEqual(result.ending_supply_tokens, 0.0)
        self.assertAlmostEqual(result.ending_liquid_supply_tokens, 0.0)
        self.assertAlmostEqual(result.ending_realizable_liquid_tokens, 0.0)
        self.assertGreater(result.total_unmet_actions, 0.0)
        self.assertAlmostEqual(result.supply_accounting_error_tokens, 0.0)
        self.assertTrue(result.accounting_valid)
        self.assertFalse(result.economic_survival)

    def test_five_year_horizon_catches_slow_liquid_supply_depletion(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=6_000.0,
            daily_actions=10.0,
            minimum_organic_actions_per_day_for_survival=1.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.25,
            security_fee_share=0.75,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            staked_fraction=0.50,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        one_year = simulate(config, StressScenario(name="one-year", days=365))
        five_year = simulate(config, StressScenario(name="five-year", days=1_825))
        self.assertTrue(one_year.economic_survival)
        self.assertFalse(five_year.economic_survival)
        self.assertGreater(five_year.total_unmet_actions, 0.0)
        self.assertLess(five_year.ending_realizable_liquid_tokens, 1e-6)
        self.assertGreater(five_year.ending_staked_tokens, 0.0)

    def test_zero_stake_cannot_report_economic_survival(self) -> None:
        config = replace(
            EconomyConfig(),
            staked_fraction=0.0,
            emission_realization_fraction=1.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="zero-stake"))
        self.assertFalse(result.stake_adequate)
        self.assertEqual(result.stake_coverage_ratio, 0.0)
        self.assertFalse(result.economic_survival)

    def test_slashing_depletes_stake_without_automatic_replacement(self) -> None:
        config = replace(
            EconomyConfig(),
            staked_fraction=0.35,
            slashing_burn_rate_per_day=1.0,
            emission_realization_fraction=1.0,
            required_stake_value_usd=20_000_000.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="full-stake-slash", days=1))
        self.assertAlmostEqual(result.initial_staked_tokens, 35_000_000.0)
        self.assertAlmostEqual(result.total_slashing_burn_tokens, 35_000_000.0)
        self.assertAlmostEqual(result.ending_staked_tokens, 0.0)
        self.assertFalse(result.stake_adequate)
        self.assertFalse(result.economic_survival)

    def test_bonded_tokens_are_not_available_for_fee_turnover(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=100.0,
            staked_fraction=0.99,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=50.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="bonded-liquidity", days=1))
        self.assertAlmostEqual(result.ending_liquid_supply_tokens, 1.0)
        self.assertAlmostEqual(result.ending_realizable_liquid_tokens, 1.0)
        self.assertAlmostEqual(result.total_executed_actions, 1.0)
        self.assertAlmostEqual(result.total_unmet_actions, 49.0)
        self.assertFalse(result.usage_served)
        self.assertFalse(result.ending_liquidity_adequate)
        self.assertFalse(result.economic_survival)

    def test_paid_wash_activity_is_not_inferred_to_be_organic_demand(self) -> None:
        config = replace(
            EconomyConfig(),
            organic_usage_fraction=0.0,
            emission_realization_fraction=1.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="wash-only", days=1))
        self.assertGreater(result.total_fee_tokens, 0.0)
        self.assertEqual(result.total_organic_fee_tokens, 0.0)
        self.assertFalse(result.organic_fee_demand_present)
        self.assertFalse(result.economic_survival)

    def test_horizon_end_requires_next_day_liquid_inventory(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=100.0,
            staked_fraction=0.50,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=1.0,
            security_fee_share=0.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=1.0,
            emission_realization_fraction=1.0,
            daily_actions=51.0,
            max_daily_token_velocity=2.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="horizon-zero-liquid", days=1))
        self.assertTrue(result.usage_served)
        self.assertTrue(result.security_budget_adequate)
        self.assertTrue(result.stake_adequate)
        self.assertAlmostEqual(result.ending_staked_tokens, 50.0)
        self.assertAlmostEqual(result.ending_realizable_liquid_tokens, 0.0)
        self.assertAlmostEqual(result.required_next_day_liquid_tokens, 51.0)
        self.assertFalse(result.ending_liquidity_adequate)
        self.assertFalse(result.economic_survival)

    def test_tiny_organic_share_cannot_legitimize_wash_funded_security(self) -> None:
        config = replace(
            EconomyConfig(),
            daily_actions=20_000.0,
            organic_usage_fraction=1e-12,
            daily_security_emission_tokens=0.0,
            required_security_budget_usd_per_day=1_000.0,
        )
        result = simulate(config, StressScenario(name="tiny-organic", days=1))
        self.assertGreater(result.minimum_gross_security_budget_usd_per_day, 1_000.0)
        self.assertLess(result.minimum_security_budget_usd_per_day, 1.0)
        self.assertTrue(result.organic_fee_demand_present)
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

    def test_horizon_end_requires_next_day_stake_after_deterministic_slash(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000.0,
            staked_fraction=0.50,
            slashing_burn_rate_per_day=0.10,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=0.10,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            daily_actions=1.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=425.0,
            required_security_budget_usd_per_day=0.05,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(config, StressScenario(name="next-day-stake-cliff", days=1))
        self.assertTrue(result.security_budget_adequate)
        self.assertTrue(result.stake_adequate)
        self.assertAlmostEqual(result.ending_staked_tokens, 450.0)
        self.assertAlmostEqual(result.next_day_staked_tokens, 405.0)
        self.assertGreater(result.stake_coverage_ratio, 1.0)
        self.assertLess(result.next_day_stake_coverage_ratio, 1.0)
        self.assertFalse(result.next_day_stake_adequate)
        self.assertFalse(result.economic_survival)
        summary = summarize([result.to_dict()])
        self.assertEqual(summary["current_stake_failure_count"], 0)
        self.assertEqual(summary["next_day_stake_failure_count"], 1)
        self.assertEqual(summary["stake_failure_count"], 1)

    def test_published_matrix_contains_long_horizon_slashing_and_exit_failures(self) -> None:
        results = build_results()
        horizons = {int(result["days"]) for result in results}
        slashing_rates = {
            float(result["slashing_burn_rate_per_day"])
            for result in results
        }
        exit_rates = {
            float(result["validator_exit_rate_per_day"])
            for result in results
        }
        self.assertEqual(horizons, {365, 1_825})
        self.assertIn(0.0, slashing_rates)
        self.assertTrue(any(rate > 0.0 for rate in slashing_rates))
        self.assertIn(0.0, exit_rates)
        self.assertTrue(any(rate > 0.0 for rate in exit_rates))
        self.assertTrue(
            any(
                float(result["slashing_burn_rate_per_day"]) > 0.0
                and not bool(result["stake_adequate"])
                for result in results
            )
        )
        self.assertTrue(
            any(
                float(result["validator_exit_rate_per_day"]) > 0.0
                and not bool(result["stake_adequate"])
                for result in results
            )
        )
        self.assertTrue(
            any(
                float(result["validator_exit_rate_per_day"]) > 0.0
                and not bool(result["next_day_stake_adequate"])
                for result in results
            )
        )
        summary = summarize(results)
        self.assertGreater(summary["stake_failure_count"], 0)
        self.assertGreater(summary["next_day_stake_failure_count"], 0)
        self.assertGreater(summary["insufficient_organic_demand_scenario_count"], 0)
        self.assertEqual(summary["accounting_failure_count"], 0)


if __name__ == "__main__":
    unittest.main()