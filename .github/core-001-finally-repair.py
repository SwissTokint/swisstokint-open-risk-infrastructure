from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match in {path}, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


path = 'core/gate/reference-durable-single-use-gate.mjs'
replace_once(
    path,
    'const PROMISE_CONSTRUCTOR = Promise;\nconst PROMISE_THEN = Promise.prototype.then;\n',
    'const PROMISE_CONSTRUCTOR = Promise;\nconst PROMISE_THEN = Promise.prototype.then;\nconst PROMISE_SPECIES_KEY = Symbol.species;\n',
)

old = """const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_CONSTRUCTOR);

function stablePromiseThen(onFulfilled, onRejected) {
  const source = this;
  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {
    void (async () => {
      try {
        const value = await source;
        if (typeof onFulfilled === 'function') resolve(onFulfilled(value));
        else resolve(value);
      } catch (error) {
        if (typeof onRejected === 'function') {
          try {
            resolve(onRejected(error));
          } catch (callbackError) {
            reject(callbackError);
          }
        } else {
          reject(error);
        }
      }
    })();
  }));
}

const PROMISE_OWN_SAFE_THEN_DESCRIPTOR = makePromiseDescriptor(stablePromiseThen);

function stabilizePromise(promise) {
  // Await uses PromiseResolve(%Promise%, value). Pinning constructor=%Promise%
  // preserves direct adoption without consulting inherited then. Public promises
  // created by this boundary also receive a Core-owned then implementation that
  // constructs its result with the captured Promise directly, so mutable
  // Promise[Symbol.species] cannot rewrite a successful exposed chain.
  const descriptors = objectGetOwnPropertyDescriptors(promise);
  if (!objectHasOwn(descriptors, 'constructor')) {
    objectDefineProperty(promise, 'constructor', PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR);
  } else if (descriptors.constructor.value !== PROMISE_CONSTRUCTOR) {
    throw new TypeError('Reference durable Gate Promise constructor channel is invalid');
  }

  if (!objectHasOwn(descriptors, 'then')) {
    objectDefineProperty(promise, 'then', PROMISE_OWN_SAFE_THEN_DESCRIPTOR);
  } else if (descriptors.then.value !== PROMISE_THEN
      && descriptors.then.value !== stablePromiseThen) {
    throw new TypeError('Reference durable Gate Promise then channel is invalid');
  }
  return promise;
}
"""
new = """function makePromiseSpeciesCarrier() {
  const carrier = createObject(null);
  objectDefineProperty(
    carrier,
    PROMISE_SPECIES_KEY,
    makePromiseDescriptor(PROMISE_CONSTRUCTOR),
  );
  return freezeValue(carrier);
}

const PROMISE_SPECIES_CARRIER = makePromiseSpeciesCarrier();
const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(PROMISE_SPECIES_CARRIER);

function stablePromiseThen(onFulfilled, onRejected) {
  // Invoke the captured native then directly. The source Promise owns a frozen
  // constructor carrier whose @@species is the captured intrinsic Promise, so
  // native chaining cannot consult a later mutation of Promise[Symbol.species].
  return stabilizePromise(REFLECT_APPLY(
    PROMISE_THEN,
    this,
    [onFulfilled, onRejected],
  ));
}

const PROMISE_OWN_SAFE_THEN_DESCRIPTOR = makePromiseDescriptor(stablePromiseThen);

function stabilizePromise(promise) {
  // Public promises created by this boundary own both a safe then dispatch and
  // a null-prototype constructor carrier with immutable @@species=%Promise%.
  // This closes both direct `.then()` and inherited `.finally()` species lookup.
  // Promises already stabilized by another reviewed Core primitive may retain
  // constructor=%Promise% plus the captured native then and are accepted as
  // trusted internal channels rather than rewritten through non-configurable slots.
  const descriptors = objectGetOwnPropertyDescriptors(promise);
  if (!objectHasOwn(descriptors, 'constructor')) {
    objectDefineProperty(promise, 'constructor', PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR);
  } else if (descriptors.constructor.value !== PROMISE_CONSTRUCTOR
      && descriptors.constructor.value !== PROMISE_SPECIES_CARRIER) {
    throw new TypeError('Reference durable Gate Promise constructor channel is invalid');
  }

  if (!objectHasOwn(descriptors, 'then')) {
    objectDefineProperty(promise, 'then', PROMISE_OWN_SAFE_THEN_DESCRIPTOR);
  } else if (descriptors.then.value !== PROMISE_THEN
      && descriptors.then.value !== stablePromiseThen) {
    throw new TypeError('Reference durable Gate Promise then channel is invalid');
  }
  return promise;
}
"""
replace_once(path, old, new)

# Preserve the independently reproduced public-finally attack as a permanent
# regression on the CORE-001 branch.
test_path = Path('tests/pom-rx-core-durable-merge-blocker-regressions.node.test.mjs')
text = test_path.read_text()
name = 'public consume finally chain ignores post-import Promise Symbol.species poisoning'
if name in text:
    raise SystemExit('finally species regression already present')
text += """

test(
  'public consume finally chain ignores post-import Promise Symbol.species poisoning',
  { concurrency: false },
  async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'pom-rx-public-finally-species-'));
    let evidence;
    let poisonCalls = 0;
    const harness = createReferenceDurableSingleUseGateHarness({
      rootDir,
      trustedClock: clock(),
      observeBinding: async () => observedFrom(evidence),
      executeDownstream: () => Object.freeze({ accepted: true }),
    });
    const issued = harness.testAuthority.issueReferenceAuthorizationForTest(bindingInput(4), {
      witnessValidUntil: '2026-08-30T12:01:00.000Z',
    });
    evidence = issued.evidence;

    const consumePromise = harness.gate.consume(issued.capability, { raw: true });
    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    let chained;
    try {
      function PoisonSpecies(executor) {
        poisonCalls += 1;
        return new Promise((_resolve, reject) => {
          executor(
            () => reject(new Error('poisoned Promise species converted finally fulfillment to rejection')),
            reject,
          );
        });
      }
      Object.defineProperty(Promise, Symbol.species, {
        value: PoisonSpecies,
        configurable: true,
        enumerable: false,
        writable: true,
      });
      chained = consumePromise.finally(() => undefined);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    }

    try {
      assert.deepEqual(await chained, { accepted: true });
      assert.equal(poisonCalls, 0, 'public hardened finally must not consult mutable Promise species');
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
"""
test_path.write_text(text)
