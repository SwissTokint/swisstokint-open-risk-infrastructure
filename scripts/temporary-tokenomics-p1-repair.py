from pathlib import Path

model_path = Path("models/tokenomics/model.py")
text = model_path.read_text()

old = '''    allocation = config.burn_rate + config.security_fee_share + config.treasury_fee_share
    if abs(allocation - 1.0) > EPSILON:
        raise ValueError("burn + security + treasury fee shares must equal 1")
'''
new = '''    allocation = config.burn_rate + config.security_fee_share + config.treasury_fee_share
    if allocation != 1.0:
        raise ValueError("burn + security + treasury fee shares must equal 1 exactly")
'''
assert old in text, "allocation validation anchor moved"
text = text.replace(old, new, 1)

old = '''    minimum_staked_tokens = staked_tokens
    minimum_staked_value_usd = staked_tokens * token_price
    usage_served = True
'''
new = '''    minimum_staked_tokens = staked_tokens
    minimum_staked_value_usd = staked_tokens * token_price
    validator_exit_residual_tokens = 0.0
    usage_served = True
'''
assert old in text, "validator exit residual initialization anchor moved"
text = text.replace(old, new, 1)

old = '''        daily_validator_exit_tokens = min(
            staked_tokens,
            staked_tokens * config.validator_exit_rate_per_day,
        )
        staked_tokens -= daily_validator_exit_tokens
        realizable_liquid_tokens += daily_validator_exit_tokens
'''
new = '''        daily_validator_exit_target_tokens = (
            staked_tokens * config.validator_exit_rate_per_day
            + validator_exit_residual_tokens
        )
        requested_validator_exit_tokens = min(
            staked_tokens,
            max(daily_validator_exit_target_tokens, 0.0),
        )
        post_exit_staked_tokens = max(
            staked_tokens - requested_validator_exit_tokens,
            0.0,
        )
        daily_validator_exit_tokens = staked_tokens - post_exit_staked_tokens
        validator_exit_residual_tokens = (
            daily_validator_exit_target_tokens - daily_validator_exit_tokens
        )
        if post_exit_staked_tokens <= 0.0:
            validator_exit_residual_tokens = 0.0
        staked_tokens = post_exit_staked_tokens
        realizable_liquid_tokens += daily_validator_exit_tokens
'''
assert old in text, "validator exit transition anchor moved"
text = text.replace(old, new, 1)

old = '''        collectible_fee_tokens = min(
            requested_fee_tokens,
            remaining_fee_velocity_tokens,
            max_fee_tokens_by_burn,
        )

        if fee_tokens_per_action > 0:
            executed_actions = collectible_fee_tokens / fee_tokens_per_action
        else:
            executed_actions = requested_actions_per_day

        executed_actions = min(executed_actions, requested_actions_per_day)
        if executed_actions < requested_actions_per_day:
            usage_served = False

        organic_executed_actions = executed_actions * config.organic_usage_fraction
        daily_fee_tokens = executed_actions * fee_tokens_per_action
        daily_organic_fee_tokens = organic_executed_actions * fee_tokens_per_action
'''
new = '''        collectible_fee_tokens = min(
            requested_fee_tokens,
            remaining_fee_velocity_tokens,
            max_fee_tokens_by_burn,
        )
        fee_capacity_served = collectible_fee_tokens >= requested_fee_tokens
        if not fee_capacity_served:
            usage_served = False

        if fee_tokens_per_action > 0:
            executed_actions = collectible_fee_tokens / fee_tokens_per_action
        else:
            executed_actions = requested_actions_per_day

        executed_actions = min(executed_actions, requested_actions_per_day)
        organic_executed_actions = executed_actions * config.organic_usage_fraction
        # Fee accounting follows the capacity-constrained token amount directly.
        # Reconstructing it from a rounded action quotient can recreate tokens
        # that were never collectible at large floating-point scales.
        daily_fee_tokens = collectible_fee_tokens
        daily_organic_fee_tokens = daily_fee_tokens * config.organic_usage_fraction
'''
assert old in text, "fee capacity/action rounding anchor moved"
text = text.replace(old, new, 1)

old = '''    next_day_validator_exit_tokens = min(
        staked_tokens,
        staked_tokens * config.validator_exit_rate_per_day,
    )
    next_day_after_exit_tokens = staked_tokens - next_day_validator_exit_tokens
'''
new = '''    next_day_validator_exit_target_tokens = (
        staked_tokens * config.validator_exit_rate_per_day
        + validator_exit_residual_tokens
    )
    next_day_requested_validator_exit_tokens = min(
        staked_tokens,
        max(next_day_validator_exit_target_tokens, 0.0),
    )
    next_day_after_exit_tokens = max(
        staked_tokens - next_day_requested_validator_exit_tokens,
        0.0,
    )
'''
assert old in text, "next-day validator exit anchor moved"
text = text.replace(old, new, 1)
model_path.write_text(text)

tests_path = Path("models/tokenomics/test_review_regressions.py")
tests = tests_path.read_text()
anchor = '''\n\nif __name__ == "__main__":\n    unittest.main()\n'''
assert anchor in tests, "test append anchor moved"
additions = r'''

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
'''
tests = tests.replace(anchor, additions + anchor, 1)
tests_path.write_text(tests)
