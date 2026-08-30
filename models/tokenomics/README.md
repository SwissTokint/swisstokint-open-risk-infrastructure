# POM-RX token-economics stress model

Status: **research model / no token decision**.

Issue: #145

This directory contains a deterministic mechanical stress model used to falsify proposed SWTK fee, burn and security-budget designs. It is intentionally not a market-price model.

## Run

```bash
python models/tokenomics/test_model.py
python models/tokenomics/run_scenarios.py > /tmp/pom-rx-tokenomics-scenarios.json
```

The first scenario matrix spans:

- fee mode: USD-indexed vs fixed-token fee;
- burn: 0%, 10%, 25%, 50%, 75%, 100%;
- explicit token-price shocks: x0.1, x0.5, x1, x2, x10;
- usage shocks: x0.1, x1, x10, x100.

The model reports fee affordability, fee-funded security rewards, explicit security emissions, burn, treasury allocation, supply change and security-budget coverage.

## Important interpretation

A scenario `economic_survival=true` means only that the configured mechanical constraints passed for that explicit scenario. It does **not** mean:

- SWTK is necessary;
- SWTK has economic value;
- token price will follow the scenario input;
- the design is incentive-compatible under strategic adversaries;
- governance is safe;
- liquidity exists;
- the protocol is legally compliant;
- a public token sale is appropriate;
- an investment return is expected.

Price is an exogenous stress input, not a forecast. Future lots must add no-token/stablecoin comparison, strategic-agent/game-theory stress, governance concentration, liquidity/velocity assumptions and objective slashing models before the Prime can decide `TOKEN_NECESSITY` or `ECONOMIC_SURVIVAL`.
