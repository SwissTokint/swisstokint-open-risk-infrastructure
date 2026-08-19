# POM-RX Core — Exact authorization

This directory owns the common exact-authorization contract for POM-RX.

Application blocks may define domain-specific action and trusted-context normalization, but they must feed versioned, domain-separated Core commitments and must not create competing capability/replay semantics.

Current status: **contract proposed, production issuer unproved**.

The activated strict verifier is a prerequisite structural check only; it is not authorization. Production issuance additionally depends on enrolled/revocable source and witness trust, trusted evaluation time, exact verifier/policy/artifact binding and a separately reviewed issuer.

The candidate capability binds a versioned `binding_profile`, action/context commitments, preflight/witness evidence identities and the exact strict verifier/policy/artifact tuple. The first local reference capability is process-local, branded and non-serializable.

The first allowed implementation lot is a local reference binding/capability used to test the Gate state machine. Any test/reference issuer must be explicitly non-production and excluded from public production exports.

Authoritative candidate design:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
