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

### Repair history and current evidence

- historical candidate `7774febbb308a085536fc139e1261d3e61a904f3`
  failed CI 726 because a rejected provider Promise could remain without a
  rejection reaction when prototype drift was rejected synchronously;
- commit `310bbdb9988df141247f56a2e13f09bd1385effb` attached a captured
  native-Promise rejection reaction without dispatching poisoned inherited
  `constructor`/`then`, then pinned captured own Promise data properties;
- intermediate `3a58736cc581d92936cb460ed7ac0239243fc18d` / CI 728 proved the
  provider-gate attack regression and shared plain-data hardening, but exposed a
  controlled-host compatibility failure because hardened Core snapshot arrays no
  longer use ordinary `Array.prototype`;
- commit `7839526c4843c11c41225b42340defc9b998852d` added the narrow
  application bridge from hardened Core policy snapshots to ordinary frozen
  policy-list arrays; CI 729 completed full `npm test` successfully;
- skeptical false-PASS review then found scalar policy-list values could be
  converted into empty arrays. Commits `830b73f8d7bb29a9f8e5dc163fefee7933f5ae03`
  and `315ba35db28a2ce265968f4c9ae603961de5f209` require actual arrays and add
  CI-wired scalar rejection cases;
- exact head `2f081956dff590359fec5a95dc8eb0c547ac4174` passed CI 733, but
  release-owner/security review `5000444583` found **P1** inherited
  `Array.prototype[0]` setter substitution through `copyFrozenArray`;
- repair commit `f614ecedfb0e161a7436ba16555ac1859df6fa80` captures the Array
  constructor plus `Object.create`/`Object.defineProperty`, creates bridge and
  account/inspection arrays with captured construction, and defines every element
  as an own data property rather than inherited `[[Set]]`;
- regression commit `0b66e6c12f8ad446083daf41a6831f7575e727a4` adds post-import
  `Array.prototype[0]` substitution attacks against both policy bridge data and
  provider-observed account context; `bd404401a1a9a6131f0b4a98ce29dd9dc107b53c`
  wires them into full `npm test`;
- exact head `5885da291d7d6b3e4541e5c00c160ffb481828b8` then passed canonical
  CI 737 and owner five-stage technical review, but the genuinely distinct
  `chatgpt-codex-connector` review found **P1** on unresolved thread
  `PRRT_kwDOTiNyWc6bZjxp`: a rejected native Promise with own string metadata or
  a non-standard prototype could be rejected structurally without first attaching
  a rejection reaction, leaving an orphaned rejection that can terminate Node
  under strict unhandled-rejection behavior;
- the moved-head repair adds `drainPromiseTransportBeforeIntegrityFailure()` to
  the invalid structural transport branch before fail-closed rejection and adds
  `provider-invalid-rejected-transport.node.test.mjs` cases for extensible own
  metadata and an extensible non-standard prototype under
  `--unhandled-rejections=strict`;
- pre-control-plane repair head `9b52474a2def9df2c75649eda4b81a0ca128658a`
  passed canonical exact-head CI run `32584166269` / CI 739. The later
  control-plane reconciliation moved the head, so CI 739 is historical release
  evidence only;
- release-owner/adversarial review `5000574562` on exact head
  `b7576f8e94b3379c7427a51e4113960f396ac7e8` found a **new P1 variant in the
  same drain boundary**: `drainPromiseTransportBeforeIntegrityFailure()` first
  tries to define an own `constructor` and only then attaches the captured
  rejection reaction. A rejected same-realm native Promise with ordinary own
  metadata followed by `Object.preventExtensions()` therefore makes that first
  `defineProperty` throw before any reaction is attached. The gateway error can
  be caught while `node --unhandled-rejections=strict` still terminates on the
  orphaned provider rejection. A direct Node 22.16 reproducer confirmed exit 1;
- the same owner review requires an explicit design/evidence decision for
  non-shadowable own `constructor`/`then` cases so the implementation does not
  silently choose between hostile accessor dispatch and an orphaned rejection.

The exact `b7576f8e...` owner review is non-independent and this control-plane
write moves the head, so the review is historical as release evidence; its P1
finding remains an active blocker because no runtime repair has yet occurred.
The earlier Codex thread `PRRT_kwDOTiNyWc6bZjxp` also remains intentionally
unresolved. The fresh Codex request comment `5381422260` targeted `b7576f8e...`
and likewise becomes stale after this bookkeeping move; do not count any later
result on that moved SHA as final release evidence.

The PR #120 exact final head is intentionally not self-embedded in this moving
file because doing so would create an infinite head-changing loop. Read the live
PR head after the last owned-file commit and record the exact SHA in the PR
conversation.

### Bounded scope and acceptance

PR #120 starts from trusted main rather than merging/rebasing/reviving stale PR
#97. The bounded prerequisite must:

- fail closed before inherited `Promise.prototype.constructor`/`then` drift can
  substitute provider context;
- pin load-bearing internal async Promises with captured own Promise data
  properties before parent awaits;
- safely drain every structurally invalid rejected native Promise class that the
  implementation claims to handle before returning the gateway validation error;
- preserve zero hostile `constructor`/`then` getter execution for decorated
  Promise rejection paths;
- preserve hardened synchronous non-Promise/plain-data capture through Core;
- preserve controlled-host compatibility without scalar coercion or inherited
  Array-index substitution;
- require hostile rejected context transports to yield **zero reference
  authorization and zero sensitive forwarding**.

This lot does **not** establish trusted durable Gate composition. The historical
PR #97 durable-claim composition remains a separate untrusted dependency to be
reconstructed/reviewed only after this prerequisite closes.

### Skeptical hypotheses

1. inherited Promise constructor/then poisoning can convert rejected reads into
   stable attacker context and reach authorization/forwarding;
2. own Promise accessors can dispatch during assimilation;
3. structurally invalid rejected native Promises can become process-level orphaned
   rejections before fail-closed validation, including non-extensible metadata and
   non-shadowable constructor/then variants;
4. synchronous Array/Object/callable Proxies can dispatch before inert capture;
5. shared plain-data hardening can be weakened by post-import intrinsic drift;
6. policy/account bridges can false-PASS via scalar coercion or inherited Array
   index setters;
7. this prerequisite can accidentally overclaim or import durable Gate
   composition.

## blocked_historical_prs

### PR #97 — stale historical durable Gate candidate

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- CI 592: `success` but false-PASS for the Promise-drift property;
- release-owner verdict: `BLOCK / NON-INDEPENDENT`;
- status: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_REPAIR_BY_PR120`.

### PR #93 — Wallet Guard simulation evidence

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- CI 541: `success` but not release evidence;
- owner/distinct review evidence is stale on an older moved head;
- unresolved P1/P2 classes include negative-zero identity, typed-data wrapper
  normalization, generic-signature exact-value commitment, nested saved-reflection
  capture and shared proof canonicalization/SHA-256/hash hardening;
- status: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120` unless a
  separately reviewed dependency decision changes that order.

## current_blockers

1. `PR120_P1_NONEXTENSIBLE_DECORATED_REJECTED_PROMISE_CAN_ORPHAN_REJECTION_BEFORE_DRAIN`.
2. `PR120_NONSHADOWABLE_PROMISE_CONSTRUCTOR_THEN_DRAIN_BOUNDARY_REQUIRES_EXPLICIT_SAFE_DESIGN`.
3. `PR120_FINAL_EXACT_HEAD_CI_REQUIRED_AFTER_RUNTIME_REPAIR`.
4. `PR120_RELEASE_OWNER_FIVE_STAGE_GATE_REQUIRED_AFTER_RUNTIME_REPAIR`.
5. `PR120_DISTINCT_EXACT_HEAD_INDEPENDENT_REVIEW_REQUIRED_AFTER_RUNTIME_REPAIR`.
6. `PR120_ZERO_UNRESOLVED_P0_P1_P2_NOT_ESTABLISHED`.
7. `PR97_STALE_HISTORICAL_BRANCH_MUST_NOT_MERGE`.
8. `PR93_RECONCILIATION_AND_FRESH_EXACT_HEAD_REVIEW_REQUIRED_AFTER_PR120`.
9. `DAGR_SOURCE_DOCUMENT_MISSING`.
10. `PRODUCTION_TRUST_UNPROVED / REAL_WALLET_NOT_AUTHORIZED`.

## merge_and_post_merge_rules

Standing authorization permits merge only after the mandatory five-stage
pre-merge gate, all applicable technical/security gates, canonical exact-head CI,
a genuinely distinct exact-head independent review, and zero unresolved P0/P1/P2
on the same frozen SHA. Release-owner/Prime/self-review is non-independent. A
fresh `chatgpt-codex-connector` review counts only when it actually reviews that
exact SHA. Any head movement invalidates exact-head CI/review evidence.

After any merge, require exact-main CI and exact-merge-SHA SpecKit,
skeptical/falsification, security, code-quality, optimization and
integration/regression assurance with one final verdict:
`POST_MERGE_ASSURANCE_PASS`, `POST_MERGE_ASSURANCE_CONDITIONAL` or
`POST_MERGE_ASSURANCE_BLOCK`. A non-PASS merge is not a trusted dependency.

## next_safe_actions

1. Repair the non-extensible decorated rejected-Promise drain path in the same
   bounded PR #120 and add a strict-unhandled-rejection regression; explicitly
   handle or bound non-shadowable own constructor/then cases without executing
   hostile accessors.
2. Reconcile this same useful PR's control plane after the runtime/test repair;
   do not create a docs-only successor.
3. Freeze the resulting exact head and require canonical exact-head CI.
4. Re-run the release-owner five-stage gate.
5. Request a **new** genuinely distinct exact-head Codex skeptical/security
   review; prior requests/reviews on moved heads are history only.
6. Resolve `PRRT_kwDOTiNyWc6bZjxp` only after the fresh exact-head independent
   reviewer validates the final repaired boundary and zero P0/P1/P2 remain.
7. Merge only if every exact-head gate passes unchanged; immediately run exact-
   merge post-merge assurance before trusting PR #120.
8. Reconstruct durable claim-before-observer/downstream composition only after
   PR #120 is trusted; reconcile PR #93 afterwards unless dependency ordering is
   separately reviewed.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. No public site/Vercel/funding-directory write belongs to this
control plane. Burner local/testnet E2E remains behind a separate explicit human
gate.
