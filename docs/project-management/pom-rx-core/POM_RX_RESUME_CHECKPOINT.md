# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T17:08:00+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`e5aead150a2ed5f390593cc2d9d307defdd79bdc`

Latest trusted merge: PR #119 — transition from the terminal documentation
checkpoint to the fresh PR #97-line runtime repair.

- exact source head: `057b225783b24c97568dbcd733ca4c821f889c7a`;
- exact merge/main SHA: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- exact-head CI: CI 719, `success`;
- release-owner exact-head gate: `PASS / NON-INDEPENDENT`;
- distinct exact-head `chatgpt-codex-connector` review: no major issues on the
  frozen candidate;
- canonical exact-main push CI: run `32575110984`, CI 720, `success` on the exact
  merge SHA;
- exact-merge SpecKit, skeptical/falsification, security, code-quality,
  optimization and integration/regression: PASS for the bounded control-plane
  scope;
- final exact-merge verdict: `POST_MERGE_ASSURANCE_PASS`, PR #119 issue comment
  `5380609307`.

PR #119 is terminal coordination evidence. Do **not** create another docs-only
successor. Material continuation is carried by the useful runtime lot below.

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
- state at this checkpoint commit: `OPEN / DRAFT / IN_PROGRESS / NOT_TRUSTED`;
- historical candidate head `7774febbb308a085536fc139e1261d3e61a904f3`
  failed canonical CI run `32578978161` / CI 726 in the Promise-drift exploit
  regression;
- CI 726 diagnosis: authorization/forwarding remained blocked, but immediate
  `Promise.reject(...)` provider context transports were left without a rejection
  reaction when Promise-prototype drift was detected synchronously, so Node
  terminated the child on an unhandled rejection before the regression could
  observe the intended fail-closed `POMRX_WG_PROVIDER_E_CONTEXT_INVALID` result;
- repair commit `310bbdb9988df141247f56a2e13f09bd1385effb`
  safely attaches a captured native-Promise rejection reaction before raising the
  drift error. It temporarily shadows `constructor` with own `undefined` so
  `Promise.prototype.then` uses the intrinsic default species without dispatching
  the poisoned inherited constructor getter, then pins captured own
  `constructor`/`then` data properties;
- intermediate exact head `3a58736cc581d92936cb460ed7ac0239243fc18d`
  ran canonical CI `32579737013` / CI 728. The Wallet Guard provider-gate suite
  passed 23/23, including the inherited Promise constructor/then substitution
  exploit with zero hostile getter execution, zero reference authorization and
  zero sensitive forwarding. The shared plain-data intrinsic-hardening suite also
  passed 19/19;
- CI 728 nevertheless failed integration in
  `test:pom-rx:wallet-guard-controlled-host`: the newly hardened shared Core
  capture correctly returns frozen arrays on a reference-owned prototype, while
  the historical Wallet Guard public policy boundary correctly accepts only
  ordinary `Array.prototype` policy lists. Ten of thirteen controlled-host tests
  therefore failed during bootstrap with
  `POMRX_WG_POLICY_E_INVALID: require_simulation_for must use the standard Array prototype`;
- compatibility repair commit `7839526c4843c11c41225b42340defc9b998852d`
  keeps both security properties intact. `controlled-host.mjs` first captures the
  complete caller policy through the shared Core inert-data boundary, then bridges
  only the known Wallet Guard policy-list fields back to ordinary frozen arrays
  before invoking the historical strict policy validator. CI 729 on this code
  completed the full `npm test` step successfully, proving the controlled-host
  integration regression was closed before later bookkeeping/security edits;
- skeptical false-PASS review found that an empty scalar such as
  `require_simulation_for: ''` could otherwise be converted by the compatibility
  bridge into `[]`, turning an invalid policy into a valid policy with no required
  simulation. Commit `830b73f8d7bb29a9f8e5dc163fefee7933f5ae03`
  makes every bridge copy require an actual array, and commit
  `315ba35db28a2ce265968f4c9ae603961de5f209` adds CI-wired negative cases for
  `require_simulation_for` and `allowed_spenders` scalar coercion;
- the compatibility bridge therefore does not weaken Core capture, does not admit
  arbitrary custom-prototype arrays at the public policy boundary, does not add a
  second generic recursive capture system, and now fails closed before any scalar
  policy-list coercion;
- canonical exact-head CI: `PENDING` after this control-plane commit; all CI/review
  evidence on intermediate heads is stale for release after head movement;
- release-owner five-stage gate: `PENDING`;
- distinct exact-head independent skeptical/security review: `PENDING`; direct
  reviewer assignment to `chatgpt-codex-connector` returned GitHub 422 ineligible,
  so no independent approval may be inferred;
- unresolved current P0/P1/P2 on PR #120: read live before any release decision.

The PR #120 exact final head is intentionally not self-embedded in this moving
file because doing so would create an infinite head-changing loop. The exact
candidate SHA, CI and review state must be recorded in the PR conversation after
the final owned-file commit and read live at the start of the next run.

PR #120 starts from trusted main rather than merging/rebasing/reviving stale PR
#97. Its bounded implementation scope is:

- fail closed if inherited `Promise.prototype.constructor` or `then` drift from
  the module-initialization descriptors before a provider Promise is assimilated;
- pin load-bearing internal async Promises with captured own `constructor`/`then`
  data properties before parent awaits so rejected inner transports cannot be
  converted to attacker-controlled context by inherited Promise poisoning;
- preserve own-decorated native-Promise rejection without attacker getter
  execution;
- preserve ordinary native-Promise own-symbol bookkeeping compatibility;
- preserve hardened synchronous non-Promise/plain-data capture through the
  shared Core primitive;
- preserve controlled-host compatibility without relaxing either the hardened
  Core snapshot prototype or the Wallet Guard public policy-array boundary;
- fail closed when invalid scalar policy-list values reach the compatibility
  bridge rather than silently normalizing them to empty arrays;
- require the exploit regression to show **zero reference authorization and zero
  sensitive forwarding** for hostile rejected context transports.

This lot does **not** establish trusted durable Gate composition. The historical
PR #97 durable-claim composition remains a separate untrusted dependency to be
reconstructed/reviewed only after this prerequisite closes.

Skeptical hypotheses mapped to CI-wired evidence:

1. inherited Promise constructor/then poisoning can turn rejected chain/account
   reads into stable attacker context and reach authorization/forwarding;
2. own Promise `constructor`/`then` accessors can dispatch during assimilation;
3. synchronous Array/Object/callable Proxies can dispatch `then`/reflection traps
   before the inert-data boundary;
4. hardening Core snapshot-array prototypes can accidentally break application
   composition and tempt a fail-open relaxation of the public policy boundary;
5. a representation bridge can coerce invalid scalar list values into semantically
   valid empty arrays and silently reduce required policy controls.

The negative gates require fail-closed behavior before authorization/forwarding;
compatibility controls require ordinary synchronous/native-Promise context,
own-symbol Promise bookkeeping, strict custom-prototype policy rejection,
non-array policy-list rejection and the controlled-host path to remain supported.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- exact-head CI: run `32487036517`, CI 592, `success` but **not** security/release
  evidence;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT`;
- current exact-head P1: `Reject Promise drift before entering async layers`;
- status: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_REPAIR_BY_FRESH_PR120`.

### PR #93 — Wallet Guard simulation evidence

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- exact-head CI: run `32465835858`, CI 541, `success` but not release evidence;
- latest owner/distinct release evidence is stale on moved head `03e0201c9f...`;
- unresolved current/non-outdated P1/P2 classes include negative-zero identity,
  typed-data wrapper normalization, generic-signature exact-value commitment,
  nested payload capture/saved-reflection hardening, and shared proof
  canonicalization/SHA-256/hash hardening;
- status: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a
  separately reviewed dependency decision changes that order.

## current_blockers

1. `PR120_EXACT_HEAD_CI_PENDING_AFTER_SCALAR_POLICY_BRIDGE_FALSE_PASS_REPAIR`.
2. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_PENDING`.
3. `PR120_DISTINCT_EXACT_HEAD_INDEPENDENT_REVIEW_PENDING`.
4. `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_YET_ESTABLISHED`.
5. `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`.
6. `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_PR120`.
7. `DAGR_SOURCE_DOCUMENT_MISSING`.
8. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_and_post_merge_rules

Standing authorization permits merge only after the mandatory five-stage
pre-merge gate, all applicable technical/security gates, canonical exact-head CI,
a genuinely distinct exact-head independent review, and zero unresolved P0/P1/P2
on the same frozen SHA. Release-owner/Prime/self-review is non-independent. A
fresh `chatgpt-codex-connector` review counts only when it actually reviews that
exact SHA. Any head movement invalidates CI/review evidence.

After any merge, require exact-main CI and exact-merge-SHA SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression assurance with one final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency.

## next_safe_actions

1. Treat the post-checkpoint PR #120 head recorded in the PR conversation as the
   frozen candidate; do not move it for bookkeeping-only SHA self-reference.
2. Run/read canonical exact-head CI on that SHA. Required evidence includes the
   23/23 provider-gate pass with zero exploit counters, 19/19 shared plain-data
   intrinsic-hardening pass, restored controlled-host integration including the
   scalar-list false-PASS negatives, and full workflow success.
3. If CI is green, run the release-owner five-stage gate and obtain a fresh
   genuinely distinct exact-head skeptical/security review; direct assignment
   failure is not independent evidence.
4. Merge only if all exact-head gates pass unchanged and zero unresolved P0/P1/P2
   remain; then run exact-merge post-merge assurance before trusting the
   dependency.
5. Reconstruct the durable claim-before-observer/downstream composition as a
   separately bounded reviewed lot only after PR #120 is trusted.
6. Reconcile PR #93 only after the trusted prerequisite order permits it.
7. Do not begin burner/local-testnet execution without separate explicit human
   authorization.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.
