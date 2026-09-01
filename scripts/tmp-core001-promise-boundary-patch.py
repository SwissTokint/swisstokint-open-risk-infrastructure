from pathlib import Path

path = Path('core/gate/reference-durable-claim-store.mjs')
s = path.read_text()


def once(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one occurrence, got {count}')
    s = s.replace(old, new, 1)


once(
    'const OBJECT_CREATE = Object.create;\nconst OBJECT_FREEZE = Object.freeze;',
    'const OBJECT_CREATE = Object.create;\nconst OBJECT_DEFINE_PROPERTY = Object.defineProperty;\nconst OBJECT_FREEZE = Object.freeze;',
    'capture Object.defineProperty',
)
once(
    'const PROMISE_CONSTRUCTOR = Promise;\nconst FS_OPEN_FD = openFdCallback;',
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
    "}]);\n"
    "const FS_OPEN_FD = openFdCallback;",
    'capture Promise boundary',
)
once(
    'const PROCESS_PLATFORM = process.platform;\n\nfunction makeStatSnapshot(stat) {',
    "const PROCESS_PLATFORM = process.platform;\n\n"
    "function stabilizePromise(promise) {\n"
    "  // Await performs PromiseResolve(%Promise%, value). Immutable own captured\n"
    "  // constructor/then data properties prevent post-import Promise-prototype\n"
    "  // poisoning from substituting internal durable result channels.\n"
    "  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [\n"
    "    promise,\n"
    "    'constructor',\n"
    "    PROMISE_OWN_CONSTRUCTOR_DESCRIPTOR,\n"
    "  ]);\n"
    "  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [\n"
    "    promise,\n"
    "    'then',\n"
    "    PROMISE_OWN_THEN_DESCRIPTOR,\n"
    "  ]);\n"
    "  return promise;\n"
    "}\n\n"
    "function makeStatSnapshot(stat) {",
    'insert stabilizePromise',
)

# Callback-backed promise factories.
for label, old, new in [
    (
        'fsLstat promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_LSTAT, undefined, [filePath, (error, stat) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_LSTAT, undefined, [filePath, (error, stat) => {',
    ),
    (
        'fsStat promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_STAT, undefined, [filePath, (error, stat) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_STAT, undefined, [filePath, (error, stat) => {',
    ),
    (
        'fsFstat promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_FSTAT_FD, undefined, [fd, (error, stat) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_FSTAT_FD, undefined, [fd, (error, stat) => {',
    ),
    (
        'openFd promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_OPEN_FD, undefined, [filePath, flags, mode, (error, fd) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_OPEN_FD, undefined, [filePath, flags, mode, (error, fd) => {',
    ),
    (
        'writeFileFd promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_WRITE_FILE_FD, undefined, [fd, value, encoding, (error) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_WRITE_FILE_FD, undefined, [fd, value, encoding, (error) => {',
    ),
    (
        'fsyncFd promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_FSYNC_FD, undefined, [fd, (error) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_FSYNC_FD, undefined, [fd, (error) => {',
    ),
    (
        'closeFd promise',
        '  return new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_CLOSE_FD, undefined, [fd, (error) => {',
        '  return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve, reject) => {\n    REFLECT_APPLY(FS_CLOSE_FD, undefined, [fd, (error) => {',
    ),
]:
    once(old, new, label)

for old, new, label in [
    ('  });\n}\n\nfunction fsStat(filePath)', '  }));\n}\n\nfunction fsStat(filePath)', 'fsLstat close'),
    ('  });\n}\n\nfunction fsFstat(fd)', '  }));\n}\n\nfunction fsFstat(fd)', 'fsStat close'),
    ('  });\n}\n\nfunction fsMkdir(filePath, options)', '  }));\n}\n\nfunction fsMkdir(filePath, options)', 'fsFstat close'),
    ('  });\n}\n\nfunction writeFileFd(fd, value, encoding)', '  }));\n}\n\nfunction writeFileFd(fd, value, encoding)', 'openFd close'),
    ('  });\n}\n\nfunction fsyncFd(fd)', '  }));\n}\n\nfunction fsyncFd(fd)', 'writeFileFd close'),
    ('  });\n}\n\nfunction closeFd(fd)', '  }));\n}\n\nfunction closeFd(fd)', 'fsyncFd close'),
    ('  });\n}\n\nasync function closeFdIgnoringFailure(fd)', '  }));\n}\n\nasync function closeFdIgnoringFailure(fd)', 'closeFd close'),
]:
    once(old, new, label)

# node:fs/promises returns native promises; harden them immediately.
for label, old, new in [
    ('fsMkdir', '  return REFLECT_APPLY(FS_MKDIR, undefined, [filePath, options]);', '  return stabilizePromise(REFLECT_APPLY(FS_MKDIR, undefined, [filePath, options]));'),
    ('fsReadFile', '  return REFLECT_APPLY(FS_READ_FILE, undefined, [filePath, options]);', '  return stabilizePromise(REFLECT_APPLY(FS_READ_FILE, undefined, [filePath, options]));'),
    ('fsRealpath', '  return REFLECT_APPLY(FS_REALPATH, undefined, [filePath]);', '  return stabilizePromise(REFLECT_APPLY(FS_REALPATH, undefined, [filePath]));'),
    ('fsUnlink', '  return REFLECT_APPLY(FS_UNLINK, undefined, [filePath]);', '  return stabilizePromise(REFLECT_APPLY(FS_UNLINK, undefined, [filePath]));'),
]:
    once(old, new, label)

# Async helper promises are hardened at the point where another async function awaits them.
s = s.replace('await closeFdIgnoringFailure(fd);', 'await stabilizePromise(closeFdIgnoringFailure(fd));')
s = s.replace('await fsyncDirectory(directory);', 'await stabilizePromise(fsyncDirectory(directory));')
once('      return await operation();', '      return await stabilizePromise(operation());', 'runOperation await')

# trustedRoot's own helper channels and shared bootstrap promise.
s = s.replace('const pathIdentity = await inspectConfiguredRoot();', 'const pathIdentity = await stabilizePromise(inspectConfiguredRoot());')
s = s.replace('const currentPathIdentity = await inspectConfiguredRoot();', 'const currentPathIdentity = await stabilizePromise(inspectConfiguredRoot());')
s = s.replace('await fsyncDirectory(PATH_DIRNAME(configuredRoot));', 'await stabilizePromise(fsyncDirectory(PATH_DIRNAME(configuredRoot)));')
once('trustedRootPromise = (async () => {', 'trustedRootPromise = stabilizePromise((async () => {', 'trustedRoot bootstrap open')
once('      })();\n    }\n\n    const root = await trustedRootPromise;', '      })());\n    }\n\n    const root = await trustedRootPromise;', 'trustedRoot bootstrap close')

# Every async trustedRoot return channel is stabilized before await.
s = s.replace('const rootRef = await trustedRoot();', 'const rootRef = await stabilizePromise(trustedRoot());')

# Public operations return a hardened promise, rather than an async wrapper whose
# promise could be assimilated by a poisoned inherited then.
for name, args, impl in [
    ('inspect', 'input', 'inspectImpl(input)'),
    ('claim', 'input', 'claimImpl(input)'),
    ('complete', 'handle, outcome', 'completeImpl(handle, outcome)'),
    ('abandon', 'handle', 'abandonImpl(handle)'),
]:
    once(
        f"  async function {name}({args}) {{\n    return runOperation(() => {impl});\n  }}",
        f"  function {name}({args}) {{\n    return stabilizePromise(runOperation(() => {impl}));\n  }}",
        f'public {name}',
    )

# close() is also a non-async public wrapper. Its single shared promise owns the
# final state transition and is hardened before any caller receives it.
close_start = s.find("  async function close() {\n")
return_start = s.find("\n  return freezeValue({\n", close_start)
if close_start < 0 or return_start < 0:
    raise SystemExit('close function slice not found')
new_close = """  function close() {
    if (lifecycleState === 'CLOSED') {
      return stabilizePromise(new PROMISE_CONSTRUCTOR((resolve) => resolve()));
    }
    if (lifecycleState === 'CLOSING') return closePromise;

    lifecycleState = 'CLOSING';
    closePromise = stabilizePromise((async () => {
      try {
        if (activeOperations > 0) {
          await stabilizePromise(new PROMISE_CONSTRUCTOR((resolve) => {
            drainResolve = resolve;
          }));
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
        if (root !== null) {
          let identityError = null;
          try {
            assertPinnedRootSync(root);
          } catch (error) {
            identityError = error;
          }
          const released = releasePinnedRootDescriptorSync(root);
          if (!released && identityError === null) {
            fail('POMRX_GATE_E_DURABLE_IO', 'durable claim root descriptor could not be closed');
          }
          if (identityError !== null) throw identityError;
        }
      } finally {
        lifecycleState = 'CLOSED';
      }
    })());
    return closePromise;
  }
"""
s = s[:close_start] + new_close + s[return_start:]

path.write_text(s)
