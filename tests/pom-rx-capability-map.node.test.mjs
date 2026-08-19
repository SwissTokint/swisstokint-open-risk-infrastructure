import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const capabilityMap = readFileSync('docs/product/POM_RX_CAPABILITY_MAP.md', 'utf8');
const skepticGate = readFileSync(
  'docs/project-management/pom-rx-core/POM_RX_SKEPTICAL_REVIEW_GATE.md',
  'utf8',
);
const automationPolicy = readFileSync(
  'docs/project-management/pom-rx-core/POM_RX_AUTOMATION_POLICY.md',
  'utf8',
);

test('capability map keeps one non-normative POM-RX hierarchy with site-aligned application blocks', () => {
  assert.match(capabilityMap, /CURRENT_INFORMATION_ARCHITECTURE \/ NON_NORMATIVE/);
  assert.match(capabilityMap, /POM-RX is the single principal technical product/);
  for (const heading of [
    'Payments and financial operations',
    'AI agents',
    'APIs and enterprise systems',
    'Cybersecurity',
    'Blockchain and digital assets',
  ]) {
    assert.match(capabilityMap, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(capabilityMap, /Application blocks are not mutually exclusive/);
  assert.match(capabilityMap, /must not duplicate\s+or fork Core canonicalization, hashing, verifier, Witness or Gate semantics/s);
  assert.match(capabilityMap, /`POM-RX Wallet Guard` is one application profile inside this block/);
  assert.match(capabilityMap, /primary product home is\s+Blockchain and digital assets, while its defensive control model also overlaps\s+the Cybersecurity block/s);
  assert.match(capabilityMap, /POM-RX Governance Profile — DAGR/);
  assert.match(capabilityMap, /Do not mass-move frozen protocol or fixture files/);
});

test('skeptical gate requires two review-control passes and an explicit falsification verdict', () => {
  assert.match(skepticGate, /Review pass 1/);
  assert.match(skepticGate, /Control pass 1/);
  assert.match(skepticGate, /Skeptical challenge/);
  assert.match(skepticGate, /Review pass 2/);
  assert.match(skepticGate, /Control pass 2/);
  assert.match(skepticGate, /SKEPTIC_PASS/);
  assert.match(skepticGate, /SKEPTIC_CONDITIONAL/);
  assert.match(skepticGate, /SKEPTIC_BLOCK/);
  assert.match(skepticGate, /The writer can never serve as\s+the skeptic/i);
});

test('Prime automation policy binds capability blocks and skeptic review before merge', () => {
  assert.match(automationPolicy, /POM_RX_SKEPTICAL_REVIEW_GATE\.md/);
  assert.match(automationPolicy, /full five-stage gate is satisfied/);
  assert.match(automationPolicy, /Wallet Guard.*one POM-RX\s+application profile/s);
  assert.match(automationPolicy, /no stale historical PR is merged wholesale/);
  assert.match(automationPolicy, /no domain reputation, UI warning, blockchain anchor or simulation result may\s+substitute for the execution-side Gate/s);
});
