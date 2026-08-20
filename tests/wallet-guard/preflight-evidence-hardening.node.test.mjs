import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createWalletGuardPreflightEvidenceBuilder,
  WalletGuardPreflightEvidenceError,
} from '../../applications/blockchain-digital-assets/wallet-guard/preflight-evidence.mjs';
import {
  normalizeWalletGuardIntent,
} from '../../applications/blockchain-digital-assets/wallet-guard/intent.mjs';

const ACCOUNT = `0x${'1'.repeat(40)}`;
const RECIPIENT = `0x${'3'.repeat(40)}`;
const ORIGIN = 'https://fixture.wallet-guard.local';
const CHAIN_ID = '0x1';
const FIXED_TIME = '2026-08-20T01:00:00.000Z';

function localIntent(requestId = 'wg-preflight-hardening-0001') {
  return normalizeWalletGuardIntent({
    requestId,
    trustedOrigin: ORIGIN,
    trustedChainId: CHAIN_ID,
    trustedAccount: ACCOUNT,
    request: {
      method: 'eth_sendTransaction',
      params: [{
        from: ACCOUNT,
        to: RECIPIENT,
        value: '0x1',
        data: '0x',
      }],
    },
  });
}

function policy() {
  return {
    schema_version: 'wallet-guard-policy/0.1',
    policy_id: 'wallet-guard-preflight-hardening/0.1',
    enabled: true,
    kill_switch: false,
    expected_chain_id: CHAIN_ID,
    allowed_origins: [ORIGIN],
    allowed_targets: [],
    allowed_recipients: [RECIPIENT],
    allowed_spenders: [],
    allowed_typed_data_verifying_contracts: [],
    max_native_value: '1000',
    max_token_amount: '1000',
    deny_unlimited_allowance: true,
    deny_operator_approval: true,
    require_simulation_for: [],
  };
}

function input(intentValue = localIntent()) {
  return {
    intent: intentValue,
    policy: policy(),
    evidenceId: 'evidence_wg_preflight_hardening_0001',
    runId: 'run_wg_preflight_hardening_0001',
    agentRef: 'wallet-guard-hardening-agent',
    subjectRef: 'wallet:hardening-subject-01',
    sourceKeyId: 'wallet-guard-source-01',
  };
}

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardPreflightEvidenceError);
  assert.equal(error.code, code);
  return true;
}

test('live and revoked Proxy wrappers fail before Array.isArray or prototype inspection', () => {
  const liveOptions = new Proxy({ trustedClock: () => FIXED_TIME }, {});
  assert.throws(
    () => createWalletGuardPreflightEvidenceBuilder(liveOptions),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );

  const revokedOptions = Proxy.revocable({ trustedClock: () => FIXED_TIME }, {});
  revokedOptions.revoke();
  assert.throws(
    () => createWalletGuardPreflightEvidenceBuilder(revokedOptions.proxy),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );

  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
  const liveInput = new Proxy(input(), {});
  assert.throws(
    () => evidenceBuilder.build(liveInput),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );

  const revokedInput = Proxy.revocable(input(), {});
  revokedInput.revoke();
  assert.throws(
    () => evidenceBuilder.build(revokedInput.proxy),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );
});

test('hidden unknown fields and custom prototypes fail the exact record boundary', () => {
  const hidden = input();
  Object.defineProperty(hidden, 'hiddenPolicyOverride', {
    value: true,
    enumerable: false,
  });
  assert.throws(
    () => createWalletGuardPreflightEvidenceBuilder({ trustedClock: () => FIXED_TIME }).build(hidden),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );

  const custom = input();
  Object.setPrototypeOf(custom, { inherited: true });
  assert.throws(
    () => createWalletGuardPreflightEvidenceBuilder({ trustedClock: () => FIXED_TIME }).build(custom),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );

  const options = { trustedClock: () => FIXED_TIME };
  Object.defineProperty(options, 'hiddenClockOverride', {
    value: true,
    enumerable: false,
  });
  assert.throws(
    () => createWalletGuardPreflightEvidenceBuilder(options),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_INVALID'),
  );
});

test('inherited descriptor get/set poisoning cannot rewrite top-level captured values', () => {
  const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, 'get');
  const originalSet = Object.getOwnPropertyDescriptor(Object.prototype, 'set');
  let hostileReads = 0;

  Object.defineProperty(Object.prototype, 'get', {
    configurable: true,
    get() {
      hostileReads += 1;
      return () => FIXED_TIME;
    },
  });
  Object.defineProperty(Object.prototype, 'set', {
    configurable: true,
    get() {
      hostileReads += 1;
      return () => {};
    },
  });

  try {
    const evidence = createWalletGuardPreflightEvidenceBuilder({
      trustedClock: () => FIXED_TIME,
    }).build(input());
    assert.equal(evidence.wallet_guard_decision, 'ALLOW');
    assert.equal(hostileReads, 0);
  } finally {
    if (originalGet) Object.defineProperty(Object.prototype, 'get', originalGet);
    else delete Object.prototype.get;
    if (originalSet) Object.defineProperty(Object.prototype, 'set', originalSet);
    else delete Object.prototype.set;
  }
});

test('foreign canonicalizer TypeError from intent commitment preserves exact provenance', () => {
  const intentValue = localIntent();
  const rawInput = input(intentValue);
  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('foreign intent canonicalizer failure');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'schema_version' && form === 'NFKC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    assert.throws(
      () => evidenceBuilder.build(rawInput),
      (error) => {
        assert.equal(error, sentinel);
        return true;
      },
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }
});

test('foreign runtime TypeError from policy evaluation is not collapsed into policy rejection', () => {
  const intentValue = localIntent();
  const rawInput = input(intentValue);
  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('foreign policy canonicalizer failure');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'allowed_origins' && form === 'NFKC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    assert.throws(
      () => evidenceBuilder.build(rawInput),
      (error) => {
        assert.equal(error, sentinel);
        assert.equal(error instanceof WalletGuardPreflightEvidenceError, false);
        return true;
      },
    );
  } finally {
    String.prototype.normalize = originalNormalize;
  }
});

test('failed foreign-runtime attempt does not consume evidence or run replay identity', () => {
  const intentValue = localIntent();
  const rawInput = input(intentValue);
  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('foreign transient failure');

  String.prototype.normalize = function normalize(form) {
    if (String(this) === 'schema_version' && form === 'NFKC') throw sentinel;
    return originalNormalize.call(this, form);
  };
  try {
    assert.throws(() => evidenceBuilder.build(rawInput), (error) => error === sentinel);
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  const evidence = evidenceBuilder.build(rawInput);
  assert.equal(evidence.wallet_guard_decision, 'ALLOW');
});

test('an accepted clock sample remains monotonic even if later evidence construction fails', () => {
  const times = [
    '2026-08-20T01:00:02.000Z',
    '2026-08-20T01:00:01.000Z',
  ];
  let timeIndex = 0;
  const rawInput = input();
  const originalNormalize = String.prototype.normalize;
  const sentinel = new TypeError('post-clock construction failure');
  let injectPostClockFailure = true;
  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => {
      const sampled = times[Math.min(timeIndex++, times.length - 1)];
      if (injectPostClockFailure) {
        injectPostClockFailure = false;
        String.prototype.normalize = function normalize(form) {
          if (String(this) === 'schema_version' && form === 'NFKC') throw sentinel;
          return originalNormalize.call(this, form);
        };
      }
      return sampled;
    },
  });

  try {
    assert.throws(() => evidenceBuilder.build(rawInput), (error) => error === sentinel);
  } finally {
    String.prototype.normalize = originalNormalize;
  }

  assert.throws(
    () => evidenceBuilder.build(rawInput),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_TIME_ROLLBACK'),
  );
});

test('local replay identity memory is bounded and fails closed at capacity', () => {
  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
  const intentValue = localIntent();

  for (let index = 0; index < 1_000; index += 1) {
    const suffix = String(index).padStart(4, '0');
    evidenceBuilder.build({
      ...input(intentValue),
      evidenceId: `evidence_wg_preflight_capacity_${suffix}`,
      runId: `run_wg_preflight_capacity_${suffix}`,
    });
  }

  assert.throws(
    () => evidenceBuilder.build({
      ...input(intentValue),
      evidenceId: 'evidence_wg_preflight_capacity_overflow',
      runId: 'run_wg_preflight_capacity_overflow',
    }),
    (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_CAPACITY'),
  );
});

test('replay rejection ignores later Set.prototype has/size poisoning', { concurrency: false }, () => {
  const originalHas = Object.getOwnPropertyDescriptor(Set.prototype, 'has');
  const originalSize = Object.getOwnPropertyDescriptor(Set.prototype, 'size');
  const evidenceBuilder = createWalletGuardPreflightEvidenceBuilder({
    trustedClock: () => FIXED_TIME,
  });
  const intentValue = localIntent();
  let firstInput;

  // Populate the private replay registry under the normal runtime. The later
  // poisoning is intentionally applied only to the rejection paths so this
  // regression isolates the preflight replay registry rather than changing
  // unrelated Set users inside the Wallet Guard policy implementation.
  for (let index = 0; index < 1_000; index += 1) {
    const suffix = String(index).padStart(4, '0');
    const rawInput = {
      ...input(intentValue),
      evidenceId: `evidence_wg_preflight_set_poison_${suffix}`,
      runId: `run_wg_preflight_set_poison_${suffix}`,
    };
    if (index === 0) firstInput = rawInput;
    evidenceBuilder.build(rawInput);
  }

  Object.defineProperty(Set.prototype, 'has', {
    configurable: true,
    writable: true,
    value() {
      return false;
    },
  });
  Object.defineProperty(Set.prototype, 'size', {
    configurable: true,
    get() {
      return 0;
    },
  });

  try {
    assert.throws(
      () => evidenceBuilder.build(firstInput),
      (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_REPLAY'),
    );
    assert.throws(
      () => evidenceBuilder.build({
        ...input(intentValue),
        evidenceId: 'evidence_wg_preflight_set_poison_overflow',
        runId: 'run_wg_preflight_set_poison_overflow',
      }),
      (error) => expectCode(error, 'POMRX_WG_PREFLIGHT_E_CAPACITY'),
    );
  } finally {
    Object.defineProperty(Set.prototype, 'has', originalHas);
    Object.defineProperty(Set.prototype, 'size', originalSize);
  }
});

test('replay registry pins Set.add instead of dispatching through a later mutable prototype', async () => {
  const source = await readFile(
    new URL(
      '../../applications/blockchain-digital-assets/wallet-guard/preflight-evidence.mjs',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(source, /const SET_ADD = Set\.prototype\.add;/u);
  assert.match(source, /REFLECT_APPLY\(SET_ADD, set, \[value\]\)/u);
  assert.doesNotMatch(source, /usedEvidenceIds\.add\(/u);
  assert.doesNotMatch(source, /usedRunIds\.add\(/u);
});
