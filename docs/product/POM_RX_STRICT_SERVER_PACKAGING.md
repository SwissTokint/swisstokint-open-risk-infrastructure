# POM-RX strict server packaging contract

Status: M4 packaging/provenance prototype. This document does not promote POM-RX to an authorization, execution, wallet-safety, financial-safety, audit, certification, or production-readiness claim.

## Goal

A server consumer must be able to depend on the complete strict POM-RX runtime closure without copying Core semantics into an application repository. The package boundary must preserve the already-ratified strict verifier, its artifact manifest, Unicode support data, canonicalization canaries, historical receipt implementation dependencies, and the fresh trusted-policy capability requirement.

The intended deployment unit is the immutable `@swisstokint/open-risk-infrastructure` package source pinned by a package-manager integrity or an immutable Git commit. A mutable branch name is not sufficient provenance for a trusted deployment.

## Bootstrap trust boundary

`src`-level package code cannot prove the authenticity of the package source that supplied that same code. The host must therefore authenticate an immutable Git/package-manager source identity **before** trusting `sdk/typescript/pom-rx-strict-package.mjs` or its embedded pins. The bootstrap reports `package_source_identity_proved === false` and `immutable_source_pin_required === true` explicitly.

The bootstrap module imports only Node built-ins. It does not import or execute `pom-rx-profiled.mjs`, the strict verifier, the artifact scanner, the historical verifier, canonicalization code, policy code, or any other file in the measured POM-RX closure. Instead it:

1. authenticates the exact artifact-manifest bytes against a source-pinned SHA-256 constant;
2. validates the pinned manifest shape and frozen profile/version/implementation identity;
3. resolves every manifest path below the package root;
4. requires every declared artifact entry to be a canonical, single-link regular file with the declared byte length;
5. hashes every declared file and compares the bytes to the pinned manifest, including the artifact-identity scanner itself;
6. detects a file changing during its own measurement using file identity/size/mtime checks;
7. returns only `measured_artifact_bytes_integrity === "verified"` and `measured_artifact_code_executed === false`.

This closes the bootstrap loop identified during skeptical review: the artifact scanner is never asked to attest its own bytes before those bytes have been independently authenticated.

The strict runtime still requires an immutable/read-only package filesystem between bootstrap measurement and subsequent strict-module import/execution. This prototype does not prove that filesystem property and therefore reports `immutable_runtime_filesystem_required === true`.

## Stable consumer boundary

The server activation sequence uses two package entrypoints, but they must not be statically imported together:

- first import **only** `sdk/typescript/pom-rx-strict-package.mjs` and run `verifyPomRxStrictMeasuredArtifactBytes()`;
- only after the byte bootstrap passes and the host's immutable-source/filesystem preconditions are satisfied may the server dynamically import `sdk/typescript/pom-rx-profiled.mjs` for strict verification.

The bootstrap is provenance/control-plane code, not an alternate receipt verifier. It never calls `verifyPomRxChainProfiled`, never implements POM-RX receipt semantics, never creates a policy capability, and never offers historical-verifier fallback.

## Required activation sequence

A server host must:

1. pin the Open Risk package to an immutable source identity and verify that pin independently of package code;
2. import only `sdk/typescript/pom-rx-strict-package.mjs`;
3. call `verifyPomRxStrictMeasuredArtifactBytes()` and require `measured_artifact_bytes_integrity === "verified"`, `measured_artifact_code_executed === false`, and `package_source_identity_proved === false`;
4. guarantee the verified package filesystem cannot change between bootstrap measurement and strict execution;
5. obtain `{ artifactManifestPath, expectedArtifactManifestSha256 }` from `getPomRxStrictPackageHostPins()`;
6. dynamically import `sdk/typescript/pom-rx-profiled.mjs` only after steps 1-5 pass;
7. independently provide and pin a local verification policy file plus its SHA-256;
8. independently provide a trusted canonical evaluation instant;
9. create a **fresh single-use** capability with `withFreshPomRxPolicyCapability(...)` using those host pins;
10. call `verifyPomRxChainProfiled(...)` with `verificationProfile === POM_RX_V01_STRICT_PROFILE` inside that synchronous capability callback;
11. treat `structural_status` as structural evidence only. The strict verifier still returns `authorization_proved === false`.

The bootstrap must never generate a permissive policy from the currently observed runtime, self-approve a newly observed artifact, derive trust from a mutable branch, or fall back to `pom-rx/0.1` historical verification.

## Frozen identities for this lot

- strict profile: `pom-rx-v0.1/strict-errata-1`;
- strict verifier: `pom-rx-v0.1-strict-verifier/1`;
- artifact manifest SHA-256: `05c0f37091cd4aa6c97d0339cf785125e71424e3553c0d7545baf3ebf3eaca9f`;
- manifest-declared implementation artifact SHA-256: `72a187e56bba7d488e0ecb5510abba013b61322d1b599aa7d76b633bae5dc9eb`;
- measured manifest entries: 16.

`tests/pom-rx-strict-package.node.test.mjs` binds these values to the installed files, proves the scanner itself is treated as ordinary authenticated bytes, asserts the bootstrap imports no measured POM-RX code, and runs `npm pack --dry-run` to require every artifact-manifest entry in the distributable package.

## Promotion boundary

Passing M4 means the strict verifier has a reproducible **byte-bootstrap and packaging closure** suitable for a separately authenticated immutable server package. It does not mean the SwissTokint website is already running the strict profile. Website activation is a separate bounded lot that must pin the Open Risk source independently, preserve the package filesystem on the deployed runtime, provision a trusted local policy and evaluation-time source, configure Next.js/Vercel so the package is not bundled away and its support files are traced, and pass its own exact-head security/skeptical/E2E gates.
