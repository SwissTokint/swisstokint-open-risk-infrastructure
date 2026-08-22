# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T18:18:00+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`e5aead150a2ed5f390593cc2d9d307defdd79bdc`

Latest trusted merge: PR #119 — terminal coordination transition into useful
runtime work.

- exact source head: `057b225783b24c97568dbcd733ca4c821f889c7a`;
- exact merge/main SHA: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- exact-head CI 719: `success`;
- release-owner exact-head gate: `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` review: no major issues;
- canonical exact-main push CI: run `32575110984`, CI 720, `success`;
- exact-merge post-merge assurance: `POST_MERGE_ASSURANCE_PASS`, PR #119 issue
  comment `5380609307`.

PR #119 is terminal coordination evidence. Do **not** create another docs-only
successor. Carry materially changed continuation state with useful runtime work.

## architecture_and_claim_boundary

Trusted main contains the strict reference profile, common exact authorization,
a process-local single-use Gate, the shared bounded hostile-object/plain-data
capture, process-local Witness trust lifecycle, a separate filesystem durable
claim primitive, reference execution evidence, observation/reconciliation, and
Wallet Guard reference layers. Shared canonicalization, hashing, verifier,
Witness, exact authorization, Gate, execution-evidence and observation semantics
remain Core-owned; Wallet Guard remains an application profile.

A reviewed composition of the durable claim primitive with the common Gate is
**not** on trusted main. Production trusted time/key custody, distributed replay,
arbitrary browser/provider integrity and real external execution/effect truth
remain unproved. Maximum claim remains
`POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`.

## active_runtime_task

### PR #120 — fresh Wallet Guard Promise-drift boundary repair

- PR: `#120`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact base/trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- first implementation commit: `f31611139e51cf0f05265c19012e372e06bfc7ae`;
- class: `TIER_B_SHARED_SECURITY_SEMANTICS`;
- state: `OPEN / READY_FOR_REVIEW / NOT_TRUSTED / BLOCKED_P1`.

### Review and repair history

- `2f081956dff590359fec5a95dc8eb0c547ac4174`: CI 733 passed, but
  release-owner/security review `5000444583` found P1 inherited
  `Array.prototype[0]` setter substitution through `copyFrozenArray`;
- commits `f614ecedfb0e161a7436ba16555ac1859df6fa80`,
  `0b66e6c12f8ad446083daf41a6831f7575e727a4` and
  `bd404401a1a9a6131f0b4a98ce29dd9dc107b53c` repaired that bridge with captured
  construction/own element definitions and CI-wired policy/account attacks;
- `5885da291d7d6b3e4541e5c00c160ffb481828b8`: CI 737 passed and owner
  technical lanes passed, but the genuinely distinct `chatgpt-codex-connector`
  found P1 thread `PRRT_kwDOTiNyWc6bZjxp`: structurally invalid rejected native
  Promise transports could be rejected before a rejection reaction was attached,
  creating an orphaned rejection under strict Node behavior;
- the first drain repair added `drainPromiseTransportBeforeIntegrityFailure()`
  plus `provider-invalid-rejected-transport.node.test.mjs` cases for extensible
  own metadata and an extensible non-standard prototype;
- pre-control-plane repair head `9b52474a2def9df2c75649eda4b81a0ca128658a`
  passed canonical CI `32584166269` / CI 739;
- fresh dedicated Codex review on exact moved head
  `b7576f8e94b3379c7427a51e4113960f396ac7e8` confirmed a **P1** on new thread
  `PRRT_kwDOTiNyWc6bZ6tx`: the drain still performs a fallible own-`constructor`
  `defineProperty` before attaching the rejection reaction. A rejected Promise
  made non-extensible, or carrying a non-configurable own constructor, can
  therefore still become an orphaned strict unhandled rejection;
- that same distinct review found **P2** thread `PRRT_kwDOTiNyWc6bZ6tz`: the new
  rejected-transport regression file was not actually included by canonical
  `npm test`, making prior green CI a false-PASS for those cases;
- the P2 has now been repaired on this branch: the
  `test:pom-rx:wallet-guard-provider-gate` script explicitly runs
  `tests/wallet-guard/provider-invalid-rejected-transport.node.test.mjs` while
  preserving the pre-existing Witness lifecycle test wiring;
- the P1 now has CI-visible expected-red evidence: the rejected-transport test
  adds `metadata-nonextensible` and `constructor-nonconfigurable` strict child
  cases in addition to the original metadata/prototype cases. Before this
  checkpoint write, the exact branch head containing the CI wiring and those red
  regressions was `6911eaeeb2a0a89ccefceebeb7b6e03b64c97d15`. No canonical workflow run
  was yet associated with that exact SHA when revalidated.

The runtime P1 is **not repaired yet**. The newly wired regression is expected to
fail until the drain design changes. The two Codex P1 threads
`PRRT_kwDOTiNyWc6bZjxp` and `PRRT_kwDOTiNyWc6bZ6tx` remain unresolved. The Codex
P2 thread `PRRT_kwDOTiNyWc6bZ6tz` should remain unresolved until a later exact-head
review confirms the CI wiring on the repaired final candidate.

All review/CI evidence on moved heads is historical for release. This
control-plane write moves the head again, so read the final live PR head and do
not self-embed it here.

### Current acceptance boundary

The PR #120 runtime repair must now prove, with CI-wired negative cases, that:

- inherited Promise constructor/then drift cannot substitute provider context;
- structurally invalid rejected native Promise classes claimed as supported are
  drained before a fail-closed gateway error;
- non-extensible own-metadata and non-configurable own-constructor rejected
  Promises do not become orphaned strict unhandled rejections;
- hostile own constructor/then accessors are not executed merely to drain an
  invalid transport; if a non-shadowable accessor case cannot be safely drained
  with standard captured intrinsics, the design must explicitly narrow and prove
  the bounded claim rather than silently false-PASS;
- every hostile rejected context path yields zero reference authorization and zero
  sensitive forwarding;
- synchronous Proxy/callable thenables, shared plain-data intrinsic hardening,
  scalar policy-list rejection and inherited Array-index substitution protections
  remain intact.

PR #120 still does **not** establish trusted durable Gate composition. Historical
PR #97 remains stale and must not merge/rebase/revive wholesale.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- CI 592: `success` but false-PASS for the Promise-drift property;
- status: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_REPAIR_BY_PR120`.

### PR #93 — Wallet Guard simulation evidence

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- CI 541: `success` but not release evidence;
- unresolved P1/P2 classes remain;
- status: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a
  separately reviewed dependency decision changes that order.

## current_blockers

1. `PR120_P1_ATTACH_REJECTION_REACTION_BEFORE_FALLIBLE_PROMISE_PINNING`.
2. `PR120_NONSHADOWABLE_PROMISE_CONSTRUCTOR_THEN_BOUNDARY_REQUIRES_SAFE_DESIGN_OR_EXPLICIT_BOUNDED_CLAIM`.
3. `PR120_EXPECTED_RED_NONEXTENSIBLE_AND_NONCONFIGURABLE_REJECTED_PROMISE_REGRESSIONS_REQUIRE_RUNTIME_REPAIR`.
4. `PR120_FINAL_EXACT_HEAD_CI_REQUIRED_AFTER_RUNTIME_REPAIR`.
5. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_REQUIRED_AFTER_RUNTIME_REPAIR`.
6. `PR120_DISTINCT_EXACT_HEAD_INDEPENDENT_REVIEW_REQUIRED_AFTER_RUNTIME_REPAIR`.
7. `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_ESTABLISHED`.
8. `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`.
9. `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_PR120`.
10. `DAGR_SOURCE_DOCUMENT_MISSING`.
11. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## next_safe_actions

1. Repair the drain ordering/strategy in `provider.mjs` so the newly wired strict
   non-extensible/non-configurable rejected-Promise cases no longer orphan a
   rejection, without introducing hostile accessor execution.
2. Run the targeted provider-gate command first; the newly wired cases are the
   expected-red control for the current P1.
3. Reconcile this same PR's control plane after the runtime repair, freeze the
   resulting exact head and require canonical exact-head CI success.
4. Re-run the release-owner five-stage gate and request a **new** genuinely
   distinct exact-head Codex skeptical/security review.
5. Resolve all three current Codex threads only after fresh exact-head evidence
   validates the P1 repair and CI wiring with zero unresolved P0/P1/P2.
6. Merge only then under standing authorization and immediately run exact-merge
   post-merge assurance before trusting PR #120.
7. Reconstruct durable claim-before-observer/downstream composition only after
   PR #120 is trusted; reconcile PR #93 afterwards unless ordering is separately
   reviewed.

## merge_and_post_merge_rules

Standing authorization permits merge only after the mandatory five-stage
pre-merge gate, all applicable technical/security gates, canonical exact-head CI,
a genuinely distinct exact-head independent review, and zero unresolved P0/P1/P2
on the same frozen SHA. Any head move invalidates exact-head evidence. Every
non-trivial merge then requires exact-main CI and exact-merge-SHA SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression assurance with a final PASS/CONDITIONAL/BLOCK verdict.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.
