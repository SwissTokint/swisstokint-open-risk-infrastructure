import assert from 'node:assert/strict';
import fsPromises, {
  chmod,
  mkdtemp,
  open,
  rm,
} from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
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

test('post-import Array iterator poisoning cannot rewrite durable bootstrap or claim contracts', async () => {
  const rootDir = await tempDir('pom-rx-durable-gate-array-iterator-');
  const originalIterator = Array.prototype[Symbol.iterator];
  let evidence;
  let downstreamCalls = 0;
  let harness;

  try {
    Array.prototype[Symbol.iterator] = function* poisonedBootstrapIterator() {
      yield 'forged-bootstrap-key';
    };
    harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
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
    Array.prototype[Symbol.iterator] = originalIterator;
  }

  try {
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    let pending;
    try {
      Array.prototype[Symbol.iterator] = function* poisonedClaimIterator() {
        yield 'forged-claim-key';
      };
      // durableStore.claim() validates its exact input synchronously before its
      // first filesystem await, so keeping the poison only for this call probes
      // the claim contract without destabilizing unrelated Node async internals.
      pending = harness.gate.consume(issued.capability, { request: 'array-iterator-control' });
    } finally {
      Array.prototype[Symbol.iterator] = originalIterator;
    }

    assert.equal(await pending, 'ok');
    assert.equal(downstreamCalls, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_SUCCESS',
    );
    assert.equal(
      (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
      'CONSUMED_SUCCESS',
    );
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('post-import Object.entries poisoning cannot rewrite durable error terminal truth', async () => {
  const rootDir = await tempDir('pom-rx-durable-terminal-entries-');
  const input = {
    capabilityId: `cap-${'c'.repeat(32)}`,
    authorizationCommitment: h('d'),
  };
  const originalEntries = Object.entries;

  try {
    const store = createReferenceDurableClaimStore({ rootDir });
    const claimed = await store.claim(input);

    try {
      Object.entries = function poisonedEntries(value) {
        const entries = originalEntries(value);
        if (value && value.terminal_state === 'CONSUMED_ERROR') {
          return entries.map(([key, entryValue]) => (
            key === 'terminal_state'
              ? [key, 'CONSUMED_SUCCESS']
              : [key, entryValue]
          ));
        }
        return entries;
      };
      const completed = await store.complete(claimed.handle, 'error');
      assert.equal(completed.state, 'CONSUMED_ERROR');
    } finally {
      Object.entries = originalEntries;
    }

    const reopened = createReferenceDurableClaimStore({ rootDir });
    const inspection = await reopened.inspect(input);
    assert.equal(inspection.state, 'CONSUMED_ERROR');
  } finally {
    Object.entries = originalEntries;
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('post-claim FileHandle.writeFile poisoning cannot fake terminal persistence', async () => {
  const rootDir = await tempDir('pom-rx-durable-terminal-filehandle-');
  const input = {
    capabilityId: `cap-${'e'.repeat(32)}`,
    authorizationCommitment: h('f'),
  };
  const probePath = path.join(rootDir, 'filehandle-probe.tmp');
  let prototype;
  let writeFileDescriptor;

  try {
    const store = createReferenceDurableClaimStore({ rootDir });
    const claimed = await store.claim(input);

    const probe = await open(probePath, 'w');
    prototype = Object.getPrototypeOf(probe);
    writeFileDescriptor = Object.getOwnPropertyDescriptor(prototype, 'writeFile');
    assert.equal(typeof writeFileDescriptor?.value, 'function');
    await probe.close();
    await rm(probePath, { force: true });

    Object.defineProperty(prototype, 'writeFile', {
      ...writeFileDescriptor,
      value: async function poisonedWriteFile() {
        // Vulnerable code reports success while leaving the temp inode empty.
      },
    });

    const completed = await store.complete(claimed.handle, 'error');
    assert.equal(completed.state, 'CONSUMED_ERROR');
  } finally {
    if (prototype && writeFileDescriptor) {
      Object.defineProperty(prototype, 'writeFile', writeFileDescriptor);
    }
  }

  try {
    const reopened = createReferenceDurableClaimStore({ rootDir });
    const inspection = await reopened.inspect(input);
    assert.equal(inspection.state, 'CONSUMED_ERROR');
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});


test('terminal link live-binding poisoning cannot suppress durable publication', async () => {
  const rootDir = await tempDir('pom-rx-durable-terminal-link-capture-');
  const input = {
    capabilityId: `cap-${'7'.repeat(32)}`,
    authorizationCommitment: h('8'),
  };
  const originalLink = fsPromises.link;

  try {
    const store = createReferenceDurableClaimStore({ rootDir });
    const claimed = await store.claim(input);

    fsPromises.link = async function poisonedLink() {};
    syncBuiltinESMExports();

    const completed = await store.complete(claimed.handle, 'error');
    assert.equal(completed.state, 'CONSUMED_ERROR');

    fsPromises.link = originalLink;
    syncBuiltinESMExports();
    const reopened = createReferenceDurableClaimStore({ rootDir });
    assert.equal((await reopened.inspect(input)).state, 'CONSUMED_ERROR');
  } finally {
    fsPromises.link = originalLink;
    syncBuiltinESMExports();
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('process.platform poisoning cannot admit a world-writable Unix durable root', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Unix permission invariant');
    return;
  }
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  if (!descriptor?.configurable) {
    t.skip('process.platform is not configurable on this runtime');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-platform-capture-');
  const input = {
    capabilityId: `cap-${'9'.repeat(32)}`,
    authorizationCommitment: h('a'),
  };
  await chmod(rootDir, 0o777);

  try {
    const store = createReferenceDurableClaimStore({ rootDir });
    Object.defineProperty(process, 'platform', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      writable: descriptor.writable,
      value: 'win32',
    });
    await assert.rejects(
      store.claim(input),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
        return true;
      },
    );
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
    await chmod(rootDir, 0o700).catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});


test('lstat live-binding poisoning cannot admit a world-writable Unix durable root', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Unix permission invariant');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-lstat-capture-');
  const input = {
    capabilityId: `cap-${'b'.repeat(32)}`,
    authorizationCommitment: h('c'),
  };
  const originalLstat = fsPromises.lstat;
  await chmod(rootDir, 0o777);

  try {
    const store = createReferenceDurableClaimStore({ rootDir });
    fsPromises.lstat = async function poisonedLstat(target, ...args) {
      const stat = await Reflect.apply(originalLstat, fsPromises, [target, ...args]);
      if (path.resolve(target) !== path.resolve(rootDir)) return stat;
      return {
        mode: stat.mode & ~0o022,
        uid: stat.uid,
        size: stat.size,
        isDirectory: () => true,
        isFile: () => false,
        isSymbolicLink: () => false,
      };
    };
    syncBuiltinESMExports();

    await assert.rejects(
      store.claim(input),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
        return true;
      },
    );
  } finally {
    fsPromises.lstat = originalLstat;
    syncBuiltinESMExports();
    await chmod(rootDir, 0o700).catch(() => {});
    await rm(rootDir, { recursive: true, force: true });
  }
});
