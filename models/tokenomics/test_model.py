from __future__ import annotations

import unittest
from dataclasses import replace

from model import EconomyConfig, StressScenario, allocation_for_burn, simulate


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
        high = simulate(config, StressScenario(name="high", price_multiplier=10.0))
        self.assertAlmostEqual(low.actual_fee_usd_per_action, 0.10)
        self.assertAlmostEqual(high.actual_fee_usd_per_action, 0.10)

    def test_fixed_token_fee_exposes_high_price_affordability_failure(self) -> None:
        config = replace(
            EconomyConfig(),
            fee_mode="token_fixed",
            fixed_token_fee_per_action=0.20,
            max_affordable_fee_usd_per_action=1.0,
        )
        result = simulate(
            config,
            StressScenario(name="price-x10", price_multiplier=10.0),
        )
        self.assertAlmostEqual(result.actual_fee_usd_per_action, 2.0)
        self.assertFalse(result.fee_affordable)
        self.assertFalse(result.economic_survival)

    def test_low_price_can_expose_security_budget_failure(self) -> None:
        config = replace(
            EconomyConfig(),
            required_security_budget_usd_per_day=2_000.0,
        )
        result = simulate(
            config,
            StressScenario(name="price-minus-90", price_multiplier=0.1),
        )
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

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

    def test_zero_usage_does_not_create_fee_demand(self) -> None:
        result = simulate(
            EconomyConfig(),
            StressScenario(name="zero-usage", usage_multiplier=0.0),
        )
        self.assertEqual(result.total_fee_tokens, 0.0)
        self.assertEqual(result.total_burn_tokens, 0.0)
        self.assertEqual(result.total_security_fee_tokens, 0.0)


if __name__ == "__main__":
    unittest.main()
