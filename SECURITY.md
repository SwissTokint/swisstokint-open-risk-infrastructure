# Security policy

## Supported scope

Security reports are welcome for the current `main` branch and the latest
published schemas. This repository is an experimental open-source prototype; it
has not completed an independent security audit and must not be used as the sole
control for live funds.

## Reporting

Please do not open a public issue for a suspected vulnerability that could
expose secrets, forge receipts, bypass validation or compromise a deployment.
Send a concise report to `contact@swisstokint.ch` with:

- affected component and version or commit;
- expected and observed behaviour;
- reproduction steps or a minimal proof of concept;
- potential impact;
- any suggested mitigation.

Do not include real exchange credentials, wallet seeds, personal data or
third-party secrets. We will acknowledge a complete report as soon as
practicable and coordinate disclosure after a fix is available.

## Deployment warning

The reference relay accepts a dedicated ingest secret from a mounted file or,
for compatibility, an environment variable. Operators must use a secret
manager, rotate credentials, restrict network egress and keep strategy inputs
local. Never give the relay an exchange credential, wallet seed, withdrawal
permission or trading authority. The public repository does not provide
custody, exchange connectivity or trade execution.

The minimum container controls and rotation process are defined in
[`docs/CONTAINER_AND_SECRET_SECURITY_BASELINE.md`](docs/CONTAINER_AND_SECRET_SECURITY_BASELINE.md).
