import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const charter = readFileSync("docs/product/POM_RX_PRODUCT_CHARTER.md", "utf8");

test("product charter keeps POM-RX as the principal product and DAGR as a profile", () => {
  assert.match(charter, /Status: `CANDIDATE_NON_NORMATIVE_DRAFT`/);
  assert.match(charter, /POM-RX is the sole principal technical product/);
  assert.match(charter, /POM-RX Governance Profile — DAGR/);
  assert.match(charter, /not an autonomous\n+audit product/);
  assert.match(charter, /parallel DAGR SDK/);
  assert.doesNotMatch(charter, /DAGR (is|and POM-RX are) a peer product/i);
});

test("product charter separates artifacts and preserves fail-closed claims", () => {
  assert.match(charter, /Proof Receipt, POM-RX, and the POM-RX Guided Educational Simulator are distinct/);
  assert.match(charter, /only the public TypeScript POM-RX verifier is currently evidenced/);
  assert.match(charter, /`steps=\[\]` or `steps=null` is `CI_INFRA_FAILURE`/);
  assert.match(charter, /No executable downstream Gate is currently proved/);
  assert.match(charter, /known continuity and positive-outcome defects remain open/);
  assert.match(charter, /not an independent verifier or protocol implementation/);
  assert.match(charter, /SwissTokint\/swisstokint-open-risk-infrastructure/);
  assert.match(charter, /pinned by version, commit, and\n+content hash/);
  assert.match(charter, /6f421c540e9a47a971840847547c9bfc951e1d46/);
  assert.match(charter, /d2783fbd35ef2ac28b73607b75ea8fa3c7ae643b/);
  assert.match(charter, /175d4ddfab8e7efa035a34793205fd53f1e15984/);
});

test("product charter keeps sensitive, financial, token, and institutional gates closed", () => {
  assert.match(charter, /SWTK remains `SWTK_NOT_YET_NECESSARY`/);
  assert.match(charter, /token-dependent narrative belongs to the active\n+product or public funding story/);
  assert.match(charter, /no financial transaction/);
  assert.match(charter, /only current human contacts[^\n]+Mehdi\n+Mauroux and Guy Nambou/);
  assert.match(charter, /AI tools are not founders, members, employees/);
  assert.match(charter, /signed statutes and\n+minutes have been verified/);
  assert.match(charter, /Human approval is mandatory before/);
  assert.match(charter, /not a protocol specification, release, audit,/);
  assert.match(charter, /not an autonomous\n+audit product, certification/);
  assert.match(charter, /neither merged nor production-ready/);
  assert.match(charter, /submitting funding material or claiming adoption/);
});
