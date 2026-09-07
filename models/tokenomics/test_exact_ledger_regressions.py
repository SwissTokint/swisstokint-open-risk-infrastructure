from __future__ import annotations

import math
import unittest
from dataclasses import replace

from model import EconomyConfig, StressScenario, simulate


class ExactLedgerRegressionTests(unittest.TestCase):
    def funded(self, **updates) -> EconomyConfig:
        base = EconomyConfig(
            initial_supply_tokens=1e6,
            initial_price_usd=1.0,
            daily_actions=1.0,
            organic_usage_fraction=1.0,
            minimum_organic_usage_fraction_for_survival=0.0,
            minimum_organic_actions_per_day_for_survival=0.0,
            minimum_organic_fee_usd_per_day_for_survival=0.0,
            fee_mode="token_fixed",
            fixed_token_fee_per_action=1.0,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=1.0,
            emission_realization_fraction=1.0,
            security_fee_realization_fraction=0.0,
            staked_fraction=0.5,
            validator_exit_rate_per_day=0.0,
            required_stake_value_usd=1.0,
            max_daily_token_velocity=3.0,
            slashing_burn_rate_per_day=0.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e308,
        )
        return replace(base, **updates)

    def test_emission_realization_product_cannot_round_up_to_security_requirement(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e101,
            daily_security_emission_tokens=1e100,
            emission_realization_fraction=0.1,
            required_security_budget_usd_per_day=1.0000000000000001e99,
            fixed_token_fee_per_action=1e-100,
        )
        result = simulate(config, StressScenario(name="emission-product", days=1))
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

    def test_shared_velocity_debit_cannot_disappear_below_capacity_ulp(self) -> None:
        config = self.funded(
            initial_supply_tokens=2.0,
            initial_price_usd=1e18,
            daily_actions=2e100,
            fixed_token_fee_per_action=1.0,
            daily_security_emission_tokens=1.0,
            emission_realization_fraction=1.0,
            staked_fraction=0.5,
            max_daily_token_velocity=1e100,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e18,
        )
        result = simulate(config, StressScenario(name="velocity-debit", days=1))
        self.assertGreater(result.total_unmet_actions, 0.0)
        self.assertFalse(result.usage_served)
        self.assertFalse(result.economic_survival)

    def test_organic_fee_floor_is_exact_before_horizon_accumulation(self) -> None:
        below = math.nextafter(1e100, 0.0)
        config = self.funded(
            initial_supply_tokens=1e102,
            daily_actions=1.0,
            fixed_token_fee_per_action=below,
            burn_rate=0.0,
            security_fee_share=0.0,
            treasury_fee_share=1.0,
            minimum_organic_fee_usd_per_day_for_survival=1e100,
            max_daily_token_velocity=100.0,
        )
        result = simulate(config, StressScenario(name="organic-floor-accumulation", days=11))
        self.assertLess(result.average_organic_fee_usd_per_day, 1e100)
        self.assertFalse(result.organic_fee_revenue_adequate)
        self.assertFalse(result.economic_survival)

    def test_fixed_fee_affordability_uses_exact_price_product(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e301,
            initial_price_usd=1e300,
            fixed_token_fee_per_action=0.1,
            max_affordable_fee_usd_per_action=1e299,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="fixed-affordability", days=1))
        self.assertEqual(result.actual_fee_usd_per_action, 1e299)
        self.assertFalse(result.fee_affordable)
        self.assertFalse(result.economic_survival)

    def test_burn_rate_product_cannot_round_down_before_liquid_depletion(self) -> None:
        config = self.funded(
            initial_supply_tokens=2e299,
            staked_fraction=0.0,
            daily_actions=1.0,
            fixed_token_fee_per_action=1e300,
            burn_rate=0.1,
            security_fee_share=0.75,
            treasury_fee_share=0.15,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            security_fee_realization_fraction=0.0,
            max_daily_token_velocity=10.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="burn-product", days=1))
        self.assertEqual(
            result.ending_realizable_liquid_tokens,
            result.required_next_day_liquid_tokens,
        )
        self.assertFalse(result.ending_liquidity_adequate)

    def test_validator_exit_liquid_credit_cannot_create_inventory(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e300,
            staked_fraction=1e-16,
            validator_exit_rate_per_day=0.8,
            daily_actions=1e300,
            fixed_token_fee_per_action=1.0,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            max_daily_token_velocity=1.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="exit-liquid-credit", days=1))
        self.assertGreater(result.total_unmet_actions, 0.0)
        self.assertFalse(result.usage_served)

    def test_initial_bonded_stake_product_cannot_round_up_to_requirement(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e200,
            staked_fraction=0.1,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            required_stake_value_usd=1e199,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(config, StressScenario(name="initial-stake", days=1))
        self.assertEqual(result.initial_staked_tokens, 1e199)
        self.assertFalse(result.stake_adequate)
        self.assertFalse(result.economic_survival)

    def test_validator_exit_rate_product_preserves_exact_next_day_stake(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e50,
            staked_fraction=0.5,
            validator_exit_rate_per_day=0.1,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            required_stake_value_usd=4.0500000000000004e49,
            required_security_budget_usd_per_day=1e-300,
        )
        result = simulate(config, StressScenario(name="exit-product", days=1))
        self.assertFalse(result.next_day_stake_adequate)
        self.assertFalse(result.economic_survival)

    def test_slash_rate_product_preserves_exact_next_day_stake(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e50,
            staked_fraction=0.5,
            slashing_burn_rate_per_day=0.1,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            required_stake_value_usd=4.0500000000000004e49,
            required_security_budget_usd_per_day=1e-300,
        )
        result = simulate(config, StressScenario(name="slash-product", days=1))
        self.assertFalse(result.next_day_stake_adequate)
        self.assertFalse(result.economic_survival)

    def test_security_fee_allocation_product_cannot_round_up_budget(self) -> None:
        config = self.funded(
            initial_supply_tokens=1e101,
            daily_actions=1.0,
            fixed_token_fee_per_action=1e100,
            burn_rate=0.25,
            security_fee_share=0.5625,
            treasury_fee_share=0.1875,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            security_fee_realization_fraction=1.0,
            max_daily_token_velocity=3.0,
            required_security_budget_usd_per_day=5.625e99,
        )
        result = simulate(config, StressScenario(name="security-allocation", days=1))
        self.assertFalse(result.security_budget_adequate)
        self.assertFalse(result.economic_survival)

    def test_shared_velocity_capacity_product_cannot_round_up(self) -> None:
        fee = 5.0000000000000004e98
        config = self.funded(
            initial_supply_tokens=1e100,
            staked_fraction=0.0,
            daily_actions=1.0,
            fixed_token_fee_per_action=fee,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            security_fee_realization_fraction=1.0,
            max_daily_token_velocity=0.1,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=fee,
        )
        result = simulate(config, StressScenario(name="velocity-capacity", days=1))
        self.assertFalse(result.security_budget_adequate)

    def test_organic_share_gate_uses_exact_configured_fraction(self) -> None:
        organic_fraction = math.nextafter(0.1, 0.0)
        config = self.funded(
            initial_supply_tokens=1e301,
            daily_actions=1e300,
            organic_usage_fraction=organic_fraction,
            minimum_organic_usage_fraction_for_survival=0.1,
            fixed_token_fee_per_action=1.0,
            max_daily_token_velocity=10.0,
        )
        result = simulate(config, StressScenario(name="organic-share", days=1))
        self.assertLess(result.organic_usage_share, 0.1)
        self.assertFalse(result.organic_usage_share_adequate)
        self.assertFalse(result.economic_survival)

    def test_fee_reward_realization_product_cannot_round_up_budget(self) -> None:
        requirement = 1.0000000000000001e99
        config = self.funded(
            initial_supply_tokens=1e101,
            daily_actions=1.0,
            fixed_token_fee_per_action=1e100,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            security_fee_realization_fraction=0.1,
            max_daily_token_velocity=3.0,
            required_security_budget_usd_per_day=requirement,
        )
        result = simulate(config, StressScenario(name="reward-realization", days=1))
        self.assertFalse(result.security_budget_adequate)

    def test_organic_fee_revenue_product_cannot_round_up_floor(self) -> None:
        floor = 1.0000000000000001e99
        config = self.funded(
            initial_supply_tokens=1e101,
            daily_actions=1.0,
            organic_usage_fraction=0.1,
            fixed_token_fee_per_action=1e100,
            burn_rate=0.0,
            security_fee_share=0.0,
            treasury_fee_share=1.0,
            daily_security_emission_tokens=1.0,
            emission_realization_fraction=1.0,
            minimum_organic_fee_usd_per_day_for_survival=floor,
            max_daily_token_velocity=10.0,
        )
        result = simulate(config, StressScenario(name="organic-revenue", days=1))
        self.assertFalse(result.organic_fee_revenue_adequate)
        self.assertFalse(result.economic_survival)

    def test_scenario_price_product_cannot_round_up_stake_value(self) -> None:
        config = self.funded(
            initial_supply_tokens=2.0,
            initial_price_usd=1e100,
            staked_fraction=0.5,
            daily_actions=1.0,
            fixed_token_fee_per_action=1e-100,
            daily_security_emission_tokens=1e100,
            emission_realization_fraction=1.0,
            required_stake_value_usd=1.0000000000000001e99,
            required_security_budget_usd_per_day=1.0,
        )
        result = simulate(
            config,
            StressScenario(name="scenario-price", days=1, price_multiplier=0.1),
        )
        self.assertGreaterEqual(result.token_price_usd, 1e99)
        self.assertFalse(result.stake_adequate)
        self.assertFalse(result.next_day_stake_adequate)

    def test_usd_indexed_fee_quotient_cannot_round_down_liquidity_requirement(self) -> None:
        rounded_fee_tokens = 1.4285714285714286e299
        config = self.funded(
            initial_supply_tokens=rounded_fee_tokens,
            initial_price_usd=7.0,
            staked_fraction=0.0,
            daily_actions=1.0,
            fee_mode="usd_indexed",
            fee_usd_per_action=1e300,
            burn_rate=0.0,
            security_fee_share=1.0,
            treasury_fee_share=0.0,
            daily_security_emission_tokens=0.0,
            emission_realization_fraction=0.0,
            security_fee_realization_fraction=1.0,
            max_daily_token_velocity=2.0,
            required_stake_value_usd=1.0,
            required_security_budget_usd_per_day=1.0,
            max_affordable_fee_usd_per_action=1e300,
        )
        result = simulate(config, StressScenario(name="fee-quotient", days=1))
        self.assertFalse(result.ending_liquidity_adequate)
        self.assertFalse(result.economic_survival)


if __name__ == "__main__":
    unittest.main()
