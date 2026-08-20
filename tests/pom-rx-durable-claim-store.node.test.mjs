import assert from 'node:assert/strict';
import {
  chmod,
  mkdtemp,
  mkdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PomRxDurableClaimStoreError,
  createReferenceDurableClaimStore,
} from '../core/gate/reference-durable-claim-store.mjs';

const CAPABILITY = `cap-${'a'.repeat(32)}`;
const OTHER_CAPABILITY = `cap-${'b'.repeat(32)}`;
const AUTHORIZATION = '1'.repeat(64);
const OTHER_AUTHORIZATION = '2'.repeat(64);

async function withTempDir(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-durable-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function expectCode(error, code) {
  assert.ok(error instanceof PomRxDurableClaimStoreError);
  assert.equal(error.code, code);
  return true;
}

function store(rootDir) {
  return createReferenceDurableClaimStore({ rootDir });
}

const claimInput = (overrides = {}) => ({
  capabilityId: CAPABILITY,
  authorizationCommitment: AUTHORIZATION,
  ...overrides,
});

test('durable claim survives a new store instance and remains reserved', async () => {
  await withTempDir(async (rootDir) => {
    const first = store(rootDir);
    const claimed = await first.claim(claimInput());

    assert.equal(claimed.claim.capability_id, CAPABILITY);
    assert.equal(claimed.claim.authorization_commitment, AUTHORIZATION);
    assert.equal(claimed.claim.reference_only, true);
    assert.equal(claimed.claim.exclusive_claim_recorded, true);
    assert.equal(claimed.claim.local_filesystem_atomicity_assumed, true);
    assert.equal(claimed.claim.distributed_consensus_proved, false);
    assert.equal(claimed.claim.network_filesystem_atomicity_proved, false);
    assert.equal(claimed.claim.crash_recovery_proved, false);
    assert.match(claimed.claim.claim_commitment, /^[a-f0-9]{64}$/u);

    const second = store(rootDir);
    const inspection = await second.inspect(claimInput());
    assert.equal(inspection.state, 'RESERVED');
    assert.equal(inspection.claim_commitment, claimed.claim.claim_commitment);
    assert.equal(inspection.exclusive_claim_recorded, true);
    assert.equal(inspection.local_filesystem_atomicity_assumed, true);
  });
});

test('two store instances racing one capability produce exactly one durable winner', async () => {
  await withTempDir(async (rootDir) => {
    const left = store(rootDir);
    const right = store(rootDir);

    const results = await Promise.allSettled([
      left.claim(claimInput()),
      right.claim(claimInput()),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(expectCode(rejected[0].reason, 'POMRX_GATE_E_DURABLE_REPLAY'));
  });
});

test('capability identity is the durable replay key even if authorization commitment changes', async () => {
  await withTempDir(async (rootDir) => {
    const first = store(rootDir);
    const second = store(rootDir);
    await first.claim(claimInput());

    await assert.rejects(
      second.claim(claimInput({ authorizationCommitment: OTHER_AUTHORIZATION })),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
    await assert.rejects(
      second.inspect(claimInput({ authorizationCommitment: OTHER_AUTHORIZATION })),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_BINDING_MISMATCH'),
    );
  });
});

test('claim commitment is deterministic for the same durable binding', async () => {
  let leftCommitment;
  let rightCommitment;
  await withTempDir(async (rootDir) => {
    leftCommitment = (await store(rootDir).claim(claimInput())).claim.claim_commitment;
  });
  await withTempDir(async (rootDir) => {
    rightCommitment = (await store(rootDir).claim(claimInput())).claim.claim_commitment;
  });
  assert.equal(leftCommitment, rightCommitment);
});

test('successful terminal state is durable and inspectable by another instance', async () => {
  await withTempDir(async (rootDir) => {
    const first = store(rootDir);
    const { handle, claim } = await first.claim(claimInput());
    const completed = await first.complete(handle, 'success');

    assert.equal(completed.state, 'CONSUMED_SUCCESS');
    assert.equal(completed.claim_commitment, claim.claim_commitment);
    assert.match(completed.terminal_commitment, /^[a-f0-9]{64}$/u);

    const second = store(rootDir);
    const persisted = await second.inspect(claimInput());
    assert.equal(persisted.state, 'CONSUMED_SUCCESS');
    assert.equal(persisted.terminal_commitment, completed.terminal_commitment);

    await assert.rejects(
      second.claim(claimInput()),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
  });
});

test('error terminal state is durable and never rearms the capability', async () => {
  await withTempDir(async (rootDir) => {
    const first = store(rootDir);
    const { handle } = await first.claim(claimInput());
    const completed = await first.complete(handle, 'error');
    assert.equal(completed.state, 'CONSUMED_ERROR');

    const second = store(rootDir);
    assert.equal((await second.inspect(claimInput())).state, 'CONSUMED_ERROR');
    await assert.rejects(
      second.claim(claimInput()),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
  });
});

test('one local handle can complete at most once even under concurrent calls', async () => {
  await withTempDir(async (rootDir) => {
    const durableStore = store(rootDir);
    const { handle } = await durableStore.claim(claimInput());

    const results = await Promise.allSettled([
      durableStore.complete(handle, 'success'),
      durableStore.complete(handle, 'success'),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.ok(rejected);
    assert.ok(expectCode(rejected.reason, 'POMRX_GATE_E_DURABLE_STALE'));
  });
});

test('invalid completion outcome does not manufacture a terminal state', async () => {
  await withTempDir(async (rootDir) => {
    const durableStore = store(rootDir);
    const { handle } = await durableStore.claim(claimInput());
    await assert.rejects(
      durableStore.complete(handle, 'maybe'),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );
    const completed = await durableStore.complete(handle, 'success');
    assert.equal(completed.state, 'CONSUMED_SUCCESS');
  });
});

test('a crash-style incomplete tombstone stays fail-closed and does not invent an authorization binding', async () => {
  await withTempDir(async (rootDir) => {
    await mkdir(path.join(rootDir, CAPABILITY), { mode: 0o700 });
    const durableStore = store(rootDir);

    const inspection = await durableStore.inspect(claimInput());
    assert.equal(inspection.state, 'RESERVED_INCOMPLETE');
    assert.equal(inspection.capability_id, CAPABILITY);
    assert.equal(inspection.authorization_commitment, null);
    assert.equal(inspection.claim_commitment, null);
    assert.equal(inspection.exclusive_claim_recorded, false);
    assert.equal(inspection.local_filesystem_atomicity_assumed, true);

    await assert.rejects(
      durableStore.claim(claimInput()),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
  });
});

test('corrupted persisted claim uses the corruption diagnostic family and still blocks replay', async () => {
  await withTempDir(async (rootDir) => {
    const first = store(rootDir);
    await first.claim(claimInput());
    await writeFile(path.join(rootDir, CAPABILITY, 'claim.json'), '{"broken":true}\n', 'utf8');

    const second = store(rootDir);
    await assert.rejects(
      second.inspect(claimInput()),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_CORRUPT'),
    );
    await assert.rejects(
      second.claim(claimInput()),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
  });
});

test('persisted unknown/prototype-like keys fail as corruption', async () => {
  await withTempDir(async (rootDir) => {
    const first = store(rootDir);
    await first.claim(claimInput());
    const filePath = path.join(rootDir, CAPABILITY, 'claim.json');
    const text = await import('node:fs/promises').then(({ readFile }) => readFile(filePath, 'utf8'));
    const parsed = JSON.parse(text);
    const poisoned = JSON.stringify({ ...parsed, __proto_marker__: true });
    await writeFile(filePath, `${poisoned}\n`, 'utf8');

    await assert.rejects(
      store(rootDir).inspect(claimInput()),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_CORRUPT'),
    );
  });
});

test('persisted claim corruption discovered during completion burns the local handle fail-closed', async () => {
  await withTempDir(async (rootDir) => {
    const durableStore = store(rootDir);
    const { handle } = await durableStore.claim(claimInput());
    await writeFile(path.join(rootDir, CAPABILITY, 'claim.json'), '{"broken":true}\n', 'utf8');

    await assert.rejects(
      durableStore.complete(handle, 'success'),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_CORRUPT'),
    );
    await assert.rejects(
      durableStore.complete(handle, 'success'),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_STALE'),
    );
  });
});

test('pre-existing terminal file makes completion fail closed and the handle cannot retry', async () => {
  await withTempDir(async (rootDir) => {
    const durableStore = store(rootDir);
    const { handle } = await durableStore.claim(claimInput());
    await writeFile(path.join(rootDir, CAPABILITY, 'terminal.json'), '{}\n', 'utf8');

    await assert.rejects(
      durableStore.complete(handle, 'success'),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_REPLAY'),
    );
    await assert.rejects(
      durableStore.complete(handle, 'success'),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_STALE'),
    );
  });
});

test('bootstrap and per-call accessor substitution are rejected without invoking getters', async () => {
  await withTempDir(async (rootDir) => {
    let bootstrapGetterCalls = 0;
    const bootstrap = {};
    Object.defineProperty(bootstrap, 'rootDir', {
      enumerable: true,
      get() {
        bootstrapGetterCalls += 1;
        return rootDir;
      },
    });
    assert.throws(
      () => createReferenceDurableClaimStore(bootstrap),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );
    assert.equal(bootstrapGetterCalls, 0);

    const durableStore = store(rootDir);
    let requestGetterCalls = 0;
    const request = { authorizationCommitment: AUTHORIZATION };
    Object.defineProperty(request, 'capabilityId', {
      enumerable: true,
      get() {
        requestGetterCalls += 1;
        return CAPABILITY;
      },
    });
    await assert.rejects(
      durableStore.claim(request),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );
    assert.equal(requestGetterCalls, 0);
  });
});

test('revoked Proxy boundaries fail with stable durable diagnostics', async () => {
  await withTempDir(async (rootDir) => {
    const bootstrapRevocable = Proxy.revocable({ rootDir }, {});
    bootstrapRevocable.revoke();
    assert.throws(
      () => createReferenceDurableClaimStore(bootstrapRevocable.proxy),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );

    const durableStore = store(rootDir);
    const inputRevocable = Proxy.revocable(claimInput(), {});
    inputRevocable.revoke();
    await assert.rejects(
      durableStore.claim(inputRevocable.proxy),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );
  });
});

test('hidden, symbol and custom-prototype public inputs fail closed', async () => {
  await withTempDir(async (rootDir) => {
    const durableStore = store(rootDir);

    const hidden = { authorizationCommitment: AUTHORIZATION };
    Object.defineProperty(hidden, 'capabilityId', {
      value: CAPABILITY,
      enumerable: false,
    });
    await assert.rejects(
      durableStore.claim(hidden),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );

    const symbol = claimInput();
    symbol[Symbol('extra')] = true;
    await assert.rejects(
      durableStore.claim(symbol),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );

    const customPrototype = Object.create({ inherited: true });
    Object.assign(customPrototype, claimInput());
    await assert.rejects(
      durableStore.claim(customPrototype),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
    );
  });
});

test('descriptor inspection ignores inherited Object.prototype get/set poison', async () => {
  await withTempDir(async (rootDir) => {
    const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
    const originalSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
    let inheritedGetReads = 0;
    let inheritedSetReads = 0;

    Object.defineProperty(Object.prototype, 'get', {
      configurable: true,
      get() {
        inheritedGetReads += 1;
        return () => rootDir;
      },
    });
    Object.defineProperty(Object.prototype, 'set', {
      configurable: true,
      get() {
        inheritedSetReads += 1;
        return () => {};
      },
    });

    try {
      const durableStore = createReferenceDurableClaimStore({ rootDir });
      assert.ok(durableStore);
    } finally {
      if (originalGet) Object.defineProperty(Object.prototype, 'get', originalGet);
      else delete Object.prototype.get;
      if (originalSet) Object.defineProperty(Object.prototype, 'set', originalSet);
      else delete Object.prototype.set;
    }

    assert.equal(inheritedGetReads, 0);
    assert.equal(inheritedSetReads, 0);
  });
});

test('root path must be absolute and direct symlink roots are rejected', async () => {
  assert.throws(
    () => store('relative/durable-root'),
    (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_INVALID'),
  );

  await withTempDir(async (parent) => {
    const actual = path.join(parent, 'actual');
    const linked = path.join(parent, 'linked');
    await mkdir(actual, { mode: 0o700 });
    await symlink(actual, linked, 'dir');
    const durableStore = store(linked);
    await assert.rejects(
      durableStore.claim(claimInput({ capabilityId: OTHER_CAPABILITY })),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_ROOT_INVALID'),
    );
  });
});

test('group/world writable roots are rejected before any capability claim', async () => {
  if (process.platform === 'win32') return;
  await withTempDir(async (parent) => {
    const unsafeRoot = path.join(parent, 'unsafe');
    await mkdir(unsafeRoot, { mode: 0o700 });
    await chmod(unsafeRoot, 0o777);

    const durableStore = store(unsafeRoot);
    await assert.rejects(
      durableStore.claim(claimInput({ capabilityId: OTHER_CAPABILITY })),
      (error) => expectCode(error, 'POMRX_GATE_E_DURABLE_ROOT_INVALID'),
    );
  });
});
