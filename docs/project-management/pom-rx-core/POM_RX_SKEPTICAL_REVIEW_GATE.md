# POM-RX skeptical review gate

Status: `ACTIVE_PROCESS_RULE`

Date: 2026-08-19

## Purpose

A normal review asks whether the proposed change appears correct. The skeptical
review has a different mandate: assume that the proposed acceptance claim is
wrong, incomplete or too broad and try to falsify it before merge.

The skeptic is a read-only reviewer. The skeptic must not implement the same lot,
own the changed files or convert uncertainty into approval by wording alone.

## Mandatory gate sequence

Every non-trivial POM-RX PR uses this sequence before merge:

1. **Review pass 1** — architecture/code/security review on the proposed diff.
2. **Control pass 1** — targeted tests, relevant regression/compatibility gates,
   secret scan where applicable, dependency audit where applicable and
   `git diff --check`.
3. **Skeptical challenge** — an independent falsification pass against the exact
   stated acceptance claim.
4. **Review pass 2** — exact-head re-review after all findings and fixes.
5. **Control pass 2** — exact-head GitHub CI plus final release-gate evidence.

A changed head invalidates the prior exact-head pass 2 and control pass 2. A
material security or architecture change also invalidates the skeptical pass.

## Skeptic questions

The skeptic must actively answer, at minimum:

1. What single false assumption would make the claimed result untrue?
2. Is there a bypass around the component that supposedly enforces the rule?
3. Can the action be modified between preflight, authorization and execution?
4. Can a replay, stale capability, alternate origin, chain, account or provider
   path reach execution?
5. Can a self-consistent or post-hoc evidence set produce a false PASS?
6. Does a missing, unknown or simulation-failed state ever become ALLOW?
7. Is the implementation solving a broader problem than the tests actually
   prove?
8. Is there a materially simpler design with a smaller trusted computing base?
9. Is any public wording stronger than the reproducible evidence?
10. What remains unproved even if every current test passes?

For security-sensitive or Tier-B work, the skeptic must add at least three
concrete failure hypotheses and point each to one of:

- an existing negative test that disproves the hypothesis;
- a new test/evidence item required before merge;
- an explicit remaining limitation that blocks the corresponding claim.

## Verdicts

Only these verdicts are valid:

- `SKEPTIC_PASS` — no unresolved hypothesis defeats the scoped claim;
- `SKEPTIC_CONDITIONAL` — the change may proceed only after named evidence or
  wording corrections;
- `SKEPTIC_BLOCK` — a plausible bypass, false-PASS path, evidence gap or scope
  error remains unresolved.

Absence of findings is not automatically `SKEPTIC_PASS`. The reviewer must
state which claim was challenged and which evidence was inspected.

## Scope by change type

### Protocol, Gate, Witness, authorization or wallet changes

Skeptical review is mandatory and must be distinct from the implementation
owner. Direct-provider bypass, mutation-after-preflight, replay, stale/withdrawn
trust, clock failure, unknown input and failure-to-observe are mandatory attack
families where relevant.

### Public product/claim changes

Skeptical review is mandatory. The reviewer must compare every material claim to
an exact implementation/test/deployment artifact and downgrade wording when the
evidence is narrower.

### Integration/adaptor changes

The skeptic must challenge whether the adapter is being mistaken for the POM-RX
authorization boundary and whether chain/storage success proves more than
publication or retrieval of evidence.

### Documentation-only coordination

A lightweight skeptical pass is still required when the document changes
priority, product hierarchy, merge policy, readiness status or a public claim.
Pure typo/formatting fixes may be exempted by the Prime lead with the exemption
recorded in the PR.

## Independence and routing

The existing maximum of three active subagents remains unchanged. Reviews may
run sequentially so the skeptical reviewer is independent without increasing
parallelism.

For Tier-B work the recommended sequence is:

```text
writer
  -> architecture/security reviewer
  -> control pass 1
  -> skeptical/falsification reviewer
  -> fixes if needed
  -> exact-head independent reviewer
  -> control pass 2 / release judge
```

The skeptic may be the adversarial-security reviewer only when a separate
exact-head release reviewer remains independent. The writer can never serve as
the skeptic for the same lot.

## Wallet Guard specific falsification gate

Before `WALLET_GUARD_SIMULATED_READY`, the skeptic must attempt to invalidate at
least these claims:

- DENY/critical INDETERMINATE cannot reach the underlying provider;
- origin is captured from a trusted boundary rather than caller payload;
- chain/account are provider-observed and rechecked at Gate consumption;
- a request mutated after preflight cannot reuse the authorization;
- a capability cannot execute twice;
- unknown dangerous calldata or typed data cannot become ALLOW because
  simulation is optimistic;
- the controlled fixture has no second unguarded provider route.

Before `WALLET_GUARD_BURNER_E2E_READY`, the same hypotheses must be reproduced
against the actual local/testnet harness and burner account, with zero meaningful
funds and a separate human gate.
