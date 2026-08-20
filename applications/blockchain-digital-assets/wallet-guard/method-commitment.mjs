import {
  sha256Hex,
} from '../../../sdk/typescript/swisstokint-proof.mjs';

export const WALLET_GUARD_METHOD_COMMIT_DOMAIN =
  'swisstokint:pom-rx-wallet-guard-method:v1:';

const RPC_METHOD_PATTERN = /^[A-Za-z0-9_]{1,64}$/u;

export function commitWalletGuardMethod(method) {
  if (typeof method !== 'string' || !RPC_METHOD_PATTERN.test(method)) {
    throw new TypeError('Wallet Guard RPC method has an invalid format');
  }
  return sha256Hex(`${WALLET_GUARD_METHOD_COMMIT_DOMAIN}${method}`);
}
