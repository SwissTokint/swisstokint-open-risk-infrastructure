# POM-RX strict server packaging contract

Status: M4 packaging/provenance prototype. This document does not promote POM-RX to an authorization, execution, wallet-safety, financial-safety, audit, certification, or production-readiness claim.

## Goal

A server consumer must be able to depend on the complete strict POM-RX runtime closure without copying Core semantics into an application repository. The package boundary must preserve the already-ratified strict verifier, its artifact manifest, Unicode support data, canonicalization canaries, historical receipt implementation dependencies, and the fresh trusted-policy capability requirement.

The intended deployment unit is the immutable `@swisstokint/open-risk-infrastructure` package source pinned by a package-manager integrity or an immutable Git commit. A mutable branch name is not sufficient provenance for a trusted deployment.

## Stable consumer boundary

Server consumers use two existing/new entrypoints from the same installed package:

- `sdk/typescript/pom-rx-profiled.mjs` — the measured strict verifier and fresh policy-capability API;
- `sdk/typescript/pom-rx-strict-package.mjs` — package/provenance metadata, artifact host pins, and an integrity check for the complete **measured strict artifact closure**.

The packaging module deliberately does **not** call `verifyPomRxChainProfiled`, does not implement receipt semantics, and is not an alternate verifier. It only measures and exposes the package closure that the strict verifier already requires.

The packaging helper itself is outside the measured strict-verifier implementation artifact. Therefore its result must never be described as proof of the entire npm/Git package identity. Its output explicitly reports `package_source_identity_proved === false` and `immutable_source_pin_required === true`. The server host must authenticate the package source independently before trusting the helper or its embedded manifest pin.

## Required activation sequence

A server host must:

1. pin the Open Risk package to an immutable source identity;
2. call `verifyPomRxStrictMeasuredArtifactIntegrity()` and require `measured_artifact_integrity === "verified"` while also requiring `package_source_identity_proved === false` and satisfying the separate immutable source pin;
3. obtain `{ artifactManifestPath, expectedArtifactManifestSha256 }` from `getPomRxStrictPackageHostPins()`;
4. independently provide and pin a local verification policy file plus its SHA-256;
5. independently provide a trusted canonical evaluation instant;
6. create a **fresh single-use** capability with `withFreshPomRxPolicyCapability(...)` using those host pins;
7. call `verifyPomRxChainProfiled(...)` with `verificationProfile === POM_RX_V01_STRICT_PROFILE` inside that synchronous capability callback;
8. treat `structural_status` as structural evidence only. The strict verifier still returns `authorization_proved === false`.

The package helper must never generate a permissive policy from the currently observed runtime, self-approve a newly observed artifact, derive trust from a mutable branch, or fall back to `pom-rx/0.1` historical verification.

## Frozen package identities for this lot

- strict profile: `pom-rx-v0.1/strict-errata-1`;
- strict verifier: `pom-rx-v0.1-strict-verifier/1`;
- artifact manifest SHA-256: `05c0f37091cd4aa6c97d0339cf785125e71424e3553c0d7545baf3ebf3eaca9f`;
- measured implementation artifact SHA-256: `72a187e56bba7d488e0ecb5510abba013b61322d1b599aa7d76b633bae5dc9eb`.

`tests/pom-rx-strict-package.node.test.mjs` binds these values to the actual installed files and also runs `npm pack --dry-run` to prove that every artifact-manifest entry is present in the distributable package. Presence in the pack is not itself a source-authenticity proof; runtime artifact measurement and the independent immutable source pin are both required.

## Promotion boundary

Passing M4 means the strict verifier has a reproducible server packaging/provenance boundary. It does **not** mean the SwissTokint website is already running the strict profile. Website activation is a separate bounded lot that must pin the Open Risk dependency, provision a trusted local policy and evaluation-time source, validate the target Node/ICU/Unicode runtime, and pass its own exact-head security/skeptical/E2E gates.
