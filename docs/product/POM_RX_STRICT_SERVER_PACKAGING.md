# POM-RX strict server packaging contract

Status: M4 packaging/provenance prototype. This document does not promote POM-RX to an authorization, execution, wallet-safety, financial-safety, audit, certification, or production-readiness claim.

## Goal

A server consumer must be able to depend on the complete strict POM-RX runtime closure without copying Core semantics into an application repository. The package boundary must preserve the already-ratified strict verifier, its artifact manifest, Unicode support data, canonicalization canaries, historical receipt implementation dependencies, and the fresh trusted-policy capability requirement.

The intended deployment unit is the immutable `@swisstokint/open-risk-infrastructure` package source pinned by a package-manager integrity or an immutable Git commit. A mutable branch name is not sufficient provenance for a trusted deployment.

## Bootstrap trust boundary

Package code cannot prove the authenticity of the package source that supplied that same code. The host must therefore authenticate an immutable Git/package-manager source identity **before** trusting `sdk/typescript/pom-rx-strict-package.mjs` or its embedded pins. The bootstrap reports `package_source_identity_proved === false` and `immutable_source_pin_required === true` explicitly.

The bootstrap module imports only Node built-ins. It does not import or execute `pom-rx-profiled.mjs`, the strict verifier, the artifact scanner, the historical verifier, canonicalization code, policy code, or any other file in the measured POM-RX closure. Instead it authenticates the pinned manifest and all 16 declared artifact files as bytes, including the artifact-identity scanner itself.

The manifest file itself is also required to be a canonical single-link regular file and is measured with before/after file-identity checks before its pinned SHA-256 is accepted. This prevents an otherwise-identical symlink/hardlink manifest from silently changing the host-path assumptions passed later to the strict verifier.

The Node runtime and built-in implementations used to perform that measurement are part of the bootstrap TCB. The module captures the imported `crypto`, `fs`, `path` and URL functions immediately after module load to prevent later replacement of those exported functions from silently changing the measurement behavior. This does **not** prove the integrity of Node itself or detect a built-in/global poisoned before module evaluation. The contract therefore reports `clean_node_process_required === true` and `node_builtin_integrity_proved === false`. A host that cannot establish a clean, controlled bootstrap process must fail closed rather than treat the byte report as trusted evidence.

The package filesystem must already be immutable/read-only **before byte measurement begins** and must remain immutable through subsequent strict-module import/execution. This is a host property, not something package code can prove. `verifyPomRxStrictMeasuredArtifactBytes(...)` therefore requires an explicit host-preconditions object before it touches the package filesystem and reports `host_preconditions_proved === false`, `host_preconditions_required_before_measurement === true`, and `immutable_runtime_filesystem_required === true`. Passing booleans to that API is an assertion by the independently trusted host; it is not evidence that the package established those properties itself.

## Bootstrap algorithm

Only after the host has independently established immutable source identity, a clean Node process, and an immutable/read-only package filesystem does the bootstrap:

1. reject any missing, malformed or false host-precondition assertion before package filesystem measurement starts;
2. verify the manifest is a stable canonical single-link regular file;
3. authenticate the exact artifact-manifest bytes against a source-pinned SHA-256 constant;
4. validate the pinned manifest shape and frozen profile/version/implementation identity;
5. resolve every manifest path below the package root;
6. require every declared artifact entry to be a canonical, single-link regular file with the declared byte length;
7. hash every declared file and compare the bytes to the pinned manifest, including the artifact-identity scanner itself;
8. detect files changing during their own measurement using file identity/size/mtime checks as an additional defense-in-depth check;
9. return only `measured_artifact_bytes_integrity === "verified"` and `measured_artifact_code_executed === false`.

This closes the circular-trust issue found during skeptical review: the artifact scanner is never asked to attest its own bytes before those bytes have been independently authenticated. Requiring filesystem immutability before step 1 also closes the cross-entry TOCTOU activation-order gap where an already-measured file could otherwise be replaced while later entries were still being measured.

## Adversarial regression coverage

The M4 test suite builds isolated copies of the strict package closure and requires fail-closed behavior for:

- missing host preconditions;
- an immutable-source assertion that is not established;
- a clean-process assertion that is not established;
- an immutable-runtime-filesystem assertion that is not established;
- a same-length byte modification inside the artifact-identity scanner;
- a byte-substituted artifact manifest;
- a measured artifact replaced by a symlink to byte-identical trusted content;
- the artifact manifest itself replaced by a symlink to byte-identical trusted content.

These tests reproduce the class of attack behind the prior P1 instead of relying only on source inspection. The host-precondition tests do not pretend to prove OS-level immutability; they prove that the package contract cannot begin measurement unless the host has explicitly asserted that the required property is already active.

## Stable consumer boundary

The server activation sequence uses two package entrypoints, but they must not be statically imported together:

- independently pin/authenticate the package source, establish a clean controlled Node process, and place the package on an immutable/read-only filesystem that will remain immutable through strict execution;
- import **only** `sdk/typescript/pom-rx-strict-package.mjs` and call `verifyPomRxStrictMeasuredArtifactBytes(...)` with the explicit host-preconditions object;
- only after the byte bootstrap passes may the server dynamically import `sdk/typescript/pom-rx-profiled.mjs` for strict verification.

The bootstrap is provenance/control-plane code, not an alternate receipt verifier. It never calls `verifyPomRxChainProfiled`, never implements POM-RX receipt semantics, never creates a policy capability, and never offers historical-verifier fallback.

## Required activation sequence

A server host must:

1. pin the Open Risk package to an immutable source identity and verify that pin independently of package code;
2. establish an immutable/read-only package filesystem **before bootstrap measurement** and guarantee that the verified package files cannot change until strict execution is complete;
3. start/use a clean controlled Node bootstrap process with no untrusted pre-import code or preload hooks;
4. import only `sdk/typescript/pom-rx-strict-package.mjs`;
5. call `verifyPomRxStrictMeasuredArtifactBytes(...)` with exactly:

   ```js
   {
     schema_version: 'pom-rx-strict-bootstrap-host-preconditions/1',
     immutable_source_pin_established: true,
     clean_node_process_established: true,
     immutable_runtime_filesystem_established: true,
   }
   ```

   and set those values to `true` only after the host has independently established the properties they describe;
6. require `measured_artifact_bytes_integrity === "verified"`, `measured_artifact_code_executed === false`, `host_preconditions_required_before_measurement === true`, `host_preconditions_proved === false`, `node_builtin_integrity_proved === false`, and `package_source_identity_proved === false`;
7. obtain `{ artifactManifestPath, expectedArtifactManifestSha256 }` from `getPomRxStrictPackageHostPins()`;
8. dynamically import `sdk/typescript/pom-rx-profiled.mjs` only after steps 1-7 pass;
9. independently provide and pin a local verification policy file plus its SHA-256;
10. independently provide a trusted canonical evaluation instant;
11. create a **fresh single-use** capability with `withFreshPomRxPolicyCapability(...)` using those host pins;
12. call `verifyPomRxChainProfiled(...)` with `verificationProfile === POM_RX_V01_STRICT_PROFILE` inside that synchronous capability callback;
13. treat `structural_status` as structural evidence only. The strict verifier still returns `authorization_proved === false`.

The bootstrap must never generate the host-preconditions object from the currently observed runtime, generate a permissive policy from the currently observed runtime, self-approve a newly observed artifact, derive trust from a mutable branch, or fall back to `pom-rx/0.1` historical verification.

## Frozen identities for this lot

- strict profile: `pom-rx-v0.1/strict-errata-1`;
- strict verifier: `pom-rx-v0.1-strict-verifier/1`;
- artifact manifest SHA-256: `05c0f37091cd4aa6c97d0339cf785125e71424e3553c0d7545baf3ebf3eaca9f`;
- manifest-declared implementation artifact SHA-256: `72a187e56bba7d488e0ecb5510abba013b61322d1b599aa7d76b633bae5dc9eb`;
- measured manifest entries: 16.

`tests/pom-rx-strict-package.node.test.mjs` binds these values to the installed files, proves the scanner itself is treated as ordinary authenticated bytes, requires the explicit host preconditions before measurement, asserts the bootstrap imports no measured POM-RX code, keeps the Node bootstrap TCB explicit, exercises isolated adversarial tamper/symlink cases, and runs `npm pack --dry-run` to require every artifact-manifest entry in the distributable package.

## Promotion boundary

Passing M4 means the strict verifier has a reproducible byte-bootstrap and packaging closure suitable for a separately authenticated immutable server package in a clean controlled Node process. It does not mean the SwissTokint website is already running the strict profile. Website activation is a separate bounded lot that must pin the Open Risk source independently, establish the clean-process and immutable-filesystem preconditions **before** strict bootstrap measurement, provision a trusted local policy and evaluation-time source, configure Next.js/Vercel so the package is not bundled away and its support files are traced, and pass its own exact-head security/skeptical/E2E gates.
