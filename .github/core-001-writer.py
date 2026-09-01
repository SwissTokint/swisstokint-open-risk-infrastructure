from pathlib import Path
import json
import re
import shutil
import subprocess


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"expected exactly one match in {path}, found {count}: {old[:120]!r}"
        )
    p.write_text(text.replace(old, new, 1))


def regex_replace_once(path: str, pattern: str, replacement: str) -> None:
    p = Path(path)
    text = p.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"expected one regex match in {path}, found {count}: {pattern}")
    p.write_text(updated)


# Ensure all tree comparisons are against the exact trusted baseline.
subprocess.run(['git', 'fetch', 'origin', 'main'], check=True)

# ---------------------------------------------------------------------------
# CORE-001 P1: RegExp.prototype.test dynamically consults pattern.exec.
# Capture and invoke the original RegExp.prototype.exec directly.
# ---------------------------------------------------------------------------
replace_once(
    'core/gate/reference-durable-claim-store.mjs',
    'const REGEXP_TEST = RegExp.prototype.test;',
    'const REGEXP_EXEC = RegExp.prototype.exec;',
)
replace_once(
    'core/gate/reference-durable-claim-store.mjs',
    "function regexpTest(pattern, value) {\n  return REFLECT_APPLY(REGEXP_TEST, pattern, [value]);\n}",
    "function regexpTest(pattern, value) {\n  return REFLECT_APPLY(REGEXP_EXEC, pattern, [value]) !== null;\n}",
)

# ---------------------------------------------------------------------------
# CORE-001 P2: close() must release an owned pinned root fd even when the
# configured pathname has drifted, while never closing a reused foreign fd.
# ---------------------------------------------------------------------------
new_close = r'''  async function close() {
    if (lifecycleState === 'CLOSED') return;
    if (lifecycleState === 'CLOSING') {
      await closePromise;
      return;
    }

    lifecycleState = 'CLOSING';
    let descriptorOwnershipReleased = trustedRootPromise === null;
    closePromise = (async () => {
      if (activeOperations > 0) {
        await new PROMISE_CONSTRUCTOR((resolve) => {
          drainResolve = resolve;
        });
      }

      setForEach(openClaimStates, (state) => {
        releasePinnedClaimDirectorySync(state);
      });

      let root = null;
      if (trustedRootPromise !== null) {
        try {
          root = await trustedRootPromise;
        } catch {
          root = null;
        }
      }
      if (root === null) {
        // A rejected bootstrap closes any descriptor it acquired before the
        // trusted-root promise rejects, so this instance owns no root fd.
        descriptorOwnershipReleased = true;
        return;
      }

      let rootIdentityError = null;
      try {
        assertPinnedRootSync(root);
      } catch (error) {
        if (error instanceof PomRxDurableClaimStoreError
            && error.code === 'POMRX_GATE_E_DURABLE_ROOT_INVALID') {
          rootIdentityError = error;
        } else {
          fail(
            'POMRX_GATE_E_DURABLE_IO',
            'durable claim root descriptor identity could not be verified during close',
          );
        }
      }

      let fdIdentity = null;
      try {
        fdIdentity = fsFstatSyncSnapshot(root.fd);
      } catch (error) {
        if (error?.code === 'EBADF') {
          // The numeric slot no longer names an owned descriptor. Never try to
          // close a potentially reused foreign fd on this path.
          descriptorOwnershipReleased = true;
        } else {
          fail(
            'POMRX_GATE_E_DURABLE_IO',
            'durable claim root descriptor ownership could not be verified during close',
          );
        }
      }

      if (fdIdentity !== null) {
        const descriptorStillOwned = statIsDirectory(fdIdentity)
          && !statIsSymbolicLink(fdIdentity)
          && fdIdentity.dev === root.dev
          && fdIdentity.ino === root.ino
          && fdIdentity.mode === root.mode
          && fdIdentity.uid === root.uid;
        if (descriptorStillOwned) {
          try {
            closeFdSync(root.fd);
            descriptorOwnershipReleased = true;
          } catch {
            fail(
              'POMRX_GATE_E_DURABLE_IO',
              'durable claim root descriptor could not be closed',
            );
          }
        } else {
          // Same-realm code may already have closed and reused the raw numeric
          // fd. The original owned descriptor is gone; do not close the foreign
          // replacement.
          descriptorOwnershipReleased = true;
          if (rootIdentityError === null) {
            rootIdentityError = new PomRxDurableClaimStoreError(
              'POMRX_GATE_E_DURABLE_ROOT_INVALID',
              'durable claim root descriptor ownership changed before close',
            );
          }
        }
      }

      if (rootIdentityError !== null) throw rootIdentityError;
    })();

    try {
      await closePromise;
      lifecycleState = 'CLOSED';
    } catch (error) {
      if (descriptorOwnershipReleased) {
        lifecycleState = 'CLOSED';
      } else {
        // Keep lifecycle retryable only while this instance may still own the
        // pinned root descriptor. A retry re-verifies descriptor ownership.
        lifecycleState = 'OPEN';
        closePromise = null;
      }
      throw error;
    }
  }'''
regex_replace_once(
    'core/gate/reference-durable-claim-store.mjs',
    r"  async function close\(\) \{.*?\n  \}\n\n  return freezeValue\(\{",
    new_close + "\n\n  return freezeValue({",
)

# ---------------------------------------------------------------------------
# CORE-001 P1: a rejection after executeDownstream has returned cannot be
# promoted to terminal error truth. Inherited thenable assimilation may reject
# after the downstream has already completed its actual work.
# ---------------------------------------------------------------------------
consume_marker = "  async function consume(capability, executionAttempt) {"
mark_unknown = r'''  function markConsumptionUnknown(capability) {
    const record = weakMapGet(capabilityState, capability);
    if (!record || record.state !== 'CONSUMING') {
      throw gateError(
        'POMRX_GATE_E_CAPABILITY_STALE',
        'Reference capability is not consuming',
      );
    }
    record.state = 'CONSUMED_UNKNOWN';
  }

'''
replace_once(
    'core/gate/reference-single-use-gate.mjs',
    consume_marker,
    mark_unknown + consume_marker,
)

new_consume_tail = r'''    beginConsumption(capability);

    let downstreamResult;
    try {
      // The caller-owned executionAttempt is never forwarded. Only the detached,
      // frozen snapshot captured from the trusted observer can reach downstream.
      // Invoke first so a synchronous throw is distinguishable from any later
      // Promise/thenable settlement after dispatch has returned.
      downstreamResult = executeDownstream(observed.prepared_execution);
    } catch {
      completeConsumption(capability, false);
      throw gateError(
        'POMRX_GATE_E_DOWNSTREAM_FAILED',
        'Downstream execution failed synchronously',
      );
    }

    try {
      const result = await downstreamResult;
      completeConsumption(capability, true);
      return result;
    } catch {
      // Once executeDownstream has returned, a rejection cannot prove terminal
      // execution error in this same-realm reference model: inherited thenable
      // assimilation can reject an ordinary success value after work completed.
      markConsumptionUnknown(capability);
      throw gateError(
        'POMRX_GATE_E_DOWNSTREAM_FAILED',
        'Downstream completion could not be established after asynchronous dispatch',
      );
    }
  }

  const gate'''
regex_replace_once(
    'core/gate/reference-single-use-gate.mjs',
    r"    beginConsumption\(capability\);\n\n    try \{.*?\n    \}\n  \}\n\n  const gate",
    new_consume_tail,
)

new_outer_catch = r'''      const innerState = inner.testAuthority.inspectCapabilityStateForTest(capability);
      if (innerState === 'CONSUMED_ERROR') {
        state.state = 'CONSUMED_ERROR';
        try {
          await durableStore.complete(durableClaim.handle, 'error');
        } catch (durableError) {
          throw durableError;
        }
      } else if (innerState === 'CONSUMED_UNKNOWN') {
        // Downstream was reached, but the asynchronous return channel is not
        // terminal execution truth. Keep the tombstone RESERVED/non-replayable.
        state.state = 'CONSUMED_UNKNOWN';
      } else {
        state.state = 'REJECTED';
      }
      throw error;'''
regex_replace_once(
    'core/gate/reference-durable-single-use-gate.mjs',
    r"      const innerState = inner\.testAuthority\.inspectCapabilityStateForTest\(capability\);\n      if \(innerState === 'CONSUMED_ERROR'\) \{.*?      throw error;",
    new_outer_catch,
)

# ---------------------------------------------------------------------------
# Regression: existing async rejection is now explicit ambiguity; retain a
# synchronous-throw test to prove deterministic CONSUMED_ERROR still exists.
# ---------------------------------------------------------------------------
replace_once(
    'tests/pom-rx-core-reference-gate.node.test.mjs',
    "test('downstream failure is terminal and cannot be replayed', async () => {",
    "test('asynchronous downstream rejection is burned but not promoted to terminal error truth', async () => {",
)
reference_gate = Path('tests/pom-rx-core-reference-gate.node.test.mjs')
reference_text = reference_gate.read_text()
anchor = "test('asynchronous downstream rejection is burned but not promoted to terminal error truth', async () => {"
start = reference_text.index(anchor)
next_test = reference_text.index("\ntest('", start + len(anchor))
block = reference_text[start:next_test]
if block.count("'CONSUMED_ERROR'") != 1:
    raise SystemExit('reference async downstream block did not contain one CONSUMED_ERROR')
block = block.replace("'CONSUMED_ERROR'", "'CONSUMED_UNKNOWN'", 1)
reference_gate.write_text(reference_text[:start] + block + reference_text[next_test:])

new_durable_tests = r'''test('asynchronous downstream rejection remains burned and durably RESERVED', async () => {
  await withTempDir(async (rootDir) => {
    let evidence;
    let downstreamCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock(
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: async () => {
        downstreamCalls += 1;
        throw new Error('sensitive downstream detail');
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'downstream-error' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
    );
    assert.equal(downstreamCalls, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_UNKNOWN',
    );
    const inspection = await harness.testAuthority.inspectDurableStateForTest(issued.capability);
    assert.equal(inspection.state, 'RESERVED');
    assert.equal(inspection.terminal_commitment, null);
    await harness.close();
  });
});

test('synchronous downstream throw persists CONSUMED_ERROR before reporting failure', async () => {
  await withTempDir(async (rootDir) => {
    let evidence;
    let downstreamCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock(
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => {
        downstreamCalls += 1;
        throw new Error('synchronous downstream failure');
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    await assert.rejects(
      harness.gate.consume(issued.capability, { request: 'sync-downstream-error' }),
      (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
    );
    assert.equal(downstreamCalls, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_ERROR',
    );
    assert.equal(
      (await harness.testAuthority.inspectDurableStateForTest(issued.capability)).state,
      'CONSUMED_ERROR',
    );
    await harness.close();
  });
});

test('inherited Object.prototype.then cannot persist false CONSUMED_ERROR after downstream success', async () => {
  await withTempDir(async (rootDir) => {
    const objectPrototype = Object.prototype;
    const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    const defineProperty = Object.defineProperty;
    const hasOwn = Object.hasOwn;
    const originalThen = getOwnPropertyDescriptor(objectPrototype, 'then');
    let evidence;
    let downstreamEffects = 0;
    let releaseDownstream;
    let thenCalls = 0;
    const downstreamBarrier = new Promise((resolve) => {
      releaseDownstream = resolve;
    });
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: sequenceClock(
        '2026-08-30T12:00:01.000Z',
        '2026-08-30T12:00:02.000Z',
      ),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: async () => {
        downstreamEffects += 1;
        await downstreamBarrier;
        return { accepted: true };
      },
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(), {
      witnessValidUntil: WITNESS_VALID_UNTIL,
    });
    evidence = issued.evidence;

    const consumePromise = harness.gate.consume(
      issued.capability,
      { request: 'thenable-terminal-poison' },
    );
    while (downstreamEffects === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    try {
      defineProperty(objectPrototype, 'then', {
        configurable: true,
        enumerable: false,
        get() {
          if (!this || !hasOwn(this, 'accepted')) return undefined;
          return function rejectCompletedSuccess(resolve, reject) {
            thenCalls += 1;
            reject(new Error('poisoned inherited then'));
          };
        },
      });
      releaseDownstream();
      await assert.rejects(
        consumePromise,
        (error) => expectGateCode(error, 'POMRX_GATE_E_DOWNSTREAM_FAILED'),
      );
    } finally {
      if (originalThen) defineProperty(objectPrototype, 'then', originalThen);
      else delete objectPrototype.then;
    }

    assert.equal(downstreamEffects, 1);
    assert.equal(thenCalls, 1);
    assert.equal(
      harness.testAuthority.inspectCapabilityStateForTest(issued.capability),
      'CONSUMED_UNKNOWN',
    );
    const inspection = await harness.testAuthority.inspectDurableStateForTest(issued.capability);
    assert.equal(inspection.state, 'RESERVED');
    assert.equal(inspection.terminal_commitment, null);
    await harness.close();
  });
});
'''
regex_replace_once(
    'tests/pom-rx-core-durable-gate.node.test.mjs',
    r"test\('downstream failure persists CONSUMED_ERROR before reporting downstream failure', async \(\) => \{.*?\n\}\);\n\n(?=test\('concurrent local consume)",
    new_durable_tests + "\n",
)

# ---------------------------------------------------------------------------
# Permanent exact regressions for the traversal and lifecycle findings.
# ---------------------------------------------------------------------------
current = Path('tests/pom-rx-core-durable-gate-current-head-regressions.node.test.mjs')
current_text = current.read_text()
if "import { closeSync, openSync } from 'node:fs';" not in current_text:
    current_text = current_text.replace(
        "import { spawnSync } from 'node:child_process';\n",
        "import { spawnSync } from 'node:child_process';\nimport { closeSync, openSync } from 'node:fs';\n",
        1,
    )
if '  readlink,\n' not in current_text:
    current_text = current_text.replace('  readdir,\n', '  readdir,\n  readlink,\n', 1)

extra_regressions = r'''

test('post-import RegExp.prototype.exec poisoning cannot escape the durable root', async (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd traversal reproduction');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-regexp-root-');
  const foreignDir = await tempDir('pom-rx-durable-regexp-foreign-');
  const foreignFd = openSync(foreignDir, 'r');
  const regexpPrototype = RegExp.prototype;
  const originalExec = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(regexpPrototype, 'exec');
  const store = createReferenceDurableClaimStore({ rootDir });
  let poisonedExecCalls = 0;

  try {
    OBJECT_DEFINE_PROPERTY(regexpPrototype, 'exec', {
      configurable: true,
      enumerable: false,
      writable: true,
      value() {
        poisonedExecCalls += 1;
        return { 0: 'forged-match', index: 0, input: '', groups: undefined };
      },
    });

    await assert.rejects(
      store.claim({
        capabilityId: `../${foreignFd}/escaped`,
        authorizationCommitment: h('8'),
      }),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_INVALID');
        return true;
      },
    );
  } finally {
    OBJECT_DEFINE_PROPERTY(regexpPrototype, 'exec', originalExec);
  }

  try {
    assert.equal(poisonedExecCalls, 0);
    assert.deepEqual(await readdir(foreignDir), []);
  } finally {
    await store.close().catch(() => {});
    closeSync(foreignFd);
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(foreignDir, { recursive: true, force: true }),
    ]);
  }
});

test('root identity drift during close releases the still-owned pinned Linux descriptor', async (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux /proc/self/fd lifecycle reproduction');
    return;
  }

  const rootDir = await tempDir('pom-rx-durable-close-drift-');
  const movedRoot = `${rootDir}-moved`;
  const input = {
    capabilityId: `cap-${'9'.repeat(32)}`,
    authorizationCommitment: h('a'),
  };
  const store = createReferenceDurableClaimStore({ rootDir });

  async function countMovedRootDescriptors() {
    const names = await readdir('/proc/self/fd');
    let count = 0;
    for (let index = 0; index < names.length; index += 1) {
      try {
        const target = await readlink(`/proc/self/fd/${names[index]}`);
        if (target === movedRoot || target === `${movedRoot} (deleted)`) count += 1;
      } catch {
        // Descriptor table may change between readdir and readlink.
      }
    }
    return count;
  }

  try {
    await store.inspect(input);
    await rename(rootDir, movedRoot);
    await mkdir(rootDir, { mode: 0o700 });
    assert.ok((await countMovedRootDescriptors()) >= 1);

    await assert.rejects(
      store.close(),
      (error) => {
        assert.equal(error?.code, 'POMRX_GATE_E_DURABLE_ROOT_INVALID');
        return true;
      },
    );
    assert.equal(await countMovedRootDescriptors(), 0);
    await store.close();
    assert.equal(await countMovedRootDescriptors(), 0);
  } finally {
    await store.close().catch(() => {});
    await Promise.all([
      rm(rootDir, { recursive: true, force: true }),
      rm(movedRoot, { recursive: true, force: true }),
    ]);
  }
});
'''
if "post-import RegExp.prototype.exec poisoning cannot escape the durable root" in current_text:
    raise SystemExit('RegExp regression already present unexpectedly')
current.write_text(current_text + extra_regressions)

# ---------------------------------------------------------------------------
# Documentation and claim boundary refinement.
# ---------------------------------------------------------------------------
replace_once(
    'core/gate/README.md',
    '''       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR''',
    '''       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR
            -> CONSUMED_UNKNOWN''',
)
replace_once(
    'core/gate/README.md',
    '''The wrapper reserves locally before its first `await`, acquires the durable capability tombstone before the inner Gate can observe or forward, and persists `CONSUMED_SUCCESS` / `CONSUMED_ERROR` before reporting the corresponding successful/failed downstream outcome. A validation or binding rejection after the durable claim intentionally leaves the durable state `RESERVED`: the capability remains fail-closed/non-reusable without pretending an external action executed.''',
    '''The wrapper reserves locally before its first `await`, acquires the durable capability tombstone before the inner Gate can observe or forward, and persists `CONSUMED_SUCCESS` before reporting a successful downstream outcome. A synchronous throw from `execute_downstream` before it returns is the only local path promoted directly to durable `CONSUMED_ERROR`. If the downstream has returned and its Promise/thenable path later rejects, Core records local `CONSUMED_UNKNOWN`, leaves the durable tombstone `RESERVED`, and forbids replay: same-realm Promise assimilation can otherwise turn an already-completed success into a false error. A validation or binding rejection after the durable claim also leaves the durable state `RESERVED`. Independent observation/reconciliation, not this local return channel, decides external execution/effect truth.''',
)
replace_once(
    'core/gate/DURABLE-COMPOSITION.md',
    '''If downstream succeeds, the local Gate reaches `CONSUMED_SUCCESS` and the composition persists `CONSUMED_SUCCESS` before returning the downstream result. If downstream fails, the local Gate reaches `CONSUMED_ERROR`; the composition persists `CONSUMED_ERROR` before propagating the Gate's downstream-failure diagnostic.

If terminal-marker persistence itself fails after downstream has already resolved or rejected, the durable claim remains fail-closed and the same capability must not be retried. This composition does not infer external effect truth from local terminal state; independent observation/reconciliation remains required.''',
    '''If downstream succeeds, the local Gate reaches `CONSUMED_SUCCESS` and the composition persists `CONSUMED_SUCCESS` before returning the downstream result. A synchronous throw from `executeDownstream` before it returns reaches local/durable `CONSUMED_ERROR`. Once `executeDownstream` has returned, however, a later Promise/thenable rejection is not accepted as terminal error truth in this same-realm reference model: inherited thenable assimilation can reject an ordinary success value after the downstream has already acted. That path becomes local `CONSUMED_UNKNOWN`, leaves the durable tombstone `RESERVED`, remains non-replayable, and requires independent observation/reconciliation.

If terminal-marker persistence itself fails after a confirmed local success/error transition, the durable claim remains fail-closed and the same capability must not be retried. This composition does not infer external effect truth from local terminal state; independent observation/reconciliation remains required.''',
)

adr = Path('docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md')
adr_text = adr.read_text()
old_state = '''       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR'''
if old_state not in adr_text:
    raise SystemExit('ADR state machine marker missing')
adr_text = adr_text.replace(
    old_state,
    '''       -> CONSUMING
            -> CONSUMED_SUCCESS
            -> CONSUMED_ERROR
            -> CONSUMED_UNKNOWN''',
    1,
)
old_terminal = "Any terminal state is permanently non-reusable. In particular, downstream failure ends in `CONSUMED_ERROR`; a retry requires a new authorization lifecycle."
if old_terminal not in adr_text:
    raise SystemExit('ADR terminal paragraph marker missing')
adr_text = adr_text.replace(
    old_terminal,
    "Any terminal state is permanently non-reusable. A synchronous throw from the private downstream adapter before it returns ends in `CONSUMED_ERROR`. A rejection after the adapter has returned is conservatively `CONSUMED_UNKNOWN`: the same-realm Promise/thenable return channel is not proof that an external action failed, so a retry still requires a new authorization lifecycle and external truth is deferred to observation/reconciliation.",
    1,
)
adr_text = adr_text.replace(
    '- downstream error is terminal;',
    '- downstream invocation is terminal/non-replayable; only synchronous pre-return throws are promoted to `CONSUMED_ERROR`, while post-return rejection is `CONSUMED_UNKNOWN`;',
    1,
)
adr.write_text(adr_text)

# ---------------------------------------------------------------------------
# Rebuild package.json from trusted main and copy only Core regression wiring.
# This intentionally removes unrelated artifact-scanner / Wallet Guard script
# changes accumulated on the old branch.
# ---------------------------------------------------------------------------
main_package = json.loads(
    subprocess.check_output(['git', 'show', 'origin/main:package.json'], text=True)
)
main_package['scripts']['test:pom-rx:exact-authorization-input-hardening'] = (
    'node --test tests/pom-rx-exact-authorization-input-hardening.node.test.mjs '
    'tests/pom-rx-core-exact-authorization-intrinsic.node.test.mjs'
)
main_package['scripts']['test:pom-rx:durable-claim-store'] = (
    'node --test '
    'tests/pom-rx-core-durable-gate.node.test.mjs '
    'tests/pom-rx-core-durable-gate-bootstrap-intrinsic.node.test.mjs '
    'tests/pom-rx-core-durable-gate-intrinsic-hardening.node.test.mjs '
    'tests/pom-rx-core-durable-gate-current-head-regressions.node.test.mjs '
    'tests/pom-rx-core-durable-fd-reuse.node.test.mjs '
    'tests/pom-rx-core-durable-child-directory-rebinding.node.test.mjs '
    'tests/pom-rx-core-durable-gate-issue-options.node.test.mjs '
    'tests/pom-rx-durable-claim-store.node.test.mjs '
    'tests/pom-rx-durable-claim-store-root.node.test.mjs '
    'tests/pom-rx-durable-claim-store-publication.node.test.mjs'
)
main_package['scripts']['test:pom-rx:reference-plain-data'] = (
    'node --test tests/pom-rx-reference-plain-data.node.test.mjs '
    'tests/pom-rx-reference-plain-data-prototype-boundary.node.test.mjs '
    'tests/pom-rx-reference-plain-data-intrinsic-hardening.node.test.mjs'
)
Path('package.json').write_text(json.dumps(main_package, indent=2) + '\n')

# ---------------------------------------------------------------------------
# CONSOLIDATION: retain only the bounded CORE-001 surface. Everything else from
# the stale 82-commit stack is restored exactly to trusted main (or removed if it
# did not exist there). This explicitly removes Wallet Guard / SDK / CI drift.
# ---------------------------------------------------------------------------
allow = {
    'core/authorization/reference-exact-authorization.mjs',
    'core/gate/DURABLE-COMPOSITION.md',
    'core/gate/README.md',
    'core/gate/reference-durable-claim-store.mjs',
    'core/gate/reference-durable-single-use-gate.mjs',
    'core/gate/reference-single-use-gate.mjs',
    'core/reference-data/plain-data-snapshot.mjs',
    'docs/adr/ADR-POMRX-CORE-EXACT-AUTH-GATE.md',
    'package.json',
    'tests/pom-rx-core-durable-child-directory-rebinding.node.test.mjs',
    'tests/pom-rx-core-durable-fd-reuse.node.test.mjs',
    'tests/pom-rx-core-durable-gate-bootstrap-intrinsic.node.test.mjs',
    'tests/pom-rx-core-durable-gate-current-head-regressions.node.test.mjs',
    'tests/pom-rx-core-durable-gate-intrinsic-hardening.node.test.mjs',
    'tests/pom-rx-core-durable-gate-issue-options.node.test.mjs',
    'tests/pom-rx-core-durable-gate.node.test.mjs',
    'tests/pom-rx-core-exact-authorization-intrinsic.node.test.mjs',
    'tests/pom-rx-core-reference-gate-temporal.node.test.mjs',
    'tests/pom-rx-core-reference-gate.node.test.mjs',
    'tests/pom-rx-reference-plain-data-intrinsic-hardening.node.test.mjs',
}
changed = subprocess.check_output(
    ['git', 'diff', '--name-only', 'origin/main...HEAD'], text=True
).splitlines()
for path in changed:
    if path in allow:
        continue
    exists_on_main = subprocess.run(
        ['git', 'cat-file', '-e', f'origin/main:{path}'],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0
    if exists_on_main:
        subprocess.run(['git', 'checkout', 'origin/main', '--', path], check=True)
    else:
        p = Path(path)
        if p.is_dir():
            shutil.rmtree(p)
        elif p.exists() or p.is_symlink():
            p.unlink()

# Temporary writer artifacts must never enter the PR candidate tree.
for temp in (
    Path('.github/core-001-writer.py'),
    Path('.github/workflows/core-001-bounded-writer.yml'),
):
    if temp.exists():
        temp.unlink()

# Collapse history to one bounded commit rooted exactly at current trusted main.
subprocess.run(['git', 'reset', 'origin/main'], check=True)
subprocess.run(['git', 'add', '-A'], check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)

names = subprocess.check_output(
    ['git', 'diff', '--cached', '--name-only'], text=True
).splitlines()
for name in names:
    if name.startswith('applications/') or name.startswith('sdk/'):
        raise SystemExit(f'application/SDK scope leaked into CORE-001: {name}')
    if 'wallet-guard' in name.lower():
        raise SystemExit(f'Wallet Guard scope leaked into CORE-001: {name}')
    if name.startswith('.github/'):
        raise SystemExit(f'temporary/CI workflow scope leaked into CORE-001: {name}')

print('BOUNDED_CORE_FILES')
for name in names:
    print(name)
