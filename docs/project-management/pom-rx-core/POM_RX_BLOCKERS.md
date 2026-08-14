# POM-RX Core — Active Blockers

Updated: `2026-08-14T13:56:20+02:00`

## Prime operational-prototype gate

Status: `NO_GO_IN_PROGRESS`

Current main: `2f7eca1b63e32061defb11b6d798cf423739df89`

Independent Architecture, Security and Conformance reviews agree that the
current repository is a reproducible structural prototype, not yet an
operationally usable local demonstrator. The legacy verifier still reproduces
exactly seven known-vulnerable chains and one valid control. This is correct
expected-red evidence, not a correction.

P0 delivery blockers:

1. internal strict-profile foundation is absent;
2. action, input, outcome/assertion and receipt-ID invariants are not corrected
   in the strict profile;
3. the strict profile is not activated;
4. PR #24 does not supply the required enrollment, revocation, clock,
   transactional persistence or reviewed Gate trust model;
5. exact synthetic authorization and single-use transactional Gate are absent;
6. DAGR normative source is unconfirmed;
7. independent observation, reconciliation and deterministic demo artifacts
   are absent.

The maximum future claim after these gates is
`POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and
offline only. It never means production-ready, audited, certified, deployed or
authorized for financial execution.

## Repository preservation and cleanup blocker

Status: `PRESERVATION_REQUIRED_BEFORE_CLEANUP`

The primary checkout and five additional worktrees contain dirty unpublished
material. No dirty path may be deleted or mixed into POM-RX. Each lot requires
ownership attribution, secret scan, a dedicated preservation branch, commit
and GitHub push before any local cleanup. Clean merged worktrees may be removed
only after their commits are proven reachable from GitHub.

## Fresh Windows checkout exact-LF blocker

Status: `P1_CANDIDATE_RESOLVED / FRESH_WINDOWS_GREEN / AWAITING_EXACT_HEAD_CI`

A fresh worktree at main `2a65bfb555b2eea942c8724819487df06c94242c`
completed the risk, POM-RX, Proof Receipt and integration subsets, including
legacy POM-RX 12/12. The full fixture suite then returned 18 pass, one fail and
one POSIX-only skip because the worktree `.gitattributes` bytes were CRLF while
the immutable-corpus contract expects exact LF. The failure is not caused by
the control-plane documentation diff.

Do not weaken the verifier or normalize the expected fixture contract. A
separate checkout-integrity PR must ensure a fresh Windows worktree preserves
the root `.gitattributes` contract with exact LF, then rerun the full Windows
suite and exact-head CI.

Root cause is confirmed: the system Git configuration has `core.autocrlf=true`
and the root `.gitattributes` file did not declare its own text/eol behavior.
The minimal candidate fix adds `/.gitattributes text eol=lf` and updates the
exact contract assertion to include that line. A fresh detached Windows
worktree at candidate commit `ab3ca2164acacaf165ea722e1aed659e744256dc`
materialized 175 bytes with zero CR and four LF without manual normalization.
Its clean install and full suite passed: 19 applicable fixture tests passed,
one POSIX-only test skipped, all risk/POM-RX/Proof Receipt Node and Proof
Receipt Python tests passed, expected-red confirmed the exact 7 vulnerable
cases plus one green control, and `npm audit --omit=dev --audit-level=high`
reported zero vulnerabilities. Exact-head GitHub CI is still required before
closing the P1.

## R3 immutable-fixture contract blocker

Status: `RESOLVED_PR34_MERGED_MAIN_CI_GREEN`

Scope: `R3-STRICT-PROFILE-V01-COMPATIBILITY-FIXTURES`

Baseline: `743b8082bfc925d1681af7a239856a0b4f7e8464`

A clean isolated worktree and branch were created. The four pre-generation P1
questions are now frozen by the documentation-only amendment at exact local
head `b686447522a31c04ce132286607da82c229e8cc5`:

1. each scenario must bind the exact `allow_partial` invocation mode;
2. scenario/canary nested keys, order, types, nullability, path/index rules and
   raw duplicate/unknown-key rejection must be exact;
3. `fixture_set_sha256` must be independently pinned outside the self-consistent
   fixture root at an exact reviewed location and serialization;
4. exact-byte checkout and filesystem proof must define `.gitattributes -text`,
   Unicode 17.0 full case folding, and honest Linux/Windows symlink,
   junction/reparse and ADS coverage.

Exact-head Protocol, Security and Code Quality reviews returned `APPROVE` with
no P0/P1/P2. Local `git diff --check`, POM-RX Node 12/12 and the strict
expected-red gate passed unchanged. No fixture, manifest, checksum, test,
verifier, schema, canonical byte, receipt hash or runtime file was written.

The human gate was satisfied by `APPROUVE FUSION PR #34`. The PR was moved out
of draft and squash-merged as
`e24997295563fb245b1696f62f07c467349d2c71`. Its merge tree is identical to
reviewed head `b686447522a31c04ce132286607da82c229e8cc5`. Exact-head run
`31693154183` and post-merge main run `31697930963` each completed successfully
with 18 non-empty steps. This blocker is resolved. The fixture implementation
is now the next bounded task after its clean worktree is synchronized
non-destructively to current main.

## R3 action-continuity prerequisite blocker

Status: `P1_BLOCKED_BY_FIXTURE_AND_FOUNDATION_SEQUENCE`

Scope: `POMRX-INTEGRITY-01-ACTION-CONTINUITY`

Baseline: `743b8082bfc925d1681af7a239856a0b4f7e8464`

The action-continuity implementation did not start. Independent Security and
QA review reproduced the seven expected-red defects and found that changing
the existing `verifyPomRxChain()` would violate the merged Option D contract.
The existing v0.1 verifier and result shape must remain historically
compatible.

The merged implementation sequence requires these prerequisites before the
first invariant correction:

1. immutable v0.1 compatibility fixtures and checksums;
2. an implementation ADR for the profiled verdict envelope and stable inherited
   diagnostic families;
3. an exact verifier/artifact identity contract and trusted-policy tuple rules;
4. the additive profiled verifier entry point with no legacy fallback;
5. resolution of the surrogate acknowledgement defect-ID observability gap.

The receipt-only chain cannot distinguish
`POMRX-001-SURROGATE-ACK-ACTION-SUBSTITUTION` from the underlying
`POMRX-001-ACTION-PREFLIGHT-EXECUTION` case because the surrogate object is not
an authenticated verifier input. Untrusted scenario metadata must not select a
security diagnostic. The implementation ADR must decide whether the surrogate
ID remains a conformance-scenario evidence ID while the receipt-only verifier
emits the underlying continuity defect.

No POM-RX schema, receipt bytes, canonicalisation, hash domain, receipt hashes,
legacy verifier behavior, Witness, Gate, DAGR profile or v0.2 candidate runtime
was modified. The local baseline remains:

- POM-RX legacy tests: `12/12` pass;
- expected-red strict gate: `EXPECTED_RED_CONFIRMED`, seven vulnerable failures
  and one green control;
- clean new R3 worktree.

The prerequisite contract was reviewed at exact head
`496fe9a49459518f6ceedcc3215401b50fe435e1`. Distinct Protocol, Security and
Code Quality reviews returned `APPROVE` with no P0/P1/P2. No runtime, schema,
fixture or test file changed. After explicit authorization for that exact
payload, PR #33 was squash-merged as
`743b8082bfc925d1681af7a239856a0b4f7e8464`. Exact-head run `31682647454`, job
`94391402206`, and post-merge main run `31683246573`, job `94393318356`, each
completed successfully with 18 non-empty successful steps.

The local dependency audit remained unavailable before publication because the
local npm request could not reach the endpoint. The exact-head CI subsequently
ran `npm audit --omit=dev --audit-level=high` successfully; that green result is
bounded to commit `496fe9a` and run `31682647454`.

Historical next action, now completed by merged PR #35: create an isolated
fixture-only slice for the immutable v0.1 compatibility corpus and
checksum/canary tests. Action-continuity runtime remains blocked by explicit R3
semantic ratification and the separate profiled-verifier foundation.

## R3 fixture generator destination ownership blocker

Status: `HISTORICAL_SUPERSEDED_BY_PR35_MERGE`

Scope: `POMRX-R3-FIXTURE-DESTINATION-OWNERSHIP`

Exact reviewed head: `5b3ab9c1016f74b528e585fe90b6d2502eb3561b`

The destination-ownership P1 is resolved at the exact reviewed head above.
The generator now claims the version root, pin and payload files exclusively,
records filesystem identities and byte digests, validates the exact owned
regular-file closure before pin publication and again at commit, and rolls
back only identity-proven objects. Precreated sentinels, hardlinks, path swaps,
late foreign files and in-place payload/pin mutations are rejected without
deleting foreign objects. The four-source post-check completes before the pin
is published.

The exact Windows suite passed 18 applicable tests with zero failures and one
expected POSIX-only skip; the corpus root remains
`a561817969f491ac15f02e5818cea252eecba7acc2726e93162f49b66f9ab23b`.
Protocol, Security and QA independently approved exact head
`5b3ab9c1016f74b528e585fe90b6d2502eb3561b` with no P0/P1. The branch is pushed
and draft PR #35 existed at that historical point. This paragraph is
`SUPERSEDED_BY_PR35_MERGE`; current disposition is recorded below. The implementation proves
fail-closed local-process ownership checks; it does not claim crash durability
or resistance to a privileged/concurrent hostile operating-system actor.

## R3 fixture CI historical-source checkout blocker

Status: `RESOLVED_PR36_MERGED_MAIN_ADVANCED`

Scope: `POMRX-R3-FIXTURE-CI-HISTORICAL-SOURCE-CHECKOUT`

Draft PR: `#35`

Exact head: `5b3ab9c1016f74b528e585fe90b6d2502eb3561b`

GitHub Actions run `31739328166`, job `94578544677`, failed because the default
shallow `actions/checkout` did not contain historical source baseline
`743b8082bfc925d1681af7a239856a0b4f7e8464`. The source-binding test correctly
failed closed at `git rev-parse 743b808:sdk/typescript/pom-rx.mjs`. Ubuntu
otherwise recorded 17 passes, one source-binding failure and one expected
Windows-only skip; the POSIX symlink integration passed.

This is a CI checkout-history prerequisite, not evidence of a fixture or
runtime regression. Do not weaken or skip source binding. CI-only PR #36 at
exact head `0dd95abfd87bf93265b84d04c8ab54f9dc63184c` keeps the reviewed checkout
SHA and adds only `fetch-depth: 0`. Independent QA approved it with no P0/P1.
Actions run `31744486526`, job `94595589780`, completed successfully with all
18 non-empty steps green. The exact human gate `APPROUVE FUSION PR #36` was
recorded for reviewed head `0dd95abfd87bf93265b84d04c8ab54f9dc63184c`.
PR #36 was squash-merged as
`bd49e11c3adac31a507a4ca1612415ef64139022` at
`2026-08-14T08:20:13Z`; its source branch was retained. Post-merge main run
`31783490906` completed successfully on that exact merge commit.

This checkout-history blocker is resolved. The historical next task was a
non-destructive resynchronization of draft PR #35 onto current main. That
resynchronization was completed as merge commit
`2806376076acb081713aee890bc99c2c9433ab8a`. A POSIX-only hand-built file URL
in the source-binding positive control was corrected test-only at exact head
`3b8ff1a8ae6799bc6f9381262d1af1097e88ac4e`. Exact-head run `31787982124`, job
`94728127015`, completed successfully and GitHub reports the PR mergeable and
clean. The checkout-history blocker is therefore closed; it is superseded by
the independent Windows QA blocker below.

## R3 Windows metadata-helper timeout blocker

Status: `RESOLVED_MERGED_MAIN_CI_GREEN`

Scope: `R3-STRICT-PROFILE-V01-COMPATIBILITY-FIXTURES`

Draft PR: `#35`

Exact head: `752f61b8ecff784b625cbb581537ba6fe534b334`

Commit `752f61b8ecff784b625cbb581537ba6fe534b334` resolves the P1 with an explicit
per-target ADS mode, reparse-first stream short-circuit, a 10-second and 1 MiB
bounded fail-closed production helper, and a 30-second per-case native harness
deadline with exact-PID process-tree cleanup. Exact-head CI run `31792617893`,
job `94742703725`, completed successfully. The exact-head Windows Node suite
passed 19 applicable tests with zero failures and one POSIX-only skip in 222.1
seconds. The native harness completed in 10.7 seconds: all nine applicable
cases passed and symlink creation was transparently privilege-limited. No
related Node, PowerShell or CSC process remained after the runs.

Renewed exact-head Protocol, Security and QA reviews all returned `APPROVE`
with no P0/P1. After the exact instruction `APPROUVE FUSION PR #35`, PR #35
was squash-merged as `2a65bfb555b2eea942c8724819487df06c94242c` at
`2026-08-14T10:47:40Z`; the source branch was retained. Post-merge main CI run
`31793630923`, job `94745800115`, completed successfully with every non-empty
step green. Remaining P2 limitations stay explicit: production timeout is not
Windows Job Object containment, repeated PowerShell/Add-Type startup is costly,
the local symlink case is partial, and the native harness is not yet run in
GitHub CI.
