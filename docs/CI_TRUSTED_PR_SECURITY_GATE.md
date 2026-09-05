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

Candidate dependencies are installed with lifecycle scripts disabled. The
evaluated source is then reconstructed only from the exact checkout's tracked
file list after Git proves that no tracked byte drifted,
the target branch's security tests are overlaid, and the resulting tree is
mounted read-only into a non-root container with no network, no Linux
capabilities and `no-new-privileges`. A mandatory write probe proves the mount
is non-writable before the security tests run. A base-owned custom reporter
requires one successful per-file summary for every manifest entry, so a
candidate-triggered early `process.exit(0)` cannot turn missing assertions into
a successful gate.

The container image is an exact Node version and immutable OCI index digest.
Dependency lock entries are limited to integrity-pinned HTTPS artifacts from
the public npm registry before installation.

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
