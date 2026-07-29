# POM-RX v0.1

**Risk execution receipts for autonomous financial agents**

Status: public working specification and tested prototype. It is not a
production control, an audit opinion, a trading product or a promise of
financial performance.

## The problem

Trading bots are not new. Open-source systems such as Hummingbot and Freqtrade
already provide strategies, exchange connectors, backtesting, automation and
Docker deployment. Agent wallets can also execute transfers and swaps with
vendor-specific spending controls.

The unresolved public-good problem is narrower:

> How can an independent verifier prove that a financial agent evaluated the
> declared risk policy **before** an action, used the same method and policy
> during execution, and reconciled the outcome, without receiving the
> operator's strategy, account data or credentials?

Editable dashboards and retrospective logs do not answer this question. A log
created after execution cannot prove that the declared controls existed before
the action.

## Proposed primitive

POM-RX is a domain-specific receipt chain with three phases:

1. **Preflight** commits to the software method, policy, inputs and proposed
   action, then records an allow or deny decision.
2. **Execution** commits to the venue or network acknowledgement and is
   hash-linked to the preflight receipt.
3. **Reconciliation** commits to the independently observed outcome and is
   hash-linked to the execution receipt.

An allowed preflight requires every declared assertion to pass. A denied
preflight cannot be followed by execution. An accepted execution requires
reconciliation for a complete chain. Method, policy, agent, subject and run
identity cannot change between phases.

The protocol records commitments, not secrets. Numeric limits, positions,
balances, raw orders, model prompts, private strategies and API credentials
remain in the source environment.

## Why this is not another bot

POM-RX does not:

- generate a signal;
- optimize or sell a strategy;
- custody an asset;
- place an order;
- replace an exchange, wallet or policy engine;
- claim that profitable performance is verifiable from a receipt.

It wraps an existing bot, wallet, payment agent or DAO executor and produces
portable evidence about the control path. A Hummingbot, Freqtrade, AgentKit or
custom integration can emit the same receipt shape.

## Relationship to emerging agent standards

### ERC-8004

ERC-8004 provides generic agent identity, reputation and validation registries.
Its validation request deliberately points to application-specific evidence.
POM-RX supplies a financial-risk evidence format that an ERC-8004 validator can
consume. It does not duplicate the identity registry.

### ERC-8126

ERC-8126 defines verification types for an agent's token, media, Solidity code,
web application and wallet. POM-RX focuses on a different unit: one
policy-constrained financial action and its lifecycle.

### ERC-8183 and agentic commerce

Agentic-commerce protocols coordinate jobs, escrow and evaluation. POM-RX can
be attached as evidence to an evaluator response, but it does not handle
payment or escrow.

### Non-EVM networks

The receipt and hash chain are chain-neutral. Anchor adapters can publish a
batch root to Stellar, Solana, Filecoin, Tezos, Avalanche or another network
without changing the receipt semantics.

## Receipt model

Each `pom-rx/0.1` receipt contains:

| Field | Purpose |
|---|---|
| `run_id` | Stable identifier for one proposed action lifecycle |
| `phase` / `outcome` | Preflight, execution or reconciliation state |
| `agent_ref` | Portable agent identity, optionally an ERC-8004 reference |
| `method_hash` | Commitment to the executable method and build provenance |
| `policy_hash` | Commitment to the exact risk-policy version |
| `input_commitment` | Commitment to normalized private inputs |
| `action_commitment` | Commitment to the proposed action |
| `assertions` | Named pass/fail statements with public, commitment or ZK evidence |
| `previous_receipt_hash` | Domain-separated link to the previous phase |
| `occurred_at` | Offset-qualified source time |
| `source_key_id` | Identifier for the signing identity used by the source |

The current SDK canonicalizes each receipt and computes:

```text
SHA-256("swisstokint:pom-rx:v1:" || canonical_receipt)
```

The generic Proof of Method transport can then sign, batch and anchor that
commitment.

## Initial risk assertion vocabulary

The schema permits versioned rule identifiers rather than publishing values.
An integration profile can define assertions such as:

- `max-notional`;
- `max-leverage`;
- `allowed-market`;
- `allowed-venue`;
- `drawdown-budget`;
- `kill-switch-clear`;
- `withdrawals-disabled`;
- `human-approval-present`;
- `execution-matches-intent`;
- `venue-acknowledged`.

The rule threshold and evaluation method are committed by `rule_hash`.
`evidence_hash` identifies the local evidence or proof. A future zero-knowledge
profile can prove comparisons such as notional below a committed cap without
revealing either value.

## Critical trust boundary

A local receipt alone does not prove real-time ordering. A dishonest operator
could fabricate all phases after the event. A production profile must therefore
use one of these pre-execution witnesses:

- a remote timestamped witness that acknowledges the preflight hash;
- a public testnet/mainnet anchor before execution;
- a trusted execution environment attestation;
- a mutually operated validator quorum.

The execution adapter must fail closed if the selected witness is required but
unavailable. This requirement is the difference between a useful control and a
post-hoc audit story.

## Threats addressed

- post-hoc execution evidence without a preflight;
- risk-policy or method substitution during a run;
- receipt deletion or reordering;
- duplicate or ambiguous rule identifiers;
- accidental publication of credentials through unknown fields;
- cross-chain anchor ambiguity through a chain-neutral committed payload.

## Threats not solved by v0.1

- a compromised source that lies before signing;
- falsified private market data without an independent data commitment;
- theft of the source signing key;
- a venue returning false acknowledgements;
- correctness of a zero-knowledge circuit not yet implemented;
- legal or regulatory classification of an automated financial service.

## Public roadmap

1. Finalize receipt vocabulary and independent test vectors.
2. Add source signatures and remote preflight witness acknowledgements.
3. Publish Hummingbot, Freqtrade and AgentKit adapters in dry-run mode.
4. Map POM-RX verification results to ERC-8004 validation requests.
5. Add a minimal zero-knowledge comparison profile for private limits.
6. Run two independent reproductions and one non-custodial pilot.

No production trading or token is required to validate the protocol. A future
validator network or utility token should be considered only after independent
verification demand exists and the legal design has been reviewed.

## Reference sources

- ERC-8004 Trustless Agents: https://eips.ethereum.org/EIPS/eip-8004
- ERC-8126 AI Agent Verification: https://eips.ethereum.org/EIPS/eip-8126
- ERC-8183 Agentic Commerce: https://eips.ethereum.org/EIPS/eip-8183
- Hummingbot documentation: https://hummingbot.org/docs/
- Freqtrade documentation: https://docs.freqtrade.io/en/latest/
- Coinbase Agentic Wallet: https://docs.cdp.coinbase.com/agentic-wallet/cli/welcome
