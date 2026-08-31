"""Deterministic POM-RX token-economics stress model.

This module is deliberately not a price model and does not predict investment
returns. It tests whether a proposed fee/burn/security allocation remains
mechanically viable under explicit price, usage, liquidity and staking shocks.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import inf, isclose, isfinite
from typing import Any


EPSILON = 1e-9
REL_TOLERANCE = 1e-12


@dataclass(frozen=True)
class EconomyConfig:
    initial_supply_tokens: float = 100_000_000.0
    initial_price_usd: float = 1.0
    daily_actions: float = 10_000.0
    organic_usage_fraction: float = 1.0
    minimum_organic_usage_fraction_for_survival: float = 0.10
    minimum_organic_actions_per_day_for_survival: float = 1_000.0
    minimum_organic_fee_usd_per_day_for_survival: float = 1.0
    fee_mode: str = "usd_indexed"
    fee_usd_per_action: float = 0.10
    fixed_token_fee_per_action: float = 0.10
    burn_rate: float = 0.25
    security_fee_share: float = 0.5625
    treasury_fee_share: float = 0.1875
    daily_security_emission_tokens: float = 1_000.0
    emission_realization_fraction: float = 0.0
    security_fee_realization_fraction: float = 0.0
    staked_fraction: float = 0.35
    validator_exit_rate_per_day: float = 0.0
    required_stake_value_usd: float = 1_000_000.0
    max_daily_token_velocity: float = 1.0
    slashing_burn_rate_per_day: float = 0.0
    required_security_budget_usd_per_day: float = 1_000.0
    max_affordable_fee_usd_per_action: float = 1.0


@dataclass(frozen=True)
class StressScenario:
    name: str
    days: int = 365
    price_multiplier: float = 1.0
    usage_multiplier: float = 1.0


@dataclass(frozen=True)
class SimulationResult:
    scenario: str
    fee_mode: str
    days: int
    token_price_usd: float
    configured_staked_fraction: float
    validator_exit_rate_per_day: float
    slashing_burn_rate_per_day: float
    emission_realization_fraction: float
    security_fee_realization_fraction: float
    minimum_organic_usage_fraction_for_survival: float
    minimum_organic_actions_per_day_for_survival: float
    minimum_organic_fee_usd_per_day_for_survival: float
    requested_actions_per_day: float
    average_executed_actions_per_day: float
    average_organic_executed_actions_per_day: float
    average_organic_fee_usd_per_day: float
    total_requested_actions: float
    total_executed_actions: float
    total_unmet_actions: float
    total_organic_executed_actions: float
    organic_usage_share: float
    actual_fee_usd_per_action: float
    total_fee_tokens: float
    total_organic_fee_tokens: float
    total_burn_tokens: float
    total_security_fee_tokens: float
    total_organic_security_fee_tokens: float
    total_realizable_security_fee_tokens: float
    total_realizable_security_fee_usd: float
    total_security_emission_tokens: float
    total_realizable_security_emission_tokens: float
    total_realizable_security_emission_usd: float
    total_treasury_tokens: float
    total_validator_exit_tokens: float
    total_slashing_burn_tokens: float
    total_emission_realization_velocity_tokens: float
    total_fee_velocity_tokens: float
    total_security_fee_realization_velocity_tokens: float
    starting_supply_tokens: float
    ending_supply_tokens: float
    initial_staked_tokens: float
    ending_staked_tokens: float
    minimum_staked_tokens: float
    next_day_staked_tokens: float
    initial_realizable_liquid_tokens: float
    ending_liquid_supply_tokens: float
    ending_realizable_liquid_tokens: float
    required_next_day_liquid_tokens: float
    required_next_day_liquidity_usd: float
    ending_realizable_liquidity_usd: float
    net_supply_change_pct: float
    supply_accounting_error_tokens: float
    average_security_budget_usd_per_day: float
    minimum_security_budget_usd_per_day: float
    average_gross_security_budget_usd_per_day: float
    minimum_gross_security_budget_usd_per_day: float
    security_coverage_ratio: float
    minimum_staked_value_usd: float
    stake_coverage_ratio: float
    next_day_staked_value_usd: float
    next_day_stake_coverage_ratio: float
    fee_affordable: bool
    security_budget_adequate: bool
    stake_adequate: bool
    next_day_stake_adequate: bool
    ending_liquidity_adequate: bool
    usage_served: bool
    organic_fee_demand_present: bool
    organic_fee_revenue_adequate: bool
    organic_usage_share_adequate: bool
    absolute_organic_demand_adequate: bool
    organic_demand_adequate: bool
    supply_positive: bool
    accounting_valid: bool
    economic_survival: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _validate(config: EconomyConfig, scenario: StressScenario) -> None:
    positive_fields = {
        "initial_supply_tokens": config.initial_supply_tokens,
        "initial_price_usd": config.initial_price_usd,
        "daily_actions": config.daily_actions,
        "required_security_budget_usd_per_day": config.required_security_budget_usd_per_day,
        "required_stake_value_usd": config.required_stake_value_usd,
        "max_affordable_fee_usd_per_action": config.max_affordable_fee_usd_per_action,
        "max_daily_token_velocity": config.max_daily_token_velocity,
        "days": float(scenario.days),
        "price_multiplier": scenario.price_multiplier,
    }
    for name, value in positive_fields.items():
        if not isfinite(value) or value <= 0:
            raise ValueError(f"{name} must be finite and > 0")

    nonnegative_fields = {
        "usage_multiplier": scenario.usage_multiplier,
        "minimum_organic_actions_per_day_for_survival": (
            config.minimum_organic_actions_per_day_for_survival
        ),
        "minimum_organic_fee_usd_per_day_for_survival": (
            config.minimum_organic_fee_usd_per_day_for_survival
        ),
        "fee_usd_per_action": config.fee_usd_per_action,
        "fixed_token_fee_per_action": config.fixed_token_fee_per_action,
        "daily_security_emission_tokens": config.daily_security_emission_tokens,
    }
    for name, value in nonnegative_fields.items():
        if not isfinite(value) or value < 0:
            raise ValueError(f"{name} must be finite and >= 0")

    for name, value in {
        "burn_rate": config.burn_rate,
        "security_fee_share": config.security_fee_share,
        "treasury_fee_share": config.treasury_fee_share,
        "emission_realization_fraction": config.emission_realization_fraction,
        "security_fee_realization_fraction": config.security_fee_realization_fraction,
        "staked_fraction": config.staked_fraction,
        "organic_usage_fraction": config.organic_usage_fraction,
        "minimum_organic_usage_fraction_for_survival": (
            config.minimum_organic_usage_fraction_for_survival
        ),
        "validator_exit_rate_per_day": config.validator_exit_rate_per_day,
        "slashing_burn_rate_per_day": config.slashing_burn_rate_per_day,
    }.items():
        if not isfinite(value) or not 0 <= value <= 1:
            raise ValueError(f"{name} must be finite and between 0 and 1")

    allocation = config.burn_rate + config.security_fee_share + config.treasury_fee_share
    if abs(allocation - 1.0) > EPSILON:
        raise ValueError("burn + security + treasury fee shares must equal 1")

    if config.fee_mode not in {"usd_indexed", "token_fixed"}:
        raise ValueError("fee_mode must be 'usd_indexed' or 'token_fixed'")


def _meets_required(actual: float, required: float) -> bool:
    """Scale-aware lower-bound comparison with no absolute token epsilon."""
    if required <= 0:
        return True
    if actual <= 0:
        return False
    return actual >= required or isclose(
        actual,
        required,
        rel_tol=REL_TOLERANCE,
        abs_tol=0.0,
    )


def simulate(config: EconomyConfig, scenario: StressScenario) -> SimulationResult:
    """Run a deterministic mechanical stress simulation.

    Token price is an explicit scenario input, never an endogenous prediction.
    Bonded stake is tracked separately from liquid inventory. Validator exits
    unbond stake without destroying supply; slashing destroys bonded stake.

    Emission sales, fee turnover and realization of security-fee rewards all
    consume one shared daily token-velocity budget. Merely receiving a token as a
    protocol fee is therefore not treated as realizable USD security funding.
    Fee-funded security tokens contribute to the conservative USD budget only to
    the explicit ``security_fee_realization_fraction`` and only when remaining
    velocity permits a distinct realization transfer. Both realization fractions
    default to zero so the baseline does not silently assume external buyers.
    """

    _validate(config, scenario)

    token_price = config.initial_price_usd * scenario.price_multiplier
    if not isfinite(token_price) or token_price <= 0:
        raise ValueError("token_price_usd must remain finite and > 0")

    requested_actions_per_day = config.daily_actions * scenario.usage_multiplier
    if not isfinite(requested_actions_per_day) or requested_actions_per_day < 0:
        raise ValueError("requested_actions_per_day must remain finite and >= 0")

    if config.fee_mode == "usd_indexed":
        actual_fee_usd_per_action = config.fee_usd_per_action
        fee_tokens_per_action = config.fee_usd_per_action / token_price
    else:
        fee_tokens_per_action = config.fixed_token_fee_per_action
        actual_fee_usd_per_action = fee_tokens_per_action * token_price

    if not isfinite(actual_fee_usd_per_action):
        raise ValueError("actual_fee_usd_per_action must remain finite")
    if not isfinite(fee_tokens_per_action):
        raise ValueError("fee_tokens_per_action must remain finite")

    supply = config.initial_supply_tokens
    initial_staked_tokens = supply * config.staked_fraction
    staked_tokens = initial_staked_tokens
    initial_realizable_liquid_tokens = max(supply - staked_tokens, 0.0)
    realizable_liquid_tokens = initial_realizable_liquid_tokens

    total_requested_actions = 0.0
    total_executed_actions = 0.0
    total_organic_executed_actions = 0.0
    total_fee_tokens = 0.0
    total_organic_fee_tokens = 0.0
    total_burn_tokens = 0.0
    total_security_fee_tokens = 0.0
    total_organic_security_fee_tokens = 0.0
    total_realizable_security_fee_tokens = 0.0
    total_realizable_security_fee_usd = 0.0
    total_security_emission_tokens = 0.0
    total_realizable_security_emission_tokens = 0.0
    total_realizable_security_emission_usd = 0.0
    total_treasury_tokens = 0.0
    total_validator_exit_tokens = 0.0
    total_slashing_burn_tokens = 0.0
    total_emission_realization_velocity_tokens = 0.0
    total_fee_velocity_tokens = 0.0
    total_security_fee_realization_velocity_tokens = 0.0
    total_security_budget_usd = 0.0
    total_gross_security_budget_usd = 0.0
    minimum_security_budget_usd: float | None = None
    minimum_gross_security_budget_usd: float | None = None
    minimum_staked_tokens = staked_tokens
    minimum_staked_value_usd = staked_tokens * token_price
    usage_served = True

    for _ in range(scenario.days):
        total_requested_actions += requested_actions_per_day

        daily_emission_tokens = config.daily_security_emission_tokens
        requested_realizable_emission_tokens = (
            daily_emission_tokens * config.emission_realization_fraction
        )
        supply += daily_emission_tokens

        daily_validator_exit_tokens = min(
            staked_tokens,
            staked_tokens * config.validator_exit_rate_per_day,
        )
        staked_tokens -= daily_validator_exit_tokens
        realizable_liquid_tokens += daily_validator_exit_tokens

        daily_slashing_burn_tokens = min(
            staked_tokens,
            staked_tokens * config.slashing_burn_rate_per_day,
        )
        staked_tokens -= daily_slashing_burn_tokens
        supply -= daily_slashing_burn_tokens

        liquid_supply_before_emission_realization = max(supply - staked_tokens, 0.0)
        realizable_liquid_tokens = min(
            realizable_liquid_tokens,
            liquid_supply_before_emission_realization,
        )
        provisional_liquid_inventory = min(
            realizable_liquid_tokens + requested_realizable_emission_tokens,
            liquid_supply_before_emission_realization,
        )
        daily_velocity_capacity_tokens = (
            provisional_liquid_inventory * config.max_daily_token_velocity
        )
        daily_realizable_emission_tokens = min(
            requested_realizable_emission_tokens,
            daily_velocity_capacity_tokens,
        )
        realizable_liquid_tokens = min(
            realizable_liquid_tokens + daily_realizable_emission_tokens,
            liquid_supply_before_emission_realization,
        )
        remaining_fee_velocity_tokens = max(
            daily_velocity_capacity_tokens - daily_realizable_emission_tokens,
            0.0,
        )

        requested_fee_tokens = requested_actions_per_day * fee_tokens_per_action
        if not isfinite(requested_fee_tokens):
            raise ValueError("requested_fee_tokens must remain finite")

        max_fee_tokens_by_burn = (
            realizable_liquid_tokens / config.burn_rate
            if config.burn_rate > 0
            else inf
        )
        collectible_fee_tokens = min(
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
        daily_burn_tokens = daily_fee_tokens * config.burn_rate
        daily_security_fee_tokens = daily_fee_tokens * config.security_fee_share
        daily_organic_security_fee_tokens = (
            daily_organic_fee_tokens * config.security_fee_share
        )
        daily_treasury_tokens = daily_fee_tokens * config.treasury_fee_share

        daily_burn_tokens = min(daily_burn_tokens, realizable_liquid_tokens)
        supply -= daily_burn_tokens
        realizable_liquid_tokens -= daily_burn_tokens
        if supply < 0.0:
            supply = 0.0
        if realizable_liquid_tokens < 0.0:
            realizable_liquid_tokens = 0.0
        if staked_tokens > supply:
            staked_tokens = supply

        remaining_security_fee_realization_velocity_tokens = max(
            remaining_fee_velocity_tokens - daily_fee_tokens,
            0.0,
        )
        requested_realizable_security_fee_tokens = (
            daily_organic_security_fee_tokens
            * config.security_fee_realization_fraction
        )
        daily_realizable_security_fee_tokens = min(
            requested_realizable_security_fee_tokens,
            remaining_security_fee_realization_velocity_tokens,
        )

        realizable_emission_usd = daily_realizable_emission_tokens * token_price
        realizable_security_fee_usd = (
            daily_realizable_security_fee_tokens * token_price
        )
        daily_gross_security_budget_usd = (
            daily_security_fee_tokens * token_price + realizable_emission_usd
        )
        daily_security_budget_usd = (
            realizable_security_fee_usd + realizable_emission_usd
        )
        daily_staked_value_usd = staked_tokens * token_price

        total_executed_actions += executed_actions
        total_organic_executed_actions += organic_executed_actions
        total_fee_tokens += daily_fee_tokens
        total_organic_fee_tokens += daily_organic_fee_tokens
        total_burn_tokens += daily_burn_tokens
        total_security_fee_tokens += daily_security_fee_tokens
        total_organic_security_fee_tokens += daily_organic_security_fee_tokens
        total_realizable_security_fee_tokens += daily_realizable_security_fee_tokens
        total_realizable_security_fee_usd += realizable_security_fee_usd
        total_security_emission_tokens += daily_emission_tokens
        total_realizable_security_emission_tokens += daily_realizable_emission_tokens
        total_realizable_security_emission_usd += realizable_emission_usd
        total_treasury_tokens += daily_treasury_tokens
        total_validator_exit_tokens += daily_validator_exit_tokens
        total_slashing_burn_tokens += daily_slashing_burn_tokens
        total_emission_realization_velocity_tokens += daily_realizable_emission_tokens
        total_fee_velocity_tokens += daily_fee_tokens
        total_security_fee_realization_velocity_tokens += (
            daily_realizable_security_fee_tokens
        )
        total_security_budget_usd += daily_security_budget_usd
        total_gross_security_budget_usd += daily_gross_security_budget_usd
        minimum_security_budget_usd = (
            daily_security_budget_usd
            if minimum_security_budget_usd is None
            else min(minimum_security_budget_usd, daily_security_budget_usd)
        )
        minimum_gross_security_budget_usd = (
            daily_gross_security_budget_usd
            if minimum_gross_security_budget_usd is None
            else min(minimum_gross_security_budget_usd, daily_gross_security_budget_usd)
        )
        minimum_staked_tokens = min(minimum_staked_tokens, staked_tokens)
        minimum_staked_value_usd = min(
            minimum_staked_value_usd,
            daily_staked_value_usd,
        )

    expected_ending_supply = (
        config.initial_supply_tokens
        + total_security_emission_tokens
        - total_burn_tokens
        - total_slashing_burn_tokens
    )
    accounting_error = supply - expected_ending_supply
    average_security_budget = total_security_budget_usd / scenario.days
    average_gross_security_budget = total_gross_security_budget_usd / scenario.days
    minimum_security_budget = (
        minimum_security_budget_usd if minimum_security_budget_usd is not None else 0.0
    )
    minimum_gross_security_budget = (
        minimum_gross_security_budget_usd
        if minimum_gross_security_budget_usd is not None
        else 0.0
    )
    security_coverage = (
        minimum_security_budget / config.required_security_budget_usd_per_day
    )
    stake_coverage = minimum_staked_value_usd / config.required_stake_value_usd

    fee_affordable = actual_fee_usd_per_action <= config.max_affordable_fee_usd_per_action
    security_budget_adequate = security_coverage >= 1.0
    stake_adequate = stake_coverage >= 1.0
    total_unmet_actions = max(total_requested_actions - total_executed_actions, 0.0)

    organic_usage_share = (
        total_organic_executed_actions / total_executed_actions
        if total_executed_actions > EPSILON
        else 0.0
    )
    average_organic_executed_actions = (
        total_organic_executed_actions / scenario.days
    )
    average_organic_fee_usd = (
        total_organic_fee_tokens * token_price / scenario.days
    )
    organic_fee_demand_present = average_organic_fee_usd > 0.0
    organic_fee_revenue_adequate = _meets_required(
        average_organic_fee_usd,
        config.minimum_organic_fee_usd_per_day_for_survival,
    )
    organic_usage_share_adequate = (
        organic_fee_demand_present
        and _meets_required(
            organic_usage_share,
            config.minimum_organic_usage_fraction_for_survival,
        )
    )
    absolute_organic_demand_adequate = _meets_required(
        average_organic_executed_actions,
        config.minimum_organic_actions_per_day_for_survival,
    )
    organic_demand_adequate = (
        organic_usage_share_adequate
        and absolute_organic_demand_adequate
        and organic_fee_revenue_adequate
    )
    supply_positive = supply > EPSILON
    accounting_valid = abs(accounting_error) <= 1e-6
    ending_liquid_supply = max(supply - staked_tokens, 0.0)

    requested_fee_tokens_per_day = requested_actions_per_day * fee_tokens_per_action
    next_day_requested_realizable_emission_tokens = (
        config.daily_security_emission_tokens * config.emission_realization_fraction
    )
    next_day_requested_security_fee_realization_tokens = (
        requested_fee_tokens_per_day
        * config.organic_usage_fraction
        * config.security_fee_share
        * config.security_fee_realization_fraction
    )
    required_for_shared_velocity = max(
        (
            next_day_requested_realizable_emission_tokens
            + requested_fee_tokens_per_day
            + next_day_requested_security_fee_realization_tokens
        )
        / config.max_daily_token_velocity
        - next_day_requested_realizable_emission_tokens,
        0.0,
    )
    required_for_burn = requested_fee_tokens_per_day * config.burn_rate
    required_next_day_liquid_tokens = max(
        required_for_shared_velocity,
        required_for_burn,
    )
    ending_realizable_liquidity_usd = realizable_liquid_tokens * token_price
    required_next_day_liquidity_usd = required_next_day_liquid_tokens * token_price
    ending_liquidity_adequate = (
        required_next_day_liquid_tokens <= 0.0
        or realizable_liquid_tokens >= required_next_day_liquid_tokens
    )

    next_day_validator_exit_tokens = min(
        staked_tokens,
        staked_tokens * config.validator_exit_rate_per_day,
    )
    next_day_after_exit_tokens = staked_tokens - next_day_validator_exit_tokens
    next_day_slashing_burn_tokens = min(
        next_day_after_exit_tokens,
        next_day_after_exit_tokens * config.slashing_burn_rate_per_day,
    )
    next_day_staked_tokens = (
        next_day_after_exit_tokens - next_day_slashing_burn_tokens
    )
    next_day_staked_value_usd = next_day_staked_tokens * token_price
    next_day_stake_coverage = (
        next_day_staked_value_usd / config.required_stake_value_usd
    )
    next_day_stake_adequate = next_day_stake_coverage >= 1.0

    return SimulationResult(
        scenario=scenario.name,
        fee_mode=config.fee_mode,
        days=scenario.days,
        token_price_usd=token_price,
        configured_staked_fraction=config.staked_fraction,
        validator_exit_rate_per_day=config.validator_exit_rate_per_day,
        slashing_burn_rate_per_day=config.slashing_burn_rate_per_day,
        emission_realization_fraction=config.emission_realization_fraction,
        security_fee_realization_fraction=config.security_fee_realization_fraction,
        minimum_organic_usage_fraction_for_survival=(
            config.minimum_organic_usage_fraction_for_survival
        ),
        minimum_organic_actions_per_day_for_survival=(
            config.minimum_organic_actions_per_day_for_survival
        ),
        minimum_organic_fee_usd_per_day_for_survival=(
            config.minimum_organic_fee_usd_per_day_for_survival
        ),
        requested_actions_per_day=requested_actions_per_day,
        average_executed_actions_per_day=total_executed_actions / scenario.days,
        average_organic_executed_actions_per_day=average_organic_executed_actions,
        average_organic_fee_usd_per_day=average_organic_fee_usd,
        total_requested_actions=total_requested_actions,
        total_executed_actions=total_executed_actions,
        total_unmet_actions=total_unmet_actions,
        total_organic_executed_actions=total_organic_executed_actions,
        organic_usage_share=organic_usage_share,
        actual_fee_usd_per_action=actual_fee_usd_per_action,
        total_fee_tokens=total_fee_tokens,
        total_organic_fee_tokens=total_organic_fee_tokens,
        total_burn_tokens=total_burn_tokens,
        total_security_fee_tokens=total_security_fee_tokens,
        total_organic_security_fee_tokens=total_organic_security_fee_tokens,
        total_realizable_security_fee_tokens=total_realizable_security_fee_tokens,
        total_realizable_security_fee_usd=total_realizable_security_fee_usd,
        total_security_emission_tokens=total_security_emission_tokens,
        total_realizable_security_emission_tokens=total_realizable_security_emission_tokens,
        total_realizable_security_emission_usd=total_realizable_security_emission_usd,
        total_treasury_tokens=total_treasury_tokens,
        total_validator_exit_tokens=total_validator_exit_tokens,
        total_slashing_burn_tokens=total_slashing_burn_tokens,
        total_emission_realization_velocity_tokens=(
            total_emission_realization_velocity_tokens
        ),
        total_fee_velocity_tokens=total_fee_velocity_tokens,
        total_security_fee_realization_velocity_tokens=(
            total_security_fee_realization_velocity_tokens
        ),
        starting_supply_tokens=config.initial_supply_tokens,
        ending_supply_tokens=supply,
        initial_staked_tokens=initial_staked_tokens,
        ending_staked_tokens=staked_tokens,
        minimum_staked_tokens=minimum_staked_tokens,
        next_day_staked_tokens=next_day_staked_tokens,
        initial_realizable_liquid_tokens=initial_realizable_liquid_tokens,
        ending_liquid_supply_tokens=ending_liquid_supply,
        ending_realizable_liquid_tokens=realizable_liquid_tokens,
        required_next_day_liquid_tokens=required_next_day_liquid_tokens,
        required_next_day_liquidity_usd=required_next_day_liquidity_usd,
        ending_realizable_liquidity_usd=ending_realizable_liquidity_usd,
        net_supply_change_pct=(
            (supply - config.initial_supply_tokens)
            / config.initial_supply_tokens
            * 100.0
        ),
        supply_accounting_error_tokens=accounting_error,
        average_security_budget_usd_per_day=average_security_budget,
        minimum_security_budget_usd_per_day=minimum_security_budget,
        average_gross_security_budget_usd_per_day=average_gross_security_budget,
        minimum_gross_security_budget_usd_per_day=minimum_gross_security_budget,
        security_coverage_ratio=security_coverage,
        minimum_staked_value_usd=minimum_staked_value_usd,
        stake_coverage_ratio=stake_coverage,
        next_day_staked_value_usd=next_day_staked_value_usd,
        next_day_stake_coverage_ratio=next_day_stake_coverage,
        fee_affordable=fee_affordable,
        security_budget_adequate=security_budget_adequate,
        stake_adequate=stake_adequate,
        next_day_stake_adequate=next_day_stake_adequate,
        ending_liquidity_adequate=ending_liquidity_adequate,
        usage_served=usage_served,
        organic_fee_demand_present=organic_fee_demand_present,
        organic_fee_revenue_adequate=organic_fee_revenue_adequate,
        organic_usage_share_adequate=organic_usage_share_adequate,
        absolute_organic_demand_adequate=absolute_organic_demand_adequate,
        organic_demand_adequate=organic_demand_adequate,
        supply_positive=supply_positive,
        accounting_valid=accounting_valid,
        economic_survival=(
            fee_affordable
            and security_budget_adequate
            and stake_adequate
            and next_day_stake_adequate
            and ending_liquidity_adequate
            and usage_served
            and organic_demand_adequate
            and supply_positive
            and accounting_valid
        ),
    )


def allocation_for_burn(
    burn_rate: float,
    security_fraction_of_remainder: float = 0.75,
) -> tuple[float, float]:
    """Allocate non-burn fee share between security and treasury."""
    if not 0 <= burn_rate <= 1:
        raise ValueError("burn_rate must be between 0 and 1")
    if not 0 <= security_fraction_of_remainder <= 1:
        raise ValueError("security_fraction_of_remainder must be between 0 and 1")

    remainder = 1.0 - burn_rate
    security_share = remainder * security_fraction_of_remainder
    treasury_share = remainder - security_share
    return security_share, treasury_share
