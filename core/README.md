# POM-RX Core

Shared POM-RX semantics belong here: preflight/policy, strict verification, exact authorization, Witness, single-use Gate, observation and reconciliation.

Current Core homes include:

- `core/strict-verification/` — activated bounded strict-profile verifier and artifact identity;
- `core/authorization/` — candidate common exact-authorization contract;
- `core/gate/` — candidate common single-use Gate contract;
- `core/reference-data/` — shared bounded plain-data snapshot/capture boundary for hostile caller-owned reference objects;
- `core/witness/` — shared reference Witness trust lifecycle around the existing Ed25519 source/Witness primitives.

During the compatibility migration, frozen/shared implementations that predate the product-oriented layout remain at their current paths, especially `sdk/typescript/pom-rx.mjs`, `sdk/typescript/internal/` and `sdk/typescript/pom-rx-witness.mjs`.

Application blocks may normalize their own domain intents/context and own downstream adapters, but they must not duplicate canonicalization, hashing, verifier, Witness or Gate semantics. Exact authorization is also common Core behavior and must not be forked into an application-specific implementation.

Historical v0.1 paths are moved only through dedicated compatibility-preserving PRs that prove the required byte/hash/import/link invariants.
