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
        self.assertEqual(result.total_realizable_security_emission_usd, 0.0)
        self.assertFalse(result.organic_fee_demand_present)
        self.assertFalse(result.economic_survival)

    def test_supply_exhaustion_caps_burn_and_records_unmet_actions(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=100.0,
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
        self.assertGreater(result.total_unmet_actions, 0.0)
        self.assertAlmostEqual(result.supply_accounting_error_tokens, 0.0)
        self.assertTrue(result.accounting_valid)
        self.assertFalse(result.economic_survival)

    def test_five_year_horizon_catches_slow_supply_depletion(self) -> None:
        config = replace(
            EconomyConfig(),
            initial_supply_tokens=1_000.0,
            daily_actions=10.0,
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

    def test_published_matrix_contains_five_year_and_affordability_failures(self) -> None:
        results = build_results()
        horizons = {int(result["days"]) for result in results}
        summary = summarize(results)
        self.assertEqual(horizons, {365, 1_825})
        self.assertGreater(summary["fee_affordability_failure_count"], 0)
        self.assertGreater(summary["supply_depletion_count"], 0)
        self.assertGreater(summary["unmet_demand_scenario_count"], 0)
        self.assertGreater(summary["stake_failure_count"], 0)


if __name__ == "__main__":
    unittest.main()
