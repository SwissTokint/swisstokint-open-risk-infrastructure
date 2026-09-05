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
The publisher also verifies that the PR base SHA is still the current `main`
commit immediately before it writes that status.

Every push to `main` changes the trust base. The base-owned workflow therefore
lists all open PRs targeting `main` and replaces each prior
exact-head result with `pending`. A PR must then be updated, reopened, marked
ready, or have its base edited so the trusted evaluation runs again against the
new base. An already-running evaluation whose base has become stale fails the
publisher's current-base check instead of producing fresh success evidence.

Candidate dependencies are installed with lifecycle scripts disabled. The
evaluated source is then reconstructed only from the exact checkout's tracked
file list after Git proves that no tracked byte drifted,
the target branch's security tests are overlaid, and the resulting tree is
mounted read-only into a non-root container with no network, no Linux
capabilities and `no-new-privileges`. A mandatory write probe proves the mount
is non-writable before the security tests run. A base-owned preload freezes the
shared strict-assert identity before any candidate module initializes. A
base-owned custom reporter requires one successful per-file summary for every
manifest entry, so assertion replacement, skipped tests or a candidate-triggered
early `process.exit(0)` cannot turn missing assertions into a successful gate.

The container image is an exact Node version and immutable OCI index digest.
Dependency lock entries are limited to integrity-pinned HTTPS artifacts from
the public npm registry before installation. Workflow files are parsed as YAML,
not approximated with line matching; the parser is exact-versioned in the
trusted base lockfile, installed separately, and overlaid onto the evaluation
tree so a candidate cannot substitute its implementation.

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

Changes to the trusted workflow, its test manifest, action pins, container
digest or ruleset are control-plane changes. Review them on the exact head,
retain both required checks, and obtain an independent approval before merge.

After a control-plane merge, require canonical `main` CI and the existing
exact-main status publisher to succeed on the resulting merge SHA before other
security work treats the new gate as trusted.
