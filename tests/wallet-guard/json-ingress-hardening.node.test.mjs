import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WalletGuardJsonIngressError,
  parseWalletGuardJsonIngress,
} from '../../applications/blockchain-digital-assets/wallet-guard/json-ingress.mjs';

function expectCode(error, code) {
  assert.ok(error instanceof WalletGuardJsonIngressError);
  assert.equal(error.code, code);
  return true;
}

test('escaped unpaired Unicode surrogates are rejected while a valid pair is accepted', () => {
  for (const escaped of ['\\ud800', '\\udfff']) {
    assert.throws(
      () => parseWalletGuardJsonIngress(`{"method":"eth_sign","params":["${escaped}"]}`),
      (error) => expectCode(error, 'POMRX_WG_JSON_E_UNICODE'),
    );
  }

  const valid = parseWalletGuardJsonIngress(
    '{"method":"eth_sign","params":["\\ud83d\\ude00"]}',
  );
  assert.equal(valid.request.params[0], '😀');
});

test('literal unpaired surrogate code units in the supplied JavaScript string are rejected', () => {
  const loneHigh = String.fromCharCode(0xd800);
  const raw = `{"method":"eth_sign","params":["${loneHigh}"]}`;
  assert.throws(
    () => parseWalletGuardJsonIngress(raw),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_UNICODE'),
  );
});

test('alternate numeric spellings that collapse under JavaScript parsing are rejected', () => {
  for (const token of ['-0', '1.0', '1e3', '1E+3', '0.0']) {
    assert.throws(
      () => parseWalletGuardJsonIngress(`{"method":"eth_chainId","params":[${token}]}`),
      (error) => expectCode(error, 'POMRX_WG_JSON_E_NUMBER'),
    );
  }
});

test('shared canonicalizer rejections are normalized to the ingress diagnostic family', () => {
  for (const raw of [
    '{"method":"eth_sign","params":[{"password":"not-a-secret-fixture"}]}',
    '{"method":"eth_sign","params":[{"é":"value"}]}',
  ]) {
    assert.throws(
      () => parseWalletGuardJsonIngress(raw),
      (error) => expectCode(error, 'POMRX_WG_JSON_E_CANONICAL'),
    );
  }
});

test('scanner bounds are aligned with the shared canonical payload string bound', () => {
  const acceptedText = 'a'.repeat(2_048);
  const accepted = parseWalletGuardJsonIngress(
    `{"method":"eth_sign","params":["${acceptedText}"]}`,
  );
  assert.equal(accepted.request.params[0].length, 2_048);

  const rejectedText = 'a'.repeat(2_049);
  assert.throws(
    () => parseWalletGuardJsonIngress(
      `{"method":"eth_sign","params":["${rejectedText}"]}`,
    ),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_BOUNDS'),
  );
});

test('decoded duplicate-key comparison cannot be bypassed with surrogate escapes', () => {
  const raw = '{"method":"eth_sign","params":[{"\\u0061":"first","a":"second"}]}';
  assert.throws(
    () => parseWalletGuardJsonIngress(raw),
    (error) => expectCode(error, 'POMRX_WG_JSON_E_DUPLICATE_KEY'),
  );
});
