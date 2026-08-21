import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';
import {
  PomRxGateError,
} from '../core/gate/reference-single-use-gate.mjs';
import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const h = (character) => character.repeat(64);
const WITNESS_VALID_UNTIL = '2026-08-21T04:01:00.000Z';

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-durable-gate-intrinsic-0001',
    agent_ref: 'agent-durable-gate-intrinsic-01',
    subject_ref: 'subject-durable-gate-intrinsic-01',
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
    issued_at: '2026-08-21T04:00:00.000Z',
    expires_at: '2026-08-21T04:00:30.000Z',
  };
}

function observedFrom(evidence, overrides = {}) {
  return {
    binding_profile: evidence.binding.binding_profile,
    action_commitment: evidence.binding.action_commitment,
    context_commitment: evidence.binding.context_commitment,
    prepared_execution: { request: 'prepared-intrinsic-control' },
    ...overrides,
  };
}

async function tempDir(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

test('post-import Object.create poisoning cannot redirect the composed durable root', async () => {
  const configuredRoot = await tempDir('pom-rx-durable-gate-configured-');
  const substitutedRoot = await tempDir('pom-rx-durable-gate-substituted-');
  const originalObjectCreate = Object.create;

  let evidence;
  let downstreamCalls = 0;
  let harness;
  try {
    Object.create = function poisonedObjectCreate(prototype) {
      const value = originalObjectCreate(prototype);
      if (prototype === null) {
        Object.defineProperty(value, 'rootDir', {
          configurable: true,
          enumerable: true,
          get() {
            return substitutedRoot;
          },
          set() {
            // A vulnerable live Object.create-based bootstrap snapshot loses the configured root here.
          },
        });
      }
      return value;
    };

    harness = createReferenceDurableSingleUseGateHarness({
      rootDir: configuredRoot,
      trustedClock: (() => {
        const values = ['2026-08-21T04:00:01.000Z', '2026-08-21T04:00:02.000Z'];
        let index = 0;
        return () => values[Math.min(index++, values.length - 1)];
      })(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: async () => {
        downstreamCalls += 1;
        return 'ok';
      },
    });
  } finally {
    Object.create = originalObjectCreate;
  }

  try {
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    assert.equal(await harness.gate.consume(issued.capability, { request: 'control' }), 'ok');
    assert.equal(downstreamCalls, 1);

    const durableInput = {
      capabilityId: issued.evidence.binding.capability_id,
      authorizationCommitment: issued.evidence.authorization_commitment,
    };
    const configured = await createReferenceDurableClaimStore({ rootDir: configuredRoot })
      .inspect(durableInput);
    const substituted = await createReferenceDurableClaimStore({ rootDir: substitutedRoot })
      .inspect(durableInput);

    assert.equal(configured.state, 'CONSUMED_SUCCESS');
    assert.equal(substituted.state, 'ABSENT');
  } finally {
    await Promise.all([
      rm(configuredRoot, { recursive: true, force: true }),
      rm(substitutedRoot, { recursive: true, force: true }),
    ]);
  }
});

test('post-import WeakMap replacement cannot rewrite the inner Gate authorization binding', async () => {
  const rootDir = await tempDir('pom-rx-durable-gate-weakmap-');
  const OriginalWeakMap = globalThis.WeakMap;
  let evidence;
  let downstreamCalls = 0;

  class PoisonedWeakMap {
    constructor() {
      this.inner = new OriginalWeakMap();
    }

    get(key) {
      return this.inner.get(key);
    }

    set(key, value) {
      if (value
          && value.state === 'AVAILABLE'
          && value.binding?.action_commitment === h('3')) {
        this.inner.set(key, {
          ...value,
          binding: {
            ...value.binding,
            action_commitment: h('9'),
          },
        });
      } else {
        this.inner.set(key, value);
      }
      return this;
    }
  }

  let harness;
  try {
    globalThis.WeakMap = PoisonedWeakMap;
    harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: (() => {
        const values = ['2026-08-21T04:00:01.000Z', '2026-08-21T04:00:02.000Z'];
        let index = 0;
        return () => values[Math.min(index++, values.length - 1)];
      })(),
      observeBinding: async () => observedFrom(evidence, { action_commitment: h('9') }),
      executeDownstream: async () => {
        downstreamCalls += 1;
        return 'must-not-run';
      },
    });
  } finally {
    globalThis.WeakMap = OriginalWeakMap;
  }

  try {
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;
    assert.equal(evidence.binding.action_commitment, h('3'));

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'binding-substitution' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_BINDING_MISMATCH'),
    );
    assert.equal(downstreamCalls, 0);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'REJECTED',
    );
    assert.equal(
      (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
      'RESERVED',
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
