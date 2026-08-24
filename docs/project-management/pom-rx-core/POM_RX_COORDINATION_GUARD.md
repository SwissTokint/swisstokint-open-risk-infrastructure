# POM-RX canonical single-flight coordination guard

Status: `ACTIVE_PROCESS_RULE`

## Purpose

This document defines the **one and only** coordination-lock mechanism used by POM-RX automation. It exists to enforce the repository invariant that two overlapping automation invocations must never both enter a writer lane or continue mutating project state concurrently.

The guard is coordination state only. It is not release evidence, project-management state, protocol state, a readiness claim, or a substitute for exact-head CI/review gates.

## Canonical lock location

- repository: `SwissTokint/swisstokint-open-risk-infrastructure`
- branch: `automation/pom-rx-coordination`
- path: `.pom-rx/coordination-lock.json`
- schema: `pom-rx-coordination-lock/1`
- active-window duration: 45 minutes

No other branch, issue, label, comment, workflow artifact, local file, chat state, or external store may be used as a competing POM-RX single-flight lock.

The coordination branch is intentionally not merged into `main`. Lock acquisition/release writes only to that branch, so normal coordination does not create commits on `main` or move a feature/control-plane PR head.

## Lock document

The lock document has this shape:

```json
{
  "schema": "pom-rx-coordination-lock/1",
  "state": "FREE | HELD",
  "lease_minutes": 45,
  "holder": null,
  "last_transition": {}
}
```

When `state` is `HELD`, `holder` must contain:

- `run_id`: unique identifier for the invocation;
- `acquired_at`: UTC RFC3339 timestamp;
- `expires_at`: UTC RFC3339 timestamp exactly 45 minutes after acquisition;
- `base_main`: live `main` SHA observed for the run;
- `purpose`: bounded work description.

Unknown schema/state, malformed timestamps, missing required holder fields, wrong duration, unreadable branch/file state, or inconsistent holder data is **guard unavailable**, never FREE.

## Atomic acquisition protocol

The GitHub contents API blob SHA is the compare-and-swap token.

Before entering any writer lane:

1. Fetch `automation/pom-rx-coordination:.pom-rx/coordination-lock.json` and retain its exact blob SHA.
2. Validate the schema and lock configuration. If validation fails, return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and modify no project state.
3. If `state=HELD` and `expires_at` is still in the future, return `SKIPPED_PREVIOUS_RUN_ACTIVE` and modify no project state.
4. If `state=HELD` and `expires_at` is at or before the current time, treat the lock as **STALE/BLOCKED**, return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`, and modify neither project state nor the lock. Automation must never reclaim an expired HELD lock automatically.
5. Only if `state=FREE`, attempt one update of the lock file using the **exact fetched blob SHA**. The replacement state is `HELD` with this invocation's unique `run_id`, acquisition/expiry timestamps, live base-main SHA and bounded purpose.
6. If the compare-and-swap update fails for any reason, re-read the lock only to classify the outcome; do not enter a writer lane and do not retry acquisition inside the same invocation. A now-active HELD state is `SKIPPED_PREVIOUS_RUN_ACTIVE`; every other result is `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`.
7. After a successful update, fetch the lock again. Proceed only if the stored `state` is `HELD`, the schema/configuration remain valid, `holder.run_id` exactly equals this invocation's `run_id`, and `expires_at` is still in the future. Otherwise return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and modify no project state.

Because every contender updates from the exact blob SHA it observed, the first successful acquisition changes the blob SHA. A concurrent contender using the stale SHA cannot successfully claim the same FREE state. `last_transition` also changes on every acquisition/release, preventing the FREE document from intentionally returning to an identical content blob during normal operation.

## Mandatory lock-liveness check before every project mutation

Initial acquisition is not sufficient for a long-running invocation. **Immediately before every state-changing project action** — including branch/ref movement, file write, PR/comment/review/thread mutation, merge, or any other GitHub write outside the coordination branch — the run must re-fetch the canonical lock and verify all of the following:

1. schema and lock configuration are valid;
2. `state=HELD`;
3. `holder.run_id` exactly equals this invocation's run ID;
4. `expires_at` is still in the future.

If any check fails, or the lock cannot be read/validated, the invocation performs **no further project mutation**. If its active window expired, it becomes read-only for project state and must not renew, extend or reacquire the lock inside the same invocation.

Read-only polling of CI/reviews may continue for reporting after expiry. The invocation may also perform the narrowly defined **same-holder release** on the coordination branch described below, because automatic stale-lock reclamation is forbidden and release is the operation that restores availability. It must not perform any other write.

## Why expired HELD locks are not automatically reclaimed

The 45-minute timestamp is a writer-liveness deadline, not an automatic fencing token. GitHub does not provide an atomic transaction that couples this coordination file to every separate PR/comment/ref/merge mutation.

If another run were allowed to reclaim the lock automatically at the exact expiry boundary, an older project API call started just before expiry could complete after the new run acquired the lock. A pre-mutation time check alone cannot atomically close that cross-resource race.

Therefore an expired `HELD` lock remains **blocking** for every other automated invocation. This conservative rule preserves one-writer safety without pretending that a timestamp provides server-side fencing.

Normal runs should release promptly. If a run is delayed beyond 45 minutes but remains alive, it becomes project-read-only and should release its own stale lock. If the holder crashed and cannot release, recovery requires the explicit human procedure below.

## Release protocol

Release is a coordination-only operation and is permitted for the **exact current holder**, even after its project-write active window expired, provided ownership has not changed.

1. Fetch the current lock and exact blob SHA.
2. Validate schema/configuration and require `state=HELD` plus `holder.run_id` exactly equal to the releasing invocation's run ID. Do not require future `expires_at` for release.
3. Update the file using that exact blob SHA to `state=FREE`, `holder=null`, preserving `lease_minutes=45` and recording a unique `RELEASE` transition with current UTC time and the releasing run ID.
4. Re-fetch and verify valid schema/configuration plus `state=FREE` and `holder=null`.

A run must never release another run's lock. A release compare-and-swap failure is not retried blindly; re-read only. If ownership changed, stop. If the same holder is still present but release cannot be verified, report `COORDINATION_RELEASE_BLOCKED` and perform no project writes.

## Explicit stale-lock recovery

Automation must never clear or overwrite an expired HELD lock owned by another run.

If a holder crashed and left a stale lock, recovery requires **explicit human instruction**. Before resetting it, the recovery operator must re-read the canonical lock, confirm it is expired, confirm the identified run is no longer performing project writes to the best available live evidence, and record the recovery reason in `last_transition`. The reset uses the exact observed blob SHA and must be re-read afterward as `FREE`.

This is intentionally fail-closed. A rare manual stale-lock recovery is preferable to silently permitting two project writers without a true cross-resource fencing primitive.

## Bootstrap rule

Creation of the canonical coordination branch/file is a one-time bootstrap operation. It may occur only under an explicit human instruction to repair an unavailable coordination guard. After bootstrap, automation itself must never recreate, rename, replace or fork the mechanism. Any future change to this protocol or lock location requires a normal scoped control-plane PR and the full applicable review gates.

## Evidence and non-claims

Acquiring this guard proves only single-writer coordination for POM-RX automation that follows this protocol. It does not provide distributed transaction semantics for arbitrary GitHub users, does not secure GitHub itself, and does not replace branch protection, CI, independent review, post-merge assurance, or application/runtime locking.
