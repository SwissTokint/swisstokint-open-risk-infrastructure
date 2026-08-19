# POM-RX Core

Shared POM-RX semantics belong here conceptually: preflight/policy, strict verification, exact authorization, Witness, single-use Gate, observation and reconciliation.

During the compatibility migration, existing canonical implementations remain at their current paths, especially `sdk/typescript/pom-rx.mjs`, `sdk/typescript/internal/` and `sdk/typescript/pom-rx-witness.mjs`.

New Core work must not duplicate canonicalization, hashing, verifier, Witness or Gate semantics in an application block. Physical migration into `core/` requires a separate compatibility-preserving PR.
