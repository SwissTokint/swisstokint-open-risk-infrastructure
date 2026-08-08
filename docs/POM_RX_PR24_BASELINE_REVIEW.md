# PR 24 baseline review — existing preflight witness

Status: `READ_ONLY_REVIEW / BLOCK_MERGE / CLAUDE_REVIEW_NOT_RUN`

Reviewed head: `175d4ddfab8e7efa035a34793205fd53f1e15984`

Base: `6f421c540e9a47a971840847547c9bfc951e1d46`

PR: <https://github.com/SwissTokint/swisstokint-open-risk-infrastructure/pull/24>

The PR is open and draft. The review used the existing witness implementation;
no witness was rewritten. Its historical GitHub Actions run succeeded on the
reviewed head, but that is neither an independent review nor production proof.

## Classification matrix

| Area | Classification | Observable fact | Required disposition |
|---|---|---|---|
| Exact signed preflight envelope | KEEP | `createPomRxSourceEnvelope()` and `verifyPomRxSourceEnvelope()` bind an Ed25519 source key to the exact committed preflight receipt | Preserve and extend with trust-policy checks |
| Signed acknowledgement | KEEP | `createPomRxWitnessAck()` signs receipt hash, receipt/run IDs, outcome, source key ID, receipt time, expiry and witness key ID | Preserve; never describe it as native execution proof |
| Freshness and expiry | KEEP | Server bounds receipt age/future skew; acknowledgement validity is bounded | Preserve, then add trusted-clock controls |
| Idempotent acknowledgement | KEEP | HTTP path returns the existing acknowledgement for the same receipt hash and persists before a new response | Preserve semantics when replacing storage |
| Source enrollment | MISSING / PRODUCTION_BLOCKER | A self-presented Ed25519 key can be cryptographically valid without being an authorized source; no trust registry is consulted | Add explicit enrollment status, scope and unknown-source rejection tests |
| Key revocation | MISSING / PRODUCTION_BLOCKER | No source or witness revocation state is evaluated | Define rotation, overlap, revocation time and offline status behavior |
| Transactional storage | CHANGE / PRODUCTION_BLOCKER | The serialized JSONL ledger is fail-closed and prototype-idempotent, but append-only file writes do not provide a demonstrated transaction, fsync or partial-write recovery guarantee | Reuse the interface with a transactional store or a framed durable journal |
| Trusted clock | MISSING / PRODUCTION_BLOCKER | Time checks rely on the process clock | Add drift monitoring, trusted source policy and fail-closed thresholds |
| Ledger error recovery | MISSING / PRODUCTION_BLOCKER | Corrupt, duplicate or signature-invalid lines stop startup; no quarantine, restore or drill is implemented | Add backup/restore, truncated-write recovery and compromise drills |
| Downstream fail-closed gate | MISSING / PRODUCTION_BLOCKER | Documentation requires the consumer to reject a missing, expired or dry-run acknowledgement; no executable consumer is included in the PR | Test a bounded representative adapter without inspecting or modifying the bot |
| CEX boundary | KEEP | `docs/POM_RX_PREFLIGHT_WITNESS_V0_1.md`, “Blockchain utility boundary”, states that an off-chain witness cannot cryptographically force a centralized venue | Preserve this limit in every public claim |
| Bypass tests | CHANGE / PRODUCTION_BLOCKER | Existing tests cover tampering, wrong phase, media type, size, stale/future time and idempotence; they omit action substitution, unknown/revoked source, same source/witness key, duplicate JSON keys, failed persistence and truncated ledger | Add the missing adversarial vectors before merge |

## Required adversarial coverage

- action substitution after a valid witness acknowledgement;
- input substitution after acknowledgement;
- unknown, revoked or not-yet-valid source;
- source key equal to witness key;
- duplicate JSON object keys and noncanonical key encodings;
- acknowledgement replay outside scope or validity;
- persistence failure before response;
- interrupted append and truncated final ledger record;
- witness-key compromise and rotation overlap;
- downstream rejection of absent, expired, dry-run or mismatched acknowledgement.

## Security conclusion

The existing code is useful prototype material and should be continued rather
than rewritten. It proves that a witness received and signed one exact
preflight receipt. It does not prove that the source was enrolled, the key was
not revoked, a reliable clock was used, storage is transactional, a CEX obeyed
the acknowledgement or the later native action matched the preflight action.

Verdict for this baseline: `PRODUCTION_BLOCKER`. Merge remains subject to real
Claude architecture/security reviews and explicit human approval.
