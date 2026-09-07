# ADR — POM-RX native token necessity

Status: **OPEN / NOT DECIDED**

Issue: #145

## Decision question

Should POM-RX introduce a native fungible network/security token (working name `SWTK`) rather than operate with no native token or with stablecoin/fiat settlement?

This ADR intentionally starts from a neutral position. A token is not justified by fundraising, branding, governance theater, burn narratives or an expectation of appreciation. It must improve a protocol/security property enough to justify added market, liquidity, governance, smart-contract, legal and operational risk.

## Architectures under comparison

### A — No native token

- POM-RX exact authorization and single-use capabilities remain cryptographic/protocol objects.
- Fees may be fiat, subscription or ordinary payment rails.
- Witness/observer accountability uses contractual identity, reputation, external collateral or other non-token mechanisms.

### B — Stablecoin settlement

- POM-RX Core remains token-independent.
- Usage fees and/or collateral are denominated in a stable asset.
- Single-use POM-RX capability remains separate from payment.

### C — Native SWTK layer

- POM-RX Core remains correct without relying on token price.
- SWTK may provide fee settlement, Witness/observer/challenge bonds, staking, objective slashing and bounded governance.
- A separate POM-PERMIT capability may be single-use/non-transferable; the persistent receipt/evidence is never burned.
- Burn is evaluated only as one fee-allocation sink, not as a guarantee of price appreciation.

## Candidate reasons that could justify SWTK

A native token is potentially justified only if evidence shows one or more of the following are materially stronger than alternatives:

1. globally portable cryptoeconomic collateral for permissionless Witness/observer participation;
2. objective slashable bonds tied to verifiable protocol violations;
3. permissionless challenge markets where challengers and operators share one collateral unit;
4. security-budget coordination across otherwise unrelated applications/chains;
5. governance of strictly bounded protocol parameters where external membership systems are materially worse;
6. a measurable reduction in trust/counterparty assumptions that cannot be obtained as simply with stablecoins or conventional signed capabilities.

## Reasons to reject SWTK

Reject or postpone a native token if:

- its primary purpose is fundraising or speculative demand;
- the same security property is achieved more simply with stablecoin collateral or ordinary authorization capabilities;
- network security depends on permanent token-price appreciation;
- burn materially weakens the security budget;
- high token price makes protocol usage unaffordable;
- low token price causes Witness/validator exit or insufficient attack cost;
- governance is cheaply borrowable/capturable;
- liquidity assumptions dominate protocol correctness;
- regulatory/operational cost exceeds the protocol benefit.

## Required falsification tests

Before `TOKEN_NECESSITY = PASS`, compare A/B/C under at least:

- token price: -90%, -50%, flat, x2, x10;
- usage: -90%, flat, x10, x100;
- burn rates: 0%, 10%, 25%, 50%, 75%, 100%;
- zero-growth five-year case;
- Witness/validator exit;
- governance concentration/borrowed voting power;
- artificial usage/wash burn;
- reward farming;
- slash griefing;
- liquidity shock.

## Claim boundary

This ADR does not state that SWTK is necessary, valuable, compliant, an investment, yield-bearing, deflationary in market value, or suitable for public sale. It defines the evidence required before a future implementation decision.

## Current decision

`OPEN` — run the economic/security comparison before any mainnet token implementation or sale.
