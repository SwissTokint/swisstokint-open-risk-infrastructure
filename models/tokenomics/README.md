# POM-RX token-economics stress model

Status: **research model / no token decision**.

Issue: #145

This directory contains a deterministic mechanical stress model used to falsify proposed SWTK fee, burn, staking and security-budget designs. It is intentionally not a market-price model.

## Run

```bash
python models/tokenomics/test_model.py
python models/tokenomics/run_scenarios.py > /tmp/pom-rx-tokenomics-scenarios.json
```

The current scenario matrix spans fee mode, 0–100% burn, validator/Witness stake shocks, explicit token-price shocks x0.1 through x20, usage shocks x0 through x100, and one-year/five-year horizons.

The model reports requested/executed actions, unmet demand, gross and organic fee flow, nominal versus realizable security funding, total/liquid supply, persistent bonded stake, validator exit/slashing, shared velocity use, next-day reserves and security coverage.

## Conservative mechanics

- Token price is always an exogenous scenario input, never a price prediction.
- Nominal security emissions are **not** automatically valued as spendable USD security budget. They contribute only through explicit `emission_realization_fraction`; default zero.
- Tokens received as security-fee rewards are also **not** automatically valued as USD funding. They contribute only through explicit `security_fee_realization_fraction`; default zero, and their distinct realization transfer must fit inside remaining token velocity.
- Emission realization, protocol fee turnover and security-fee reward realization all share one configured daily token-velocity budget. With velocity 2, a token emitted/sold and then returned as a fee has exhausted two transfers; the returned fee reward cannot be counted as independently realizable USD until a third transfer is available.
- Bonded stake is persistent. Validator exit unbonds without destroying supply; slashing destroys bonded stake and supply.
- Fee throughput uses only realizable, liquid, unstaked inventory and the remaining shared velocity budget, additionally constrained by tokens available for burn.
- Paid activity is not automatically organic. `organic_usage_fraction` identifies the modeled organic part; survival separately requires minimum organic share, minimum average organic actions/day, and minimum average organic fee USD/day. All three gates are horizon-independent.
- Gross nominal fee-based security value remains reported only as a diagnostic. The conservative survival budget counts only independently realizable security emissions plus independently realizable organic security-fee rewards.
- A horizon passes liquidity only if ending realizable inventory can support one additional identical day, including emission realization, fee turnover, security-fee reward realization and burn.
- Positive next-day reserve requirements use relative-only economic-value comparison; a fixed token epsilon cannot let zero inventory cover a positive reserve at extreme token prices.
- `economic_survival` requires affordable fees, adequate minimum independently realizable security funding, adequate current and next-day stake, adequate next-day liquidity, served demand, all organic-demand gates, positive supply and valid accounting.
- A zero-stake system cannot pass.

These are deliberately conservative research assumptions, not final token policy.

## Important interpretation

`economic_survival=true` means only that configured mechanical constraints passed for that explicit scenario. It does **not** establish SWTK necessity or value, token-price support, external market depth, independently measured organic demand, incentive compatibility, governance safety, legal compliance, suitability for public sale, yield or investment return.

Future lots must still add the full no-token/stablecoin comparison, strategic-agent/game-theory stress, governance concentration/borrowed voting power, richer exchange-liquidity/market-depth assumptions, objective slashing models and external demand evidence before Prime can decide `TOKEN_NECESSITY` or `ECONOMIC_SURVIVAL`.
