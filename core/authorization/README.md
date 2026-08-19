# POM-RX Core — Exact authorization

This directory owns the common exact-authorization contract for POM-RX.

Application blocks may define domain-specific action and trusted-context normalization, but they must feed versioned, domain-separated Core commitments and must not create competing capability/replay semantics.

Current status: **Core contract ratified; local reference record/capability harness exists; production issuer unproved**.

The activated strict verifier is a prerequisite structural check only; it is not authorization. Production issuance additionally depends on enrolled/revocable source and witness trust, trusted evaluation time, exact verifier/policy/artifact binding and a separately reviewed production issuer.

The exact authorization record binds a versioned `binding_profile`, action/context commitments, preflight/witness evidence identities and the exact strict verifier/policy/artifact tuple. Serialized reference evidence remains explicitly `reference_only`, `authorization_eligible=false` and `authorization_proved=false`.

The authorization module validates/commits the reference record but owns no global capability registry and exports no lifecycle transition API. Opaque capability state is created and retained inside one reference Gate instance, which makes the local capability audience Gate-specific and non-serializable.

Reference issuance is available only on the Gate harness's separately named `testAuthority`; the untrusted-facing Gate handle exposes consumption only. The test authority is for local conformance testing with fake downstreams and is not a production authorization issuer.

Design and hardening decisions:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
- `docs/decisions/COUNCIL_POM_RX_CORE_REFERENCE_GATE_HARDENING.md`
