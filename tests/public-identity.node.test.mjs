import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const opening = readme.slice(0, readme.indexOf('## Why it exists'));
const pomRxSection = readme.slice(readme.indexOf('## POM-RX risk execution receipts'), readme.indexOf('## Security boundary'));
const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ');

const approvedIdentityBlock = `This repository is one public technical research stream of Association
SwissTokint. It contains work on POM-RX v0.1, pre-execution control,
verifiable evidence and selected distributed-infrastructure experiments. It
does not define the full scope of the Association.

POM-RX v0.1 structurally checks a supplied receipt chain describing a declared
preflight, execution acknowledgement and reconciliation path. Financial
environments are test beds; Filecoin, Stellar and other chains are anchoring
or integration experiments.

This research is non-custodial: it does not execute for third parties or
receive exchange keys, and makes no token-sale or financial-performance claim.

Open infrastructure for deterministic receipt commitments and inspectable
risk-rule evaluation without publishing the private strategy.`;

const approvedPomRxLead = `POM-RX v0.1 is the domain-specific research layer above generic Proof of
Method receipts. It structurally checks a supplied receipt chain describing a
declared preflight, execution acknowledgement and reconciliation path, without
publishing strategy inputs, numeric limits or credentials.`;

test('the public repository opening keeps its research identity and POM-RX boundary explicit', () => {
  const normalizedOpening = normalizeWhitespace(opening);
  const normalizedPomRxSection = normalizeWhitespace(pomRxSection);
  const identityBlock = opening.slice(
    opening.indexOf('This repository is one public technical research stream'),
    opening.indexOf('This repository contains three interoperable building blocks:'),
  ).trim();
  const pomRxLead = pomRxSection.slice(
    pomRxSection.indexOf('POM-RX v0.1 is the domain-specific research layer'),
    pomRxSection.indexOf('```js'),
  ).trim();

  assert.equal(normalizeWhitespace(identityBlock), normalizeWhitespace(approvedIdentityBlock));
  assert.equal(normalizeWhitespace(pomRxLead), normalizeWhitespace(approvedPomRxLead));
  assert.doesNotMatch(normalizedOpening, /POM-RX[^.]*proves/i);
  assert.doesNotMatch(normalizedPomRxSection, /POM-RX[^.]*proves/i);
});
