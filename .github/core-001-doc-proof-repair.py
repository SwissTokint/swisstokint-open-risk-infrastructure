from pathlib import Path
import subprocess


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"expected exactly one match in {path}, found {count}: {old[:160]!r}"
        )
    p.write_text(text.replace(old, new, 1))


store_path = "core/gate/reference-durable-claim-store.mjs"
composition_path = "core/gate/reference-durable-single-use-gate.mjs"

# P1: do not allow a post-import mutation of Promise[Symbol.species] to control
# chaining from public durable-store promises. Pin an inert constructor carrier
# with an own immutable @@species=%Promise% exactly as the reviewed composed Gate
# already does.
replace_once(
    store_path,
    "const PROMISE_CONSTRUCTOR = Promise;\n"
    "const PROMISE_THEN = Promise.prototype.then;\n"
    "const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = REFLECT_APPLY(OBJECT_FREEZE, Object, [{\n"
    "  value: PROMISE_CONSTRUCTOR,\n"
    "  configurable: false,\n"
    "  enumerable: false,\n"
    "  writable: false,\n"
    "}]);\n"
    "const PROMISE_OWN_THEN_DESCRIPTOR = REFLECT_APPLY(OBJECT_FREEZE, Object, [{\n"
    "  value: PROMISE_THEN,\n"
    "  configurable: false,\n"
    "  enumerable: false,\n"
    "  writable: false,\n"
    "}]);\n",
    "const PROMISE_CONSTRUCTOR = Promise;\n"
    "const PROMISE_THEN = Promise.prototype.then;\n"
    "const PROMISE_SPECIES_KEY = Symbol.species;\n"
    "\n"
    "function makePromiseDescriptor(value) {\n"
    "  const descriptor = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);\n"
    "  descriptor.value = value;\n"
    "  descriptor.configurable = false;\n"
    "  descriptor.enumerable = false;\n"
    "  descriptor.writable = false;\n"
    "  return REFLECT_APPLY(OBJECT_FREEZE, Object, [descriptor]);\n"
    "}\n"
    "\n"
    "function makePromiseSpeciesCarrier() {\n"
    "  const carrier = REFLECT_APPLY(OBJECT_CREATE, Object, [null]);\n"
    "  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [\n"
    "    carrier,\n"
    "    PROMISE_SPECIES_KEY,\n"
    "    makePromiseDescriptor(PROMISE_CONSTRUCTOR),\n"
    "  ]);\n"
    "  return REFLECT_APPLY(OBJECT_FREEZE, Object, [carrier]);\n"
    "}\n"
    "\n"
    "const PROMISE_SPECIES_CARRIER = makePromiseSpeciesCarrier();\n"
    "const PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR = makePromiseDescriptor(\n"
    "  PROMISE_SPECIES_CARRIER,\n"
    ");\n"
    "const PROMISE_OWN_THEN_DESCRIPTOR = makePromiseDescriptor(PROMISE_THEN);\n",
)

replace_once(
    store_path,
    "function stabilizePromise(promise) {\n"
    "  // Await performs PromiseResolve(%Promise%, value). Immutable own captured\n"
    "  // constructor/then data properties prevent post-import Promise-prototype\n"
    "  // poisoning from substituting internal durable result channels.\n",
    "function stabilizePromise(promise) {\n"
    "  // Await/chaining must not consult mutable Promise prototype/species state.\n"
    "  // Each durable Promise owns the captured native then plus a frozen,\n"
    "  // null-prototype constructor carrier whose @@species is the captured\n"
    "  // intrinsic Promise.\n",
)

# P1: the security-critical realpath boundary must not obtain a Promise from
# node:fs/promises before Core can stabilize it. Use the captured callback API so
# Core creates and pins the only Promise in this adapter.
replace_once(
    store_path,
    "  readFileSync as readFileSyncCallback,\n"
    "  realpathSync as realpathSyncCallback,\n",
    "  readFileSync as readFileSyncCallback,\n"
    "  realpath as realpathCallback,\n"
    "  realpathSync as realpathSyncCallback,\n",
)
replace_once(
    store_path,
    "  readFile,\n"
    "  realpath,\n"
    "  unlink,\n"
    "} from 'node:fs/promises';\n",
    "  readFile,\n"
    "  unlink,\n"
    "} from 'node:fs/promises';\n",
)
replace_once(
    store_path,
    "const FS_REALPATH = realpath;\n",
    "const FS_REALPATH = realpathCallback;\n",
)
replace_once(
    store_path,
    "function fsRealpath(filePath) {\n"
    "  return stabilizePromise(REFLECT_APPLY(FS_REALPATH, undefined, [filePath]));\n"
    "}\n",
    "function fsRealpath(filePath) {\n"
    "  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n"
    "    REFLECT_APPLY(FS_REALPATH, undefined, [filePath, (error, resolvedPath) => {\n"
    "      if (error) reject(error);\n"
    "      else resolve(resolvedPath);\n"
    "    }]);\n"
    "  }));\n"
    "}\n",
)

# The composed Gate and standalone store are separate Core primitives and create
# distinct inert species-carrier objects. Accept a structurally exact safe carrier
# rather than requiring object identity, while still rejecting mutable/accessor/
# prototype-bearing constructor channels.
anchor = (
    "const PROMISE_OWN_SAFE_FINALLY_DESCRIPTOR = makePromiseDescriptor(stablePromiseFinally);\n"
    "\n"
    "function stabilizePromise(promise) {\n"
)
replacement = (
    "const PROMISE_OWN_SAFE_FINALLY_DESCRIPTOR = makePromiseDescriptor(stablePromiseFinally);\n"
    "\n"
    "function isSafePromiseSpeciesCarrier(value) {\n"
    "  if (value === null\n"
    "      || typeof value !== 'object'\n"
    "      || isProxy(value)\n"
    "      || objectGetPrototypeOf(value) !== null\n"
    "      || objectGetOwnPropertyNames(value).length !== 0) {\n"
    "    return false;\n"
    "  }\n"
    "  const symbols = objectGetOwnPropertySymbols(value);\n"
    "  if (symbols.length !== 1 || symbols[0] !== PROMISE_SPECIES_KEY) return false;\n"
    "  const descriptor = objectGetOwnPropertyDescriptors(value)[PROMISE_SPECIES_KEY];\n"
    "  return Boolean(descriptor)\n"
    "    && objectHasOwn(descriptor, 'value')\n"
    "    && descriptor.value === PROMISE_CONSTRUCTOR\n"
    "    && descriptor.enumerable === false\n"
    "    && descriptor.writable === false\n"
    "    && descriptor.configurable === false\n"
    "    && !objectHasOwn(descriptor, 'get')\n"
    "    && !objectHasOwn(descriptor, 'set');\n"
    "}\n"
    "\n"
    "function stabilizePromise(promise) {\n"
)
replace_once(composition_path, anchor, replacement)
replace_once(
    composition_path,
    "  } else if (descriptors.constructor.value !== PROMISE_CONSTRUCTOR\n"
    "      && descriptors.constructor.value !== PROMISE_SPECIES_CARRIER) {\n",
    "  } else if (descriptors.constructor.value !== PROMISE_CONSTRUCTOR\n"
    "      && descriptors.constructor.value !== PROMISE_SPECIES_CARRIER\n"
    "      && !isSafePromiseSpeciesCarrier(descriptors.constructor.value)) {\n",
)

changed = [
    line.strip()
    for line in subprocess.check_output(["git", "diff", "--name-only"], text=True).splitlines()
    if line.strip()
]
expected = [store_path, composition_path]
if changed != expected:
    raise SystemExit(f"unexpected bounded repair surface: {changed!r}; expected {expected!r}")
