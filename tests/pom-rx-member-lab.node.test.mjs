import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPomRxMemberLabScenarios,
  POM_RX_MEMBER_LAB_SCHEMA_VERSION,
  runPomRxMemberLabScenario,
} from '../applications/enterprise-apis/member-lab/member-lab.mjs';

const EXPECTED_CONTROL_HASHES = [
  'be040c9939baeb3795499928ddc86ede2695c04b8ba2a178c21ce9b3e4d13f60',
  '3e73c5b454a60686e7c72f9bbe8803b85c253c176d5e114e66e4a2d0afd85da1',
  '638a30f42d412f8b7e84c9a8833b2e7c6b02761ee2dd43e4d24683ad03dfbfd3',
];

test('member lab publishes only the bounded scenario allowlist', () => {
  assert.deepEqual(
    getPomRxMemberLabScenarios().map(({ id }) => id),
    [
      'valid-chain',
      'missing-preflight-field',
      'execution-link-mismatch',
      'reconciliation-link-mismatch',
    ],
  );
});

test('member lab executes the frozen valid control through the POM-RX reference verifier', () => {
  const result = runPomRxMemberLabScenario('valid-chain');

  assert.equal(result.schema_version, POM_RX_MEMBER_LAB_SCHEMA_VERSION);
  assert.equal(result.verifier, 'pom-rx/0.1-reference');
  assert.equal(result.verdict, 'complete');
  assert.equal(result.status, 'reconciliation:matched');
  assert.deepEqual(result.receipt_hashes, EXPECTED_CONTROL_HASHES);
  assert.deepEqual(result.stages.map(({ verdict }) => verdict), ['pass', 'pass', 'pass']);
  assert.equal(result.authorization_proved, false);
  assert.equal(result.external_execution_proved, false);
  assert.equal(result.financial_safety_proved, false);
});

test('member lab fails closed when preflight is structurally incomplete', () => {
  const result = runPomRxMemberLabScenario('missing-preflight-field');

  assert.equal(result.verdict, 'rejected');
  assert.equal(result.status, null);
  assert.match(result.error, /missing or unknown fields/u);
  assert.deepEqual(result.stages.map(({ verdict }) => verdict), ['reject', 'not-run', 'not-run']);
});

test('member lab exposes the first actual hash-link rejection at execution', () => {
  const result = runPomRxMemberLabScenario('execution-link-mismatch');

  assert.equal(result.verdict, 'rejected');
  assert.match(result.error, /previous_receipt_hash does not match/u);
  assert.deepEqual(result.stages.map(({ verdict }) => verdict), ['pass', 'reject', 'not-run']);
});

test('member lab exposes the first actual hash-link rejection at reconciliation', () => {
  const result = runPomRxMemberLabScenario('reconciliation-link-mismatch');

  assert.equal(result.verdict, 'rejected');
  assert.match(result.error, /previous_receipt_hash does not match/u);
  assert.deepEqual(result.stages.map(({ verdict }) => verdict), ['pass', 'pass', 'reject']);
});

test('member lab rejects arbitrary scenario selection before verifier execution', () => {
  assert.throws(
    () => runPomRxMemberLabScenario('arbitrary-user-input'),
    /Unknown POM-RX member-lab scenario/u,
  );
});
