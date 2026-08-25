# POM-RX member prototype engineering loop

Status: `DRAFT_VERTICAL_SLICE / NON_PRODUCTION`

Date: 2026-08-25

## Goal

Turn the existing POM-RX reference implementation into a bounded prototype that an authenticated SwissTokint member can exercise from the website dashboard without introducing custody, exchange credentials, wallet secrets, order execution, arbitrary untrusted receipt upload or production-readiness claims.

The first vertical slice proves product wiring, not financial safety:

```text
member dashboard
  -> authenticated same-origin API
  -> bounded scenario allowlist
  -> POM-RX member-lab application adapter
  -> existing POM-RX reference verifier
  -> sanitized verdict + receipt hashes + per-stage outcome
  -> dashboard rendering
```

The application adapter must reference shared POM-RX semantics. It must not fork canonicalization, hashing, strict verification, Witness, exact authorization, Gate, execution-evidence or reconciliation semantics.

## Repository map used by this slice

- `sdk/typescript/pom-rx.mjs` — frozen POM-RX v0.1 receipt and chain reference verifier.
- `core/strict-verification/` — strict-profile verifier and artifact identity; promotion target after packaging/runtime integration is proven.
- `core/authorization/` — exact-authorization contract; not exposed by the first member lab.
- `core/gate/` — single-use Gate and durable claim primitives; not invoked by the first member lab.
- `core/witness/` — Witness lifecycle; not invoked by the first member lab.
- `core/execution/` — execution-evidence semantics; no external execution is performed by the first member lab.
- `core/observation/` — observation/reconciliation semantics; later operational slice.
- `applications/enterprise-apis/member-lab/` — bounded member-facing adapter introduced by this slice.
- `fixtures/pom-rx/v0.1-compat/1/` — frozen public compatibility/control evidence used as test material.

## Engineering loop

Every iteration is deliberately small and must end in evidence before another capability is added.

### 0. Snapshot

Record live `main`, active stacked work, coordination state and the exact capability being changed. Do not build on stale or unrelated Wallet Guard PR history.

### 1. Select one observable capability

Choose exactly one member-observable result, for example: reference chain verification, strict-profile verification, exact authorization display, Gate single-use demonstration, execution-evidence recording, observation/reconciliation or proof export.

### 2. Define the contract first

Write or update a machine-testable contract before implementation. Inputs must be bounded. Unknown input, unavailable dependency or ambiguous state must fail closed.

For the first slice the only accepted input is one scenario identifier from a fixed allowlist. Arbitrary receipt JSON is intentionally out of scope.

### 3. Implement the smallest vertical slice

Change only the application adapter and required website integration. Reuse Core/SDK semantics directly. Do not duplicate security-critical logic in the dashboard.

### 4. Run targeted tests

The selected capability must have deterministic positive and negative tests. The valid control must reproduce frozen hashes. Negative cases must prove where the chain first rejects.

### 5. Run the full repository gate

A targeted pass is necessary but insufficient. Freeze the exact head, run canonical CI/full tests, and treat any head movement as invalidating prior exact-head evidence.

### 6. Skeptical/security review

Review the exact frozen head with at least one independent skeptical/security lane. Required questions include: can arbitrary input escape the allowlist; can browser state alter a verifier result; can an API request bypass authentication; can a failure be rendered as success; can a result be misrepresented as authorization, execution or financial safety?

### 7. Website integration

The website API must authenticate independently because `/api/*` is not protected merely by dashboard page routing. Use same-origin mutation protection, strict schema validation, request IDs, private/no-store responses, bounded time/size and a server-only adapter. The browser receives only the sanitized member-lab contract.

### 8. Preview E2E

On a preview deployment, test as an authenticated member:

1. open the POM-RX lab;
2. run the valid control and reproduce `reconciliation:matched` plus the frozen three receipt hashes;
3. run each negative scenario and observe the correct first rejected stage;
4. verify unauthenticated API access is rejected;
5. verify unknown scenario IDs are rejected;
6. verify no wallet/exchange prompt, secret handling or external transaction occurs.

### 9. Capture evidence

Record exact Git SHA, CI run, test matrix, preview URL, member E2E outcome, known limitations and any unresolved P0/P1/P2. Do not upgrade the readiness claim merely because the UI works.

### 10. Promote one capability or roll back

Only after the prior slice is green may the next capability be selected. Regressions or ambiguous behavior roll the slice back to the last trusted checkpoint.

Then repeat from **0. Snapshot**.

## Prototype milestones

### M0 — mapped baseline

Repository capabilities, active PR stacks, trust boundaries and website integration seam are known.

### M1 — reference-verifier member lab

The application adapter runs the actual frozen v0.1 reference verifier against four bounded scenarios. No external execution.

### M2 — authenticated dashboard API

`/api/pom-rx/lab` authenticates the member server-side, accepts only the scenario allowlist and returns the sanitized adapter result.

### M3 — dashboard E2E

`/[locale]/dashboard/lab` calls M2 instead of calculating the result locally. Preview E2E proves authentication, positive/negative cases and fail-closed behavior.

### M4 — strict-profile promotion

Replace the compatibility/reference verifier path with the strict verifier only after its complete artifact manifest, frozen support data, runtime canary and trusted policy-capability packaging are reliably available in the deployed server runtime. Do not approximate or copy strict semantics into the website.

### M5 — operational evidence lifecycle

Add exact authorization/Gate/execution evidence/observation/reconciliation one capability at a time. Keep external effects synthetic or local until a separate human promotion gate explicitly authorizes a testnet/burner exercise.

## Hard stop conditions

Stop the loop and do not promote when any of these is true:

- unresolved P0/P1/P2 on the exact candidate head;
- CI/full-suite failure;
- stale or ambiguous coordination state;
- authentication or origin protection can be bypassed;
- arbitrary member-controlled data reaches security-critical Core semantics before a separately reviewed bounded-ingress design exists;
- any UI/API wording implies authorization, external execution, audit, certification, profitability or financial safety beyond the evidence actually produced;
- the next step requires a private key, seed, exchange credential, funded wallet, mainnet transaction or meaningful funds without a separate explicit human gate.

## Maximum claim for the first website slice

`POM_RX_MEMBER_REFERENCE_VERIFIER_PROTOTYPE`

It means an authenticated member can exercise a bounded server-side reference-verifier demonstration through the SwissTokint dashboard. It does **not** mean production authorization, production security, external execution, wallet safety, financial safety, audit, certification or profitability.
