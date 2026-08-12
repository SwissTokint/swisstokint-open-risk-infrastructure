# POM-RX product charter

Status: `CANDIDATE_NON_NORMATIVE_DRAFT`

Date: 2026-08-10

Baseline commit: `6f421c540e9a47a971840847547c9bfc951e1d46`

Human approval is required before this charter can become an active public or
funding claim. It is not a protocol specification, release, audit,
certification, production-readiness statement, or deployment authorization.

## Product position

POM-RX is open, verifiable risk-control infrastructure for sensitive
autonomous and digital-asset actions.

POM-RX is the sole principal technical product in the SwissTokint programme.
It is intended to make the control path before, during, and after one sensitive
action independently inspectable without requiring disclosure of raw private
strategy inputs.

POM-RX does not claim to make an action safe. It defines an intended lifecycle
for linking bounded evidence about declared policy, the action commitment,
preflight, exact authorization, execution, observation, and reconciliation.
The currently evidenced v0.1 TypeScript verifier checks only the stated
structural receipt properties; it does not prove end-to-end exact
authorization, native execution, or independent observation. A structurally
valid receipt is not proof that the business decision was legitimate or that
every relevant control existed.

## Required hierarchy

```text
POM-RX
├── Core protocol
├── Preflight witness
├── Exact authorization
├── Gate consumption
├── Native execution evidence
├── Independent observation
├── Reconciliation
├── Profiles
│   └── Governance / DAGR
├── Optional anchor adapters
└── Demonstrations and verification tools
```

Every public narrative, implementation plan, demonstration, and funding
document must preserve this hierarchy.

## Lifecycle responsibilities

| Layer | Question it is intended to answer | Current evidence boundary |
|---|---|---|
| Core protocol | Are the declared receipts structurally valid and linked? | POM-RX v0.1 TypeScript prototype exists; known continuity, positive-outcome, and receipt-ID uniqueness defects remain open |
| Preflight witness | Did a distinct source acknowledge preflight before action? | Draft PR 24 contains a signed-witness prototype; it is not merged or production-ready |
| Exact authorization | Was this exact action authorized under the declared policy? | Target property; current v0.1 evidence does not prove end-to-end exact-action continuity |
| Gate consumption | Did an execution-side consumer fail closed on the authorization? | No executable downstream Gate is currently proved |
| Native execution evidence | What action did the native system report executing? | Target property; no production financial execution is part of this charter |
| Independent observation | What did a distinct observer report? | Target property with synthetic/local demonstrations only |
| Reconciliation | Does observed outcome match the authorized action and declared rules? | v0.1 receipt phase exists; failed-assertion positive outcomes remain an expected-red defect |
| Profiles | Which domain controls are required for this action and scope? | Governance profile source material is candidate, non-normative, and not yet remapped |
| Optional adapters | Can evidence be anchored, transported, or observed on another system? | Experimental artifacts do not become POM-RX Core or prove interoperability |
| Demonstrations and tools | Can a reviewer reproduce the bounded claims locally? | Must use synthetic deterministic data and name every unproved boundary |

## Artefact authority

The public `SwissTokint/swisstokint-open-risk-infrastructure` repository is the
sole future normative source for POM-RX. A document becomes normative only
through an explicit versioned publication and human gate; presence in this
repository alone does not make a draft normative.

The private website may consume only artifacts pinned by version, commit, and
content hash. It must not maintain a second normative verifier, schema, or
policy implementation, and it must not depend on a mutable `main` branch at
runtime.

### Pinned evidence snapshot

The following immutable commits bound the current statements in this charter:

- public baseline: `6f421c540e9a47a971840847547c9bfc951e1d46`;
- PR 27 adversarial baseline: `d2783fbd35ef2ac28b73607b75ea8fa3c7ae643b`,
  where seven tracked expected-red integrity defects covering continuity,
  positive-outcome consistency, and `receipt_id` uniqueness remain reproduced
  rather than fixed;
- PR 24 witness prototype: `175d4ddfab8e7efa035a34793205fd53f1e15984`,
  which is neither merged nor production-ready and retains documented
  enrollment, revocation, persistence, clock, recovery, Gate, boundary, and
  bypass-test blockers.

These commits are observation anchors, not endorsements or release markers.
They must be revalidated before any statement is presented as current.

Proof Receipt, POM-RX, and the POM-RX Guided Educational Simulator are distinct:

- Proof Receipt is a generic evidence primitive with separate TypeScript and
  Python implementations.
- POM-RX applies a domain-specific receipt chain to sensitive action control;
  only the public TypeScript POM-RX verifier is currently evidenced.
- The POM-RX Guided Educational Simulator v0.1 is a teaching interface. It is
  not an independent verifier or protocol implementation.

## POM-RX Governance Profile — DAGR

The public profile name is `POM-RX Governance Profile — DAGR`.

The profile supplies a taxonomy and candidate control catalog for governance
of digital assets. A future assessment receipt may be referenced during a
POM-RX preflight decision, subject to scope, version, validity window, critical
control results, evidence strength, and limitations.

The profile does not replace Core, witness, exact authorization, Gate,
execution evidence, observation, or reconciliation. It is not an autonomous
audit product, certification, security score, or parallel DAGR SDK. No global
percentage score is authorized. A critical `unknown` or `not_tested` result
must keep the profile incomplete.

## Claim discipline

| Claim state | Required evidence |
|---|---|
| `IMPLEMENTED_LOCAL` | Exact commit, executable command, non-synthetic code path, and result |
| `PASS_SCOPED` | Exact commit/run, real executed steps, and explicit statement of what the pass does not prove |
| `EXPECTED_RED` | Defect identifier, test name, expected vulnerable behavior, diagnostic, exit status, and import/fixture health |
| `CANDIDATE` | Design proposal with unresolved decisions and no implementation claim |
| `UNPROVED` | Missing, stale, empty-step, or non-reproducible evidence |

`steps=[]` or `steps=null` is `CI_INFRA_FAILURE`. It is neither a code failure
nor green CI. Historical reviews apply only to their exact commits. No scoped
approval can be converted into `CLAUDE_APPROVED` for a programme, release, or
later diff.

The following words require exact public reproducible evidence in their stated
scope: compatible, production, independently verified, decentralized network,
blocks execution, and secures transactions.

## Explicit non-goals and prohibitions

POM-RX is not a firewall, policy engine, transaction simulator, custodian,
exchange, trading bot, legal opinion, audit firm, certification authority, or
guarantee against loss. It does not hold assets, receive exchange credentials,
promise performance, or authorize real-world execution merely because a
receipt verifies.

No real key, seed phrase, exchange credential, payment address, member secret,
or confidential raw evidence belongs in source control, logs, prompts,
demonstration fixtures, or funding artifacts. Demonstrations remain local,
synthetic, non-audited, and non-production, with no financial transaction.

SWTK remains `SWTK_NOT_YET_NECESSARY`. No token, sale, presale, allocation,
yield, wallet-connect path, or token-dependent narrative belongs to the active
product or public funding story. Reconsideration requires a distinct technical
necessity, legal analysis, and explicit human gate.

## Institutional and capacity boundary

The only current human contacts declared for programme capacity are Mehdi
Mauroux and Guy Nambou. Future recruitment is an unconfirmed objective, not
current staffing. AI tools are not founders, members, employees, advisers,
partners, or funded human capacity.

The Association may be described as constituted only after signed statutes and
minutes have been verified in the local source records. No confidential signed
document is published automatically. Any legal, fiscal, address, committee,
representation, donation, or registry wording remains human-gated.

## Human gates

Human approval is mandatory before:

- publishing POM-RX v0.2 or a breaking protocol change;
- changing schema, hashing, canonicalisation, witness, Gate, or normative
  governance-profile behavior;
- merging any protocol, profile, site, institutional, or funding claim;
- deploying production or changing the public domain;
- using a real key or performing a testnet/mainnet transaction;
- submitting funding material or claiming adoption, partnership, audit,
  certification, award, or financing;
- publishing confidential source material or incident claims.

## Charter acceptance gate

This candidate may leave draft only when:

1. every product component is labeled as implemented, candidate, expected-red,
   or unproved against an exact artifact;
2. POM-RX v0.1 defects and PR 24 production blockers remain visible;
3. the DAGR profile is subordinate to POM-RX and no parallel SDK is introduced;
4. Proof Receipt, POM-RX, and educational demonstrations remain distinct;
5. the website consumes pinned public artifacts rather than duplicated logic;
6. institutional facts are reconciled and human-approved;
7. a head-exact architecture review and human product decision are recorded.

Until then the charter remains `CANDIDATE_NON_NORMATIVE_DRAFT`.
