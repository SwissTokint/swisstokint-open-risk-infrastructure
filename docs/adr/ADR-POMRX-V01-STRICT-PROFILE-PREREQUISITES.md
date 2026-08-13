# ADR — POM-RX v0.1 Strict Profile Prerequisites

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-13

Baseline: `9b1e9bc416ce8cb26ffa3253865984143a7d0579`

Council: `docs/decisions/COUNCIL_R3_STRICT_PROFILE_PREREQUISITES_ADR.md`

Supersedes: nothing

Clarifies: the surrogate row in the merged compatibility ADR is an immutable
PR 27 evidence mapping, not permission for a receipt-only runtime to emit an
unobservable Witness-flavoured defect ID.

Depends on: `docs/adr/ADR-POMRX-V01-ERRATA-V02-COMPATIBILITY.md`

## Decision summary

Before the first `pom-rx-v0.1/strict-errata-1` invariant correction ships,
POM-RX shall freeze an exact-byte v0.1 compatibility corpus and implement a
separate profiled-verifier foundation with a complete verdict contract,
typed diagnostics, pinned local policy capability, deterministic executable
artifact identity and mandatory no-fallback behavior.

The profiled entry point shall remain internal and shall not emit a conformant
verdict until all invariant families required by
`pom-rx-v0.1/strict-errata-1` are implemented as one complete profile. Partial
invariant delivery is testable, but is never an active-use strict verifier.

The receipt-only verifier shall report only defects observable from its trusted
inputs. Consequently, the unsigned-surrogate defect ID remains a conformance
scenario evidence ID. The strict verifier emits the underlying action
continuity defect for the indistinguishable receipt chain. No caller-supplied
scenario metadata may change a verifier diagnostic.

This ADR does not implement or authorize runtime, fixtures, schemas,
canonicalisation, hashes, Witness, Gate, DAGR or v0.2 changes.

## 1. Scope and non-goals

This ADR decides the prerequisites for implementing strict verification over
frozen `pom-rx/0.1` receipts. It does not decide commitment preimages, a new
receipt schema or hash domain, signed Witness lifecycle, durable replay,
trusted-clock infrastructure, Gate consumption, DAGR controls, native
execution evidence, or POM-RX Core v0.2 candidate ordering.

All standalone strict verdicts remain:

```text
authorization_eligible = false
authorization_proved = false
```

They are not an `ALLOW`, audit, certification or production-security claim.

## 2. Frozen v0.1 compatibility corpus

### 2.1 Versioned layout

The first fixture PR shall add exactly this versioned root:

```text
fixtures/pom-rx/v0.1-compat/1/
  manifest.json
  checksums.sha256
  chains/<scenario_id>.json
  canonical/<scenario_id>/<receipt_index>.json
```

Version `1` contains exactly eight scenarios:

```text
valid-control
POMRX-001-ACTION-PREFLIGHT-EXECUTION
POMRX-001-ACTION-EXECUTION-RECONCILIATION
POMRX-001-INPUT-PREFLIGHT-EXECUTION
POMRX-006-EXECUTION-FAIL-ASSERTION
POMRX-006-RECONCILIATION-FAIL-ASSERTION
POMRX-007-DUPLICATE-RECEIPT-ID
POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION
```

The corpus is synthetic, local and offline. It contains no secret, wallet,
exchange credential, fund, position, live order or network transaction.

### 2.2 Exact bytes and immutability

- `chains/*.json` and `manifest.json` are UTF-8 without BOM, use LF, contain no
  CR byte, and end with exactly one LF.
- `canonical/**/*.json` contains the exact UTF-8 bytes returned by the frozen
  v0.1 canonicalizer and has no added BOM or terminal newline.
- `checksums.sha256` is UTF-8 ASCII, LF terminated, and has one line
  `<64 lowercase hex><two spaces><relative POSIX path>` per other file.
- Checksum paths are ordinally sorted by Unicode scalar value, unique, relative,
  slash-separated and contain no empty, `.` or `..` segment. The checksum file
  excludes itself and includes every other regular file under the version root.
- Symlinks, junctions, alternate data streams and unmanifested regular files
  fail verification.
- Checksums are SHA-256 over exact file bytes. Windows text normalization is
  forbidden during verification.

After merge, version `1` is append-closed and byte-immutable. Any correction
creates a new numeric fixture version and documents why the old evidence
remains retained; it never overwrites version `1`.

### 2.3 Manifest contract

`manifest.json` has exact keys and rejects unknown fields. It records:

```text
fixture_schema_version = pom-rx-v0.1-compat-fixtures/1
receipt_schema_version = pom-rx/0.1
hash_domain = swisstokint:pom-rx:v1:
source_repository
source_baseline
generated_with_node
generated_with_icu
generated_with_locale
scenarios[]
```

Each scenario records exact `scenario_id`, `classification` (`valid-control` or
`known-vulnerable`), ordered chain path, ordered canonical paths, expected
legacy qualification, expected legacy receipt hashes and, for vulnerable
scenarios, exact PR 27 evidence defect ID. The manifest records provenance; it
does not make Node/ICU/locale portable or transform legacy ordering.

The fixture verifier independently recomputes canonical bytes and receipt
hashes using the frozen v0.1 path, then byte-compares them to the fixture files.
A checksum-only pass is insufficient.

## 3. Additive API boundary, activation barrier and no fallback

The historical export stays unchanged throughout package `0.1.x`:

```text
verifyPomRxChain(receipts, { allowPartial })
```

The reserved active-use API is a separate export, no earlier than package
`0.1.1`:

```text
verifyPomRxChainProfiled(receipts, {
  allowPartial,
  verificationProfile
}, trustedPolicyCapability)
```

It supports exactly `pom-rx-v0.1/strict-errata-1`. The new function and all of
its dependencies MUST NOT call `verifyPomRxChain()`, interpret its `ok` result,
or catch a strict failure and retry legacy. Shared frozen validation and commit
primitives may be extracted only after byte/hash parity is proven over the
immutable corpus and old API behavior remains exact.

The symbol MUST NOT be exported for active use until the implementation and
tests cover this complete activation matrix:

```text
action_commitment continuity across both adjacent transitions
input_commitment continuity across both adjacent transitions
execution:accepted assertion consistency
reconciliation:matched assertion consistency
receipt_id uniqueness within the chain
```

Each invariant family may land first as an internal pure checker. Before the
matrix is complete, any internal development orchestrator using the final
verdict shape returns `indeterminate`,
`structural_prerequisite_satisfied = false`, and
`POMRX_V01_E_PROFILE_INCOMPLETE`; it never returns `conformant`. Only one final
activation PR may export `verifyPomRxChainProfiled()` and enable the conformant
truth-table row after the complete matrix and valid control pass together.

Absent profile, legacy profile in the active-use API, unsupported profile,
policy failure, artifact failure and internal failure return an indeterminate
strict verdict. They never return a legacy result and never throw an
authorization-capable success.

## 4. Trusted local policy capability

### 4.1 Trust boundary

The profiled verifier rejects a parsed/plain policy object. It accepts only an
opaque, frozen capability produced by a dedicated local loader. The loader is
given:

- a local policy file path selected by host configuration, never by a receipt
  or remote request;
- an expected lowercase SHA-256 supplied by the same trusted host bootstrap;
- an explicit trusted evaluation instant supplied by that bootstrap.

The loader reads exact bytes, verifies their SHA-256 before parsing, validates
exact keys and enums, and returns an unforgeable module-private branded
capability. The pin is not read from the policy file it authenticates. The
quality of the host/bootstrap trust root is outside this local deterministic
profile and must not be overstated.

### 4.2 Policy document

The exact policy schema is `pom-rx-local-verification-policy/1` with:

```text
policy_schema_version
policy_id
policy_version
accepted_verifiers[]
withdrawn_verifiers[]
```

An accepted verifier is the exact tuple:

```text
receipt_schema_version
verifier_profile
verifier_version
implementation_artifact_sha256
```

A withdrawal has that same tuple plus:

```text
effective_at
status = replacement | terminal
replacement = <exact tuple> | null
reason_code
```

`replacement` is required only for `replacement` status and never causes
automatic selection. The caller must explicitly select a currently accepted
replacement tuple in a new invocation.

Unknown fields, duplicate tuples, duplicate withdrawals, conflicting records,
wildcards, ranges, version comparison and malformed dates fail policy loading.
Matching is exact string equality. An accepted tuple not present in the exact
allow-set is denied. A withdrawal whose `effective_at` is at or before the
capability's trusted evaluation instant overrides allow-set membership. If the
trusted evaluation instant is absent, malformed or not designated trusted by
the loader boundary, selection is indeterminate and denied. The verifier never
uses receipt time or ambient system time to evade an effective withdrawal.

Every verdict binds `effective_policy_id`, `effective_policy_version` and the
exact-byte `effective_policy_sha256`.

## 5. Deterministic implementation artifact identity

Git commit, branch, tag, package version and filename alone are not executable
artifact identities. Each strict implementation release shall publish an
artifact manifest listing every executable or static registry file that can
affect profiled verification. The initial closure includes the profiled entry
point, frozen receipt validation/commit code, canonicalizer/hash dependency,
diagnostic registry and policy validator/loader. Tests, documentation, source
maps and policy instances are excluded.

For each included regular file, calculate and publish SHA-256 over exact bytes
as review evidence. Normalize its package-relative path to a unique POSIX path
and sort entries by Unicode scalar-value order. The artifact digest itself is
calculated over exact path and file bytes, not over a printable delimiter
format. Its preimage is:

```text
ASCII("pom-rx-verifier-artifact/1\n") ||
for each sorted entry:
  uint64be(path_utf8_byte_length) || path_utf8_bytes ||
  uint64be(file_byte_length) || exact_file_bytes
```

The SHA-256 of that preimage is
`implementation_artifact_sha256`. Lengths are unsigned 64-bit big-endian
integers. Paths containing a control character, NUL, backslash, an empty
segment, `.` or `..` are invalid. Duplicate, missing, changed or unlisted
verification-affecting files fail the build/installation integrity check. The
declared closure also fails if static import analysis finds an undeclared local
dependency or a dynamic local import.

At verifier initialization, installed exact bytes are rechecked against the
published artifact manifest before a trusted policy tuple is selected. An
artifact mismatch produces an indeterminate verdict and cannot fall back.
The artifact manifest does not include its own derived digest in the preimage,
avoiding a circular hash. Release packaging and CI must prove reproducibility
from two clean directories before the artifact tuple is proposed for use.

`verifier_version` starts at `pom-rx-v0.1-strict-verifier/1`. Any change to
verification semantics, stable mappings, included artifact closure or output
truth table requires a new verifier version and artifact digest. A rebuild with
identical exact bytes retains the same digest.

## 6. Exact verdict envelope

The result has exact top-level keys; unknown or missing keys make it invalid:

```text
verdict_schema_version = pom-rx-verification-verdict/1
receipt_schema_version = pom-rx/0.1
receipt_hashes
verifier_profile = pom-rx-v0.1/strict-errata-1
verifier_version
implementation_artifact_sha256
effective_policy_id
effective_policy_version
effective_policy_sha256
qualification
assurance = frozen-v0.1-structural-verification
authorization_eligible = false
authorization_proved = false
structural_status
structural_prerequisite_satisfied
diagnostics
warnings
limitations
```

`receipt_hashes` is the complete ordered list only when every received receipt
was individually validated, canonicalized and hashed; otherwise it is empty.
No partial list may appear to identify an unverified chain.

The exact truth table is:

| structural_status | qualification | error count | structural_prerequisite_satisfied |
|---|---|---:|---:|
| `conformant` | `STRICT_STRUCTURAL_CONFORMANCE_OBSERVED` | 0 | `true` |
| `nonconformant` | `STRICT_STRUCTURAL_NONCONFORMANCE_OBSERVED` | >= 1 | `false` |
| `indeterminate` | `STRICT_VERIFICATION_INDETERMINATE` | >= 1 | `false` |

A chain that completes validation and is proven to violate base or strict
structural rules is `nonconformant`. A policy/profile/artifact/internal failure,
or receipt failure that prevents safe completion of structural verification,
is `indeterminate`. Warnings never make the prerequisite true when an error is
present.

`limitations` is an ordered, deduplicated array of these stable codes for this
profile:

```text
POMRX_V01_L_OPAQUE_COMMITMENT_CONTENT_UNPROVED
POMRX_V01_L_NATIVE_EXECUTION_UNPROVED
POMRX_V01_L_CROSS_CHAIN_REPLAY_UNPROVED
POMRX_V01_L_SIGNED_WITNESS_UNPROVED
POMRX_V01_L_GATE_AUTHORIZATION_UNPROVED
```

The array uses the order above. English explanatory text belongs in developer
documentation, not in the machine contract.

## 7. Diagnostics

Each diagnostic has exact keys:

```text
defect_id
diagnostic_code
severity = error | warning
phase = preflight | execution | reconciliation | null
receipt_index = non-negative integer | null
field = string | null
message
```

English `message` is informative and unstable. Logic and tests use codes and
defect IDs. Diagnostics are ordered and deduplicated exactly as specified by
the merged compatibility ADR. `warnings` is the ordered, deduplicated
projection of warning `diagnostic_code` values from `diagnostics`.

### 7.1 Evaluation precedence

The implementation evaluates these layers in order:

1. capability authenticity, policy bytes/time and exact tuple;
2. installed artifact integrity and profile selection;
3. individual receipt validation, canonicalization and hashing;
4. inherited base-chain rules;
5. strict invariant rules.

A layer 1 or 2 error returns one deterministic highest-priority indeterminate
diagnostic and does not parse receipts. If any receipt cannot complete layer 3,
the result is indeterminate and layers 4–5 do not run. If layer 3 completes,
layers 4–5 collect all independently observable structural errors. This avoids
diagnostic cascades derived from unvalidated bytes.

Typed internal faults select diagnostic codes. The implementation must not
regex-match English exception messages to determine security semantics.

### 7.2 Inherited v0.1 mapping

| Current failure family | Stable code |
|---|---|
| receipt/object exact keys; schema, identifier, reference, hash, phase/outcome, assertion, source-key or date-time validation | `POMRX_V01_E_SCHEMA_INVALID` |
| canonical payload depth/node/string/number/key/sensitive-key/size failure or serialization failure | `POMRX_V01_E_CANONICALIZATION_FAILED` |
| `previous_receipt_hash` mismatch | `POMRX_V01_E_RECEIPT_HASH_LINK_INVALID` |
| chain cardinality/start/order; deny followed by execution; allowed/accepted missing required next phase; rejected execution followed by reconciliation | `POMRX_V01_E_CHAIN_PHASE_INVALID` |
| time moves backwards between valid receipts | `POMRX_V01_E_CHAIN_TIMESTAMP_INVALID` |
| `run_id`, `agent_ref`, `subject_ref`, `method_hash` or `policy_hash` changes within a valid chain | `POMRX_V01_E_CHAIN_SHARED_FIELD_CHANGED` |
| incomplete allowed chain when `allowPartial` is false | `POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN` |
| unexpected non-typed implementation failure | `POMRX_V01_E_INTERNAL_VERIFIER_ERROR` |

Where the existing implementation checks overlap, the more specific mapping
wins: missing required execution/reconciliation due only to `allowPartial=false`
uses `POMRX_V01_E_PARTIAL_CHAIN_FORBIDDEN`; illegal phase transitions and
outcome sequencing use `POMRX_V01_E_CHAIN_PHASE_INVALID`.

### 7.3 Profile and policy codes

```text
POMRX_V01_E_PROFILE_REQUIRED
POMRX_V01_E_PROFILE_UNSUPPORTED
POMRX_V01_E_PROFILE_INCOMPLETE
POMRX_V01_E_DOWNGRADE_FORBIDDEN
POMRX_V01_E_POLICY_CAPABILITY_REQUIRED
POMRX_V01_E_POLICY_INVALID
POMRX_V01_E_POLICY_TIME_UNAVAILABLE
POMRX_V01_E_VERIFIER_NOT_ALLOWED
POMRX_V01_E_VERIFIER_WITHDRAWN
POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH
```

These have `defect_id = null`. The reserved replay code remains inactive for
this profile because no durable replay check is claimed.

### 7.4 Strict defect mapping and surrogate observability

The receipt-only verifier mapping is:

| Observable transition | Defect ID | Code |
|---|---|---|
| preflight → execution action mismatch | `POMRX-001-ACTION-PREFLIGHT-EXECUTION` | `POMRX_V01_E_ACTION_CONTINUITY` |
| execution → reconciliation action mismatch | `POMRX-001-ACTION-EXECUTION-RECONCILIATION` | `POMRX_V01_E_ACTION_CONTINUITY` |

The merged compatibility ADR requires input continuity across both adjacent
transitions but PR 27 names only the preflight-to-execution defect. This ADR
therefore proposes the following new evidence ID for human ratification:

| Observable transition | Defect ID | Code |
|---|---|---|
| preflight → execution input mismatch | `POMRX-001-INPUT-PREFLIGHT-EXECUTION` | `POMRX_V01_E_INPUT_CONTINUITY` |
| execution → reconciliation input mismatch | `POMRX-001-INPUT-EXECUTION-RECONCILIATION` | `POMRX_V01_E_INPUT_CONTINUITY` |

`POMRX-001-INPUT-EXECUTION-RECONCILIATION` is not a PR 27 identifier and must
not be emitted before this ADR is human-ratified. Ratification adds it to the
profile's versioned evidence registry; it does not rewrite PR 27 evidence.

The conformance scenario
`POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION` remains immutable evidence. It is
not a separately observable receipt-verifier defect because the unsigned
surrogate object is absent from the verifier input. Its receipt-only strict
verdict therefore emits
`POMRX-001-ACTION-PREFLIGHT-EXECUTION` /
`POMRX_V01_E_ACTION_CONTINUITY`.

A checksum-verified conformance runner may report the surrogate ID only in a
separate `scenario_id` or `evidence_defect_id` field bound to the authenticated
fixture manifest. It must retain the nested verifier verdict unchanged. A
receipt field, API option, remote request or other caller-supplied label may
never cause the surrogate ID to be emitted. This preserves PR 27 evidence
without inventing a cryptographic Witness claim.

## 8. Test and delivery sequence

The only approved order after this ADR receives its own human merge approval
is:

1. fixture/checksum PR with no runtime change;
2. internal profiled verdict, typed diagnostic registry, policy capability and
   artifact identity PR with no public profiled export and no strict invariant
   correction;
3. `POMRX-INTEGRITY-01-ACTION-CONTINUITY` internal-checker PR covering both
   adjacent phase transitions and the surrogate conformance scenario boundary;
4. later internal invariant-family PRs, one family at a time;
5. one final profile-activation PR that proves the complete matrix, exports
   `verifyPomRxChainProfiled()` and only then permits a conformant verdict.

Required gates include exact-byte fixture verification, legacy API/result
compatibility, artifact reproducibility, policy adversarial cases, deterministic
diagnostics, no-fallback instrumentation, strict valid control, correction
tests, an explicit pre-activation `POMRX_V01_E_PROFILE_INCOMPLETE` test, and
retained vulnerable legacy reproduction. An expected-red case changes state
only when its exact strict correction is demonstrated; its historical
legacy-vulnerability evidence remains preserved.

No step may silently modify the v0.1 fixture corpus, collapse multiple
invariant families into one PR, or use Proof Receipt Python tests as evidence
of a Python POM-RX verifier.

## 9. Rollback and withdrawal

Documentation and fixture changes are non-runtime and independently
revertible. Runtime foundation and each invariant family ship separately.

If a profiled verifier is defective, trusted policy adds an exact withdrawal
record for its `(receipt_schema_version, verifier_profile, verifier_version,
implementation_artifact_sha256)` tuple. At or after its effective time the
tuple is denied even if still listed as accepted. A replacement is selected
only through a new exact allow-set match. Cached verdicts from the withdrawn
tuple are revalidated or rejected at later Gate research; historical verdicts
remain append-only and non-authorizing.

Rollback never:

- invokes legacy as a fallback;
- rewrites or rehashes v0.1 receipts;
- edits a merged fixture version;
- deletes vulnerability evidence;
- changes a diagnostic mapping under the same verifier version;
- treats a receipt hash or unsigned surrogate as a signed Witness;
- reinterprets v0.2 candidate data as v0.1.

## 10. Human gate

This ADR is proposed, not ratified. It authorizes no implementation. The exact
future ADR head requires distinct Protocol and Security review, green CI and
explicit human merge authorization for its PR. Fixture and runtime PRs require
their own review and merge gates. No automatic Tier-B merge, release or
publication is permitted.
