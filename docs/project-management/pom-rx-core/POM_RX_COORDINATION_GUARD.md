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
- lease duration: 45 minutes

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

Unknown schema/state, malformed timestamps, missing required holder fields, wrong lease duration, unreadable branch/file state, or inconsistent holder data is **guard unavailable**, never FREE.

## Atomic acquisition protocol

The GitHub contents API blob SHA is the compare-and-swap token.

Before entering any writer lane:

1. Fetch `automation/pom-rx-coordination:.pom-rx/coordination-lock.json` and retain its exact blob SHA.
2. Validate the schema and lease configuration. If validation fails, return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and modify no project state.
3. If the lock is `HELD` and `expires_at` is still in the future, return `SKIPPED_PREVIOUS_RUN_ACTIVE` and modify no project state.
4. If the lock is `FREE`, or `HELD` but expired, attempt one update of the lock file using the **exact fetched blob SHA**. The replacement state is `HELD` with this invocation's unique `run_id`, acquisition/expiry timestamps, live base-main SHA and bounded purpose.
5. If the compare-and-swap update fails for any reason, re-read the lock only to classify the outcome; do not enter a writer lane. A now-active lease is `SKIPPED_PREVIOUS_RUN_ACTIVE`; otherwise return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE`.
6. After a successful update, fetch the lock again. Proceed only if the stored `state` is `HELD`, the schema/lease remain valid, `holder.run_id` exactly equals this invocation's `run_id`, and `expires_at` is still in the future. Otherwise return `SKIPPED_COORDINATION_GUARD_UNAVAILABLE` and modify no project state.

Because every contender updates from the exact blob SHA it observed, the first successful acquisition changes the blob SHA. A concurrent contender using the stale SHA cannot successfully claim the same lease state.

## Mandatory lease-liveness check before every project mutation

Initial acquisition is not sufficient for a long-running invocation. **Immediately before every state-changing project action** — including branch/ref movement, file write, PR/comment/review/thread mutation, merge, or any other GitHub write outside the coordination branch — the run must re-fetch the canonical lock and verify all of the following:

1. schema and lease configuration are valid;
2. `state=HELD`;
3. `holder.run_id` exactly equals this invocation's run ID;
4. `expires_at` is still in the future.

If any check fails, or the lock cannot be read/validated, the invocation must perform **no further project mutation**. If the lease expired, ownership changed, or the state became FREE, the run stops its writer lane and returns a coordination-blocked terminal result. It must not attempt to reacquire or extend the lease inside the same invocation.

This per-mutation liveness check closes the stale-owner race: once a 45-minute lease expires and another run becomes eligible to acquire it, the old run is procedurally forbidden from making another project write.

Read-only polling of CI/reviews may continue after lease expiry only to report state, but it cannot be followed by a project write in that invocation. A later scheduled run must acquire a fresh lease and continue from live GitHub state.

## Lease expiry and stale locks

A lease older than 45 minutes is expired and may be reclaimed by a **different later invocation** through the same compare-and-swap protocol. Expiry is recovery from a crashed/abandoned/long-waiting run, not evidence that the prior run completed successfully.

Never extend or renew a lease merely to keep broad work alive, and never reacquire after expiry inside the same invocation. Work that requires writes must remain bounded enough to fit the lease. If CI/review waiting exceeds the lease, the current invocation becomes read-only and terminates; a later invocation resumes after a fresh acquisition.

## Release protocol

On a normal terminal path after durable project state has been persisted, and only while the lease is still live:

1. Fetch the current lock and exact blob SHA.
2. Verify schema/configuration, `state=HELD`, `holder.run_id` equals the releasing invocation, and `expires_at` is still in the future.
3. Update the file using that exact blob SHA to `state=FREE`, `holder=null`, preserving `lease_minutes=45` and recording a `RELEASE` transition.
4. Re-fetch and verify `state=FREE`.

A run must never release another run's lease. If its lease already expired or ownership changed, it does not mutate the coordination file; it terminates and lets expiry/reclamation provide recovery. A release write failure while the lease is still owned is a coordination blocker; the run stops further project writes and reports the failure.

## Bootstrap rule

Creation of the canonical coordination branch/file is a one-time bootstrap operation. It may occur only under an explicit human instruction to repair an unavailable coordination guard. After bootstrap, automation itself must never recreate, rename, replace or fork the mechanism. Any future change to this protocol or lock location requires a normal scoped control-plane PR and the full applicable review gates.

## Evidence and non-claims

Acquiring this guard proves only single-writer coordination for POM-RX automation that follows this protocol and performs the mandatory pre-mutation liveness checks. It does not provide distributed transaction semantics for arbitrary GitHub users, does not secure GitHub itself, and does not replace branch protection, CI, independent review, post-merge assurance, or application/runtime locking.
