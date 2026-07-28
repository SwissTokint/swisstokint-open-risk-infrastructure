# Filecoin Open Grant 2159: readiness record

Status: proposal submitted, not awarded

Proposal: `filecoin-project/devgrants#2159`

Submitted: 27 July 2026

Requested amount: USD 49,500

## Non-negotiable boundary

The proposal states that grant-funded work begins only after both parties sign
an agreement. This repository therefore labels the current CAR/CID work as a
small, self-funded pre-grant capability prototype. It is not a completed
milestone, an invoice or a request for retroactive reimbursement.

## Eligibility matrix

| Criterion | Evidence | Status |
| --- | --- | --- |
| Public open source | Public repository, reproducible `npm test` workflow | Met |
| MIT and Apache-2.0 | `LICENSE-MIT`, `LICENSE-APACHE`, SPDX package metadata | Met |
| Self-managed team | Repository-owned roadmap, CI, security and contribution policy | Met; named delivery owners still need confirmation |
| Filecoin utility | Deterministic CAR, root CID, injected Synapse prepare/upload/download boundary | Prototype evidence |
| Retrieval focus | Byte-for-byte retrieval verification and explicit availability roadmap | Prototype evidence |
| Security | Exact schemas, sensitive-field minimisation, CID recomputation, tamper tests | Met for prototype; independent audit pending |
| Measurable milestones | Three dated, priced milestones in proposal 2159 | Met in proposal |
| No premature grant claim | README and this record distinguish submission from award | Met |

## Evidence now available

- deterministic CARv1 output for the public three-receipt fixture;
- stable manifest root CID
  `bafkreid35libc4fqwf7wjssalgjd7vfdff6cu7akwek4enqmx4u3fxl53e`;
- independent verification of manifest CID, receipt CIDs and Merkle proofs;
- rejection of unknown source fields and unreferenced CAR blocks;
- tamper test that flips a stored byte and must fail;
- Synapse adapter that requires explicit confirmation, refuses hidden funding
  transactions and verifies downloaded bytes;
- dual code licensing plus CC BY-SA 4.0 documentation notice.

## Proposed funded milestones

The submitted budget remains the controlling plan:

| Milestone | Deliverables after agreement | Target | Budget |
| --- | --- | --- | ---: |
| M1 | Normative bundle profile, complete TypeScript and Python builders, conformance fixtures and local verifier | 15 Nov 2026 | USD 14,500 |
| M2 | Calibration Filecoin upload/retrieval, PieceCID-manifest mapping, availability verifier and selective-disclosure workflow | 15 Jan 2027 | USD 20,000 |
| M3 | 100,000-receipt benchmark, independent reproduction, operational documentation and tagged release | 15 Mar 2027 | USD 15,000 |

The current prototype reduces execution risk but does not satisfy those
deliverables: it has no Python CAR builder, no real Calibration PieceCID, no
100,000-receipt report and no independent reproducer.

## Review risks and actions

1. **Team evidence.** Publicly identify the second delivery owner or provide the
   name and profile privately to the grant reviewer.
2. **Technical sponsor.** Ask a Filecoin storage or Synapse maintainer for a
   short architecture review; do not imply endorsement without written consent.
3. **User evidence.** Obtain two letters of intent from bot, agent or audit-tool
   teams willing to test portable proof retrieval.
4. **Differentiation.** Keep the scope on high-frequency deterministic receipt
   batches, cross-language parity and selective proof disclosure, not generic
   agent logging.
5. **Testnet evidence.** Perform a real Calibration upload only when the grant
   boundary and wallet authority are clear; retain PieceCID, provider copies,
   transaction references and repeated retrieval results.
6. **Independent reproduction.** Reserve a clean-room reviewer who can build,
   retrieve and verify without SwissTokint infrastructure.

## Reviewer response pack

When Filecoin asks for clarification, respond with:

- the exact commit and tagged pre-grant prototype version;
- CI result and dependency audit;
- this readiness matrix;
- architecture and privacy boundary from
  `docs/FILECOIN_EVIDENCE_BUNDLE_V0_1.md`;
- named milestone owners and availability;
- letters of intent;
- a statement that no grant-funded milestone work or reimbursable cost began
  before agreement.
