# POM-RX Core

Shared POM-RX semantics belong here: strict verification, exact authorization,
Witness, single-use Gate, durable replay/claim primitives, execution evidence,
observation and reconciliation.

Current Core homes include:

- `core/strict-verification/` — activated bounded strict-profile verifier and
  artifact identity;
- `core/authorization/` — ratified common exact-authorization contract and
  reference helpers;
- `core/gate/` — common single-use Gate contract, process-local reference Gate
  and separate durable local claim primitive;
- `core/reference-data/` — shared bounded plain-data snapshot/capture boundary
  for hostile caller-owned reference objects;
- `core/witness/` — shared reference Witness trust lifecycle around the existing
  Ed25519 source/Witness primitives;
- `core/execution/` — shared reference execution-evidence commitments and
  recorder lifecycle;
- `core/observation/` — shared reference observation/reconciliation against
  validated exact-authorization bindings.

At trusted-main checkpoint
`818718955c9e4136e9e55754a31be2f1c7b610f8`, the durable claim primitive and
process-local single-use Gate both exist, but their reviewed composition is not
yet on trusted main. That composition is active Tier-B work and must not be
inferred from the presence of the two separate primitives.

During the compatibility migration, frozen/shared implementations that predate
the product-oriented layout remain at their current paths, especially
`sdk/typescript/pom-rx.mjs`, `sdk/typescript/internal/` and
`sdk/typescript/pom-rx-witness.mjs`.

Application blocks may normalize their own domain intents/context and own
downstream adapters, but they must not duplicate canonicalization, hashing,
verifier, Witness or Gate semantics. Exact authorization and execution-evidence
commitments are also common Core behavior and must not be forked into an
application-specific implementation. Observation/reconciliation comparison
semantics likewise remain shared Core behavior rather than an application fork.

The shared canonical payload contract currently remains in
`sdk/typescript/swisstokint-proof.mjs`. Validation failures from
`canonicalizePayload()` are positively identified by the exported
`ProofPayloadValidationError` class and stable `PROOF_E_PAYLOAD_*` codes while
remaining `TypeError`-compatible. POM-RX Core/application adapters that
deliberately normalize canonical-payload rejection must catch that branded
validation class/code rather than broad `TypeError` or message text. Unrelated
runtime/intrinsic failures are intentionally unbranded and must propagate with
their original provenance.

Historical v0.1 paths are moved only through dedicated
compatibility-preserving PRs that prove the required byte/hash/import/link
invariants.

Everything in this directory remains bounded reference/prototype work unless a
more specific reviewed claim says otherwise. Core reference behavior does not by
itself prove production trusted time, production key custody, external execution
or financial/wallet safety.
