# ADR — POM-RX v0.1 Strict Profile Prerequisites

Status: `PROPOSED / TIER_B / HUMAN_REVIEW_REQUIRED`

Date: 2026-08-13

Baseline: `9b1e9bc416ce8cb26ffa3253865984143a7d0579`

Council: `docs/decisions/COUNCIL_R3_STRICT_PROFILE_PREREQUISITES_ADR.md`

Supersedes: nothing

Amends after human ratification: the surrogate row in the stable diagnostic
registry of `ADR-POMRX-V01-ERRATA-V02-COMPATIBILITY.md`. That row remains an
immutable PR 27 evidence mapping, but a receipt-only runtime cannot emit its
unobservable Witness-flavoured defect ID. Until this ADR is human-ratified, the
merged registry remains authoritative and no runtime implementation is allowed.

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
  fail verification. Paths equal under Windows invariant case-folding or
  Unicode-normalization aliases also fail on every platform.
- Checksums are SHA-256 over exact file bytes. Windows text normalization is
  forbidden during verification.

After merge, version `1` is append-closed and byte-immutable. Any correction
creates a new numeric fixture version and documents why the old evidence
remains retained; it never overwrites version `1`.

### 2.3 Manifest contract

`manifest.json` has exact keys and rejects unknown fields and duplicate raw JSON
object keys before parsing. It records:

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

The profiled verifier rejects a parsed/plain policy object. It accepts only a
process-local, non-serializable, module-private branded capability produced by
a dedicated local loader. The loader is given for every verification
invocation:

- a local policy file path selected by host configuration, never by a receipt
  or remote request;
- an expected lowercase SHA-256 supplied by the same trusted host bootstrap;
- an explicit trusted evaluation instant supplied by that bootstrap;
- a host-selected artifact-manifest path and its expected exact-byte SHA-256.

The loader reads the current policy bytes on every invocation, verifies their
SHA-256 before parsing, rejects duplicate raw JSON object keys, and validates
exact keys and enums. It invokes the verifier synchronously inside a callback
scope containing the capability, then invalidates the capability when that
callback returns or throws. The capability is single-use; serialization,
cloning, reuse, use outside the callback, or use after invalidation yields
`POMRX_V01_E_POLICY_CAPABILITY_STALE`. Within the supported module/process
boundary, a cached capability cannot preserve an older policy time or evade a
later withdrawal. The pin is not read from the policy file it authenticates.

The host invocation shape is therefore:

```text
withFreshPomRxPolicyCapability(trustedBootstrapConfig, capability =>
  verifyPomRxChainProfiled(receipts, options, capability)
)
```

`trustedBootstrapConfig` is never accepted from receipt, fixture, remote API or
strategy input. The callback is synchronous and cannot return or retain the
capability.

The brand prevents accidental plain-object injection inside the supported
process. It is not cryptographic authenticity and does not resist malicious
local code that can replace the loader or verifier. The artifact checks in this
profile detect accidental packaging drift under a trusted host/bootstrap; they
do not prove executable authenticity against a compromised local machine. An
external signature, measured boot or separately trusted launcher is outside
this ADR. The quality and freshness of the host/bootstrap trust root must not
be overstated.

### 4.2 Policy document

The exact policy schema is `pom-rx-local-verification-policy/1` with:

```text
policy_schema_version
policy_id
policy_version
accepted_verifiers[]
withdrawn_verifiers[]
```

An accepted verifier record contains the merged ADR's exact four-field tuple
plus exact runtime constraints:

```text
receipt_schema_version
verifier_profile
verifier_version
implementation_artifact_sha256
runtime_constraints
```

`runtime_constraints` has exact string fields `node_version`, `icu_version`,
`unicode_version`, `locale`, `platform` and `arch`. All six must equal the
actual runtime values measured by the loader. This is required because the
frozen v0.1 assertion ordering uses `localeCompare`; source bytes alone do not
prove identical behavior across Node/ICU/locale environments. An environment
mismatch is fail-closed and never selects the tuple. Even after an exact
environment match, initialization recomputes a runtime-sensitive canonicalization
canary from the frozen compatibility corpus; a byte/hash mismatch is treated as
`POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED`.

A withdrawal targets that same four-field tuple and adds:

```text
effective_at
status = replacement | terminal
replacement = <exact tuple> | null
reason_code
```

`replacement` is required only for `replacement` status and never causes
automatic selection. The caller must explicitly select a currently accepted
replacement tuple in a new invocation.

Unknown fields, duplicate raw JSON keys, duplicate tuples, duplicate
withdrawals, conflicting records, wildcards, ranges, version comparison and
malformed dates fail policy loading. Matching is exact string equality. An
accepted tuple and runtime constraint set not present in the exact allow-set is
denied. A withdrawal whose `effective_at` is at or before the capability's
trusted evaluation instant overrides allow-set membership. If the trusted
evaluation instant is absent, malformed or not designated trusted by the loader
boundary, selection is indeterminate and denied. The verifier never uses
receipt time or ambient system time to evade an effective withdrawal.

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

The exact artifact manifest schema is `pom-rx-verifier-artifact-manifest/1`
and rejects unknown or duplicate raw JSON keys. It contains only:

```text
artifact_manifest_schema_version
artifact_id
verifier_version
verification_root = package-root
entries[] = { path, byte_length, sha256 }
implementation_artifact_sha256
```

The trusted host resolves `package-root` before loading entries. Every entry
must resolve to a regular file strictly below that root. Symlinks, junctions,
reparse points, alternate data streams, resolution escape, malformed UTF-8,
Unicode normalization aliases, and path pairs equal under Windows invariant
case-folding fail verification. The same rejection applies on all platforms so
one manifest cannot mean different closures on case-sensitive and
case-insensitive filesystems.

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
host-pinned artifact manifest before a trusted policy tuple is selected. The
loader first authenticates current policy bytes and evaluation time, then
computes the observed installed artifact identity, then applies profile,
runtime and exact-tuple policy selection. An artifact mismatch produces an
indeterminate verdict and cannot fall back.
The artifact manifest does not include its own derived digest in the preimage,
avoiding a circular hash. Release packaging and CI must prove reproducibility
from two clean directories before the artifact tuple is proposed for use.

The first public activation version is
`pom-rx-v0.1-strict-verifier/1`. Internal checker slices use test-only build
identifiers and are not policy-selectable verifier versions. Any change after
public activation to verification semantics, stable mappings, included artifact
closure or output truth table requires a new verifier version and artifact
digest. A rebuild with identical exact bytes retains the same digest.

## 6. Exact verdict envelope

The result has exact top-level keys; unknown or missing keys make it invalid:

```text
verdict_schema_version = pom-rx-verification-verdict/1
receipt_schema_version = pom-rx/0.1 | null
receipt_hashes
verifier_profile = pom-rx-v0.1/strict-errata-1 | null
verifier_version = string | null
implementation_artifact_sha256 = lowercase_sha256 | null
expected_implementation_artifact_sha256 = lowercase_sha256 | null
observed_implementation_artifact_sha256 = lowercase_sha256 | null
execution_environment = exact_runtime_object | null
effective_policy_id = string | null
effective_policy_version = string | null
effective_policy_sha256 = lowercase_sha256 | null
qualification
assurance = frozen-v0.1-structural-verification | null
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

Identity fields follow these exact population rules:

| Completed binding | Fields that may be non-null |
|---|---|
| no fresh branded capability | none of the policy, artifact, runtime, profile, verifier or receipt identity fields |
| current policy bytes and trusted time validated | `effective_policy_id`, `effective_policy_version`, `effective_policy_sha256` |
| host-pinned artifact manifest validates | previous fields plus `expected_implementation_artifact_sha256` |
| installed closure measured | previous fields plus `observed_implementation_artifact_sha256` and `execution_environment` |
| artifact bytes match the host-pinned manifest | previous fields plus `implementation_artifact_sha256` and the manifest's `verifier_version` |
| supported profile and exact tuple/runtime policy selection succeed | previous fields plus `verifier_profile` |
| every receipt validates as frozen v0.1 and is fully committed | previous fields plus `receipt_schema_version` and the complete `receipt_hashes` |

`implementation_artifact_sha256` is non-null only when expected and observed
digests are equal. On mismatch, it is null while the expected and observed
fields retain their distinct values. A missing or unreadable closure leaves the
observed field null. `receipt_schema_version` describes validated receipt input,
not the verifier's target; `verifier_profile` describes a successfully selected
supported profile, not an absent or unsupported caller string. `assurance` is
non-null only after receipt validation and structural evaluation complete as
either conformant or nonconformant. These rules prevent a pre-binding
indeterminate verdict from asserting unauthenticated identities.

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
POMRX_V01_L_MALICIOUS_LOCAL_RUNTIME_UNPROVED
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

1. fresh branded capability, current policy bytes and trusted evaluation time;
2. host-pinned artifact manifest and observed installed closure;
3. measured runtime constraints, requested profile and exact policy tuple;
4. individual receipt validation, canonicalization and hashing;
5. inherited base-chain rules;
6. strict invariant rules.

Layers 1–3 stop at the first applicable error in this total priority order:

| Priority | Diagnostic code |
|---:|---|
| 1 | `POMRX_V01_E_POLICY_CAPABILITY_REQUIRED` |
| 2 | `POMRX_V01_E_POLICY_CAPABILITY_STALE` |
| 3 | `POMRX_V01_E_POLICY_INVALID` |
| 4 | `POMRX_V01_E_POLICY_TIME_UNAVAILABLE` |
| 5 | `POMRX_V01_E_ARTIFACT_MANIFEST_INVALID` |
| 6 | `POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH` |
| 7 | `POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED` |
| 8 | `POMRX_V01_E_PROFILE_REQUIRED` |
| 9 | `POMRX_V01_E_DOWNGRADE_FORBIDDEN` |
| 10 | `POMRX_V01_E_PROFILE_UNSUPPORTED` |
| 11 | `POMRX_V01_E_VERIFIER_WITHDRAWN` |
| 12 | `POMRX_V01_E_VERIFIER_NOT_ALLOWED` |
| 13 | `POMRX_V01_E_PROFILE_INCOMPLETE` |

Only that one indeterminate diagnostic is returned and receipts are not parsed.
An unexpected typed or untyped internal fault encountered before a listed error
returns `POMRX_V01_E_INTERNAL_VERIFIER_ERROR`; it never masks an already
determined higher-priority code. If any receipt cannot complete layer 4, the
result is indeterminate and layers 5–6 do not run. If layer 4 completes, layers
5–6 collect all independently observable structural errors. This avoids
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
POMRX_V01_E_POLICY_CAPABILITY_STALE
POMRX_V01_E_POLICY_INVALID
POMRX_V01_E_POLICY_TIME_UNAVAILABLE
POMRX_V01_E_ARTIFACT_MANIFEST_INVALID
POMRX_V01_E_VERIFIER_NOT_ALLOWED
POMRX_V01_E_VERIFIER_WITHDRAWN
POMRX_V01_E_IMPLEMENTATION_ARTIFACT_MISMATCH
POMRX_V01_E_RUNTIME_ENVIRONMENT_UNSUPPORTED
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
separate `scenario_id` or `evidence_defect_id` field bound to the fixture
manifest only when that manifest is checksum-verified and its exact
checksum root is repository-pinned and reviewed. This is repository integrity,
not an external signature or cryptographic authenticity. The runner must retain
the nested verifier verdict unchanged. A
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

The gates must also cover single-use capability invalidation and attempted
reuse after policy replacement/withdrawal; policy reload per invocation;
withdrawal immediately before, exactly at and immediately after trusted time;
all pre-binding nullability rows; expected-versus-observed artifact mismatch;
the complete diagnostic priority table; raw duplicate JSON keys; symlink,
junction/reparse, ADS, root-escape, case-fold and Unicode-alias paths; manifest
tampering and undeclared imports; approved and rejected Node/ICU/Unicode/locale
environments; and a runtime-sensitive frozen-v0.1 canonicalization canary.

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
