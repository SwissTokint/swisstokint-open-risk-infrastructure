# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-22T22:18:49+02:00`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat history is not project state. Every run reconstructs state from live GitHub plus this canonical control plane. Live GitHub wins whenever a PR head, CI run, review, review thread, mergeability signal or merge changes after this checkpoint.

## trusted_main

`e5aead150a2ed5f390593cc2d9d307defdd79bdc`

Latest trusted merge: PR #119 — bounded non-Tier-B control-plane transition.

- exact source head: `057b225783b24c97568dbcd733ca4c821f889c7a`;
- exact merge/main SHA: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- canonical exact-main push CI: run `32575110984`, CI 720 attempt 1, `completed / success` on the exact merge SHA;
- exact-merge post-merge assurance: `POST_MERGE_ASSURANCE_PASS`, PR #119 issue comment `5380609307`.

PR #119 is trusted coordination evidence only. It changed no runtime/security semantics and does not make historical PR #97, PR #93, or open PR #120 trusted.

## live_control_plane_reconciliation

The four canonical continuation files on `main` still described the pre-PR119 state (`a22198bf...`) while live GitHub had already advanced to `e5aead...` and PR #120 had acquired a new exact-head P1. The continuity contract therefore requires this one scoped non-Tier-B reconciliation before stale entries are used as dependency/readiness evidence.

Owned files are exactly:

- `docs/project-management/pom-rx-core/POM_RX_RESUME_CHECKPOINT.md`;
- `docs/project-management/pom-rx-core/POM_RX_TASKS.yaml`;
- `docs/project-management/pom-rx-core/POM_RX_BLOCKERS.md`;
- `docs/product/POM_RX_CAPABILITY_MAP.md`.

No runtime, test, protocol, Gate, Witness, verifier, Wallet Guard/provider, network, wallet, public-site/Vercel or financial-execution semantics change in this reconciliation. The branch identity is `docs/pom-rx-live-state-reconcile-20260822`; read the PR number, exact head, CI and reviews live after the final owned-file write. This is not a recurring checkpoint loop.

## active_runtime_task

### PR #120 — Wallet Guard Promise-transport prerequisite repair

Live state at reconciliation:

- PR: `#120`;
- branch: `automation/pom-rx-promise-drift-repair-20260822`;
- exact base/trusted main: `e5aead150a2ed5f390593cc2d9d307defdd79bdc`;
- exact live head: `30e9c0399804f17cbadbc076eed4d1d48614610d`;
- canonical exact-head CI: run `32596104896`, CI 770, `completed / success`;
- release-owner exact-head verdict: `BLOCK / NON-INDEPENDENT` because one fresh P1 remains;
- independent exact-head release gate for a repaired final head: `PENDING`;
- merge: `BLOCKED`.

Fresh owner P1 on exact `30e9c039...`: a rejected same-realm native Promise can be made non-extensible and given a benign alternate data `constructor` whose effective `Symbol.species` path would safely fall back to native Promise. The current drain classifier does not prove that species path, falls back to an own-`constructor` `defineProperty`, and that mutation can throw before the captured rejection reaction is attached. Under `--unhandled-rejections=strict`, the original provider rejection can remain orphaned and terminate Node even though Wallet Guard itself fails closed.

Required bounded repair:

- extend captured-reflection classification to prove the effective constructor's `Symbol.species` lookup path is data-only and non-Proxy before calling captured `Promise.prototype.then`;
- internally drain only absent/null/undefined species or the captured native `Promise`;
- keep primitive constructors, accessors, Proxies and attacker-selected species constructors outside the internally-drainable claim unless separately proven safe;
- add a CI-wired strict regression for a non-extensible benign alternate data constructor;
- add a prehandled hostile species-accessor boundary regression proving zero accessor execution, zero reference authorization and zero sensitive forwarding;
- do not weaken the transport validator, capability-map invariant or existing hostile rejected-transport regressions.

Historical independent review threads on PR #120 remain unresolved and are attack history until a later exact head is independently validated:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1.

CI 770 is technically green but is **not release evidence for the new species-path P1**. Any repair moves the PR #120 head and invalidates CI 770 and all exact-head review evidence for release.

## blocked_historical_prs

### PR #97 — stale durable Gate candidate

- exact live head: `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- exact-head CI `32487036517` / CI 592: `success` but known false-PASS for the Promise-drift security property;
- state: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_BOUNDARY_BY_PR120`.

Do not merge, rebase, revive or wholesale-copy stale PR #97. Its durable claim-before-observer/downstream composition must be reconstructed later as a separate bounded Tier-B Core lot from then-current trusted main after PR #120 is trusted.

### PR #93 — Wallet Guard simulation evidence

- exact live head: `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- exact-head CI `32465835858` / CI 541: `success` but stale/untrusted release evidence;
- state: `OPEN / NOT_MERGED / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120_AND_REQUIRED_SHARED_CORE_WORK` unless a separately reviewed dependency decision changes that order.

Unresolved current/non-outdated P1/P2 history includes exact-value identity, wrapper normalization, saved-reflection capture and shared proof canonicalization/SHA-256 hardening. Do not use CI 541 as release evidence.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate, execution-evidence and observation/reconciliation semantics remain Core-owned. Wallet Guard remains an application profile. Trusted main contains a process-local single-use Gate and a separate filesystem durable claim primitive; reviewed durable composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`: local, deterministic, synthetic and bounded. It is not production readiness, an audit, certification, wallet safety, financial safety or deployment authorization.

## merge_and_review_rules

Standing authorization permits a POM-RX merge only after the mandatory five-stage pre-merge gate, every applicable technical/security gate, canonical exact-head CI, every required genuinely distinct exact-head independent review, and zero unresolved P0/P1/P2 on the same frozen SHA. The five stages remain review pass 1; control pass 1; skeptical challenge; exact-head review pass 2; exact-head control pass 2 / release gate. Release-owner/Prime/self-review is non-independent. The independent-review waiver remains limited to PR #60. A moved head invalidates exact-head evidence.

Every non-trivial merge then requires exact-main CI plus exact-merge-SHA SpecKit reconciliation, skeptical/falsification, security audit, code-quality review, optimization review and integration/regression evidence before the merge becomes a trusted dependency.

## next_safe_actions

1. Complete this four-file live-state reconciliation through its own scoped PR and exact-head gates; do not change runtime in this lot.
2. After this reconciliation is trusted, repair only the fresh PR #120 species-path P1 with the Prime lane as the single writer.
3. Freeze the repaired PR #120 head; run fresh canonical CI, the mandatory five-stage release-owner gate and a new genuinely distinct read-only `chatgpt-codex-connector` exact-head skeptical/security review.
4. Resolve historical PR #120 P1/P2 threads only if the exact repaired head validates their covered conditions and leaves zero unresolved P0/P1/P2.
5. Revalidate unchanged main/base/head/CI/reviews/threads immediately before any merge; after merge run exact-merge post-merge assurance before trusting PR #120.
6. Reconstruct durable Gate composition separately after trusted PR #120, then reconcile PR #93 in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet, mainnet transaction, meaningful funds or uncontrolled malicious-site interaction is authorized. Burner local/testnet E2E remains behind a separate explicit human gate. Public website/Vercel/funding-directory writes are outside this control plane.
