import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const charter = readFileSync("docs/product/POM_RX_PRODUCT_CHARTER.md", "utf8");

// These tests guard candidate-charter wording only. They do not execute or
// independently verify the POM-RX verifier, Witness, Gate, or reconciliation.

const forbiddenDagrPeerClaims = [
  /DAGR is (?:an? )?(?:peer|coequal|equal-rank|first-class|primary|principal|separate|second|standalone|autonomous) (?:product|offering)/i,
  /POM-RX and DAGR are (?:peer|coequal|equal-rank|separate|standalone) products/i,
  /parallel DAGR SDK (?:is|will be|exists)/i,
  /(?:build|develop|introduce|launch|maintain|ship)(?:s|ed|ing)? (?:an? )?parallel DAGR SDK/i,
];

const affirmativeGlobalScore =
  /global (?:security )?(?:score|rating)[^.\n]{0,40}\b\d{1,3}\s*%/i;

const affirmativeControlledClaim =
  /POM-RX (?:is |is now |is fully )?(?:compatible|production(?:-ready)?|independently verified|a decentralized network|blocks execution|secures transactions)/i;

test("product charter keeps POM-RX as the principal product and DAGR as a profile", () => {
  assert.match(charter, /Status: `CANDIDATE_NON_NORMATIVE_DRAFT`/);
  assert.match(charter, /POM-RX is the sole principal technical product/);
  assert.match(charter, /POM-RX Governance Profile\s*[\u2014\u2013-]\s*DAGR/);
  assert.match(
    charter,
    /DAGR profile is subordinate to POM-RX and no parallel SDK is introduced/,
  );
  assert.match(charter, /not an autonomous\s+audit product/);
  assert.match(charter, /parallel DAGR SDK/);
  for (const forbiddenPeerClaim of forbiddenDagrPeerClaims) {
    assert.doesNotMatch(charter, forbiddenPeerClaim);
  }
});

test("product charter guards reject semantic DAGR peer and parallel SDK variants", () => {
  for (const forbiddenClaim of [
    "DAGR is a coequal product",
    "DAGR is a first-class offering",
    "POM-RX and DAGR are equal-rank products",
    "SwissTokint will build a parallel DAGR SDK",
    "The programme is launching a parallel DAGR SDK",
  ]) {
    assert.equal(
      forbiddenDagrPeerClaims.some((pattern) => pattern.test(forbiddenClaim)),
      true,
      `expected guard to reject: ${forbiddenClaim}`,
    );
  }
});

test("product charter separates artifacts and preserves fail-closed claims", () => {
  assert.match(charter, /Proof Receipt, POM-RX, and the POM-RX Guided Educational Simulator are distinct/);
  assert.match(charter, /only the public TypeScript POM-RX verifier is currently evidenced/);
  assert.match(charter, /`steps=\[\]` or `steps=null` is `CI_INFRA_FAILURE`/);
  assert.match(charter, /No executable downstream Gate is currently proved/);
  assert.match(charter, /known continuity and positive-outcome defects remain open/);
  assert.match(charter, /not an independent verifier or protocol implementation/);
  assert.match(charter, /SwissTokint\/swisstokint-open-risk-infrastructure/);
  assert.match(charter, /pinned by version, commit, and\s+content hash/);
  assert.match(
    charter,
    /must not maintain a second normative verifier, schema, or\s+policy implementation/,
  );
  assert.match(charter, /must not depend on a mutable `main` branch at\s+runtime/);
  assert.match(
    charter,
    /public `SwissTokint\/swisstokint-open-risk-infrastructure` repository is the\s+sole future normative source for POM-RX/,
  );
  assert.match(
    charter,
    /POM-RX[\s\S]*Core protocol[\s\S]*Profiles[\s\S]*Governance \/ DAGR[\s\S]*Optional anchor adapters/,
  );
  assert.doesNotMatch(charter, /\uFFFD/);
  assert.match(
    charter,
    /POM-RX\r?\n├── Core protocol[\s\S]*│   └── Governance \/ DAGR[\s\S]*└── Demonstrations and verification tools/,
  );
  assert.match(
    charter,
    /Experimental artifacts do not become POM-RX Core or prove interoperability/,
  );
  assert.match(charter, /6f421c540e9a47a971840847547c9bfc951e1d46/);
  assert.match(charter, /d2783fbd35ef2ac28b73607b75ea8fa3c7ae643b/);
  assert.match(charter, /175d4ddfab8e7efa035a34793205fd53f1e15984/);
});

test("product charter keeps sensitive, financial, token, and institutional gates closed", () => {
  assert.match(charter, /SWTK remains `SWTK_NOT_YET_NECESSARY`/);
  assert.match(charter, /token-dependent narrative belongs to the active\s+product or public funding story/);
  assert.match(charter, /no financial transaction/);
  assert.match(charter, /only current human contacts[^\n]+Mehdi\s+Mauroux and Guy Nambou/);
  assert.match(charter, /AI tools are not founders, members, employees/);
  assert.match(charter, /signed statutes and\s+minutes have been verified/);
  assert.match(charter, /Human approval is mandatory before/);
  assert.match(charter, /not a protocol specification, release, audit,/);
  assert.match(charter, /not an autonomous\s+audit product, certification/);
  assert.match(charter, /neither merged nor production-ready/);
  assert.match(charter, /submitting funding material or claiming adoption/);
  assert.match(charter, /No global\s+percentage score is authorized/);
  assert.doesNotMatch(charter, affirmativeGlobalScore);
  assert.doesNotMatch(charter, affirmativeControlledClaim);
  assert.match(
    charter,
    /critical `unknown` or `not_tested` result\s+must keep the profile incomplete/,
  );
});

test("product charter guards reject affirmative score and controlled claims", () => {
  assert.match("A global security score is 97%", affirmativeGlobalScore);
  for (const forbiddenClaim of [
    "POM-RX is production-ready",
    "POM-RX is independently verified",
    "POM-RX is a decentralized network",
    "POM-RX blocks execution",
    "POM-RX secures transactions",
  ]) {
    assert.match(forbiddenClaim, affirmativeControlledClaim);
  }
});
