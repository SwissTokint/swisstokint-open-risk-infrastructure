import { readFile, rm, writeFile } from 'node:fs/promises';

async function replaceExact(path, before, after) {
  const source = await readFile(path, 'utf8');
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${path}: expected patch anchor not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${path}: expected patch anchor is not unique`);
  }
  await writeFile(path, `${source.slice(0, first)}${after}${source.slice(first + before.length)}`, 'utf8');
}

async function replaceExactCount(path, before, after, expectedCount) {
  const source = await readFile(path, 'utf8');
  let count = 0;
  let offset = 0;
  while (true) {
    const index = source.indexOf(before, offset);
    if (index < 0) break;
    count += 1;
    offset = index + before.length;
  }
  if (count !== expectedCount) {
    throw new Error(`${path}: expected ${expectedCount} patch anchors, found ${count}`);
  }
  await writeFile(path, source.split(before).join(after), 'utf8');
}

await replaceExact(
  'core/gate/reference-durable-single-use-gate.mjs',
  `const PROMISE_CONSTRUCTOR = Promise;\nconst PROMISE_THEN = Promise.prototype.then;\nconst PROMISE_SPECIES_KEY = Symbol.species;`,
  `const PROMISE_CONSTRUCTOR = Promise;\nconst PROMISE_THEN = Promise.prototype.then;\nconst PROMISE_FINALLY = Promise.prototype.finally;\nconst PROMISE_SPECIES_KEY = Symbol.species;`,
);

await replaceExact(
  'core/gate/reference-durable-single-use-gate.mjs',
  `const PROMISE_OWN_SAFE_THEN_DESCRIPTOR = makePromiseDescriptor(stablePromiseThen);\n\nfunction stabilizePromise(promise) {\n  // Public promises created by this boundary own both a safe then dispatch and\n  // a null-prototype constructor carrier with immutable @@species=%Promise%.\n  // This closes both direct \`.then()\` and inherited \`.finally()\` species lookup.\n  // Promises already stabilized by another reviewed Core primitive may retain\n  // constructor=%Promise% plus the captured native then and are accepted as\n  // trusted internal channels rather than rewritten through non-configurable slots.`,
  `const PROMISE_OWN_SAFE_THEN_DESCRIPTOR = makePromiseDescriptor(stablePromiseThen);\n\nfunction stablePromiseFinally(onFinally) {\n  // Invoke the captured native finally directly. The source Promise owns the\n  // safe then dispatch and immutable constructor carrier, so native finally\n  // cannot reach a post-import Promise.prototype.finally/then/species mutation.\n  return stabilizePromise(REFLECT_APPLY(\n    PROMISE_FINALLY,\n    this,\n    [onFinally],\n  ));\n}\n\nconst PROMISE_OWN_SAFE_FINALLY_DESCRIPTOR = makePromiseDescriptor(stablePromiseFinally);\n\nfunction stabilizePromise(promise) {\n  // Public promises created by this boundary own safe then/finally dispatch and\n  // a null-prototype constructor carrier with immutable @@species=%Promise%.\n  // Promises already stabilized by another reviewed Core primitive may retain\n  // constructor=%Promise% plus captured native methods and are accepted as\n  // trusted internal channels rather than rewritten through non-configurable slots.`,
);

await replaceExact(
  'core/gate/reference-durable-single-use-gate.mjs',
  `  if (!objectHasOwn(descriptors, 'then')) {\n    objectDefineProperty(promise, 'then', PROMISE_OWN_SAFE_THEN_DESCRIPTOR);\n  } else if (descriptors.then.value !== PROMISE_THEN\n      && descriptors.then.value !== stablePromiseThen) {\n    throw new TypeError('Reference durable Gate Promise then channel is invalid');\n  }\n  return promise;`,
  `  if (!objectHasOwn(descriptors, 'then')) {\n    objectDefineProperty(promise, 'then', PROMISE_OWN_SAFE_THEN_DESCRIPTOR);\n  } else if (descriptors.then.value !== PROMISE_THEN\n      && descriptors.then.value !== stablePromiseThen) {\n    throw new TypeError('Reference durable Gate Promise then channel is invalid');\n  }\n\n  if (!objectHasOwn(descriptors, 'finally')) {\n    objectDefineProperty(promise, 'finally', PROMISE_OWN_SAFE_FINALLY_DESCRIPTOR);\n  } else if (descriptors.finally.value !== PROMISE_FINALLY\n      && descriptors.finally.value !== stablePromiseFinally) {\n    throw new TypeError('Reference durable Gate Promise finally channel is invalid');\n  }\n  return promise;`,
);

await replaceExact(
  'core/gate/reference-single-use-gate.mjs',
  `    let resolvedResult;\n    try {\n      resolvedResult = await stabilizeDownstreamPromise(downstreamResult);\n    } catch {\n      completeConsumption(capability, 'CONSUMED_UNKNOWN');\n      throw gateError(\n        'POMRX_GATE_E_DOWNSTREAM_FAILED',\n        'Downstream execution failed or its asynchronous result channel is ambiguous',\n      );\n    }\n\n    let detachedResult;\n    try {\n      detachedResult = snapshotDownstreamResult(resolvedResult);\n    } catch (error) {\n      completeConsumption(capability, 'CONSUMED_UNKNOWN');\n      if (error instanceof PomRxGateError) throw error;\n      throw gateError(\n        'POMRX_GATE_E_DOWNSTREAM_FAILED',\n        'Downstream result could not be detached safely',\n      );\n    }`,
  `    let detachedResult;\n    if (isPromise(downstreamResult)) {\n      let resolvedResult;\n      try {\n        resolvedResult = await stabilizeDownstreamPromise(downstreamResult);\n      } catch {\n        completeConsumption(capability, 'CONSUMED_UNKNOWN');\n        throw gateError(\n          'POMRX_GATE_E_DOWNSTREAM_FAILED',\n          'Downstream execution failed or its asynchronous result channel is ambiguous',\n        );\n      }\n\n      try {\n        detachedResult = snapshotDownstreamResult(resolvedResult);\n      } catch (error) {\n        completeConsumption(capability, 'CONSUMED_UNKNOWN');\n        if (error instanceof PomRxGateError) throw error;\n        throw gateError(\n          'POMRX_GATE_E_DOWNSTREAM_FAILED',\n          'Downstream result could not be detached safely',\n        );\n      }\n    } else {\n      // A synchronous ordinary return value has no asynchronous result channel.\n      // Capture it before any Promise/await boundary can inspect an inherited\n      // then property and substitute the downstream result.\n      try {\n        detachedResult = snapshotDownstreamResult(downstreamResult);\n      } catch (error) {\n        completeConsumption(capability, 'CONSUMED_UNKNOWN');\n        if (error instanceof PomRxGateError) throw error;\n        throw gateError(\n          'POMRX_GATE_E_DOWNSTREAM_FAILED',\n          'Downstream result could not be detached safely',\n        );\n      }\n    }`,
);

await replaceExact(
  'core/gate/reference-durable-claim-store.mjs',
  `const STATS_IS_SYMBOLIC_LINK = Stats.prototype.isSymbolicLink;\nconst PROCESS_PLATFORM = process.platform;`,
  `const STATS_IS_SYMBOLIC_LINK = Stats.prototype.isSymbolicLink;\nconst PROCESS_PLATFORM = process.platform;\nconst PROCESS_PID = process.pid;`,
);

await replaceExactCount(
  'core/gate/reference-durable-claim-store.mjs',
  `\`.\${PATH_BASENAME(filePath)}.\${process.pid}.\${REFLECT_APPLY(CRYPTO_RANDOM_UUID, undefined, [])}.tmp\``,
  `\`.\${PATH_BASENAME(filePath)}.\${PROCESS_PID}.\${REFLECT_APPLY(CRYPTO_RANDOM_UUID, undefined, [])}.tmp\``,
  2,
);

await rm('scripts/core-001-writer-patch.mjs');
await rm('.github/workflows/core-001-writer.yml');
