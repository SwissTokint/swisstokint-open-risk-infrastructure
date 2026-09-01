import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  open,
  readdir,
  readlink,
  rename,
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

const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const h = (character) => character.repeat(64);

async function tempDir(prefix) {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor) OBJECT_DEFINE_PROPERTY(target, key, descriptor);
  else delete target[key];
}

async function countFdTargetsContaining(fragment) {
  const entries = await readdir('/proc/self/fd');
  let matches = 0;
  for (let index = 0; index < entries.length; index += 1) {
    try {
      const target = await readlink(`/proc/self/fd/${entries[index]}`);
      if (target.includes(fragment)) matches += 1;
    } catch {
      // Entries may disappear while /proc/self/fd is inspected.
    }
  }
  return matches;
}

function bindingInput() {
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: 'run-exact-head-regression-0001',
    agent_ref: 'agent-exact-head-regression',
    subject_ref: 'subject-exact-head-regression',
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
    issued_at: '2026-08-30T12:00:00.000Z',
    expires_at: '2026-08-30T12:00:30.000Z',
  };
}

function expectGateCode(error, code) {
  assert.ok(error instanceof PomRxGateError);
  assert.equal(error.code, code);
  return true;
}

test('captured identifier validation rejects traversal even after RegExp exec mutation', async (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd confinement regression');
    return;
  }

  const rootDir = await tempDir('pom-rx-regexp-root-');
  const foreignRoot = await tempDir('pom-rx-regexp-foreign-');
  const foreignHandle = await open(foreignRoot, 'r');
  const originalExec = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(RegExp.prototype, 'exec');
  const store = createReferenceDurableClaimStore({ rootDir });
  try {
    OBJECT_DEFINE_PROPERTY(RegExp.prototype, 'exec', {
      configurable: true,
      enumerable: false,
      writable: true,
      value() {
        return ['forced-match'];
      },
    });

    await assert.rejects(
      store.claim({
        capabilityId: `../${foreignHandle.fd}/escaped`,
        authorizationCommitment: h('9'),
      }),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_INVALID');
        return true;
      },
    );
  } finally {
    restoreDescriptor(RegExp.prototype, 'exec', originalExec);
  }

  try {
    assert.deepEqual(await readdir(foreignRoot), []);
  } finally {
    await store.close().catch(() => {});
    await foreignHandle.close();
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(foreignRoot, { recursive: true, force: true }),
    ]);
  }
});

test('close releases an owned root descriptor even when the configured path identity drifted', async (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux descriptor lifecycle regression');
    return;
  }

  const rootDir = await tempDir('pom-rx-close-drift-');
  const movedRoot = `${rootDir}-moved`;
  const store = createReferenceDurableClaimStore({ rootDir });
  try {
    await store.inspect({
      capabilityId: `cap-${'c'.repeat(32)}`,
      authorizationCommitment: h('d'),
    });
    await rename(rootDir, movedRoot);
    await mkdir(rootDir, { mode: 0o700 });
    assert.ok(await countFdTargetsContaining(movedRoot) >= 1);

    await assert.rejects(
      store.close(),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
        return true;
      },
    );
    assert.equal(await countFdTargetsContaining(movedRoot), 0);
    await store.close();
  } finally {
    await store.close().catch(() => {});
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(movedRoot, { recursive: true, force: true }),
    ]);
  }
});

test('ambiguous async result delivery cannot be persisted as a false durable error', async () => {
  const rootDir = await tempDir('pom-rx-result-ambiguity-');
  const originalThen = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'then');
  let evidence;
  let releaseDownstream;
  let signalDownstream;
  const entered = new Promise((resolve) => { signalDownstream = resolve; });
  const barrier = new Promise((resolve) => { releaseDownstream = resolve; });
  let sideEffects = 0;

  const harness = createReferenceDurableSingleUseGateHarness({
    rootDir,
    trustedClock: (() => {
      const values = [
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })(),
    observeBinding: async () => ({
      binding_profile: evidence.binding.binding_profile,
      action_commitment: evidence.binding.action_commitment,
      context_commitment: evidence.binding.context_commitment,
      prepared_execution: { request: 'prepared-control' },
    }),
    executeDownstream: async () => {
      sideEffects += 1;
      signalDownstream();
      await barrier;
      return { accepted: true };
    },
  });

  try {
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(
      bindingInput(),
      { witnessValidUntil: '2026-08-30T12:01:00.000Z' },
    );
    evidence = issued.evidence;
    const consumption = harness.gate.consume(issued.capability, { request: 'raw' });
    await entered;

    OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', {
      configurable: true,
      enumerable: false,
      get() {
        if (!this || !OBJECT_HAS_OWN(this, 'accepted')) return undefined;
        return function rejectAmbiguousDelivery(_resolve, reject) {
          reject(new Error('result delivery rejected'));
        };
      },
    });
    releaseDownstream();

    try {
      await assert.rejects(
        consumption,
        (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
      );
    } finally {
      restoreDescriptor(OBJECT_PROTOTYPE, 'then', originalThen);
    }

    assert.equal(sideEffects, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_UNKNOWN',
    );
    const durable = await harness.testAuthority.inspectDurableStateForTest(issued.capability);
    assert.equal(durable.state, 'RESERVED');
    assert.equal(durable.terminal_commitment, null);
    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'replay' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_CAPABILITY_STALE'),
    );
  } finally {
    restoreDescriptor(OBJECT_PROTOTYPE, 'then', originalThen);
    await harness.close().catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});
