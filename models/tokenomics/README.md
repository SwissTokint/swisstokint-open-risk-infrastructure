# POM-RX token-economics stress model

Status: **research model / no token decision**.

Issue: #145

This directory contains a deterministic mechanical stress model used to falsify proposed SWTK fee, burn, staking and security-budget designs. It is intentionally not a market-price model.

## Run

```bash
python models/tokenomics/test_model.py
python models/tokenomics/run_scenarios.py > /tmp/pom-rx-tokenomics-scenarios.json
```

The current scenario matrix spans:

- fee mode: USD-indexed vs fixed-token fee;
- burn: 0%, 10%, 25%, 50%, 75%, 100%;
- validator/Witness stake: 0%, 10%, 35%;
- explicit token-price shocks: x0.1, x0.5, x1, x2, x10, x20;
- usage shocks: x0, x0.1, x1, x10, x100;
- horizons: one year and five years.

The model reports requested versus executed actions, unmet demand, gross paid fee flow, explicitly organic fee flow, fee affordability, fee-funded security rewards, organic fee-funded security rewards, nominal emissions, explicitly realizable emission funding, burn, treasury allocation, total and liquid supply, persistent bonded stake, slashing, next-day liquid reserve requirements and minimum/average security-budget coverage.

## Conservative mechanics

- Token price is always an exogenous scenario input, never a price prediction.
- Nominal security emissions are **not** automatically valued as spendable USD security budget. They contribute only through an explicit `emission_realization_fraction`; the default is zero.
- Bonded stake is a persistent token pool. Slashing permanently reduces that pool; the model does not silently recreate stake from a fixed fraction of later total supply.
- Newly emitted tokens remain liquid unless a future model explicitly defines restaking.
- Fee throughput uses only liquid, unstaked tokens and is bounded by `max_daily_token_velocity` plus tokens available for burn.
- Paid activity is not automatically treated as organic demand. Only `organic_usage_fraction` contributes to organic fee demand and to the conservative fee-funded security budget used by the survival gate.
- Gross security funding is still reported separately so artificial/wash volume can be compared with the conservative organic-funded figure instead of disappearing from the evidence.
- A horizon does not pass merely because all requested actions happened before the final timestamp. Ending liquid inventory must be sufficient to serve one additional identical day under the configured turnover and burn constraints.
- `economic_survival` requires affordable fees, adequate minimum **organic/realizable** security funding, adequate minimum staked value, adequate ending liquid reserve, served requested usage, organic fee demand, positive total supply and a valid supply accounting identity.
- A zero-stake system cannot pass the survival predicate.

These are deliberately conservative research assumptions, not final token policy. The model should become stricter whenever a plausible failure mode is identified.

## Important interpretation

A scenario `economic_survival=true` means only that the configured mechanical constraints passed for that explicit scenario. It does **not** mean:

- SWTK is necessary;
- SWTK has economic value;
- token price will follow the scenario input;
- emissions can actually be sold at the quoted price beyond the explicitly configured realization assumption;
- a non-zero `organic_usage_fraction` has been independently measured or validated;
- the design is incentive-compatible under strategic adversaries;
- governance is safe;
- sufficient external market depth exists beyond the modeled liquid-token inventory/velocity constraint;
- the protocol is legally compliant;
- a public token sale is appropriate;
- an investment return is expected.

Future lots must still add the full no-token/stablecoin comparison, strategic-agent/game-theory stress, governance concentration/borrowed voting power, richer exchange-liquidity/market-depth assumptions, objective slashing models and external demand evidence before the Prime can decide `TOKEN_NECESSITY` or `ECONOMIC_SURVIVAL`.
