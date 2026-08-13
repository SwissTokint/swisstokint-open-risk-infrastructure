# ADR — POM-RX v0.1 Strict-Profile Fixture Contract Amendment

STATUS: PROPOSED / HUMAN_REVIEW_REQUIRED

TASK_ID: R3-STRICT-PROFILE-FIXTURE-CONTRACT-AMENDMENT

AMENDS: ADR-POMRX-V01-STRICT-PROFILE-PREREQUISITES.md, sections 2, 8 and 10

BASE: 743b8082bfc925d1681af7a239856a0b4f7e8464

## 1. Decision boundary

This amendment closes representation gaps found before any immutable version-1
fixture byte was generated. It is additive to the parent ADR. Where this text
is more specific about the fixture corpus, this text controls after its own
human approval and merge.

It does not change or authorize:

- `verifyPomRxChain()` or any public API;
- POM-RX v0.1 schema, normalization, canonical bytes or hash domain;
- any historical receipt or receipt hash;
- strict-profile runtime activation or a corrected invariant;
- Witness, Gate, DAGR or POM-RX Core v0.2 candidate publication.

The prior PR #33 human gate is recorded as satisfied only for reviewed head
`496fe9a49459518f6ceedcc3215401b50fe435e1`, squash-merged as
`743b8082bfc925d1681af7a239856a0b4f7e8464`. It does not approve this amendment.

## 2. Exact manifest serialization contract

The version root remains exactly:

```text
fixtures/pom-rx/v0.1-compat/1/
```

`manifest.json` is UTF-8 without BOM, uses LF, contains no CR byte and ends with
exactly one LF. Its top-level object keys appear in this exact order:

```text
fixture_schema_version
receipt_schema_version
hash_domain
source_repository
source_baseline
generated_with_node
generated_with_icu
generated_with_unicode
generated_with_locale
generated_with_platform
generated_with_arch
scenarios
canaries
```

All keys are required. Unknown or duplicate raw JSON keys are rejected at every
object depth before semantic parsing. A duplicate after JSON escape decoding,
such as `scenario_id` plus `\u0073cenario_id`, is also a duplicate. Strings are
not trimmed or normalized by the parser. Except for the nullable field defined
below, `null` is forbidden.

`fixture_schema_version`, `receipt_schema_version`, `hash_domain`,
`source_repository` and `source_baseline` are non-empty strings with the exact
values defined by this amendment and its parent ADR. Each of the six
`generated_with_*` fields is a required non-empty string containing the exact
measured runtime value; booleans, numbers, arrays, objects and `null` are
rejected. The measured fields are provenance and compatibility inputs, not
environment portability claims.

The version-1 values and capture sources are exact:

| field | capture source | exact value |
|---|---|---|
| `generated_with_node` | `process.versions.node` | `24.16.0` |
| `generated_with_icu` | `process.versions.icu` | `78.3` |
| `generated_with_unicode` | `process.versions.unicode` | `17.0` |
| `generated_with_locale` | `Intl.DateTimeFormat().resolvedOptions().locale` | `fr-CH` |
| `generated_with_platform` | `process.platform` | `win32` |
| `generated_with_arch` | `process.arch` | `x64` |

The verifier compares each exact string before executing the punctuation
canary. A different measured value fails environment compatibility; it does
not silently skip or reinterpret the canary.

The manifest generator uses two-space indentation and one terminal LF. This
format becomes byte-immutable at merge; a parser must still validate the
contract rather than treating formatting alone as validation.

### 2.1 Scenario schema and order

`scenarios` contains exactly eight objects in this exact order:

1. `valid-control`
2. `POMRX-001-ACTION-PREFLIGHT-EXECUTION`
3. `POMRX-001-ACTION-EXECUTION-RECONCILIATION`
4. `POMRX-001-INPUT-PREFLIGHT-EXECUTION`
5. `POMRX-006-EXECUTION-FAIL-ASSERTION`
6. `POMRX-006-RECONCILIATION-FAIL-ASSERTION`
7. `POMRX-007-DUPLICATE-RECEIPT-ID`
8. `POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION`

Every scenario object has exactly these keys in this exact serialization order:

```text
scenario_id
classification
allow_partial
chain_path
canonical_paths
expected_legacy_qualification
expected_legacy_status
expected_legacy_receipt_hashes
evidence_defect_id
```

Their types and constraints are:

- `scenario_id`: one exact ID from the ordered list, unique;
- `classification`: `valid-control` only for the first scenario, otherwise
  `known-vulnerable`;
- `allow_partial`: JSON boolean fixed by the table below;
- `chain_path`: exact relative POSIX path
  `chains/<scenario_id>.json`;
- `canonical_paths`: ordered non-empty string array with exactly one path per
  receipt, using `canonical/<scenario_id>/<receipt_index>.json`;
- `expected_legacy_qualification`: exact string
  `LEGACY_ACCEPTANCE_OBSERVED` for all eight scenarios;
- `expected_legacy_status`: exact string from the status table below;
- `expected_legacy_receipt_hashes`: ordered lowercase SHA-256 array with exactly
  one element per receipt;
- `evidence_defect_id`: JSON `null` only for `valid-control`; otherwise the
  exact `scenario_id`.

`receipt_index` is zero-based ASCII decimal without padding. Indices start at
`0`, are contiguous and follow chain order. Canonical path count, receipt-hash
count and chain receipt count are equal.

The exact invocation table is:

| scenario_id | allow_partial | expected_legacy_status |
|---|---:|---|
| `valid-control` | `false` | `reconciliation:matched` |
| `POMRX-001-ACTION-PREFLIGHT-EXECUTION` | `true` | `execution:accepted` |
| `POMRX-001-ACTION-EXECUTION-RECONCILIATION` | `false` | `reconciliation:matched` |
| `POMRX-001-INPUT-PREFLIGHT-EXECUTION` | `true` | `execution:accepted` |
| `POMRX-006-EXECUTION-FAIL-ASSERTION` | `true` | `execution:accepted` |
| `POMRX-006-RECONCILIATION-FAIL-ASSERTION` | `false` | `reconciliation:matched` |
| `POMRX-007-DUPLICATE-RECEIPT-ID` | `true` | `execution:accepted` |
| `POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION` | `true` | `execution:accepted` |

The verifier call is exactly:

```js
verifyPomRxChain(receipts, { allowPartial: scenario.allow_partial })
```

All eight expected results have `ok === true`, the exact table-bound `status`,
no own `error` property, and the exact ordered `receipt_hashes`. The test uses
`Object.keys(result)` to require exactly `ok`, `status`, `receipt_hashes` and
deep-compares all values. This records the measured legacy vulnerability for
seven scenarios; it is not conformance, authorization or a correction.

The ordinary preflight-to-execution action-substitution chain and the surrogate
scenario chain have identical chain-file bytes, canonical bytes and receipt
hashes. This duplication is required. Only checksum-verified manifest scenario
metadata distinguishes the conformance evidence ID; it never changes a
receipt-only verifier diagnostic.

### 2.2 Chain file contract

Every `chains/*.json` file is a direct top-level JSON array of receipt objects in
chain order. It has no wrapper or scenario metadata. It uses two-space
indentation and exactly one terminal LF. Raw duplicate object keys are rejected
before parsing. Receipt fields remain exactly those accepted by the frozen v0.1
validator; the fixture layer adds no receipt field.

### 2.3 Canary schema

`canaries` is a JSON array containing exactly one object. It is not a scenario
or receipt. The object has exactly these keys in this serialization order:

```text
canary_id
input_path
expected_path
comparator
expected_sha256
```

The exact values are:

```text
canary_id = localecompare-order-v1
input_path = canaries/localecompare-order-v1.input.json
expected_path = canaries/localecompare-order-v1.expected.json
comparator = javascript-string-localeCompare
expected_sha256 = 3707fd4c6e3322d3cbc6e1c3c7d68b669d2f409b8b675d1b4d8c70519b95e9d7
```

The canary input and expected file bytes remain exactly those specified by the
parent ADR, with no BOM or terminal newline.

## 3. Source and generation binding

`source_repository` is exactly
`https://github.com/SwissTokint/swisstokint-open-risk-infrastructure`.

`source_baseline` is exactly the full lowercase Git commit that binds the four
frozen legacy paths consumed as generation inputs. It does not claim that the
later fixture generator already exists in that commit. For version 1 it is
`743b8082bfc925d1681af7a239856a0b4f7e8464` with these identities:

| path | Git blob | SHA-256 over exact bytes |
|---|---|---|
| `sdk/typescript/pom-rx.mjs` | `d6af19d4e049fa1721bbd858f0836d317725baf6` | `8d57871b7535170459209676be25aee43eaa50fb24180dcb15fad654386d2eb6` |
| `sdk/typescript/swisstokint-proof.mjs` | `920191088a93d506889f2985c572ea8fea717266` | `83c4102fe259bbd7beac7dd070c1da64f874fe21a3c3e0fd1a5e8d6eef785313` |
| `tests/pom-rx-integrity-baseline.node.test.mjs` | `3c7b45d88867f7e7d2079135f6198465c586a953` | `7aa21aec62bfb4f60230a1f9d35fe289137650c7021162b2c117f1521770aeb5` |
| `scripts/assert-pom-rx-integrity-baseline-red.mjs` | `e8b7607bb59dc445627618c244fd41d3f7564b6a` | `ce4010479568f388569a667167da2d5747154a3eab8080f85c63c93be9ef3b14` |

Later documentation commits do not change the generation baseline. Before
writing literal output, the fixture generator reads the four paths from the
checked-out `743b808` worktree, rejects any Git blob or exact-byte SHA-256
mismatch against this table, and only then imports the checked current-tree
modules whose exact bytes were just verified. The generator's own path, Git
commit and exact-byte SHA-256 are recorded in fixture-PR review evidence; they
are not part of `source_baseline`.

The eight chain files are committed literals. Verification reads committed
bytes and recomputes canonical bytes and receipt hashes through the frozen
implementation. It must not regenerate both actual and expected input from one
builder during the verification assertion.

## 4. Independent fixture-set root pin

The independently reviewed pin lives outside the self-consistent version root:

```text
fixtures/pom-rx/v0.1-compat/pins.json
```

It is not listed in version `1/checksums.sha256`. It is UTF-8 without BOM, uses
LF, contains no CR and ends with exactly one LF. Its top-level object has
exactly these keys in this exact order:

```text
pin_schema_version
pins
```

`pin_schema_version` is exactly `pom-rx-v0.1-compat-pins/1`. `pins` is a JSON
array containing exactly one object for version 1 with these exact ordered keys:

```text
fixture_version
source_baseline
fixture_set_sha256
```

Values are respectively JSON integer `1`, the exact full source baseline
commit `743b8082bfc925d1681af7a239856a0b4f7e8464`, and one lowercase 64-hex
digest. The digest is recomputed exactly as:

```text
SHA-256(ASCII("pom-rx-v0.1-fixture-set/1\n") || exact version-1 checksums.sha256 bytes)
```

All `pins.json` top-level and pin-record keys are required. Unknown, missing,
raw duplicate and escape-equivalent duplicate keys are rejected before
semantic parsing at both depths. `pin_schema_version`, `source_baseline` and
`fixture_set_sha256` are strings with the exact formats and values defined
above; `fixture_version` is the JSON integer `1`. All other JSON types and all
`null` values are rejected. Pin object order is strictly increasing by integer
`fixture_version`; version 1 contains exactly one pin object.

`pins.json` uses two-space indentation and exactly one terminal LF. Its
whitespace and key order are part of its reviewed exact bytes even though the
version-1 root does not hash it.

The fixture verification test loads `pins.json` independently, requires one
unique version-1 pin, recomputes the digest and compares exact lowercase hex.
A mutation that updates the entire version root but not the parent pin fails.
Changing both is visible as a reviewed pin change. This is repository-pinned
integrity, not external authenticity.

## 5. Exact-byte checkout contract

The fixture PR must add these exact `.gitattributes` lines before generating or
staging bytes:

```gitattributes
/fixtures/pom-rx/v0.1-compat/1/** -text
/fixtures/pom-rx/v0.1-compat/pins.json -text
/fixtures/pom-rx/support/unicode/17.0.0/CaseFolding.txt -text
```

The rules prevent Git text conversion. They do not replace explicit BOM, CR,
newline and byte-length checks. The fixture PR proves a fresh local checkout
with `core.autocrlf=true` preserves every tracked fixture byte, the parent root
pin and the exact upstream `CaseFolding.txt` digest.

The fixture test copies tracked evidence to a temporary directory before every
mutation. It never edits the tracked immutable root.

## 6. Path and Unicode contract

All manifest and checksum paths are validated as Unicode strings before any
filesystem resolution. Reject:

- empty strings or segments;
- absolute POSIX paths;
- drive-relative or drive-absolute paths;
- UNC and Windows device paths;
- backslashes, colon, Unicode scalar values `U+0000` through `U+001F`, or
  `U+007F`;
- repeated slash, `.` or `..` segments;
- root escape after resolution;
- anything other than a regular file strictly below the resolved version root.

The implementation may not use JavaScript default `sort()` for Unicode scalar
ordering because it compares UTF-16 code units. It compares decoded Unicode
scalar sequences lexicographically: the first unequal scalar determines order;
if all shared scalars are equal, the shorter sequence sorts first; identical
sequences compare equal. Tests include U+E000 versus U+10000 and an equal-prefix
shorter/longer pair.

Collision detection applies NFC, then the full locale-independent Unicode 17.0
Default Case Folding mapping. `toLowerCase()`, `toLocaleLowerCase()` and ambient
ICU folding are forbidden substitutes.

The fixture PR must vendor the exact Unicode data used at:

```text
fixtures/pom-rx/support/unicode/17.0.0/CaseFolding.txt
```

Its exact SHA-256 is pinned in the verifier test after acquisition from the
Unicode Consortium primary distribution. Acquisition provenance and license
are recorded. The table parser recognizes all status classes, but Unicode
Default Full Case Folding applies only common `C` and full `F` mappings. Simple
`S` and Turkic `T` mappings are not selected.

Required aliases include NFC composed/decomposed forms and full-fold cases for
`Straße`/`STRASSE`, Kelvin sign/`K`, and final/ordinary sigma forms.

## 7. Filesystem proof boundary

Portable pure-validator tests run on every supported CI platform and cover
unsafe path syntax, scalar ordering, NFC and full-fold collisions without
creating unsafe filesystem objects.

Ubuntu CI provides real-file and symlink/root-escape integration evidence.

Before a fixture PR is declared ready, exact-head Windows local evidence must
cover:

- clean checkout with `core.autocrlf=true`;
- regular-file enumeration and exact set equality;
- symlink where permitted;
- directory junction and other reparse-point denial;
- alternate-data-stream syntax and detection/denial;
- drive, UNC and device path rejection.

The command, Node/Windows versions, exact head, exit code and case totals are
recorded in the PR evidence. A later dedicated Windows CI change may automate
this, but the fixture PR does not claim multiplatform CI until such a workflow
is separately reviewed and merged.

## 8. Required fixture tests

The fixture PR adds a separate script and test target without changing the
legacy verifier:

```text
test:pom-rx:v01-fixtures
```

The tests must reject:

- unknown, missing or raw duplicate keys at every manifest object depth;
- wrong scenario/canary count, order, ID, type, nullability or invocation mode;
- malformed, duplicate, missing, additional or reordered checksum entries;
- checksum paths that include `checksums.sha256` itself;
- missing, extra, unmanifested, linked, reparse, ADS or non-regular files;
- BOM, invalid UTF-8, CR/CRLF and wrong terminal-newline rules;
- byte changes even when parsed JSON is semantically equivalent;
- canonical byte, receipt hash, previous-hash or complete legacy-result drift,
  including key-set, `status`, `error` absence and ordered receipt hashes;
- a self-consistent version-root mutation that does not match `pins.json`;
- wrong-type or wrong-value `generated_with_*` fields and any measured runtime
  mismatch before canary execution;
- `pins.json` unknown, missing, null, wrong-type, raw-duplicate and
  escape-equivalent duplicate keys at both object depths;
- fresh-checkout mutation of the pinned `CaseFolding.txt` bytes or digest;
- punctuation canary input, output, digest or runtime-order mismatch;
- NFC or Unicode 17.0 full-fold path alias collisions.

The positive test proves:

- exactly one valid control and seven known-vulnerable scenarios;
- exact PR 27 identifiers and invocation table;
- all eight chains reproduce `LEGACY_ACCEPTANCE_OBSERVED`;
- canonical bytes and receipt hashes recompute exactly;
- the ordinary action-substitution and surrogate chains are byte-identical;
- canary artifacts are not counted as a ninth scenario;
- the existing expected-red gate remains exactly one pass and seven vulnerable
  failures and cannot pass because of import, syntax or fixture errors.

## 9. Delivery sequence and ownership

After this amendment is separately approved and merged:

1. recreate or fast-forward a clean fixture worktree from the amendment merge;
2. add `.gitattributes` and locally pinned Unicode data;
3. generate the eight literal chains and canonical files once;
4. finalize manifest and canary bytes;
5. create exact checksums, then the parent `pins.json` digest;
6. add independent verification and adversarial tests;
7. run local Windows evidence, legacy tests and expected-red;
8. obtain exact-head Protocol, Security and QA reviews;
9. push/create a fixture-only PR only with separate publication authorization;
10. merge only after a distinct explicit human order.

One owner writes fixture and verification files. Independent reviewers remain
read-only. The fixture PR must not activate the profiled verifier or correct an
integrity invariant.

## 10. Rollback and human gate

Before merge, the amendment can be reverted normally. After merge, corrections
use a new explicit amendment. After fixture version 1 merges, it is append-
closed and byte-immutable; a correction creates version 2 and retains version 1.

This draft requires exact-head Protocol and Security approval, green CI and the
separate instruction `APPROUVE FUSION PR #<number>`. Until then, fixture byte
generation remains blocked. No automatic merge is authorized.
