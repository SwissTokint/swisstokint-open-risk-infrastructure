import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyPomRxChain } from '../../../sdk/typescript/pom-rx.mjs';

export const POM_RX_MEMBER_LAB_SCHEMA_VERSION = 'pom-rx-member-lab/0.1';

const EXPECTED_CONTROL_HASHES = Object.freeze([
  'be040c9939baeb3795499928ddc86ede2695c04b8ba2a178c21ce9b3e4d13f60',
  '3e73c5b454a60686e7c72f9bbe8803b85c253c176d5e114e66e4a2d0afd85da1',
  '638a30f42d412f8b7e84c9a8833b2e7c6b02761ee2dd43e4d24683ad03dfbfd3',
]);

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const validControlPath = path.resolve(
  moduleDirectory,
  '../../../fixtures/pom-rx/v0.1-compat/1/chains/valid-control.json',
);

const SCENARIOS = Object.freeze([
  Object.freeze({
    id: 'valid-chain',
    title: 'Valid three-receipt control chain',
    description: 'Frozen public control fixture. The reference verifier should reach reconciliation:matched.',
  }),
  Object.freeze({
    id: 'missing-preflight-field',
    title: 'Missing required preflight field',
    description: 'The control fixture is copied and method_hash is removed from preflight before verification.',
  }),
  Object.freeze({
    id: 'execution-link-mismatch',
    title: 'Execution hash-link mismatch',
    description: 'The execution receipt is made to reference the wrong preflight hash.',
  }),
  Object.freeze({
    id: 'reconciliation-link-mismatch',
    title: 'Reconciliation hash-link mismatch',
    description: 'The reconciliation receipt is made to reference the wrong execution hash.',
  }),
]);

const scenarioIds = new Set(SCENARIOS.map(({ id }) => id));

function cloneControlChain() {
  const parsed = JSON.parse(readFileSync(validControlPath, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new TypeError('Frozen POM-RX member-lab control fixture is invalid');
  }
  return parsed;
}

function buildScenarioChain(scenarioId) {
  if (!scenarioIds.has(scenarioId)) {
    throw new TypeError('Unknown POM-RX member-lab scenario');
  }

  const chain = cloneControlChain();
  if (scenarioId === 'missing-preflight-field') {
    delete chain[0].method_hash;
  } else if (scenarioId === 'execution-link-mismatch') {
    chain[1].previous_receipt_hash = '0'.repeat(64);
  } else if (scenarioId === 'reconciliation-link-mismatch') {
    chain[2].previous_receipt_hash = '0'.repeat(64);
  }
  return chain;
}

function verifyStages(chain) {
  const stages = [];
  let blocked = false;

  for (let index = 0; index < chain.length; index += 1) {
    const phase = ['preflight', 'execution', 'reconciliation'][index];
    if (blocked) {
      stages.push(Object.freeze({
        id: phase,
        verdict: 'not-run',
        status: null,
        reason: null,
      }));
      continue;
    }

    const verification = verifyPomRxChain(chain.slice(0, index + 1), { allowPartial: true });
    if (verification.ok) {
      stages.push(Object.freeze({
        id: phase,
        verdict: 'pass',
        status: verification.status,
        reason: null,
      }));
      continue;
    }

    stages.push(Object.freeze({
      id: phase,
      verdict: 'reject',
      status: null,
      reason: verification.error,
    }));
    blocked = true;
  }

  return Object.freeze(stages);
}

function hashesMatchPinnedControl(receiptHashes) {
  return receiptHashes.length === EXPECTED_CONTROL_HASHES.length
    && receiptHashes.every((hash, index) => hash === EXPECTED_CONTROL_HASHES[index]);
}

function rejectedControlDriftResult(scenarioId) {
  return Object.freeze({
    schema_version: POM_RX_MEMBER_LAB_SCHEMA_VERSION,
    scenario_id: scenarioId,
    verifier: 'pom-rx/0.1-reference',
    verdict: 'rejected',
    status: null,
    error: 'Pinned POM-RX control verification drifted',
    receipt_hashes: Object.freeze([]),
    stages: Object.freeze([]),
    authorization_proved: false,
    external_execution_proved: false,
    financial_safety_proved: false,
  });
}

export function getPomRxMemberLabScenarios() {
  return SCENARIOS;
}

export function runPomRxMemberLabScenario(scenarioId) {
  const chain = buildScenarioChain(scenarioId);
  const verification = verifyPomRxChain(chain, { allowPartial: false });

  if (scenarioId === 'valid-chain'
    && (!verification.ok || !hashesMatchPinnedControl(verification.receipt_hashes))) {
    return rejectedControlDriftResult(scenarioId);
  }

  return Object.freeze({
    schema_version: POM_RX_MEMBER_LAB_SCHEMA_VERSION,
    scenario_id: scenarioId,
    verifier: 'pom-rx/0.1-reference',
    verdict: verification.ok ? 'complete' : 'rejected',
    status: verification.ok ? verification.status : null,
    error: verification.ok ? null : verification.error,
    receipt_hashes: Object.freeze([...verification.receipt_hashes]),
    stages: verifyStages(chain),
    authorization_proved: false,
    external_execution_proved: false,
    financial_safety_proved: false,
  });
}
