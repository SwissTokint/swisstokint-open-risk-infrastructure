from pathlib import Path


def replace_exact(text: str, old: str, new: str, label: str, expected: int = 1) -> str:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} occurrence(s), found {count}")
    return text.replace(old, new, expected)


# P1: durable-root inspection must not depend on mutable live node:fs/promises
# exports, nor on mutable Stats prototype dispatch after an async boundary.
store_path = Path("core/gate/reference-durable-claim-store.mjs")
store = store_path.read_text()
store = replace_exact(
    store,
    "  close as closeFdCallback,\n  fsync as fsyncFdCallback,\n  open as openFdCallback,\n  writeFile as writeFileFdCallback,\n} from 'node:fs';",
    "  Stats,\n  close as closeFdCallback,\n  fsync as fsyncFdCallback,\n  open as openFdCallback,\n  writeFile as writeFileFdCallback,\n} from 'node:fs';",
    "capture Stats constructor",
)
store = replace_exact(
    store,
    "const FS_CLOSE_FD = closeFdCallback;\nconst FS_LINK = link;\nconst PROCESS_PLATFORM = process.platform;",
    "const FS_CLOSE_FD = closeFdCallback;\n"
    "const FS_LINK = link;\n"
    "const FS_LSTAT = lstat;\n"
    "const FS_MKDIR = mkdir;\n"
    "const FS_READ_FILE = readFile;\n"
    "const FS_REALPATH = realpath;\n"
    "const FS_UNLINK = unlink;\n"
    "const STATS_IS_DIRECTORY = Stats.prototype.isDirectory;\n"
    "const STATS_IS_FILE = Stats.prototype.isFile;\n"
    "const STATS_IS_SYMBOLIC_LINK = Stats.prototype.isSymbolicLink;\n"
    "const PROCESS_PLATFORM = process.platform;",
    "capture filesystem and Stats intrinsics",
)
store = replace_exact(
    store,
    "function arrayIsArray(value) {\n  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);\n}",
    "function fsLstat(filePath) {\n  return REFLECT_APPLY(FS_LSTAT, undefined, [filePath]);\n}\n\n"
    "function fsMkdir(filePath, options) {\n  return REFLECT_APPLY(FS_MKDIR, undefined, [filePath, options]);\n}\n\n"
    "function fsReadFile(filePath, options) {\n  return REFLECT_APPLY(FS_READ_FILE, undefined, [filePath, options]);\n}\n\n"
    "function fsRealpath(filePath) {\n  return REFLECT_APPLY(FS_REALPATH, undefined, [filePath]);\n}\n\n"
    "function fsUnlink(filePath) {\n  return REFLECT_APPLY(FS_UNLINK, undefined, [filePath]);\n}\n\n"
    "function statIsDirectory(stat) {\n  return REFLECT_APPLY(STATS_IS_DIRECTORY, stat, []);\n}\n\n"
    "function statIsFile(stat) {\n  return REFLECT_APPLY(STATS_IS_FILE, stat, []);\n}\n\n"
    "function statIsSymbolicLink(stat) {\n  return REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, stat, []);\n}\n\n"
    "function arrayIsArray(value) {\n  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);\n}",
    "insert captured filesystem wrappers",
)
for old, new, label in (
    ("await unlink(tempPath)", "await fsUnlink(tempPath)", "temp unlink"),
    ("await lstat(filePath)", "await fsLstat(filePath)", "record lstat"),
    ("await readFile(filePath, 'utf8')", "await fsReadFile(filePath, 'utf8')", "record read"),
    ("await lstat(configuredRoot)", "await fsLstat(configuredRoot)", "root lstat"),
    ("await realpath(configuredRoot)", "await fsRealpath(configuredRoot)", "root realpath"),
    ("await lstat(claimDirectory)", "await fsLstat(claimDirectory)", "claim-dir lstat"),
    ("await mkdir(claimDirectory, { mode: 0o700 })", "await fsMkdir(claimDirectory, { mode: 0o700 })", "claim-dir mkdir"),
    ("!stat.isFile() || stat.isSymbolicLink()", "!statIsFile(stat) || statIsSymbolicLink(stat)", "record stat predicates"),
    ("!stat.isDirectory()\n            || stat.isSymbolicLink()", "!statIsDirectory(stat)\n            || statIsSymbolicLink(stat)", "root stat predicates"),
    ("!directoryStat.isDirectory() || directoryStat.isSymbolicLink()", "!statIsDirectory(directoryStat) || statIsSymbolicLink(directoryStat)", "claim-dir stat predicates"),
):
    store = replace_exact(store, old, new, label)
for forbidden in ("await lstat(", "await realpath(", "await readFile(", "await mkdir(", "await unlink("):
    if forbidden in store:
        raise SystemExit(f"durable store still contains uncaptured call {forbidden}")
store_path.write_text(store)


# P1: controlled-host copies account arrays before await, but provider normalization
# must not later dispatch through mutable Array.prototype.map/every or iterable Set
# construction. Keep the fix at the provider account-normalization boundary.
provider_path = Path("applications/blockchain-digital-assets/wallet-guard/provider.mjs")
provider = provider_path.read_text()
provider = replace_exact(
    provider,
    "const REFLECT_APPLY = Reflect.apply;\nconst SET_CONSTRUCTOR = Set;",
    "const REFLECT_APPLY = Reflect.apply;\n"
    "const ARRAY_CONSTRUCTOR = Array;\n"
    "const ARRAY_IS_ARRAY = Array.isArray;\n"
    "const OBJECT_DEFINE_PROPERTY = Object.defineProperty;\n"
    "const OBJECT_FREEZE = Object.freeze;\n"
    "const SET_CONSTRUCTOR = Set;",
    "capture provider array/object intrinsics",
)
provider = replace_exact(
    provider,
    "function setHas(set, value) {\n  return REFLECT_APPLY(SET_HAS, set, [value]);\n}",
    "function arrayIsArray(value) {\n  return REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);\n}\n\n"
    "function defineArrayElement(array, index, value) {\n"
    "  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [array, index, {\n"
    "    value,\n    writable: true,\n    enumerable: true,\n    configurable: true,\n  }]);\n}\n\n"
    "function freezeValue(value) {\n  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);\n}\n\n"
    "function setHas(set, value) {\n  return REFLECT_APPLY(SET_HAS, set, [value]);\n}",
    "insert provider array/object wrappers",
)
provider = replace_exact(provider, "Array.isArray(value)", "arrayIsArray(value)", "provider Array.isArray", expected=2)
provider = replace_exact(
    provider,
    "function normalizeAccounts(value) {\n"
    "  if (!arrayIsArray(value) || value.length < 1 || value.length > MAX_ACCOUNTS) {\n"
    "    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider must expose a bounded non-empty accounts array');\n"
    "  }\n"
    "  const normalized = value.map(normalizeProviderAccount);\n"
    "  if (new SET_CONSTRUCTOR(normalized).size !== normalized.length) {\n"
    "    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider accounts cannot contain duplicates');\n"
    "  }\n"
    "  return Object.freeze(normalized);\n"
    "}",
    "function normalizeAccounts(value) {\n"
    "  if (!arrayIsArray(value) || value.length < 1 || value.length > MAX_ACCOUNTS) {\n"
    "    fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider must expose a bounded non-empty accounts array');\n"
    "  }\n"
    "  const normalized = new ARRAY_CONSTRUCTOR(value.length);\n"
    "  const seen = new SET_CONSTRUCTOR();\n"
    "  for (let index = 0; index < value.length; index += 1) {\n"
    "    const account = normalizeProviderAccount(value[index]);\n"
    "    if (setHas(seen, account)) {\n"
    "      fail('POMRX_WG_PROVIDER_E_CONTEXT_INVALID', 'provider accounts cannot contain duplicates');\n"
    "    }\n"
    "    setAdd(seen, account);\n"
    "    defineArrayElement(normalized, index, account);\n"
    "  }\n"
    "  return freezeValue(normalized);\n"
    "}",
    "rewrite provider account normalization",
)
provider = replace_exact(
    provider,
    "function sameAccounts(left, right) {\n  return left.length === right.length && left.every((value, index) => value === right[index]);\n}",
    "function sameAccounts(left, right) {\n"
    "  if (left.length !== right.length) return false;\n"
    "  for (let index = 0; index < left.length; index += 1) {\n"
    "    if (left[index] !== right[index]) return false;\n"
    "  }\n"
    "  return true;\n"
    "}",
    "rewrite account comparison",
)
provider_path.write_text(provider)


# Permanent exact exploit regression: poison the live fs/promises lstat export
# only after the store captures its boundary. A 0777 Unix root must still fail.
core_test_path = Path("tests/pom-rx-core-durable-gate-intrinsic-hardening.node.test.mjs")
core_test = core_test_path.read_text()
if "lstat live-binding poisoning cannot admit a world-writable Unix durable root" in core_test:
    raise SystemExit("durable lstat regression already exists")
core_test += r'''

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
'''
core_test_path.write_text(core_test)


# Permanent exact exploit regression: poison Array.prototype.map after request
# entry. A provider exposing OTHER_ACCOUNT must not be rewritten to ACCOUNT.
wg_test_path = Path("tests/wallet-guard/controlled-host-v2.node.test.mjs")
wg_test = wg_test_path.read_text()
if "post-entry Array.prototype.map poisoning cannot substitute the provider active account" in wg_test:
    raise SystemExit("provider map regression already exists")
wg_test += r'''

test('post-entry Array.prototype.map poisoning cannot substitute the provider active account', async () => {
  const originalMap = Array.prototype.map;
  const { page, testAuthority } = createHost({ accounts: [OTHER_ACCOUNT] });
  const pending = page.ethereum.request(sendTransaction({
    from: ACCOUNT,
    value: '0x1',
  }));

  try {
    Array.prototype.map = function poisonedMap(callback, thisArg) {
      if (this.length === 1 && this[0] === OTHER_ACCOUNT) return [ACCOUNT];
      return Reflect.apply(originalMap, this, [callback, thisArg]);
    };
    await assert.rejects(pending);
  } finally {
    Array.prototype.map = originalMap;
  }

  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});
'''
wg_test_path.write_text(wg_test)
