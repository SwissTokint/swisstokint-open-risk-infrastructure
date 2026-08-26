# POM-RX isolated strict runner

Status: M4b process-isolation prototype. This layer is a consumer boundary around the already-ratified strict verifier. It does not modify Core receipt semantics and does not authorize, execute, sign, submit, broadcast, or fund anything.

## Goal

The strict verifier should not run inside a general-purpose application/server process that may have loaded unrelated packages, preload hooks, mutable globals or broad environment state. M4b therefore creates a dedicated Node child process with a deliberately small interface:

```text
trusted host configuration
        +
allowlisted scenario id
        ↓
parent runner
        ↓
exact Node executable / shell=false / bounded stdin
        ↓
minimal child environment
        ↓
M4 byte bootstrap
        ↓
pinned fixture + pinned policy capability
        ↓
strict profiled verifier
        ↓
structural verdict projection
```

Process isolation reduces the amount of application state inherited by the verifier. It is **not** an operating-system sandbox, VM, container boundary, seccomp profile, privilege drop, or proof that a compromised parent process cannot bypass the runner entirely.

## Public boundary

`createPomRxStrictIsolatedRunner(trustedHostConfig)` consumes a trusted, server-owned configuration once and returns a frozen object exposing only:

```js
runner.runScenario(scenarioId)
```

The per-call surface cannot provide receipts, fixture paths, verifier options, policy contents, artifact paths, environment variables, Node arguments or execution hooks.

The current allowlist is intentionally tiny:

- `valid-control`;
- `action-continuity-mismatch`;
- `duplicate-receipt-id`.

Each scenario maps inside the child to a fixed repository fixture and a frozen Git blob identity. This is a demo/test corpus, not arbitrary verification ingress. The parent also pins the expected structural outcome of each scenario; the valid control must reproduce the exact three frozen receipt hashes and each negative case must expose its expected strict diagnostic.

## Trusted host configuration

The host config schema is `pom-rx-strict-isolated-runner-host-config/1` and contains only:

- absolute local verification-policy path;
- expected policy SHA-256;
- trusted canonical evaluation instant;
- M4 bootstrap host-preconditions object.

The M4 host preconditions must already state that immutable source identity, a clean controlled Node process, and an immutable/read-only runtime package filesystem have been independently established.

M4b does **not** turn those assertions into proof. Result projection therefore retains:

- `host_preconditions_proved=false`;
- `runner_source_identity_proved=false`;
- `node_runtime_integrity_proved=false`;
- `os_sandbox_proved=false`;
- `authorization_eligible=false`;
- `authorization_proved=false`;
- `external_execution_proved=false`;
- `financial_safety_proved=false`.

A caller must not derive the trusted host config from browser/user input.

The M4 measured 16-file strict artifact closure does **not** include the M4b parent or child runner source. Trust in M4b source therefore comes from the independently authenticated immutable package-source identity represented by the M4 host precondition, not from the strict artifact-manifest digest. M4b deliberately reports `runner_source_identity_proved=false` so that this distinction cannot be collapsed into the measured-artifact claim.

## Parent-process trust boundary

The parent runner may live inside a broad application process. M4b does not claim that parent process is trustworthy or uncompromised. A compromised parent can skip the runner, substitute the server-owned host config before runner creation, or return unrelated application data to its caller.

The security property supplied by M4b is narrower: when the reviewed parent implementation is invoked with independently trusted host configuration, the actual strict verification is delegated to the dedicated child under the bounded process contract below, and the parent validates the complete child projection before returning it.

## Child-process boundary

The parent starts `process.execPath` directly with:

- no shell;
- no inherited `process.execArgv`;
- no inherited environment;
- fixed `LANG=C.UTF-8`, `LC_ALL=C.UTF-8`, `TZ=UTC` only;
- bounded stdin/stdout/stderr buffers;
- fixed timeout;
- fixed internal child entrypoint.

The child fails closed unless:

- platform is Linux;
- `process.execArgv` is empty;
- no extra CLI argument exists;
- its environment key set is exactly the three fixed locale/timezone variables;
- `NODE_OPTIONS`, `NODE_PATH`, `NODE_V8_COVERAGE`, `LD_PRELOAD`, and `DYLD_INSERT_LIBRARIES` are absent.

The parent also fails closed on any unexpected child `stderr`, timeout, execution error, non-zero exit, malformed JSON, wrong schema, wrong scenario correlation, wrong M4 identity, wrong policy identity or unexpected scenario outcome.

This reduces preload/loader/environment attack surface. It does not prove the Node executable, built-ins, kernel, filesystem implementation or operating system itself is trustworthy. The result therefore reports `node_runtime_integrity_proved=false` and `os_sandbox_proved=false`.

## Import order

The child imports only Node built-ins statically. It validates the clean child boundary and parses the bounded request before importing any POM-RX module.

The first POM-RX module dynamically imported is:

```text
sdk/typescript/pom-rx-strict-package.mjs
```

The child then:

1. passes the explicit host-preconditions object into the M4 byte bootstrap;
2. requires measured artifact byte integrity and all explicit non-proof flags;
3. retrieves the frozen artifact-manifest host pins from M4;
4. reads the internally selected fixture and checks its frozen Git blob identity;
5. dynamically imports `sdk/typescript/pom-rx-profiled.mjs` only after bootstrap success;
6. creates a fresh single-use policy capability from the host-pinned policy, trusted evaluation instant and M4 manifest pin;
7. calls `verifyPomRxChainProfiled(...)` using the strict profile;
8. emits only a bounded structural verdict projection.

There is no fallback to `pom-rx/0.1` historical verification.

## Result boundary

A successful child response is schema `pom-rx-strict-isolated-runner-result/1` and includes only bounded evidence such as:

- selected scenario id;
- isolated/clean-child markers;
- measured artifact byte-integrity result;
- strict verifier profile/version/artifact identity;
- effective policy SHA-256;
- structural status and qualification;
- receipt hashes;
- diagnostic-code projection;
- explicit false trust/authorization/execution non-claims.

The parent validates the complete result before returning it. For the bounded scenarios, it also validates exact expected scenario evidence rather than accepting any syntactically valid strict result.

## Current platform boundary

M4b is Linux-only. This matches the hardened strict-production boundary currently exercised in GitHub-hosted CI. Other platforms must remain fail-closed until their process/filesystem metadata assumptions are explicitly specified and tested.

## Test boundary

`tests/pom-rx-strict-isolated-runner.node.test.mjs` covers:

- valid strict conformance in the isolated child with exact M4 identities and exact three control hashes;
- action-continuity nonconformance;
- duplicate-receipt-id nonconformance;
- arbitrary scenario/path rejection before spawn;
- inability to weaken an M4 host precondition;
- non-propagation of inherited `NODE_OPTIONS`, `NODE_PATH` and `LD_PRELOAD`;
- wrong policy pin fail-closed behavior;
- source assertion that M4 bootstrap is dynamically imported before the strict verifier and no POM-RX module is statically imported by the child;
- explicit false runner-source/Node-runtime/OS-sandbox non-proofs;
- unexpected child `stderr` fail-closed source assertion;
- npm package closure containing both runner entrypoints and all allowlisted fixtures.

The test harness passes `true` host-precondition assertions so the API path can be exercised in a normal mutable checkout. Those test booleans are explicitly **not** evidence that the test checkout meets a production immutability requirement.

## Promotion boundary

M4b can be considered a reusable strict-runner primitive only after exact-head CI, skeptical/security review, zero unresolved P0/P1/P2, and post-merge assurance.

Website activation remains a separate lot. A website/server consumer must provide a real independently pinned policy and trusted evaluation instant, establish the M4 host preconditions before runner creation, keep the package filesystem immutable through child execution, and preserve the bounded scenario/config boundary. M4b alone is not authorization, execution, sandboxing, runtime-integrity proof or financial safety.
