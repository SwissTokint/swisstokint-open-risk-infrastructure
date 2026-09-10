# Trusted pull-request security gate

## Security objective

The repository keeps two independent pre-merge properties:

1. `CI / test` evaluates GitHub's canonical push or pull-request merge candidate.
2. `Trusted PR security / trusted-exact-head` evaluates the literal pull-request
   head using a workflow definition loaded from the target branch.

One check must never be represented as proving both properties.

## Trust boundary

The trusted workflow uses `pull_request_target` only as a base-owned controller.
It has read-only repository access plus the narrow `statuses: write` permission,
persists no checkout credential and does not pass a GitHub token or secret to
candidate code. Two trusted host-side steps publish pending and terminal states
directly on the exact head under the fixed `pom-rx/trusted-exact-head` context.
The publisher verifies that the captured base SHA is still the current `main`
commit before and after publication. Terminal `success` and `failure` also
require a live PR lookup on both sides of the POST. The controller supplies
`EXPECTED_PR_NUMBER` and `EXPECTED_HEAD_REPOSITORY`; the publisher captures
them with the head/base SHAs and run before making requests. The API response
must identify that exact open, unmerged PR, targeting `main` in the expected
repository with the captured base SHA and source repository/head SHA. Missing,
malformed or changed identity prevents terminal publication.

Any error after a POST attempt, including a changed or unavailable PR, triggers
an attempt to restore `pending` on the originally captured head and run, then
fails the job. Recovery failure preserves both errors. Pending is downgrade-only
and does not require PR metadata, so main-advance invalidation still works after
closure, retargeting or source-repository deletion. Its existing main-ref checks
and three-attempt per-head retry budget remain unchanged.

Every push to `main` changes the trust base. The base-owned workflow therefore
lists all open PRs targeting `main` and replaces each prior
exact-head result with `pending`. Each head is attempted independently with
bounded retries, and the job reports an aggregate failure only after it has
attempted every listed head. A PR must then be updated, reopened, marked
ready, or have its base edited so the trusted evaluation runs again against the
new base. An already-running evaluation whose base has become stale fails the
publisher's current-base check instead of producing fresh success evidence.
When a PR is synchronized or closed, a separate base-owned job also attempts to
replace the departing head's prior result with `pending`.
The same invalidation runs when an `edited` event shows that a PR has been
retargeted away from `main`. That invalidator always checks out the
controller from `refs/heads/main`, never from the PR's new destination branch.
Only superseded exact-head evaluation jobs share a cancelling concurrency
group. A closed or retargeted-away PR also schedules a token-free job in that
same group, cancelling an evaluation even though no replacement evaluation is
eligible to start. Departure invalidators remain outside the group and are not
cancelled by a rapid retarget or push.

These API operations are not atomic and do not prove permanent revocation.
The post-publication PR lookup detects an observed departure even if a separate
invalidation reached GitHub before an acknowledged terminal write. A delayed,
unconfirmed remote POST can still settle after recovery, and later PR changes
remain possible after the final lookup. Consumers must revalidate current PR,
base/head and trusted-run provenance when making their decision. Neither these
checks nor a successful pending response establishes controller bootstrap or
authentic test execution; those remain separate release gates.

Before any candidate-controlled dependency or test module is evaluated, the
controller byte-compares its workflow, all trusted manifests, every manifest
test, the status publishers, the loader/preloads/reporters, action-pinning
tests, package scripts, and the reviewed YAML artifact binding against `main`.
Any in-band control-plane drift is rejected. This deliberately means that a
future trusted-control change must use the documented out-of-band bootstrap
review path; an ordinary PR cannot rewrite its own judge.

The coverage validator requires the isolated-runner suite and all three Wallet
Guard prototype suites (`prototype-server`, `prototype-browser-rpc` and
`prototype-durable-journal`) in the positive security manifest. It rejects even
matching base/candidate manifests that omit a required suite or route it only
to another lane. Every declared test still receives the same base-byte check;
the three prototype suites retain their existing assertions and source bytes.
They are selected by the existing per-file positive runner with its existing
runtime restrictions, not granted a separate permissive lane.

This requirement establishes mandatory membership and byte identity only;
the validator continues to return `executionProved: false`. Compatible execution
under the pinned container, authenticated child completion, and controller
bootstrap remain separate gates. In particular, the server bootstrap and
journal process-lifecycle fixtures use child processes, and the browser bridge
uses a VM context. A manifest entry does not extend the parent reporter's
authentication to those execution contexts. A failure in those gates must remain
blocking; this inventory change does not authorize test skips or weaker runtime
permissions.

Candidate dependencies are installed with lifecycle scripts disabled. The
evaluated source is then reconstructed only from the exact checkout's tracked
file list after Git proves that no tracked byte drifted,
the target branch's security tests and controller scripts are overlaid, and the
candidate's remaining tracked product scripts are preserved for the tests that
exercise them. The trusted risk wrapper imports tracked TypeScript source
directly, so it does not depend on an untracked `dist/` artifact. The resulting tree is
mounted read-only into a non-root container with no network, no Linux
capabilities and `no-new-privileges`. A mandatory write probe proves the mount
is non-writable before the security tests run. The Node permission model denies
WASI and native addons, while the explicit CLI flags also disable addon loading.
A base-owned preload freezes the shared strict-assert identity and the two
successful early-exit paths (`process.exit` and `process.reallyExit`) before any
candidate module initializes. It also blocks process replacement through
`process.execve`, locks `process.emit` and the lifecycle methods as own
non-configurable properties, removes inherited child preload variables, and
prevents their later mutation. CommonJS and ESM export tables for the built-ins
used by the trusted tests are included in the integrity snapshot. A base-owned
preload also locks the container's explicit executable search path, runtime
platform/version identity and both working-directory APIs; candidate code
cannot redirect a trusted child command, forge a platform branch, or redirect a
relative fixture read into writable `/tmp` content. A base-owned
loader injects a primordial-integrity
checkpoint as the first executable statement of every manifest test; because
static dependencies evaluate first, candidate initialization that replaces a
global binding or intrinsic descriptor is detected before any test body can use
the poisoned observation. The loader also binds test-side reads to captured
primordial facades. The authoritative runner starts Node with
`--frozen-intrinsics`, so candidate code cannot install a one-shot forged
instance method, use it to falsify an assertion, and restore the original
descriptor before the post-test checkpoint. A literal self-restoring poison
regression must remain non-zero without a trusted pass marker. Tests whose
purpose is to mutate JavaScript intrinsics execute in a separate immutable,
authenticated non-frozen manifest lane as well as canonical CI. They retain the
same base-owned loader, preload, direct reporter and one-container-per-file
boundary without disabling the mutations they are designed to exercise.
Process-level test isolation
is deliberately disabled. An `afterEach` checkpoint therefore re-verifies the
captured globals, prototypes and built-in exports after candidate execution, so
persistent instance-method poisoning is rejected before the next test:
the base-owned reporter therefore consumes Node's direct in-process lifecycle
stream rather than deserializing candidate-controlled worker stdout. It requires
at least one direct pass event from every manifest file, validates the sole final
aggregate and rejects any failing lifecycle event, process-level file summary,
duplicate summary, skipped test or todo. The regression corpus includes the
literal V8-framed-summary plus `process.exit(0)` attack so attacker-supplied
stdout cannot enter the evidence stream or hide the subsequent real failure.
Before candidate evaluation starts, the one-shot reporter also makes the
`Readable.push` and `EventEmitter.emit` methods used by the direct lifecycle
channel non-replaceable. It installs a fail-closed exit guard, seals that exact
`exit` listener against later registration, replacement or removal, and only
arms success after the authenticated stream has ended. A regression replaces
`Readable.push`, rewrites failures and the aggregate, then tries to reset
`process.exitCode` from a later exit listener; the trusted runner must remain
red. These controls keep lifecycle evidence and terminal process state outside
candidate-controlled mutation surfaces while the test modules share a process.
The trusted test transformer is installed with Node's synchronous registration
API before the preload seals both `node:module.register` and
`node:module.registerHooks` in the CommonJS and synchronized ESM views. Worker
permission is then unnecessary and withheld. Candidate code therefore cannot
register a later hook that substitutes genuine source for the remaining
base-owned manifest files; a three-file regression proves two unconditional
later failures cannot be rewritten into genuine-looking passes.
Each manifest file also runs in a fresh container, selected from the immutable
base manifest by the trusted host loop. Cross-file module caches, background
children and mutated process state therefore do not survive into the next
security test file. The manifest covers the base-owned security, protocol,
proof, public-identity and wallet-guard regression suites; candidate changes to
those test bytes are rejected before execution. Child-process permission remains necessary for specific
base-owned regressions, so the preload makes `process.execve` non-replaceable
and fail-closed alongside `process.exit` and `process.reallyExit`. The pre-import
transport regressions run their non-frozen child source through a minimal
base-owned child manifest and the same direct lifecycle reporter; inherited
`NODE_TEST_CONTEXT` is removed, and the child has its own explicit permission
model. A literal child `process.exit(0)` attempt must remain non-zero without a
trusted pass marker. The process-replacement regression has the same
fail-closed requirement.

The reporter accepts only the reviewed Linux-only skip in the strict activation
suite and the two reviewed compatibility skips: the Windows-only metadata case
and the source-binding case that requires host `git`. Every other skip or any
additional skip remains a failure. It validates the exact source path and test
name for every accepted skip, not only the aggregate count, while the preload
makes `process.platform` non-configurable before candidate initialization. The
remaining host-independent compatibility
corpus runs in the authenticated, frozen trusted runner; candidate imports
cannot terminate it successfully before direct lifecycle evidence is complete.
Host-tool scenarios that require `git` or `python3` stay in canonical required
CI rather than the minimal pinned Node container. The trusted control-plane
verifier prevents a candidate from weakening that CI workflow or its package
commands and byte-authenticates the reviewed host-tool test files against
`main` before candidate evaluation.

The intentionally vulnerable v0.1 integrity baseline uses a separate immutable
one-file manifest and a direct lifecycle reporter. Success requires exactly the
seven reviewed assertion failures plus the one unmodified green control; TAP
text emitted by candidate code is never parsed as evidence.

### Native Promise data preparation

The positive frozen lane loads the base-owned
`scripts/trusted-promise-data-preload.cjs` through `--require`, before Node
freezes intrinsics. It verifies and makes the native
`Promise.prototype.constructor` and `.then` data properties non-writable and
non-configurable. Node consequently preserves those data properties instead of
creating derived-override accessors. An ESM `--import` occurs too late for this
preparation on the reviewed Node 22 startup path. The preloader is part of the
immutable control plane and is copied from the trusted base; it is not added to
the intrinsic-mutation, child-source or expected-red lanes.

This runner ordering is version-specific: Node 22.23.2 preloads before freezing
with `--test --experimental-test-isolation=none`. Node 24.19.0 defers the
preload in that mode until after freezing and therefore fails closed with this
preparation. Ordinary application startup and process-isolated test startup on
Node 24.19.0 do support preparation. Do not infer in-process runner compatibility
from those successful modes or change the frozen image version without checking
the actual startup sequence.

The transport independently checks native function sources, the intrinsic
same-realm prototype relation, Proxy rejection, the species getter and absent
setter, and exact captured descriptors on every runtime check. Its supported
descriptor profiles are ordinary, two-field prepared, and prepared then frozen.
Global `Promise` and its `.prototype` property retain their original shape.
Unprepared frozen accessors and mixed profiles fail closed. There is no runtime
registration token or accessor-source exception. Preparation after transport
initialization still counts as descriptor drift.

This startup contract requires a clean application-owned process and trusted
Node built-ins, as the transport already requires. Pinning removes assignment
overrides of these two inherited properties on derived objects; callers needing
those overrides are outside this prepared transport profile. Ordinary imports
do not run the preloader or change global descriptors.

The new compatibility regression in canonical CI checks all three supported
profiles, unsupported startup ordering, and the unchanged first loopback server
integration under prepared frozen Node. These benign local checks do not attest
every prototype test, nested child, browser VM, the container isolation layer,
or first installation of the trusted controller. Those execution and bootstrap
gates remain separate. All existing P1 fixtures and four manifest files retain
their bytes and expected outcomes.

Canonical CI pins Node to 22.23.2, matching the reviewed trusted container
version, and also executes that single unchanged server integration
with the positive lane's `isolation=none`, permission flags, loader, assertion
preload and direct reporter. This required compatibility step records the Node
version. Its candidate-owned CI execution is a regression check, not proof of
base-owned controller authority or complete manifest execution.

The container image is an exact Node version and immutable OCI index digest.
Dependency lock entries are limited to integrity-pinned HTTPS artifacts from
the public npm registry before installation. Workflow files are parsed as YAML,
not approximated with line matching; the parser is exact-versioned in the
trusted base lockfile, installed separately, and overlaid onto the evaluation
tree so a candidate cannot substitute its implementation.

### Callback transport test children

The two callback transport regression children use the base-owned
`tests/helpers/trusted-test-child.mjs` launcher, imported before candidate
dependencies. It captures the native spawn function, executable and encoding
and assertion operations at bootstrap. Callers supply only bounded source;
the loader, assertion preload, reporter, manifest, working directory and
resource limits are fixed. The child receives an explicit environment without
inherited startup controls, and the parent environment is never modified.

These children remain non-frozen and use strict unhandled-rejection handling.
Their original source and final asynchronous turn are unchanged. The launcher
requires normal exit, no spawn error, and exactly the file and suite completion
records from the existing one-shot direct reporter. Completion also depends on
the existing preload and reporter lifecycle guard; matching text alone is not
authentication or operating-system isolation.

The helper and its benign integration tests are immutable control-plane files.
One positive manifest entry adds those tests; no existing entry or P1 fixture
is removed. This change covers the two callback launch sites only. Other child
processes, the isolated runner's protected-parent-environment test, browser VM
completion and controller bootstrap still require their separate gates.

Canonical CI also requires this complete benign launcher suite in a prepared
frozen Node 22.23.2 parent with the positive lane's permission, loader, preload
and direct reporter settings. Its children still start non-frozen. This checks
runtime integration, including the protected parent environment, without
claiming exact-container execution or base-owned controller authority.

## Bootstrap and ruleset activation

The pull request that first adds this workflow cannot use the new workflow as
evidence about itself because `pull_request_target` loads only workflows already
present on the target branch. That bootstrap merge therefore requires an
out-of-band independent review or an existing external required check. Do not
claim that candidate-controlled `CI / test` proves this first merge.

After the workflow is present on `main`, update the active default-branch
ruleset in one administrative operation:

- keep strict current-base enforcement enabled;
- continue requiring `test` for merge-candidate compatibility;
- additionally require the `pom-rx/trusted-exact-head` commit status;
- require at least one approving review from someone other than the author;
- require all review conversations to be resolved;
- retain deletion and non-fast-forward protection.

The repository currently has only the `SwissTokint` maintainer account. Under
the owner's explicit one-account bootstrap exception, the approval threshold
therefore remains zero until a genuinely distinct maintainer is added. This is
a recorded residual governance risk: owner review and automated review must not
be described as independent approval. Raise the threshold to one as soon as a
distinct maintainer can provide the approval required above.

The built-in `GITHUB_TOKEN` still identifies every workflow as GitHub Actions.
The trusted manifest rejects any additional workflow that requests
`statuses: write`, while separate base-owned regressions constrain the two
intentional status publishers. Before granting any second account permission to
push same-repository branches, provision a dedicated GitHub App identity behind
a protected environment and bind the required trusted check to that app. Do not
treat the shared GitHub Actions identity as safe against a future collaborator
who can author workflows.

If a real independent security team is created, make the trusted workflow,
test manifest and security tests CODEOWNERS-protected and require that team's
approval. Do not name a placeholder or single author as the sole code owner.

## Change rule

Changes to the trusted workflow, its test manifests, trusted scripts or tests,
action pins, container digest, package command plane, reviewed parser binding,
or ruleset are control-plane changes. The live gate rejects such changes
in-band. Prepare them through a separate bootstrap path, review the exact head,
retain both required checks, and obtain an independent approval before merge.

After a control-plane merge, require canonical `main` CI and the existing
exact-main status publisher to succeed on the resulting merge SHA before other
security work treats the new gate as trusted.
