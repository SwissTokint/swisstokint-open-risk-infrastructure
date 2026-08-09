# ADR 0001 — POM-RX chain integrity and version transition

Status: `PROPOSED / HUMAN_DECISION_REQUIRED / CLAUDE_REVIEW_NOT_RUN`

Date: 2026-08-08

## Context

POM-RX v0.1 commits each receipt independently, then verifies a three-phase
chain. The public TypeScript verifier currently keeps `run_id`, `agent_ref`,
`subject_ref`, `method_hash` and `policy_hash` constant across phases. It does
not keep `input_commitment` or `action_commitment` constant. It also permits
`execution:accepted` and `reconciliation:matched` when a phase assertion is
`fail`, and it does not reject a repeated `receipt_id` within one chain.

The preflight witness proposed by public PR 24 signs the exact preflight
receipt hash. That is useful evidence of prior receipt, but it cannot repair a
later chain that substitutes the committed action and recomputes valid receipt
links.

The public repository has a POM-RX TypeScript verifier only. The Python tests
currently run against Proof Receipt v0.2, not POM-RX.

## Decision scope

This ADR records options and a candidate direction. It does not publish
POM-RX v0.2, change a schema, approve PR 24 or authorize a merge. No existing
v0.1 receipt hash may be rewritten.

## Option A — v0.1 verification erratum

Keep `pom-rx/0.1` receipt bytes and domain separation unchanged, but publish an
explicit verifier profile that additionally rejects:

- changes to `input_commitment` or `action_commitment` between phases;
- a positive structural outcome with a failed business assertion;
- duplicate `receipt_id` values within one chain.

Advantages: existing individual commitments remain reproducible. The unsafe
acceptance behavior becomes visible immediately.

Disadvantages: verification semantics change for already-created chains. A
consumer could still mistake the erratum for proof that the committed action
was the native action actually executed.

## Option B — POM-RX v0.2 with explicit invariants

Introduce a new schema and hash domain. Define action, input, phase outcome,
unique identifiers, witness binding and native execution binding normatively.
Keep v0.1 verifiable as historical evidence with an explicit legacy warning.

Advantages: no silent reinterpretation of the v0.1 hash domain; phase and
execution semantics can be stated precisely.

Disadvantages: new vectors, migration guidance and independent implementations
are required. A v0.2 label is not justified until those artefacts exist.

## Candidate decision

Use both mechanisms in sequence, subject to Claude and human review:

1. publish a fail-closed v0.1 verification erratum without changing receipt
   bytes or hashes;
2. define the normative action and input semantics only in POM-RX v0.2;
3. never convert an unsafe historical chain into a v0.2 authorization
   retrospectively.

## `action_commitment`

Two alternatives were considered.

### Exact-action continuity

One canonical commitment remains identical from preflight through execution
and reconciliation. A witness acknowledgement binds the preflight receipt that
contains it. A native execution proof must separately demonstrate that the
executed payload corresponds to that same action.

### Intent-to-payload transformation

An intent commitment and native payload commitment may differ only when a
versioned, deterministic transformation descriptor binds both commitments and
enumerates every permitted degree of freedom.

Candidate direction: exact-action continuity for the first v0.2 profile. The
transformation alternative is deferred because it creates a second normative
mapper and a larger substitution surface.

## `input_commitment`

POM-RX v0.1 defines neither a canonical preimage nor a privacy profile. Its
verifier can therefore prove only that the opaque value remained unchanged.

Two alternatives were considered:

1. unsalted SHA-256 over canonical JSON, suitable only for public or
   high-entropy input;
2. a domain-separated commitment over a profile identifier, at least 128 bits
   of fresh random salt and canonical redacted input.

Candidate direction: v0.1 continuity only, with no claim about input content.
For v0.2, prefer the salted profile while still prohibiting secrets, private
keys, seed phrases, account identifiers, balances, positions and strategies in
the preimage. Salt does not make a disclosed low-entropy input secret.

## Structural outcome versus business result

`outcome` is the structural state of a phase. Each assertion is a business or
control result. A positive structural state must not override a failed
assertion.

Candidate v0.2 invariants:

| Phase | Positive state | Required assertion rule | Negative or unresolved state |
|---|---|---|---|
| `preflight` | `allow` | every assertion is `pass` | `deny` requires at least one `fail` |
| `execution` | `accepted` | every assertion is `pass` | `rejected` requires at least one `fail`; `unresolved` may include `not_evaluated` |
| `reconciliation` | `matched` | every assertion is `pass` | `mismatched` requires at least one `fail`; `unresolved` may include `not_evaluated` |

Every chain also requires unique `receipt_id` values, contiguous ordered
phases, nondecreasing offset-aware time, exact previous-hash links and stable
run, agent, subject, method, policy, input and action commitments.

## Canonical `rule_id` order — deferred compatibility decision

This baseline deliberately retains the existing v0.1 `localeCompare`
behavior. Replacing it with ordinal comparison can change a receipt hash when
punctuation-bearing rule IDs are ordered differently by ICU collation, so that
runtime change does not belong in an adversarial test baseline.

The ordinal comparator and its focused test remain recoverable from commit
`76ea8c1b63138275a8dfe7f43179282ae12a0f06`. A separate compatibility PR must
measure affected vectors, specify the canonical order and migration behavior,
and obtain the required Claude and human decisions before any merge. This ADR
does not select or approve a replacement comparator.

## Compatibility v0.1 to v0.2

- Existing v0.1 bytes and receipt hashes remain immutable.
- A v0.1 chain that changes action or input is classified
  `LEGACY_CHAIN_UNSAFE_COMMITMENT_CONTINUITY`.
- A v0.1 chain with positive phase outcome and failed assertion is classified
  `LEGACY_CHAIN_UNSAFE_PHASE_RESULT`.
- A v0.1 witness acknowledgement proves only receipt acknowledgement, not
  native-action authorization or execution.
- v0.2 uses a new schema and hash domain; migration references v0.1 hashes but
  cannot manufacture prior authorization.
- No automatic downgrade from v0.2 to v0.1 is permitted.

## Consequences

The new adversarial baseline remains red for the unresolved v0.1 invariants.
This checkpoint changes tests and documentation only; it does not change POM-RX
runtime behavior. DAGR, its governance profile and any production gate remain
blocked.

## Residual risks

- source enrollment, rotation and revocation are not defined;
- trusted time and durable transactional witness storage are absent;
- there is no public Python POM-RX verifier;
- native payload binding is not specified;
- `not_evaluated` semantics require vectors;
- canonical `rule_id` ordering and legacy hash compatibility remain undecided;
- Claude architecture and security reviews have not run.

## Review and approvals

- Codex: candidate decision documented; no protocol publication approved.
- Claude Code: `CLAUDE_REVIEW_NOT_RUN`; no verdict available.
- Human: no approval of the erratum, v0.2 semantics, PR 24 or merge.
