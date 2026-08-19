# POM-RX Core — Exact authorization

This directory owns the common exact-authorization contract for POM-RX.

Application blocks may define domain-specific action and trusted-context normalization, but they must feed common Core commitments and must not create competing capability/replay semantics.

Current status: **contract proposed, production issuer unproved**.

The activated strict verifier is a prerequisite structural check only; it is not authorization. Production issuance additionally depends on enrolled/revocable source and witness trust, trusted evaluation time, exact policy binding and a separately reviewed issuer.

The first allowed implementation lot is a local reference binding/capability used to test the Gate state machine. Any test/reference issuer must be explicitly non-production and excluded from public production exports.

Authoritative candidate design:

- `docs/decisions/COUNCIL_POM_RX_CORE_EXACT_AUTH_GATE.md`
- `docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md`
