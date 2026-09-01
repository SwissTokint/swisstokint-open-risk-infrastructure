import assert from 'node:assert/strict';
import { chmod, mkdtemp, readdir, readlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createReferenceDurableClaimStore } from '../core/gate/reference-durable-claim-store.mjs';
import { createReferenceDurableSingleUseGateHarness } from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (c) => c.repeat(64);
function bindingInput(index) {
  const s = String(index).padStart(4, '0');
  return {
    binding_profile: 'pom-rx-core-reference/0.1', run_id: `run-durable-lifecycle-${s}`,
    agent_ref: `agent-durable-lifecycle-${s}`, subject_ref: `subject-durable-lifecycle-${s}`,
    method_hash: h('1'), policy_hash: h('2'), action_commitment: h('3'), context_commitment: h('4'),
    preflight_receipt_hash: h('5'), witness_ack_hash: h('6'), source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`, verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1', implementation_artifact_sha256: h('7'),
    effective_verification_policy_sha256: h('8'), issued_at: '2026-08-30T12:00:00.000Z',
    expires_at: '2026-08-30T12:00:30.000Z',
  };
}
function observedFrom(e, overrides = {}) {
  return { binding_profile: e.binding.binding_profile, action_commitment: e.binding.action_commitment,
    context_commitment: e.binding.context_commitment, prepared_execution: { operation: 'durable-lifecycle-control' }, ...overrides };
}
function clock() { let i = 0; const v = ['2026-08-30T12:00:01.000Z', '2026-08-30T12:00:02.000Z']; return () => v[Math.min(i++, v.length - 1)]; }
async function countTarget(target) {
  if (process.platform !== 'linux') return 0;
  const entries = await readdir('/proc/self/fd'); let count = 0;
  for (const entry of entries) { try { if (await readlink(`/proc/self/fd/${entry}`) === target) count += 1; } catch {} }
  return count;
}

test('nonterminal paths keep RESERVED tombstones without retaining child fds', { skip: process.platform !== 'linux', concurrency: false }, async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-abandon-fd-'));
  let rejectEvidence; let unknownEvidence; let mode = 'reject';
  const harness = createReferenceDurableSingleUseGateHarness({ rootDir, trustedClock: clock(),
    observeBinding: async () => mode === 'reject' ? observedFrom(rejectEvidence, { action_commitment: h('9') }) : observedFrom(unknownEvidence),
    executeDownstream: () => Promise.reject(new Error('ambiguous downstream channel')) });
  try {
    const rejected = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(1), { witnessValidUntil: '2026-08-30T12:01:00.000Z' }); rejectEvidence = rejected.evidence;
    await assert.rejects(harness.gate.consume(rejected.capability, { raw: true }));
    assert.equal(harness.testAuthority.inspectCapabilityStateForTest(rejected.capability), 'REJECTED');
    assert.equal((await harness.testAuthority.inspectDurableStateForTest(rejected.capability)).state, 'RESERVED');
    assert.equal(await countTarget(path.join(rootDir, rejected.evidence.binding.capability_id)), 0);
    mode = 'unknown';
    const unknown = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(2), { witnessValidUntil: '2026-08-30T12:01:00.000Z' }); unknownEvidence = unknown.evidence;
    await assert.rejects(harness.gate.consume(unknown.capability, { raw: true }));
    assert.equal(harness.testAuthority.inspectCapabilityStateForTest(unknown.capability), 'CONSUMED_UNKNOWN');
    assert.equal((await harness.testAuthority.inspectDurableStateForTest(unknown.capability)).state, 'RESERVED');
    assert.equal(await countTarget(path.join(rootDir, unknown.evidence.binding.capability_id)), 0);
  } finally { await harness.close().catch(() => {}); await rm(rootDir, { recursive: true, force: true }); }
});

test('reentrant awaited close fails closed without self-deadlock', { concurrency: false }, async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-reentrant-close-'));
  let evidence; let harness; let reentrantError = null;
  harness = createReferenceDurableSingleUseGateHarness({ rootDir, trustedClock: clock(),
    observeBinding: async () => { try { await harness.close(); } catch (error) { reentrantError = error; } return observedFrom(evidence); },
    executeDownstream: () => ({ accepted: true }) });
  try {
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(3), { witnessValidUntil: '2026-08-30T12:01:00.000Z' }); evidence = issued.evidence;
    const result = await Promise.race([harness.gate.consume(issued.capability, { raw: true }), new Promise((_, reject) => setTimeout(() => reject(new Error('deadlocked')), 750))]);
    assert.deepEqual(result, { accepted: true });
    assert.equal(reentrantError?.code, 'POMRX_GATE_E_REENTRANT_CLOSE');
    assert.equal(harness.testAuthority.inspectCapabilityStateForTest(issued.capability), 'CONSUMED_SUCCESS');
    await harness.close();
  } finally { await rm(rootDir, { recursive: true, force: true }); }
});

test('metadata-only root drift reports invalidity but releases verified owned fd', { skip: process.platform !== 'linux', concurrency: false }, async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-root-mode-drift-')); await chmod(rootDir, 0o700);
  const store = createReferenceDurableClaimStore({ rootDir });
  try {
    const claim = await store.claim({ capabilityId: `cap-${'c'.repeat(32)}`, authorizationCommitment: h('d') });
    await store.abandon(claim.handle); assert.equal(await countTarget(rootDir), 1); await chmod(rootDir, 0o755);
    await assert.rejects(store.close(), (error) => error?.code === 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
    assert.equal(await countTarget(rootDir), 0);
  } finally { await chmod(rootDir, 0o700).catch(() => {}); await store.close().catch(() => {}); await rm(rootDir, { recursive: true, force: true }); }
});
