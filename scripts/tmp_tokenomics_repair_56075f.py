from __future__ import annotations

from pathlib import Path

MODEL = Path("models/tokenomics/model.py")
TESTS = Path("models/tokenomics/test_review_regressions.py")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


model = MODEL.read_text(encoding="utf-8")

model = replace_once(
    model,
    "from dataclasses import asdict, dataclass\nfrom math import inf, isclose, isfinite\nfrom typing import Any\n",
    "from dataclasses import asdict, dataclass\nfrom decimal import Decimal\nfrom fractions import Fraction\nfrom math import inf, isfinite\nfrom typing import Any\n",
    "imports",
)

model = replace_once(
    model,
    "EPSILON = 1e-9\nREL_TOLERANCE = 1e-12\n",
    "EPSILON = 1e-9\n",
    "remove-relative-tolerance",
)

model = replace_once(
    model,
    "    allocation = config.burn_rate + config.security_fee_share + config.treasury_fee_share\n    if allocation != 1.0:\n        raise ValueError(\"burn + security + treasury fee shares must equal 1 exactly\")\n",
    "    # Validate the human/configured decimal shares without first collapsing a\n    # positive sub-ULP component through binary-float addition. The runtime\n    # allocation below is then derived conservatively from the remaining fee.\n    allocation = (\n        Decimal(str(config.burn_rate))\n        + Decimal(str(config.security_fee_share))\n        + Decimal(str(config.treasury_fee_share))\n    )\n    if allocation != Decimal(\"1\"):\n        raise ValueError(\"burn + security + treasury fee shares must equal 1 exactly\")\n",
    "fee-share-validation",
)

model = replace_once(
    model,
    "def _meets_required(actual: float, required: float) -> bool:\n    \"\"\"Scale-aware lower-bound comparison with no absolute token epsilon.\"\"\"\n    if required <= 0:\n        return True\n    if actual <= 0:\n        return False\n    return actual >= required or isclose(\n        actual,\n        required,\n        rel_tol=REL_TOLERANCE,\n        abs_tol=0.0,\n    )\n\n\n",
    "def _meets_required(actual: float, required: float) -> bool:\n    \"\"\"Conservative hard lower bound: below-threshold values never pass.\"\"\"\n    if required <= 0:\n        return True\n    return actual >= required\n\n\ndef _token_value_meets_required(\n    token_amounts: tuple[float, ...],\n    token_price_usd: float,\n    required_usd: float,\n    *,\n    required_multiplier: int = 1,\n) -> bool:\n    \"\"\"Compare represented float inputs exactly without product rounding-up.\"\"\"\n    if required_usd <= 0:\n        return True\n    actual_tokens = sum(\n        (Fraction.from_float(amount) for amount in token_amounts),\n        Fraction(0, 1),\n    )\n    actual_value = actual_tokens * Fraction.from_float(token_price_usd)\n    required_value = Fraction.from_float(required_usd) * required_multiplier\n    return actual_value >= required_value\n\n\n",
    "hard-floor-and-token-value-helper",
)

model = replace_once(
    model,
    "    validator_exit_residual_tokens = 0.0\n    usage_served = True\n",
    "    validator_exit_residual_tokens = 0.0\n    slashing_stake_residual_tokens = 0.0\n    slashing_supply_residual_tokens = 0.0\n    fee_burn_liquid_residual_tokens = 0.0\n    fee_burn_supply_residual_tokens = 0.0\n    usage_served = True\n    security_budget_adequate_all_days = True\n",
    "residual-state",
)

model = replace_once(
    model,
    "        daily_slashing_burn_tokens = min(\n            staked_tokens,\n            staked_tokens * config.slashing_burn_rate_per_day,\n        )\n        staked_tokens -= daily_slashing_burn_tokens\n        supply -= daily_slashing_burn_tokens\n",
    "        nominal_daily_slashing_tokens = min(\n            staked_tokens,\n            staked_tokens * config.slashing_burn_rate_per_day,\n        )\n\n        # Preserve destructive slashing smaller than the current float ULP.\n        # Bonded stake and total supply can have different ULPs, so each state\n        # carries its own signed error-feedback residual while consuming the\n        # same nominal slash target.\n        stake_slash_target = min(\n            staked_tokens,\n            max(nominal_daily_slashing_tokens + slashing_stake_residual_tokens, 0.0),\n        )\n        post_slash_staked_tokens = max(staked_tokens - stake_slash_target, 0.0)\n        actual_stake_slash_tokens = staked_tokens - post_slash_staked_tokens\n        slashing_stake_residual_tokens = (\n            nominal_daily_slashing_tokens\n            + slashing_stake_residual_tokens\n            - actual_stake_slash_tokens\n        )\n        if post_slash_staked_tokens <= 0.0:\n            slashing_stake_residual_tokens = 0.0\n\n        supply_slash_target = min(\n            supply,\n            max(nominal_daily_slashing_tokens + slashing_supply_residual_tokens, 0.0),\n        )\n        post_slash_supply_tokens = max(supply - supply_slash_target, 0.0)\n        daily_slashing_burn_tokens = supply - post_slash_supply_tokens\n        slashing_supply_residual_tokens = (\n            nominal_daily_slashing_tokens\n            + slashing_supply_residual_tokens\n            - daily_slashing_burn_tokens\n        )\n        if post_slash_supply_tokens <= 0.0:\n            slashing_supply_residual_tokens = 0.0\n\n        staked_tokens = post_slash_staked_tokens\n        supply = post_slash_supply_tokens\n",
    "slashing-residual",
)

model = replace_once(
    model,
    "        daily_burn_tokens = daily_fee_tokens * config.burn_rate\n        daily_security_fee_tokens = daily_fee_tokens * config.security_fee_share\n        daily_organic_security_fee_tokens = (\n            daily_organic_fee_tokens * config.security_fee_share\n        )\n        daily_treasury_tokens = daily_fee_tokens * config.treasury_fee_share\n\n        daily_burn_tokens = min(daily_burn_tokens, realizable_liquid_tokens)\n        supply -= daily_burn_tokens\n        realizable_liquid_tokens -= daily_burn_tokens\n        if supply < 0.0:\n            supply = 0.0\n        if realizable_liquid_tokens < 0.0:\n            realizable_liquid_tokens = 0.0\n        if staked_tokens > supply:\n            staked_tokens = supply\n",
    "        nominal_daily_burn_tokens = daily_fee_tokens * config.burn_rate\n        fee_tokens_after_burn = max(daily_fee_tokens - nominal_daily_burn_tokens, 0.0)\n        # Derive the final allocation from the remaining collected fee instead\n        # of independently adding three rounded products. This makes value\n        # creation impossible even at extreme magnitudes.\n        daily_security_fee_tokens = min(\n            daily_fee_tokens * config.security_fee_share,\n            fee_tokens_after_burn,\n        )\n        daily_treasury_tokens = max(\n            fee_tokens_after_burn - daily_security_fee_tokens,\n            0.0,\n        )\n        daily_organic_security_fee_tokens = (\n            daily_security_fee_tokens * config.organic_usage_fraction\n        )\n\n        # Preserve sub-ULP fee burns separately in total-supply and realizable\n        # liquid state. Each state carries the rounding error until it becomes\n        # representable; survival gates consume the corrected states.\n        liquid_burn_target = min(\n            realizable_liquid_tokens,\n            max(nominal_daily_burn_tokens + fee_burn_liquid_residual_tokens, 0.0),\n        )\n        post_burn_liquid_tokens = max(\n            realizable_liquid_tokens - liquid_burn_target,\n            0.0,\n        )\n        actual_liquid_burn_tokens = (\n            realizable_liquid_tokens - post_burn_liquid_tokens\n        )\n        fee_burn_liquid_residual_tokens = (\n            nominal_daily_burn_tokens\n            + fee_burn_liquid_residual_tokens\n            - actual_liquid_burn_tokens\n        )\n        if post_burn_liquid_tokens <= 0.0:\n            fee_burn_liquid_residual_tokens = 0.0\n\n        supply_burn_target = min(\n            supply,\n            max(nominal_daily_burn_tokens + fee_burn_supply_residual_tokens, 0.0),\n        )\n        post_burn_supply_tokens = max(supply - supply_burn_target, 0.0)\n        daily_burn_tokens = supply - post_burn_supply_tokens\n        fee_burn_supply_residual_tokens = (\n            nominal_daily_burn_tokens\n            + fee_burn_supply_residual_tokens\n            - daily_burn_tokens\n        )\n        if post_burn_supply_tokens <= 0.0:\n            fee_burn_supply_residual_tokens = 0.0\n\n        supply = post_burn_supply_tokens\n        realizable_liquid_tokens = post_burn_liquid_tokens\n        if staked_tokens > supply:\n            staked_tokens = supply\n",
    "fee-burn-residual-and-conservation",
)

model = replace_once(
    model,
    "        daily_security_budget_usd = (\n            realizable_security_fee_usd + realizable_emission_usd\n        )\n        daily_staked_value_usd = staked_tokens * token_price\n",
    "        daily_security_budget_usd = (\n            realizable_security_fee_usd + realizable_emission_usd\n        )\n        if not _token_value_meets_required(\n            (daily_realizable_security_fee_tokens, daily_realizable_emission_tokens),\n            token_price,\n            config.required_security_budget_usd_per_day,\n        ):\n            security_budget_adequate_all_days = False\n        daily_staked_value_usd = staked_tokens * token_price\n",
    "conservative-security-daily-gate",
)

model = replace_once(
    model,
    "    fee_affordable = actual_fee_usd_per_action <= config.max_affordable_fee_usd_per_action\n    security_budget_adequate = security_coverage >= 1.0\n    stake_adequate = stake_coverage >= 1.0\n",
    "    fee_affordable = actual_fee_usd_per_action <= config.max_affordable_fee_usd_per_action\n    security_budget_adequate = security_budget_adequate_all_days\n    stake_adequate = _token_value_meets_required(\n        (minimum_staked_tokens,),\n        token_price,\n        config.required_stake_value_usd,\n    )\n",
    "conservative-security-stake-gates",
)

model = replace_once(
    model,
    "    organic_fee_demand_present = average_organic_fee_usd > 0.0\n    organic_fee_revenue_adequate = _meets_required(\n        average_organic_fee_usd,\n        config.minimum_organic_fee_usd_per_day_for_survival,\n    )\n",
    "    organic_fee_demand_present = total_organic_fee_tokens > 0.0\n    organic_fee_revenue_adequate = _token_value_meets_required(\n        (total_organic_fee_tokens,),\n        token_price,\n        config.minimum_organic_fee_usd_per_day_for_survival,\n        required_multiplier=scenario.days,\n    )\n",
    "conservative-organic-fee-floor",
)

model = replace_once(
    model,
    "    next_day_slashing_burn_tokens = min(\n        next_day_after_exit_tokens,\n        next_day_after_exit_tokens * config.slashing_burn_rate_per_day,\n    )\n    next_day_staked_tokens = (\n        next_day_after_exit_tokens - next_day_slashing_burn_tokens\n    )\n",
    "    next_day_slashing_target_tokens = (\n        next_day_after_exit_tokens * config.slashing_burn_rate_per_day\n        + slashing_stake_residual_tokens\n    )\n    next_day_slashing_burn_tokens = min(\n        next_day_after_exit_tokens,\n        max(next_day_slashing_target_tokens, 0.0),\n    )\n    next_day_staked_tokens = (\n        next_day_after_exit_tokens - next_day_slashing_burn_tokens\n    )\n",
    "next-day-slashing-residual",
)

model = replace_once(
    model,
    "    next_day_stake_adequate = next_day_stake_coverage >= 1.0\n",
    "    next_day_stake_adequate = _token_value_meets_required(\n        (next_day_staked_tokens,),\n        token_price,\n        config.required_stake_value_usd,\n    )\n",
    "conservative-next-day-stake-gate",
)

MODEL.write_text(model, encoding="utf-8")

tests = TESTS.read_text(encoding="utf-8")
marker = '\n\nif __name__ == "__main__":\n    unittest.main()\n'
if tests.count(marker) != 1:
    raise RuntimeError("test insertion marker not unique")

new_tests = r'''

    def test_sub_ulp_fee_share_cannot_disappear_from_conservation_check(self) -> None:
        config = replace(
            EconomyConfig(),
            burn_rate=1.0,
            security_fee_share=4e-19,
            treasury_fee_share=0.0,
        )
        with self.assertRaisesRegex(ValueError, "must equal 1 exactly"):
            simulate(config, StressScenario(name="sub-ulp-fee-share", days=1))

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
'''

TESTS.write_text(tests.replace(marker, new_tests + marker, 1), encoding="utf-8")
