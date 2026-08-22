# POM-RX Prime Delivery Checkpoint

Updated: `2026-08-23`

Purpose: compact **durable cross-chat continuation state**. Scheduled-task chat
history is not project state. Every run reconstructs state from live GitHub plus
this canonical control plane. Live GitHub wins whenever a PR head, CI run,
review, review thread, mergeability signal or merge changes after this
checkpoint.

## trusted_main

`06de789768c2cb0d5738161997c6bf104930a174`

Latest trusted merge: PR #121 — bounded non-Tier-B live-state reconciliation.

- exact source head: `05f8964d148266ec7a3435c8959b2c998242294a`;
- exact merge/main SHA: `06de789768c2cb0d5738161997c6bf104930a174`;
- canonical exact-main push CI: run `32598869337`, CI 772 attempt 1,
  `completed / success` on the exact merge SHA;
- decision-time `pom-rx/exact-main-ci`: `success`, targeting the same canonical
  run;
- exact-merge assurance: `POST_MERGE_ASSURANCE_PASS`, PR #121 comment
  `5382634292`;
- distinct exact-head review before merge: `chatgpt-codex-connector` on source
  head `05f8964d...`, no major issues, with zero PR #121 review threads.

PR #121 is trusted coordination evidence only. It changed exactly the four
canonical continuation/product-position files and did not change runtime,
protocol, Gate, Witness, verifier or Wallet Guard/provider semantics.

## active_runtime_task

### PR #120 — Wallet Guard rejected-Promise transport prerequisite repair

Live branch: `automation/pom-rx-promise-drift-repair-20260822`.

The branch was originally created from `e5aead150a2ed5f390593cc2d9d307defdd79bdc`
but is now reconciled in its canonical control-plane overlap to trusted main
`06de789768c2cb0d5738161997c6bf104930a174`. Do not import or revive stale PR
#97 merely to resolve branch age.

The fresh owner P1 found on prior exact head
`30e9c0399804f17cbadbc076eed4d1d48614610d` was the effective-constructor
`Symbol.species` drain gap: a rejected same-realm native Promise with a benign
alternate data constructor could be made non-extensible, causing fallible own
`constructor` shadowing to fail before a rejection reaction was attached even
though native SpeciesConstructor semantics would safely fall back to the native
Promise.

Bounded implementation repair is now present on the PR #120 branch:

- implementation commit `ebaf1c71c903a266ebedad60aa5be4f775f67a84`
  captures `Object.prototype.hasOwnProperty`, requires data descriptors for the
  constructor/species classification, walks bounded non-Proxy species paths with
  captured reflection, and treats only absent/null/undefined species or the
  captured native Promise as internally drainable;
- regression commit `e9f7a70668ce0a7314dbcd0a40f90f402389f6e6`
  adds a strict-unhandled-rejection case for a non-extensible rejected native
  Promise with a benign alternate data constructor and absent species, plus a
  prehandled hostile species-accessor case requiring zero accessor execution,
  zero reference authorization and zero sensitive forwarding;
- primitive constructors, constructor/species accessors, Proxies and
  attacker-selected species constructors remain outside the internally-drainable
  claim unless separately proven safe;
- the existing transport validator, Promise-drift regressions, shared inert-data
  boundary and Wallet Guard product-position invariant remain in scope and must
  not be weakened.

The exact PR head after the canonical checkpoint commit containing this file is
GitHub-live state and must be read from PR #120. All exact-head release evidence
from `30e9c039...` and earlier heads is historical. On the new repaired head:

- canonical exact-head CI: `PENDING`;
- mandatory five-stage release-owner gate: `PENDING / NON-INDEPENDENT`;
- genuinely distinct exact-head `chatgpt-codex-connector` release review:
  `PENDING`;
- merge: `BLOCKED` until all gates pass on one frozen exact SHA.

Historical independent review threads on PR #120 remain intentionally unresolved
attack history until the repaired exact head is independently validated:

- `PRRT_kwDOTiNyWc6bZjxp` — P1;
- `PRRT_kwDOTiNyWc6bZ6tx` — P1;
- `PRRT_kwDOTiNyWc6bZ6tz` — P2;
- `PRRT_kwDOTiNyWc6baFkR` — P1;
- `PRRT_kwDOTiNyWc6baIxZ` — P1.

Do not resolve these threads merely because a code repair exists. Resolution is
allowed only after canonical exact-head CI and a fresh genuinely distinct review
validate the covered attack conditions with zero unresolved P0/P1/P2.

## blocked_historical_prs

### PR #97 — stale durable Gate candidate

- exact live head at the latest reconstruction:
  `0efb462f0b4b8cff62d664a51d13ad71306b6bbb`;
- historical base: `0564aecd42cf0794894c12842980969ff59c9f73`;
- state: `OPEN / MUST_NOT_MERGE / SUPERSEDED_FOR_PROMISE_BOUNDARY_BY_PR120`.

Do not merge, rebase, revive or wholesale-copy stale PR #97. Reconstruct its
durable claim-before-observer/downstream composition later from then-current
trusted main after PR #120 receives exact-merge `POST_MERGE_ASSURANCE_PASS`.

### PR #93 — Wallet Guard simulation evidence

- exact live head at the latest reconstruction:
  `c4e40ceb286f4e59657767661daed15d2b68e9a7`;
- historical base: `818718955c9e4136e9e55754a31be2f1c7b610f8`;
- state: `OPEN / UNTRUSTED / ORDERED_AFTER_TRUSTED_PR120_AND_REQUIRED_CORE_WORK`.

Its historical green CI is not current release evidence. Reconcile useful work
from then-current trusted main later instead of merging stale history wholesale.

## architecture_and_claim_boundary

Shared canonicalization, hashing, verifier, Witness, exact authorization, Gate,
execution-evidence and observation/reconciliation semantics remain Core-owned.
Wallet Guard remains an application profile. Trusted main contains a process-local
single-use Gate and a separate filesystem durable claim primitive; durable
composition is not yet trusted.

Maximum near-term claim remains `POM_RX_LOCAL_OPERATIONAL_PROTOTYPE_READY`:
local, deterministic, synthetic and bounded. It is not production readiness,
audit, certification, wallet safety, financial safety or deployment
authorization.

## next_safe_actions

1. Freeze the final reconciled PR #120 head and require fresh canonical exact-head
   CI success; any head move invalidates the evidence.
2. Run the mandatory five-stage release-owner review on that same exact SHA,
   including concrete species/accessor/Proxy/strict-unhandled-rejection
   falsification hypotheses. This lane is non-independent.
3. Request a fresh read-only `chatgpt-codex-connector` review on the same exact
   SHA. It must actually review that SHA and leave zero unresolved P0/P1/P2.
4. Resolve the five historical PR #120 threads only when that exact-head evidence
   justifies closure.
5. Revalidate unchanged trusted main, PR head, CI run/attempt, reviews, threads and
   mergeability immediately before merge. Merge only under standing authority if
   all applicable gates pass.
6. Immediately run and record exact-merge-SHA post-merge assurance before PR #120
   becomes a trusted dependency.
7. Only then reconstruct durable Gate composition as a fresh bounded Core lot;
   reconcile PR #93 later in dependency order.

## safety_boundary

No private key, seed, secret, funded-wallet credential, real/funded wallet,
mainnet transaction, meaningful funds or uncontrolled malicious-site interaction
is authorized. Burner local/testnet E2E remains behind a separate explicit human
gate. Public website/Vercel/funding-directory writes are outside this control
plane.
