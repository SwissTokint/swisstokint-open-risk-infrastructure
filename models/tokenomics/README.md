# POM-RX token-economics stress model

Status: **research model / no token decision**.

Issue: #145

This directory contains a deterministic mechanical stress model used to falsify proposed SWTK fee, burn and security-budget designs. It is intentionally not a market-price model.

## Run

```bash
python models/tokenomics/test_model.py
python models/tokenomics/run_scenarios.py > /tmp/pom-rx-tokenomics-scenarios.json
```

The current scenario matrix spans:

- fee mode: USD-indexed vs fixed-token fee;
- burn: 0%, 10%, 25%, 50%, 75%, 100%;
- explicit token-price shocks: x0.1, x0.5, x1, x2, x10, x20;
- usage shocks: x0, x0.1, x1, x10, x100;
- horizons: one year and five years.

The model reports requested versus executed actions, unmet demand, fee affordability, fee-funded security rewards, nominal emissions, explicitly realizable emission funding, burn, treasury allocation, supply accounting, minimum stake coverage and minimum/average security-budget coverage.

## Conservative mechanics

- Token price is always an exogenous scenario input, never a price prediction.
- Nominal security emissions are **not** automatically valued as spendable USD security budget. They only contribute through an explicit `emission_realization_fraction`; the default is zero.
- Fee throughput is bounded by `max_daily_token_velocity` and by the supply available for burn, so an exhausted token supply cannot keep generating impossible nominal fee/burn flows.
- `economic_survival` requires affordable fees, adequate minimum security funding, adequate minimum staked value, served requested usage, organic fee demand, positive ending supply and a valid supply accounting identity.
- A zero-stake system cannot pass the survival predicate.

These are research assumptions, not final token policy. The model should become stricter whenever a plausible failure mode is identified.

## Important interpretation

A scenario `economic_survival=true` means only that the configured mechanical constraints passed for that explicit scenario. It does **not** mean:

- SWTK is necessary;
- SWTK has economic value;
- token price will follow the scenario input;
- emissions can actually be sold at the quoted price beyond the explicitly configured realization assumption;
- the design is incentive-compatible under strategic adversaries;
- governance is safe;
- sufficient external liquidity exists;
- the protocol is legally compliant;
- a public token sale is appropriate;
- an investment return is expected.

Future lots must still add the full no-token/stablecoin comparison, strategic-agent/game-theory stress, governance concentration/borrowed voting power, richer liquidity/market-depth assumptions and objective slashing models before the Prime can decide `TOKEN_NECESSITY` or `ECONOMIC_SURVIVAL`.
