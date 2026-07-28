# Contributing

SwissTokint welcomes bounded, reviewable contributions to the open Proof of
Method protocol.

## Before opening a pull request

1. Open or reference an issue describing the problem and the security or
   interoperability impact.
2. Keep private strategies, credentials, account data, wallet addresses and
   personal data outside the repository and fixtures.
3. Add deterministic tests for every protocol change.
4. Run `npm ci` and `npm test`.
5. Update the normative specification and JSON Schema when a wire format
   changes.

Protocol changes must not silently alter an existing schema identifier. Create
a new version, retain historical fixtures and document migration behaviour.

## Review boundary

No pull request may add custody, trade execution, private-key handling, token
sale logic or claims of investment performance without a separately approved
security and legal design. Suspected vulnerabilities must follow
[SECURITY.md](SECURITY.md), not a public issue.

Contributions are accepted under the repository's dual MIT or Apache-2.0
licence. Documentation contributions are accepted under CC BY-SA 4.0.
