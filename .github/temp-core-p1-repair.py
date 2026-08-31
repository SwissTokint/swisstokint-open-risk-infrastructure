from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(
            f"{path}: expected {expected} occurrence(s) of {old!r}, found {count}"
        )
    target.write_text(text.replace(old, new))


# P1-1 / P1-3: capture terminal publication and platform permission semantics
# at module initialization, before any asynchronous boundary can let same-realm
# code rebind the live built-in export or process.platform.
durable_path = Path("core/gate/reference-durable-claim-store.mjs")
durable = durable_path.read_text()
capture_anchor = "const FS_CLOSE_FD = closeFdCallback;\n"
if "const FS_LINK = link;" not in durable:
    if durable.count(capture_anchor) != 1:
        raise SystemExit("durable store: fd capture anchor not unique")
    durable = durable.replace(
        capture_anchor,
        capture_anchor + "const FS_LINK = link;\nconst PROCESS_PLATFORM = process.platform;\n",
        1,
    )
if durable.count("await link(tempPath, filePath);") != 1:
    raise SystemExit("durable store: terminal link call not unique")
durable = durable.replace(
    "await link(tempPath, filePath);",
    "await REFLECT_APPLY(FS_LINK, undefined, [tempPath, filePath]);",
    1,
)
if durable.count("process.platform !== 'win32'") != 1:
    raise SystemExit("durable store: live process.platform check not unique")
durable = durable.replace("process.platform !== 'win32'", "PROCESS_PLATFORM !== 'win32'", 1)
durable_path.write_text(durable)


# P1-2: numeric property keys can be passed directly to captured defineProperty.
# Avoid the mutable global String constructor entirely on the reason path.
for file_name in (
    "applications/blockchain-digital-assets/wallet-guard/policy.mjs",
    "applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs",
):
    target = Path(file_name)
    text = target.read_text()
    if "String(index)" not in text:
        raise SystemExit(f"{file_name}: expected live String(index) call")
    target.write_text(text.replace("String(index)", "index"))


# P1-4: sensitive-call audit insertion must not dispatch through mutable
# Array.prototype.push. controlled-host already owns a captured defineProperty
# insertion helper; use it for the audit array too.
host_path = Path("applications/blockchain-digital-assets/wallet-guard/controlled-host.mjs")
host = host_path.read_text()
old_audit = "      state.sensitiveCalls.push(captureSensitiveRequest(request));"
new_audit = """      defineArrayElement(
        state.sensitiveCalls,
        state.sensitiveCalls.length,
        captureSensitiveRequest(request),
      );"""
if host.count(old_audit) != 1:
    raise SystemExit("controlled host: sensitive-call push not unique")
host_path.write_text(host.replace(old_audit, new_audit, 1))


# P1-5: capture Set constructor/has/add before any post-await mutation. Reuse
# these captures for the private forbidden-key set, duplicate-account check and
# run/preflight/witness replay bookkeeping so the whole local Set boundary is
# internally consistent.
provider_path = Path("applications/blockchain-digital-assets/wallet-guard/provider.mjs")
provider = provider_path.read_text()
set_anchor = "const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);\n"
if "const SET_HAS = Set.prototype.has;" not in provider:
    if provider.count(set_anchor) != 1:
        raise SystemExit("provider: Set capture anchor not unique")
    provider = provider.replace(
        set_anchor,
        "const REFLECT_APPLY = Reflect.apply;\n"
        "const SET_CONSTRUCTOR = Set;\n"
        "const SET_HAS = Set.prototype.has;\n"
        "const SET_ADD = Set.prototype.add;\n"
        "const FORBIDDEN_KEYS = new SET_CONSTRUCTOR(['__proto__', 'constructor', 'prototype']);\n",
        1,
    )
fail_anchor = """function fail(code, message) {
  throw new WalletGuardProviderError(code, message);
}
"""
helpers = """
function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function setAdd(set, value) {
  REFLECT_APPLY(SET_ADD, set, [value]);
}
"""
if "function setHas(set, value)" not in provider:
    if provider.count(fail_anchor) != 1:
        raise SystemExit("provider: fail helper anchor not unique")
    provider = provider.replace(fail_anchor, fail_anchor + helpers, 1)
replacements = (
    ("FORBIDDEN_KEYS.has(key)", "setHas(FORBIDDEN_KEYS, key)"),
    ("new Set(normalized).size", "new SET_CONSTRUCTOR(normalized).size"),
    ("const usedRunIds = new Set();", "const usedRunIds = new SET_CONSTRUCTOR();"),
    ("const usedPreflightHashes = new Set();", "const usedPreflightHashes = new SET_CONSTRUCTOR();"),
    ("const usedWitnessHashes = new Set();", "const usedWitnessHashes = new SET_CONSTRUCTOR();"),
    ("usedRunIds.has(referenceAuthorization.run_id)", "setHas(usedRunIds, referenceAuthorization.run_id)"),
    ("usedPreflightHashes.has(referenceAuthorization.preflight_receipt_hash)", "setHas(usedPreflightHashes, referenceAuthorization.preflight_receipt_hash)"),
    ("usedWitnessHashes.has(referenceAuthorization.witness_ack_hash)", "setHas(usedWitnessHashes, referenceAuthorization.witness_ack_hash)"),
    ("usedRunIds.add(referenceAuthorization.run_id);", "setAdd(usedRunIds, referenceAuthorization.run_id);"),
    ("usedPreflightHashes.add(referenceAuthorization.preflight_receipt_hash);", "setAdd(usedPreflightHashes, referenceAuthorization.preflight_receipt_hash);"),
    ("usedWitnessHashes.add(referenceAuthorization.witness_ack_hash);", "setAdd(usedWitnessHashes, referenceAuthorization.witness_ack_hash);"),
)
for old, new in replacements:
    if provider.count(old) != 1:
        raise SystemExit(f"provider: expected exactly one {old!r}")
    provider = provider.replace(old, new, 1)
provider_path.write_text(provider)


# Permanent exploit regressions for terminal-link and process.platform P1s.
durable_test_path = Path("tests/pom-rx-core-durable-gate-intrinsic-hardening.node.test.mjs")
durable_test = durable_test_path.read_text()
old_import = """import {
  mkdtemp,
  open,
  rm,
} from 'node:fs/promises';
"""
new_import = """import fsPromises, {
  chmod,
  mkdtemp,
  open,
  rm,
} from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
"""
if "syncBuiltinESMExports" not in durable_test:
    if durable_test.count(old_import) != 1:
        raise SystemExit("durable hardening test: fs/promises import anchor not unique")
    durable_test = durable_test.replace(old_import, new_import, 1)
if "terminal link live-binding poisoning" not in durable_test:
    durable_test += """

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
"""
durable_test_path.write_text(durable_test)


# Permanent exploit regressions for reason insertion, sensitive-call audit and
# replay bookkeeping. Mutation is introduced only after the request has crossed
# its initial synchronous capture boundary.
host_test_path = Path("tests/wallet-guard/controlled-host-v2.node.test.mjs")
host_test = host_test_path.read_text()
if "global String poisoning cannot erase a policy DENY" not in host_test:
    host_test += """

test('post-await global String poisoning cannot erase a policy DENY', async () => {
  const OriginalString = globalThis.String;
  const { page, testAuthority } = createHost();
  const pending = page.ethereum.request(sendTransaction({
    to: OTHER_ACCOUNT,
    value: '0x1',
  }));

  try {
    globalThis.String = function poisonedString(value) {
      if (typeof value === 'number') return '999999';
      return Reflect.apply(OriginalString, undefined, [value]);
    };
    const result = await pending;
    assert.equal(result.decision, 'DENY');
    assert.equal(result.forwarded, false);
  } finally {
    globalThis.String = OriginalString;
  }

  assert.equal(testAuthority.inspect().sensitive_call_count, 0);
});

test('post-await Array.prototype.push poisoning cannot suppress sensitive-call audit evidence', async () => {
  const originalPush = Array.prototype.push;
  let poisonInstalled = false;
  const { page, testAuthority } = createHost({
    referenceAuthorizationForRequest: referenceAuthorizationFactory({
      onCall: () => {
        if (poisonInstalled) return;
        poisonInstalled = true;
        Array.prototype.push = function poisonedPush(...values) {
          if (values.length === 1
              && values[0]
              && typeof values[0] === 'object'
              && values[0].method === 'eth_sendTransaction') {
            return this.length;
          }
          return Reflect.apply(originalPush, this, values);
        };
      },
    }),
  });

  try {
    const result = await page.ethereum.request(sendTransaction({ value: '0x1' }));
    assert.equal(result.decision, 'ALLOW');
    assert.equal(result.forwarded, true);
  } finally {
    Array.prototype.push = originalPush;
  }

  const state = testAuthority.inspect();
  assert.equal(state.sensitive_call_count, 1);
  assert.equal(state.sensitive_calls[0].method, 'eth_sendTransaction');
});

test('post-await Set.prototype.has poisoning cannot replay identical reference authorization', async () => {
  const originalHas = Set.prototype.has;
  const repeatedAuthorization = referenceAuthorizationRecord(1);
  let calls = 0;
  const { page, testAuthority } = createHost({
    referenceAuthorizationForRequest: () => {
      calls += 1;
      if (calls === 2) {
        Set.prototype.has = function poisonedHas() {
          return false;
        };
      }
      return repeatedAuthorization;
    },
  });

  try {
    const first = await page.ethereum.request(sendTransaction({ value: '0x1' }));
    assert.equal(first.forwarded, true);
    await assert.rejects(
      page.ethereum.request(sendTransaction({ value: '0x1' })),
      (error) => error?.code === 'POMRX_WG_PROVIDER_E_REFERENCE_REPLAY',
    );
  } finally {
    Set.prototype.has = originalHas;
  }

  assert.equal(calls, 2);
  assert.equal(testAuthority.inspect().sensitive_call_count, 1);
});
"""
host_test_path.write_text(host_test)
