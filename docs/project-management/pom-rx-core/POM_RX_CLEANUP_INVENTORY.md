# POM-RX repository preservation and cleanup inventory

Observed: `2026-08-14T17:34:57+02:00`

Repository: `SwissTokint/swisstokint-open-risk-infrastructure`

Baseline: `60a331540dded68f8e13fa4aae9dc131934b772f`

Task: `REPOSITORY-PRESERVATION-CLEANUP`

## Claim boundary

This record inventories and removes only local Git worktree registrations that
were clean, obsolete and exactly recoverable from retained GitHub branches. It
does not delete a branch, rewrite history, preserve or publish a dirty lot,
change protocol/runtime behavior, or authorize the strict-profile foundation.

`git status --porcelain=v1 -uall` was used for tracked and untracked state.
Remote reachability means that an `origin/*` ref contained the exact HEAD after
`git fetch origin --prune`; it is not inferred from a squash merge alone.

## Pre-action inventory

The `Classification` column is the primary fail-closed classification. A dirty
frozen lot is classified `DIRTY_PRESERVATION_REQUIRED` and its disposition
remains `FROZEN_KEEP` until separate attribution, secret scan and publication.

| Absolute path | Branch / state | HEAD | Status | Upstream; ahead/behind | GitHub / exact reachability | Classification | Disposition |
|---|---|---|---|---|---|---|---|
| `C:\Dev\swisstokint-open-risk-infrastructure` | `agent/solana-devnet-anchor-adapter` | `05c60c878e110c95e24dfba3eb199f62cf5432e3` | dirty: 2 modified, 10 untracked (owned lock excluded) | `origin/agent/solana-devnet-anchor-adapter`; `0/0` | PR #15 open draft; remote exact | `DIRTY_PRESERVATION_REQUIRED` | `FROZEN_KEEP` |
| `C:\Dev\pom-rx-action-continuity-worktree` | `codex/pom-rx-strict-profile-prerequisites` | `496fe9a49459518f6ceedcc3215401b50fe435e1` | clean | exact upstream; `0/0` | PR #33 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\pom-rx-ci-history-worktree` | `codex/pom-rx-ci-historical-source-checkout` | `0dd95abfd87bf93265b84d04c8ab54f9dc63184c` | clean | exact upstream; `0/0` | PR #36 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\pom-rx-fixture-contract-worktree` | `codex/pom-rx-fixture-contract-amendment` | `b686447522a31c04ce132286607da82c229e8cc5` | clean | exact upstream; `0/0` | PR #34 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\pom-rx-post-merge-reconcile-worktree` | `codex/pom-rx-post-merge-reconcile` | `cddc0d35882de467232d7e8d2171a560d0cfaa50` | clean | exact upstream; `0/0` | PR #40 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\pom-rx-preserving-cleanup-worktree` | `codex/pom-rx-preserving-cleanup` | `60a331540dded68f8e13fa4aae9dc131934b772f` | clean at creation | `origin/main`; `0/0` | `origin/main` exact | `ACTIVE_KEEP` | active writer |
| `C:\Dev\pom-rx-r2-compatibility-worktree` | `codex/pom-rx-r2-compatibility-adr` | `2d4f52d5f8e31819a611987abd25680ae17225d7` | clean; ignored outputs only | exact upstream; `0/0` | PR #32 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\pom-rx-strict-ratification-worktree` | `codex/pom-rx-strict-ratification` | `77d263f30ea5f1b6cf71645053e25cc993bbbedb` | clean | exact upstream; `0/0` | PR #39 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\pom-rx-v01-fixtures-worktree` | `codex/pom-rx-v01-compat-fixtures` | `752f61b8ecff784b625cbb581537ba6fe534b334` | clean; ignored outputs only | exact upstream; `0/0` | PR #35 merged; remote exact | `CLEAN_REACHABLE_REMOVABLE` | removed locally |
| `C:\Dev\swisstokint-aptos-worktree` | `agent/aptos-move-proof-registry` | `e396ab05ccc6d58c5bba735674b50ed104225815` | clean | exact upstream; `0/0` | PR #20 open draft; remote exact | `FROZEN_KEEP` | retained |
| `C:\Dev\swisstokint-avalanche-worktree` | `agent/avalanche-fuji-accepted-monitor` | `56c843d683620916976ce86a6caaa45793b4be6c` | clean | exact upstream; `0/0` | PR #16 open draft; remote exact | `FROZEN_KEEP` | retained |
| `C:\Dev\swisstokint-multichain-review` | detached | `3f7b2bbdddafd0be62a4cf26981e4cb775373add` | clean | none | PR #9 merged; `origin/agent/multichain-grant-readiness` contains HEAD | `FROZEN_KEEP` | retained |
| `C:\Dev\swisstokint-pom-rx-witness-worktree` | `agent/pom-rx-preflight-witness` | `175d4ddfab8e7efa035a34793205fd53f1e15984` | dirty: 7 modified, 98 untracked | exact upstream; `0/0` | PR #24 open draft; remote contains HEAD | `DIRTY_PRESERVATION_REQUIRED` | `FROZEN_KEEP` |
| `C:\Dev\swisstokint-pom-rx-worktree` | `agent/pom-rx-v0.1` | `9205d105790cd1c75550234e7070c0691ca1bf3d` | dirty: 2 modified, 12 untracked | upstream absent | PR #23 merged; no live `origin/*` ref contains HEAD | `DIRTY_PRESERVATION_REQUIRED` | `FROZEN_KEEP` |
| `C:\Dev\swisstokint-pr24-clean-worktree` | detached | `175d4ddfab8e7efa035a34793205fd53f1e15984` | clean | none | PR #24 open draft; witness remote contains HEAD | `FROZEN_KEEP` | retained |
| `C:\Dev\swisstokint-risknet-worktree` | `agent/risknet-native-token-v0.4` | `175d4ddfab8e7efa035a34793205fd53f1e15984` | dirty: 4 modified, 43 untracked | `origin/main`; ahead 1, behind 13 | witness remote contains HEAD; no matching PR | `DIRTY_PRESERVATION_REQUIRED` | `FROZEN_KEEP` |
| `C:\Dev\swisstokint-security-worktree` | `agent/container-secret-boundary` | `771250d914de01aef1b5a50208d5510e35f5d3c0` | clean | exact upstream; `0/0` | PR #22 merged; remote exact | `FROZEN_KEEP` | retained |
| `C:\Dev\swisstokint-stellar-worktree` | `agent/stellar-soroban-verifier` | `0c77495c0def2bbb2a7e2101d8be51bdda4a7a37` | clean | exact upstream; `0/0` | PR #14 merged; remote exact | `FROZEN_KEEP` | retained |
| `C:\Dev\swisstokint-tezos-worktree` | `agent/tezos-smartpy-registry` | `9c5efef680fbc6fba8a4a412e7b550b35225d417` | dirty: 3 modified, 8 untracked | exact upstream; `0/0` | PR #17 open draft; remote exact | `DIRTY_PRESERVATION_REQUIRED` | `FROZEN_KEEP` |
| `C:\Dev\swisstokint-uniswap-worktree` | `agent/uniswap-v4-urc-conformance` | `b8bba6b4e01633dd76a4af2f0cbceb6c976b4b83` | dirty: 3 modified, 2 untracked | exact upstream; `0/0` | PR #19 open draft; remote exact | `DIRTY_PRESERVATION_REQUIRED` | `FROZEN_KEEP` |

No pre-action worktree was classified `UNPUBLISHED_COMMIT_PRESERVATION_REQUIRED`
or `UNKNOWN_FAIL_CLOSED`. The dirty `agent/pom-rx-v0.1` worktree remains more
conservative than commit-only classification because it also has unpublished
files and no live remote ref containing its HEAD.

## Local removals performed

Immediately before each removal, the Lead rechecked the absolute normal
directory, exact HEAD, clean porcelain state, exact branch/upstream, `0/0`
ahead/behind, retained remote ref and merged exact-head PR. Independent
Architecture, Security and QA/Conformance reviews returned `APPROVE` / `GO`.

Only `git worktree remove <exact-path>` was used, serially and without
`--force`. Before removal, the Lead's exact ignored-file enumeration reported
only `node_modules`, `dist` and Python `__pycache__` material in the two
worktrees with ignored outputs. Reviewers could not re-observe those deleted
local outputs afterward, so this evidence is explicitly Lead-observed. No
branch or ref was deleted.

| Removed local path | Exact recoverable HEAD | Retained GitHub branch |
|---|---|---|
| `C:\Dev\pom-rx-action-continuity-worktree` | `496fe9a49459518f6ceedcc3215401b50fe435e1` | `origin/codex/pom-rx-strict-profile-prerequisites` |
| `C:\Dev\pom-rx-ci-history-worktree` | `0dd95abfd87bf93265b84d04c8ab54f9dc63184c` | `origin/codex/pom-rx-ci-historical-source-checkout` |
| `C:\Dev\pom-rx-fixture-contract-worktree` | `b686447522a31c04ce132286607da82c229e8cc5` | `origin/codex/pom-rx-fixture-contract-amendment` |
| `C:\Dev\pom-rx-post-merge-reconcile-worktree` | `cddc0d35882de467232d7e8d2171a560d0cfaa50` | `origin/codex/pom-rx-post-merge-reconcile` |
| `C:\Dev\pom-rx-r2-compatibility-worktree` | `2d4f52d5f8e31819a611987abd25680ae17225d7` | `origin/codex/pom-rx-r2-compatibility-adr` |
| `C:\Dev\pom-rx-strict-ratification-worktree` | `77d263f30ea5f1b6cf71645053e25cc993bbbedb` | `origin/codex/pom-rx-strict-ratification` |
| `C:\Dev\pom-rx-v01-fixtures-worktree` | `752f61b8ecff784b625cbb581537ba6fe534b334` | `origin/codex/pom-rx-v01-compat-fixtures` |

Post-action verification proved all seven paths absent from the registered
worktree list and every named remote branch still present at the recorded HEAD.

## Remaining blockers and next safe action

Six dirty lots remain intentionally untouched and locally preserved. They may
not be mixed into POM-RX or published merely from path/branch naming. No lot is
selected as READY. Explicit human selection and unfreeze authorization are
required before inspecting or publishing any one of them. Only then may that
separate lot receive ownership attribution, a secret scan, a dedicated remote
preservation branch and a non-force push before any later local removal. A
secret finding or uncertain attribution fails closed and blocks publication.

The current cycle did not inspect or publish their contents, start Docker,
touch the site/funding/Vercel, change DAGR, or alter a protocol/runtime file.
The strict-profile foundation therefore remains
`BLOCKED_PENDING_PRESERVING_CLEANUP_AND_SEPARATE_FOUNDATION_PR`.
