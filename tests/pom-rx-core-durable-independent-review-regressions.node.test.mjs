import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createReferenceDurableSingleUseGateHarness,
} from '../core/gate/reference-durable-single-use-gate.mjs';

const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_PROTOTYPE = Object.prototype;
const h = (character) => character.repeat(64);

function bindingInput(index) {
  const suffix = String(index).padStart(4, '0');
  return {
    binding_profile: 'pom-rx-core-reference/0.1',
    run_id: `run-independent-review-${suffix}`,
    agent_ref: `agent-independent-review-${suffix}`,
    subject_ref: `subject-independent-review-${suffix}`,
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

function clock() {
  const values = [
    '2026-08-30T12:00:01.000Z',
    '2026-08-30T12:00:02.000Z',
  ];
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function inertObserved(evidence) {
  const prepared = OBJECT_CREATE(null);
  prepared.operation = 'independent-review-control';
  OBJECT_FREEZE(prepared);

  const observed = OBJECT_CREATE(null);
  observed.binding_profile = evidence.binding.binding_profile;
  observed.action_commitment = evidence.binding.action_commitment;
  observed.context_commitment = evidence.binding.context_commitment;
  observed.prepared_execution = prepared;
  return OBJECT_FREEZE(observed);
}

function restoreDescriptor(target, key, descriptor) {
  if (descriptor === undefined) delete target[key];
  else OBJECT_DEFINE_PROPERTY(target, key, descriptor);
}

test(
  'public consume finally ignores post-import Promise.prototype.finally replacement',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-public-finally-method-'));
    let evidence;
    let poisonCalls = 0;
    let cleanupCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: () => inertObserved(evidence),
      executeDownstream: () => ({ accepted: true }),
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(1), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    const consumePromise = harness.gate.consume(issued.capability, { raw: true });
    const finallyDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(Promise.prototype, 'finally');
    let chained;
    try {
      OBJECT_DEFINE_PROPERTY(Promise.prototype, 'finally', {
        ...finallyDescriptor,
        value: function poisonedFinally() {
          poisonCalls += 1;
          return this.then(() => {
            throw new Error('poisoned inherited finally converted success to rejection');
          });
        },
      });
      chained = consumePromise.finally(() => {
        cleanupCalls += 1;
      });
    } finally {
      restoreDescriptor(Promise.prototype, 'finally', finallyDescriptor);
    }

    try {
      assert.deepEqual(await chained, { accepted: true });
      assert.equal(poisonCalls, 0, 'public consume promise must not dispatch inherited finally');
      assert.equal(cleanupCalls, 1, 'captured finally must preserve ordinary cleanup semantics');
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'CONSUMED_SUCCESS',
      );
    } finally {
      await harness.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test(
  'synchronous ordinary downstream result is captured before inherited thenable assimilation',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-sync-result-thenable-'));
    let evidence;
    let targetThenGets = 0;
    let targetThenCalls = 0;
    const originalThen = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(OBJECT_PROTOTYPE, 'then');
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: () => inertObserved(evidence),
      executeDownstream: () => ({ accepted: true }),
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(2), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    try {
      OBJECT_DEFINE_PROPERTY(OBJECT_PROTOTYPE, 'then', {
        configurable: true,
        enumerable: false,
        get() {
          if (!this || !OBJECT_HAS_OWN(this, 'accepted')) return undefined;
          targetThenGets += 1;
          return function forgeSynchronousDownstreamResult(resolve) {
            targetThenCalls += 1;
            const forged = OBJECT_CREATE(null);
            forged.accepted = 'forged';
            resolve(OBJECT_FREEZE(forged));
          };
        },
      });

      const result = await harness.gate.consume(issued.capability, { raw: true });
      assert.deepEqual(result, { accepted: true });
      assert.equal(targetThenGets, 0, 'synchronous downstream result must not be inspected as a thenable');
      assert.equal(targetThenCalls, 0, 'synchronous downstream result must not be Promise-assimilated');
      assert.equal(
        harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
        'CONSUMED_SUCCESS',
      );
      assert.equal(
        (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
        'CONSUMED_SUCCESS',
      );
    } finally {
      restoreDescriptor(OBJECT_PROTOTYPE, 'then', originalThen);
      await harness.close().catch(() => {});
      await rm(rootDir, { recursive: true, force: true });
    }
  },
);

test('live process.pid cannot coordinate child-fd reuse inside the durable truth critical section', (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux shared-fd-table regression');
    return;
  }

  const moduleUrl = new URL(
    '../core/gate/reference-durable-claim-store.mjs',
    import.meta.url,
  ).href;
  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import {
      access,
      cp,
      mkdtemp,
      readdir,
      readlink,
      rm,
    } from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';
    import { Worker } from 'node:worker_threads';

    const { createReferenceDurableClaimStore } = await import(
      ${JSON.stringify(moduleUrl)} + '?pid-fd-review=' + Date.now()
    );
    const realRoot = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-pid-fd-real-'));
    const substituteRoot = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-pid-fd-substitute-'));
    const capabilityId = 'cap-${'a'.repeat(32)}';
    const input = {
      capabilityId,
      authorizationCommitment: '${h('b')}',
    };
    const realChild = path.join(realRoot, capabilityId);
    const substituteChild = path.join(substituteRoot, capabilityId);
    const store = createReferenceDurableClaimStore({ rootDir: realRoot });
    const pidDescriptor = Object.getOwnPropertyDescriptor(process, 'pid');
    const originalPid = process.pid;
    let worker = null;
    let getterCalls = 0;

    try {
      assert.equal(pidDescriptor?.configurable, true, 'process.pid must be configurable for this regression');
      const claimed = await store.claim(input);
      await cp(realChild, substituteChild, { recursive: true });

      const entries = await readdir('/proc/self/fd');
      let childFd = null;
      for (let index = 0; index < entries.length; index += 1) {
        try {
          const target = await readlink('/proc/self/fd/' + entries[index]);
          if (path.resolve(target) === path.resolve(realChild)) {
            childFd = Number(entries[index]);
            break;
          }
        } catch {
          // Descriptor table entries may change while inspected.
        }
      }
      assert.ok(Number.isInteger(childFd), 'pinned child directory fd must be discoverable');

      const shared = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
      const state = new Int32Array(shared);
      worker = new Worker(\`
        import fs from 'node:fs';
        import { parentPort, workerData } from 'node:worker_threads';
        const state = new Int32Array(workerData.shared);
        parentPort.postMessage({ type: 'ready' });
        Atomics.wait(state, 0, 0);
        if (Atomics.load(state, 0) !== 1) process.exit(0);
        try {
          fs.closeSync(workerData.fd);
          const substitutedFd = fs.openSync(workerData.substituteChild, 'r');
          if (substitutedFd !== workerData.fd) throw new Error('substitute did not reuse child fd');
          Atomics.store(state, 0, 2);
          Atomics.notify(state, 0);

          const terminal = workerData.substituteChild + '/terminal.json';
          const deadline = Date.now() + 3000;
          while (!fs.existsSync(terminal) && Date.now() < deadline) {
            Atomics.wait(state, 1, 0, 1);
          }

          fs.closeSync(workerData.fd);
          const restoredFd = fs.openSync(workerData.realChild, 'r');
          if (restoredFd !== workerData.fd) throw new Error('real child did not restore on same fd');
          Atomics.store(state, 0, 3);
          Atomics.notify(state, 0);
          parentPort.postMessage({ type: 'done', sawTerminal: fs.existsSync(terminal) });
        } catch (error) {
          Atomics.store(state, 0, -1);
          Atomics.notify(state, 0);
          parentPort.postMessage({ type: 'error', message: error.message });
        }
      \`, {
        eval: true,
        workerData: {
          shared,
          fd: childFd,
          realChild,
          substituteChild,
        },
      });
      await new Promise((resolve, reject) => {
        worker.once('message', (message) => {
          if (message?.type === 'ready') resolve();
          else reject(new Error('worker failed to become ready'));
        });
        worker.once('error', reject);
      });

      Object.defineProperty(process, 'pid', {
        configurable: true,
        enumerable: pidDescriptor.enumerable,
        get() {
          getterCalls += 1;
          if (getterCalls === 1) {
            Atomics.store(state, 0, 1);
            Atomics.notify(state, 0);
            while (Atomics.load(state, 0) === 1) {
              Atomics.wait(state, 0, 1, 1000);
            }
            if (Atomics.load(state, 0) < 0) {
              throw new Error('fd-reuse worker failed during substitution');
            }
          }
          return originalPid;
        },
      });

      let completionError = null;
      try {
        await store.complete(claimed.handle, 'success');
      } catch (error) {
        completionError = error;
      } finally {
        Object.defineProperty(process, 'pid', pidDescriptor);
      }

      if (getterCalls > 0) {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3500);
          worker.once('message', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } else {
        Atomics.store(state, 0, 99);
        Atomics.notify(state, 0);
      }

      assert.equal(getterCalls, 0, 'durable truth critical section must use bootstrap-captured pid');
      assert.equal(completionError, null);
      assert.equal((await store.inspect(input)).state, 'CONSUMED_SUCCESS');
      await access(path.join(realChild, 'terminal.json'));
      await assert.rejects(access(path.join(substituteChild, 'terminal.json')));
    } finally {
      Object.defineProperty(process, 'pid', pidDescriptor);
      if (worker) await worker.terminate().catch(() => {});
      await store.close().catch(() => {});
      await Promise.all([
        rm(realRoot, { recursive: true, force: true }),
        rm(substituteRoot, { recursive: true, force: true }),
      ]);
    }
  `;

  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', script],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert.equal(
    result.status,
    0,
    `process.pid fd-reuse child failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
