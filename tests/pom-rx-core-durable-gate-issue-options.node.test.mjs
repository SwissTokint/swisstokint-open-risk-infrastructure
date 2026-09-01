import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const ISSUED_AT = '2026-08-30T12:00:00.000Z';
const EXPIRES_AT = '2026-08-30T12:00:30.000Z';
const TOO_SHORT_WITNESS = '2026-08-30T12:00:10.000Z';
const VALID_WITNESS = '2026-08-30T12:01:00.000Z';

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-durable-options-0001',
    agent_ref: 'agent-durable-options-01',
    subject_ref: 'subject-durable-options-01',
    method_hash: h('1'),
    policy_hash: h('2'),
    action_commitment: h('3'),
    context_commitment: h('4'),
    preflight_receipt_hash: h('5'),
    witness_ack_hash: h('6'),
    source_key_id: `ed25519-${'a'.repeat(32)}`,
    witness_key_id: `ed25519-${'b'.repeat(32)}`,
    verification_profile: 'pom-rx-v0.1/strict-errata-1',
    verifier_version: 'pom-rx-v0.1-strict-verifier/1',
    implementation_artifact_sha256: h('7'),
    effective_verification_policy_sha256: h('8'),
    issued_at: ISSUED_AT,
    expires_at: EXPIRES_AT,
  };
}

async function createHarness() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-options-'));
  const harness = createReferenceDurableSingleUseGateHarness({
    rootDir,
    trustedClock: () => '2026-08-30T12:00:01.000Z',
    observeBinding: async () => {
      throw new Error('observer must not run during issuance regression');
    },
    executeDownstream: async () => {
      throw new Error('downstream must not run during issuance regression');
    },
  });
  return { rootDir, harness };
}

test('durable authority rejects Proxy issueOptions before inner witness destructuring', async () => {
  const { rootDir, harness } = await createHarness();
  let getCalls = 0;

  const underlying = { witnessValidUntil: TOO_SHORT_WITNESS };
  const proxy = new Proxy(underlying, {
    get(target, key, receiver) {
      if (key === 'witnessValidUntil') {
        getCalls += 1;
        return VALID_WITNESS;
      }
      return Reflect.get(target, key, receiver);
    },
  });

  try {
    // Baseline: the real own-data value is too short for the binding expiry.
    assert.throws(() => {
      harness.testAuthority.issueReferenceAuthorizationForTest(
        bindingInput(),
        underlying,
      );
    });

    // Predecessor behavior destructured through the Proxy and used the longer
    // trap-selected witness cutoff. The durable boundary must reject the Proxy
    // before any get trap can participate in authorization issuance.
    assert.throws(
      () => harness.testAuthority.issueReferenceAuthorizationForTest(
        bindingInput(),
        proxy,
      ),
      /issueOptions must be a non-Proxy plain object/u,
    );
    assert.equal(getCalls, 0);

    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput(),
      { witnessValidUntil: VALID_WITNESS },
    );
    assert.ok(issued.capability);
    assert.equal(
      issued.evidence.binding.expires_at,
      EXPIRES_AT,
    );
  } finally {
    await harness.close();
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('durable authority rejects accessor issueOptions without invoking the getter', async () => {
  const { rootDir, harness } = await createHarness();
  let getterCalls = 0;
  const options = {};
  Object.defineProperty(options, 'witnessValidUntil', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return VALID_WITNESS;
    },
  });

  try {
    assert.throws(
      () => harness.testAuthority.issueReferenceAuthorizationForTest(
        bindingInput(),
        options,
      ),
      /witnessValidUntil must be an enumerable data property/u,
    );
    assert.equal(getterCalls, 0);
  } finally {
    await harness.close();
    await rm(rootDir, { recursive: true, force: true });
  }
});
