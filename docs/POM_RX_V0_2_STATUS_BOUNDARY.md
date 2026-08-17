# POM-RX v0.2 status boundary and migration gates

Status: local documentation control. This repository currently implements and
tests the `pom-rx/0.1` receipt profile. It does **not** publish POM-RX v0.2,
declare a v0.2 conformance suite, or establish an external reproduction.

The programme thesis may describe POM-RX v0.2 as the proposed next evidence
format. That proposal must not be substituted for the code or fixtures in this
repository.

## What is present here

- `sdk/typescript/pom-rx.mjs` exports `POM_RX_SCHEMA_VERSION = 'pom-rx/0.1'`.
- The v0.1 chain binds a preflight, execution and reconciliation receipt using
  hash links, exact field validation and source-side commitments.
- The local Node test suite checks permitted phase transitions, time ordering,
  hash links and selected substitution failures.

These are local prototype properties. They do not by themselves prove that a
source was independently witnessed, that an authorisation was consumed by a
gate, or that an observer independently reconciled a native action.

## Required v0.2 additions, not yet represented by v0.1

| v0.2 evidence role | v0.1 closest field or phase | Missing evidence that v0.2 must define and verify |
|---|---|---|
| Declared policy and action source | `policy_hash`, `action_commitment`, `source_key_id` | Canonical signed source envelope that binds the exact declared action and policy to a verifiable source identity. |
| Witnessed preflight | `preflight` receipt | A separately signed witness decision, its key reference, validity bound and the exact source envelope it assessed. |
| Exact authorisation consumed by a gate | No equivalent | An authorisation artifact with one-time consumption reference and rejection of replay or substitution. |
| Native execution | `execution` acknowledgement commitment | A profile-specific native transaction or execution reference with the fields needed for independent observation. |
| Independent observation | `reconciliation` receipt | A separately identified observer artifact that can be checked independently of the source/executor. |
| Reconciliation | `reconciliation` phase | A six-artifact linkage that distinguishes a source reconciliation claim from an independently observed match or mismatch. |

## Migration acceptance gates

Before any v0.2 implementation or interoperability statement, all of the
following must be available together:

1. A normative schema and canonical-byte rules for source, witness,
   authorisation, gate-consumption, execution, observation and reconciliation
   artifacts.
2. Positive and adversarial test vectors covering signature substitution,
   duplicate or unknown JSON fields, expired approvals, replayed consumption,
   mismatched policy/action bindings, missing native references and observer
   disagreement.
3. A deterministic offline verifier and a separate implementation that agrees
   on every published vector.
4. Two bounded external adapters that emit the specified artifacts without
   exposing credentials, balances, strategies or private policy values.
5. A separately authorised public-test demonstration, an independently
   operated reproduction and targeted security review before broader claims.

## Communication rules

- Refer to the present implementation as `pom-rx/0.1` unless a repository
  release and matching fixtures prove otherwise.
- Describe v0.2 only as a proposal or planned specification until the migration
  gates above are met.
- Do not treat a valid v0.1 receipt as proof of strategy correctness, future
  safety, enforcement by a gate, external integration or an independent
  observation.
- This boundary does not authorise a token, sale, wallet connection, payment,
  order, deployment or grant submission.
