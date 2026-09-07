"""Deterministic POM-RX token-economics stress model.

This module is deliberately not a price model and does not predict investment
returns. It tests whether a proposed fee/burn/security allocation remains
mechanically viable under explicit price, usage, liquidity and staking shocks.

All state and comparisons that can affect a hard survival gate are evaluated
with the exact rational values represented by the finite float inputs. Floats are
created only for reporting compatibility. This prevents binary-float product,
quotient, accumulation, residual and capacity rounding from manufacturing a
PASS at extreme-but-finite scales.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from fractions import Fraction
from math import inf, isfinite
from typing import Any


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


_ZERO = Fraction(0, 1)
_ONE = Fraction(1, 1)
_HUNDRED = Fraction(100, 1)


def _q(value: float) -> Fraction:
    """Return the exact rational represented by one already-validated float."""
    return Fraction.from_float(value)


def _report(value: Fraction) -> float:
    """Best-effort reporting float; hard gates never consume this conversion."""
    try:
        return float(value)
    except OverflowError:
        if value > 0:
            return inf
        if value < 0:
            return -inf
        return 0.0


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

    fractions = {
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
    }
    for name, value in fractions.items():
        if not isfinite(value) or not 0 <= value <= 1:
            raise ValueError(f"{name} must be finite and between 0 and 1")

    exact_allocation = (
        _q(config.burn_rate)
        + _q(config.security_fee_share)
        + _q(config.treasury_fee_share)
    )
    if exact_allocation != _ONE:
        raise ValueError(
            "burn + security + treasury fee shares must equal 1 in exact represented arithmetic"
        )

    if config.fee_mode not in {"usd_indexed", "token_fixed"}:
        raise ValueError("fee_mode must be 'usd_indexed' or 'token_fixed'")


def simulate(config: EconomyConfig, scenario: StressScenario) -> SimulationResult:
    """Run a deterministic mechanical stress simulation with exact hard-gate state."""

    _validate(config, scenario)

    initial_supply = _q(config.initial_supply_tokens)
    initial_price = _q(config.initial_price_usd)
    price_multiplier = _q(scenario.price_multiplier)
    token_price = initial_price * price_multiplier

    daily_actions = _q(config.daily_actions)
    usage_multiplier = _q(scenario.usage_multiplier)
    requested_actions_per_day = daily_actions * usage_multiplier

    organic_fraction = _q(config.organic_usage_fraction)
    min_organic_fraction = _q(config.minimum_organic_usage_fraction_for_survival)
    min_organic_actions = _q(config.minimum_organic_actions_per_day_for_survival)
    min_organic_fee_usd = _q(config.minimum_organic_fee_usd_per_day_for_survival)

    burn_rate = _q(config.burn_rate)
    security_share = _q(config.security_fee_share)
    treasury_share = _q(config.treasury_fee_share)
    emission_realization_fraction = _q(config.emission_realization_fraction)
    security_fee_realization_fraction = _q(config.security_fee_realization_fraction)
    staked_fraction = _q(config.staked_fraction)
    exit_rate = _q(config.validator_exit_rate_per_day)
    slash_rate = _q(config.slashing_burn_rate_per_day)
    max_velocity = _q(config.max_daily_token_velocity)
    required_security_usd = _q(config.required_security_budget_usd_per_day)
    required_stake_usd = _q(config.required_stake_value_usd)
    max_affordable_fee_usd = _q(config.max_affordable_fee_usd_per_action)
    daily_emission_tokens = _q(config.daily_security_emission_tokens)

    if config.fee_mode == "usd_indexed":
        fee_usd_per_action = _q(config.fee_usd_per_action)
        actual_fee_usd_per_action = fee_usd_per_action
        fee_tokens_per_action = fee_usd_per_action / token_price
    else:
        fee_tokens_per_action = _q(config.fixed_token_fee_per_action)
        actual_fee_usd_per_action = fee_tokens_per_action * token_price

    fee_affordable = actual_fee_usd_per_action <= max_affordable_fee_usd

    supply = initial_supply
    initial_staked_tokens = supply * staked_fraction
    staked_tokens = initial_staked_tokens
    initial_realizable_liquid_tokens = supply - staked_tokens
    realizable_liquid_tokens = initial_realizable_liquid_tokens

    total_requested_actions = _ZERO
    total_executed_actions = _ZERO
    total_organic_executed_actions = _ZERO
    total_fee_tokens = _ZERO
    total_organic_fee_tokens = _ZERO
    total_burn_tokens = _ZERO
    total_security_fee_tokens = _ZERO
    total_organic_security_fee_tokens = _ZERO
    total_realizable_security_fee_tokens = _ZERO
    total_realizable_security_fee_usd = _ZERO
    total_security_emission_tokens = _ZERO
    total_realizable_security_emission_tokens = _ZERO
    total_realizable_security_emission_usd = _ZERO
    total_treasury_tokens = _ZERO
    total_validator_exit_tokens = _ZERO
    total_slashing_burn_tokens = _ZERO
    total_emission_realization_velocity_tokens = _ZERO
    total_fee_velocity_tokens = _ZERO
    total_security_fee_realization_velocity_tokens = _ZERO
    total_security_budget_usd = _ZERO
    total_gross_security_budget_usd = _ZERO

    minimum_security_budget_usd: Fraction | None = None
    minimum_gross_security_budget_usd: Fraction | None = None
    minimum_staked_tokens = staked_tokens
    minimum_staked_value_usd = staked_tokens * token_price
    usage_served = True
    security_budget_adequate_all_days = True

    for _ in range(scenario.days):
        total_requested_actions += requested_actions_per_day

        requested_realizable_emission_tokens = (
            daily_emission_tokens * emission_realization_fraction
        )
        supply += daily_emission_tokens

        daily_validator_exit_tokens = min(staked_tokens, staked_tokens * exit_rate)
        staked_tokens -= daily_validator_exit_tokens
        realizable_liquid_tokens += daily_validator_exit_tokens

        daily_slashing_burn_tokens = min(staked_tokens, staked_tokens * slash_rate)
        staked_tokens -= daily_slashing_burn_tokens
        supply -= daily_slashing_burn_tokens

        liquid_supply_before_realization = max(supply - staked_tokens, _ZERO)
        realizable_liquid_tokens = min(
            realizable_liquid_tokens,
            liquid_supply_before_realization,
        )

        provisional_liquid_inventory = min(
            realizable_liquid_tokens + requested_realizable_emission_tokens,
            liquid_supply_before_realization,
        )
        daily_velocity_capacity_tokens = provisional_liquid_inventory * max_velocity

        daily_realizable_emission_tokens = min(
            requested_realizable_emission_tokens,
            daily_velocity_capacity_tokens,
        )
        realizable_liquid_tokens = min(
            realizable_liquid_tokens + daily_realizable_emission_tokens,
            liquid_supply_before_realization,
        )
        remaining_fee_velocity_tokens = (
            daily_velocity_capacity_tokens - daily_realizable_emission_tokens
        )

        requested_fee_tokens = requested_actions_per_day * fee_tokens_per_action
        fee_capacity_candidates = [
            requested_fee_tokens,
            remaining_fee_velocity_tokens,
        ]
        if burn_rate > 0:
            fee_capacity_candidates.append(realizable_liquid_tokens / burn_rate)
        collectible_fee_tokens = max(min(fee_capacity_candidates), _ZERO)

        if collectible_fee_tokens < requested_fee_tokens:
            usage_served = False

        if fee_tokens_per_action > 0:
            executed_actions = collectible_fee_tokens / fee_tokens_per_action
        else:
            executed_actions = requested_actions_per_day
        executed_actions = min(executed_actions, requested_actions_per_day)

        organic_executed_actions = executed_actions * organic_fraction
        daily_fee_tokens = collectible_fee_tokens
        daily_organic_fee_tokens = daily_fee_tokens * organic_fraction

        daily_burn_tokens = daily_fee_tokens * burn_rate
        daily_security_fee_tokens = daily_fee_tokens * security_share
        daily_treasury_tokens = daily_fee_tokens * treasury_share

        if (
            daily_burn_tokens
            + daily_security_fee_tokens
            + daily_treasury_tokens
            != daily_fee_tokens
        ):
            raise AssertionError("exact fee partition lost conservation")

        daily_organic_security_fee_tokens = (
            daily_security_fee_tokens * organic_fraction
        )

        supply -= daily_burn_tokens
        realizable_liquid_tokens -= daily_burn_tokens
        if supply < 0 or realizable_liquid_tokens < 0:
            raise AssertionError("exact burn exceeded available state")
        if staked_tokens > supply:
            staked_tokens = supply

        remaining_security_realization_velocity = max(
            remaining_fee_velocity_tokens - daily_fee_tokens,
            _ZERO,
        )
        requested_realizable_security_fee_tokens = (
            daily_organic_security_fee_tokens * security_fee_realization_fraction
        )
        daily_realizable_security_fee_tokens = min(
            requested_realizable_security_fee_tokens,
            remaining_security_realization_velocity,
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
        if daily_security_budget_usd < required_security_usd:
            security_budget_adequate_all_days = False

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

    days_q = Fraction(scenario.days, 1)
    expected_ending_supply = (
        initial_supply
        + total_security_emission_tokens
        - total_burn_tokens
        - total_slashing_burn_tokens
    )
    accounting_error = supply - expected_ending_supply
    accounting_valid = accounting_error == 0

    average_security_budget = total_security_budget_usd / days_q
    average_gross_security_budget = total_gross_security_budget_usd / days_q
    minimum_security_budget = (
        minimum_security_budget_usd
        if minimum_security_budget_usd is not None
        else _ZERO
    )
    minimum_gross_security_budget = (
        minimum_gross_security_budget_usd
        if minimum_gross_security_budget_usd is not None
        else _ZERO
    )
    security_coverage = minimum_security_budget / required_security_usd
    stake_coverage = minimum_staked_value_usd / required_stake_usd

    security_budget_adequate = security_budget_adequate_all_days
    stake_adequate = minimum_staked_value_usd >= required_stake_usd
    total_unmet_actions = max(
        total_requested_actions - total_executed_actions,
        _ZERO,
    )

    organic_usage_share = (
        total_organic_executed_actions / total_executed_actions
        if total_executed_actions > 0
        else _ZERO
    )
    average_organic_executed_actions = (
        total_organic_executed_actions / days_q
    )
    average_organic_fee_usd = (
        total_organic_fee_tokens * token_price / days_q
    )
    organic_fee_demand_present = total_organic_fee_tokens > 0
    organic_fee_revenue_adequate = (
        average_organic_fee_usd >= min_organic_fee_usd
    )
    organic_usage_share_adequate = (
        organic_fee_demand_present
        and organic_usage_share >= min_organic_fraction
    )
    absolute_organic_demand_adequate = (
        average_organic_executed_actions >= min_organic_actions
    )
    organic_demand_adequate = (
        organic_usage_share_adequate
        and absolute_organic_demand_adequate
        and organic_fee_revenue_adequate
    )

    supply_positive = supply > 0
    ending_liquid_supply = max(supply - staked_tokens, _ZERO)

    requested_fee_tokens_per_day = (
        requested_actions_per_day * fee_tokens_per_action
    )
    next_day_requested_realizable_emission_tokens = (
        daily_emission_tokens * emission_realization_fraction
    )
    next_day_requested_security_fee_realization_tokens = (
        requested_fee_tokens_per_day
        * organic_fraction
        * security_share
        * security_fee_realization_fraction
    )
    required_for_shared_velocity = max(
        (
            next_day_requested_realizable_emission_tokens
            + requested_fee_tokens_per_day
            + next_day_requested_security_fee_realization_tokens
        )
        / max_velocity
        - next_day_requested_realizable_emission_tokens,
        _ZERO,
    )
    required_for_burn = requested_fee_tokens_per_day * burn_rate
    required_next_day_liquid_tokens = max(
        required_for_shared_velocity,
        required_for_burn,
    )
    ending_realizable_liquidity_usd = realizable_liquid_tokens * token_price
    required_next_day_liquidity_usd = (
        required_next_day_liquid_tokens * token_price
    )
    ending_liquidity_adequate = (
        required_next_day_liquid_tokens <= 0
        or realizable_liquid_tokens >= required_next_day_liquid_tokens
    )

    next_day_validator_exit_tokens = min(staked_tokens, staked_tokens * exit_rate)
    next_day_after_exit_tokens = staked_tokens - next_day_validator_exit_tokens
    next_day_slashing_burn_tokens = min(
        next_day_after_exit_tokens,
        next_day_after_exit_tokens * slash_rate,
    )
    next_day_staked_tokens = (
        next_day_after_exit_tokens - next_day_slashing_burn_tokens
    )
    next_day_staked_value_usd = next_day_staked_tokens * token_price
    next_day_stake_coverage = next_day_staked_value_usd / required_stake_usd
    next_day_stake_adequate = next_day_staked_value_usd >= required_stake_usd

    net_supply_change_pct = (
        (supply - initial_supply) / initial_supply * _HUNDRED
    )

    return SimulationResult(
        scenario=scenario.name,
        fee_mode=config.fee_mode,
        days=scenario.days,
        token_price_usd=_report(token_price),
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
        requested_actions_per_day=_report(requested_actions_per_day),
        average_executed_actions_per_day=_report(total_executed_actions / days_q),
        average_organic_executed_actions_per_day=_report(
            average_organic_executed_actions
        ),
        average_organic_fee_usd_per_day=_report(average_organic_fee_usd),
        total_requested_actions=_report(total_requested_actions),
        total_executed_actions=_report(total_executed_actions),
        total_unmet_actions=_report(total_unmet_actions),
        total_organic_executed_actions=_report(total_organic_executed_actions),
        organic_usage_share=_report(organic_usage_share),
        actual_fee_usd_per_action=_report(actual_fee_usd_per_action),
        total_fee_tokens=_report(total_fee_tokens),
        total_organic_fee_tokens=_report(total_organic_fee_tokens),
        total_burn_tokens=_report(total_burn_tokens),
        total_security_fee_tokens=_report(total_security_fee_tokens),
        total_organic_security_fee_tokens=_report(total_organic_security_fee_tokens),
        total_realizable_security_fee_tokens=_report(
            total_realizable_security_fee_tokens
        ),
        total_realizable_security_fee_usd=_report(total_realizable_security_fee_usd),
        total_security_emission_tokens=_report(total_security_emission_tokens),
        total_realizable_security_emission_tokens=_report(
            total_realizable_security_emission_tokens
        ),
        total_realizable_security_emission_usd=_report(
            total_realizable_security_emission_usd
        ),
        total_treasury_tokens=_report(total_treasury_tokens),
        total_validator_exit_tokens=_report(total_validator_exit_tokens),
        total_slashing_burn_tokens=_report(total_slashing_burn_tokens),
        total_emission_realization_velocity_tokens=_report(
            total_emission_realization_velocity_tokens
        ),
        total_fee_velocity_tokens=_report(total_fee_velocity_tokens),
        total_security_fee_realization_velocity_tokens=_report(
            total_security_fee_realization_velocity_tokens
        ),
        starting_supply_tokens=config.initial_supply_tokens,
        ending_supply_tokens=_report(supply),
        initial_staked_tokens=_report(initial_staked_tokens),
        ending_staked_tokens=_report(staked_tokens),
        minimum_staked_tokens=_report(minimum_staked_tokens),
        next_day_staked_tokens=_report(next_day_staked_tokens),
        initial_realizable_liquid_tokens=_report(initial_realizable_liquid_tokens),
        ending_liquid_supply_tokens=_report(ending_liquid_supply),
        ending_realizable_liquid_tokens=_report(realizable_liquid_tokens),
        required_next_day_liquid_tokens=_report(required_next_day_liquid_tokens),
        required_next_day_liquidity_usd=_report(required_next_day_liquidity_usd),
        ending_realizable_liquidity_usd=_report(ending_realizable_liquidity_usd),
        net_supply_change_pct=_report(net_supply_change_pct),
        supply_accounting_error_tokens=_report(accounting_error),
        average_security_budget_usd_per_day=_report(average_security_budget),
        minimum_security_budget_usd_per_day=_report(minimum_security_budget),
        average_gross_security_budget_usd_per_day=_report(
            average_gross_security_budget
        ),
        minimum_gross_security_budget_usd_per_day=_report(
            minimum_gross_security_budget
        ),
        security_coverage_ratio=_report(security_coverage),
        minimum_staked_value_usd=_report(minimum_staked_value_usd),
        stake_coverage_ratio=_report(stake_coverage),
        next_day_staked_value_usd=_report(next_day_staked_value_usd),
        next_day_stake_coverage_ratio=_report(next_day_stake_coverage),
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
    if not isfinite(burn_rate) or not 0 <= burn_rate <= 1:
        raise ValueError("burn_rate must be finite and between 0 and 1")
    if (
        not isfinite(security_fraction_of_remainder)
        or not 0 <= security_fraction_of_remainder <= 1
    ):
        raise ValueError(
            "security_fraction_of_remainder must be finite and between 0 and 1"
        )

    burn = _q(burn_rate)
    security_fraction = _q(security_fraction_of_remainder)
    remainder = _ONE - burn
    security_share = remainder * security_fraction
    treasury_share = remainder - security_share
    return _report(security_share), _report(treasury_share)
