"""Deterministic POM-RX token-economics stress model.

This module is deliberately not a price model and does not predict investment
returns. It tests whether a proposed fee/burn/security allocation remains
mechanically viable under explicit price and usage shocks.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class EconomyConfig:
    initial_supply_tokens: float = 100_000_000.0
    initial_price_usd: float = 1.0
    daily_actions: float = 10_000.0
    fee_mode: str = "usd_indexed"
    fee_usd_per_action: float = 0.10
    fixed_token_fee_per_action: float = 0.10
    burn_rate: float = 0.25
    security_fee_share: float = 0.5625
    treasury_fee_share: float = 0.1875
    daily_security_emission_tokens: float = 1_000.0
    staked_fraction: float = 0.35
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
    actions_per_day: float
    actual_fee_usd_per_action: float
    total_fee_tokens: float
    total_burn_tokens: float
    total_security_fee_tokens: float
    total_security_emission_tokens: float
    total_treasury_tokens: float
    total_slashing_burn_tokens: float
    starting_supply_tokens: float
    ending_supply_tokens: float
    net_supply_change_pct: float
    average_security_budget_usd_per_day: float
    security_coverage_ratio: float
    fee_affordable: bool
    security_budget_adequate: bool
    supply_positive: bool
    economic_survival: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _validate(config: EconomyConfig, scenario: StressScenario) -> None:
    positive_fields = {
        "initial_supply_tokens": config.initial_supply_tokens,
        "initial_price_usd": config.initial_price_usd,
        "daily_actions": config.daily_actions,
        "required_security_budget_usd_per_day": config.required_security_budget_usd_per_day,
        "max_affordable_fee_usd_per_action": config.max_affordable_fee_usd_per_action,
        "days": float(scenario.days),
        "price_multiplier": scenario.price_multiplier,
    }
    for name, value in positive_fields.items():
        if value <= 0:
            raise ValueError(f"{name} must be > 0")

    if scenario.usage_multiplier < 0:
        raise ValueError("usage_multiplier must be >= 0")

    for name, value in {
        "burn_rate": config.burn_rate,
        "security_fee_share": config.security_fee_share,
        "treasury_fee_share": config.treasury_fee_share,
        "staked_fraction": config.staked_fraction,
        "slashing_burn_rate_per_day": config.slashing_burn_rate_per_day,
    }.items():
        if not 0 <= value <= 1:
            raise ValueError(f"{name} must be between 0 and 1")

    allocation = config.burn_rate + config.security_fee_share + config.treasury_fee_share
    if abs(allocation - 1.0) > 1e-9:
        raise ValueError("burn + security + treasury fee shares must equal 1")

    if config.fee_mode not in {"usd_indexed", "token_fixed"}:
        raise ValueError("fee_mode must be 'usd_indexed' or 'token_fixed'")
    if config.fee_usd_per_action < 0 or config.fixed_token_fee_per_action < 0:
        raise ValueError("fees must be >= 0")
    if config.daily_security_emission_tokens < 0:
        raise ValueError("daily_security_emission_tokens must be >= 0")


def simulate(config: EconomyConfig, scenario: StressScenario) -> SimulationResult:
    """Run a deterministic mechanical stress simulation.

    Token price is an explicit scenario input, never an endogenous prediction.
    The security budget is the USD value of fee-funded security rewards plus
    explicit security emissions. Slashing burn is modeled as a fraction of the
    currently staked supply and is intentionally configurable to zero.
    """

    _validate(config, scenario)

    token_price = config.initial_price_usd * scenario.price_multiplier
    actions_per_day = config.daily_actions * scenario.usage_multiplier

    if config.fee_mode == "usd_indexed":
        actual_fee_usd_per_action = config.fee_usd_per_action
        fee_tokens_per_action = (
            config.fee_usd_per_action / token_price
            if token_price > 0
            else 0.0
        )
    else:
        fee_tokens_per_action = config.fixed_token_fee_per_action
        actual_fee_usd_per_action = fee_tokens_per_action * token_price

    supply = config.initial_supply_tokens
    total_fee_tokens = 0.0
    total_burn_tokens = 0.0
    total_security_fee_tokens = 0.0
    total_security_emission_tokens = 0.0
    total_treasury_tokens = 0.0
    total_slashing_burn_tokens = 0.0
    total_security_budget_usd = 0.0

    for _ in range(scenario.days):
        daily_fee_tokens = actions_per_day * fee_tokens_per_action
        daily_burn_tokens = daily_fee_tokens * config.burn_rate
        daily_security_fee_tokens = daily_fee_tokens * config.security_fee_share
        daily_treasury_tokens = daily_fee_tokens * config.treasury_fee_share
        daily_slashing_burn_tokens = (
            supply
            * config.staked_fraction
            * config.slashing_burn_rate_per_day
        )

        supply += config.daily_security_emission_tokens
        supply -= daily_burn_tokens
        supply -= daily_slashing_burn_tokens
        supply = max(supply, 0.0)

        daily_security_budget_usd = (
            daily_security_fee_tokens + config.daily_security_emission_tokens
        ) * token_price

        total_fee_tokens += daily_fee_tokens
        total_burn_tokens += daily_burn_tokens
        total_security_fee_tokens += daily_security_fee_tokens
        total_security_emission_tokens += config.daily_security_emission_tokens
        total_treasury_tokens += daily_treasury_tokens
        total_slashing_burn_tokens += daily_slashing_burn_tokens
        total_security_budget_usd += daily_security_budget_usd

    average_security_budget = total_security_budget_usd / scenario.days
    coverage = average_security_budget / config.required_security_budget_usd_per_day
    fee_affordable = actual_fee_usd_per_action <= config.max_affordable_fee_usd_per_action
    security_budget_adequate = coverage >= 1.0
    supply_positive = supply > 0.0

    return SimulationResult(
        scenario=scenario.name,
        fee_mode=config.fee_mode,
        days=scenario.days,
        token_price_usd=token_price,
        actions_per_day=actions_per_day,
        actual_fee_usd_per_action=actual_fee_usd_per_action,
        total_fee_tokens=total_fee_tokens,
        total_burn_tokens=total_burn_tokens,
        total_security_fee_tokens=total_security_fee_tokens,
        total_security_emission_tokens=total_security_emission_tokens,
        total_treasury_tokens=total_treasury_tokens,
        total_slashing_burn_tokens=total_slashing_burn_tokens,
        starting_supply_tokens=config.initial_supply_tokens,
        ending_supply_tokens=supply,
        net_supply_change_pct=(
            (supply - config.initial_supply_tokens)
            / config.initial_supply_tokens
            * 100.0
        ),
        average_security_budget_usd_per_day=average_security_budget,
        security_coverage_ratio=coverage,
        fee_affordable=fee_affordable,
        security_budget_adequate=security_budget_adequate,
        supply_positive=supply_positive,
        economic_survival=(
            fee_affordable
            and security_budget_adequate
            and supply_positive
        ),
    )


def allocation_for_burn(burn_rate: float, security_fraction_of_remainder: float = 0.75) -> tuple[float, float]:
    """Allocate non-burn fee share between security and treasury.

    This helper keeps burn experiments comparable without silently deleting the
    remainder of protocol fees. It is a scenario convention, not token policy.
    """

    if not 0 <= burn_rate <= 1:
        raise ValueError("burn_rate must be between 0 and 1")
    if not 0 <= security_fraction_of_remainder <= 1:
        raise ValueError("security_fraction_of_remainder must be between 0 and 1")

    remainder = 1.0 - burn_rate
    security_share = remainder * security_fraction_of_remainder
    treasury_share = remainder - security_share
    return security_share, treasury_share
