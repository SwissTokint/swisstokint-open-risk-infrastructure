const TRUSTED_OBJECT_CREATE = Object.create;
const TRUSTED_OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const TRUSTED_OBJECT_FREEZE = Object.freeze;
const TRUSTED_REFLECT_APPLY = Reflect.apply;
const TRUSTED_REGEXP_EXEC = RegExp.prototype.exec;

const CHAIN_ID_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const ACCOUNT_PATTERN = /^0x[0-9a-f]{40}$/u;
const FAILURE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/u;

export class WalletGuardTrustedContextError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletGuardTrustedContextError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletGuardTrustedContextError(code, message);
}

function patternMatches(pattern, value) {
  return typeof value === 'string'
    && TRUSTED_REFLECT_APPLY(TRUSTED_REGEXP_EXEC, pattern, [value]) !== null;
}

function defineFrozenData(target, key, value) {
  const descriptor = TRUSTED_OBJECT_CREATE(null);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.configurable = false;
  descriptor.writable = false;
  TRUSTED_REFLECT_APPLY(TRUSTED_OBJECT_DEFINE_PROPERTY, Object, [target, key, descriptor]);
}

function makeContext(chainId, account) {
  const context = TRUSTED_REFLECT_APPLY(TRUSTED_OBJECT_CREATE, Object, [null]);
  defineFrozenData(context, 'chain_id', chainId);
  defineFrozenData(context, 'account', account);
  return TRUSTED_REFLECT_APPLY(TRUSTED_OBJECT_FREEZE, Object, [context]);
}

/**
 * Capture already-trusted provider context through a synchronous scalar callback.
 *
 * The source is part of the application TCB. It must own current wallet context
 * independently of an untrusted Promise-return channel and synchronously invoke
 * exactly one terminal callback before returning. Structured callback payloads
 * and callback return values are deliberately excluded from this contract.
 */
export function captureWalletGuardTrustedContext(captureContext) {
  if (typeof captureContext !== 'function') {
    fail('POMRX_WG_CONTEXT_E_INVALID', 'trusted context source must be callable');
  }

  let terminalCount = 0;
  let terminalKind = null;
  let chainId = null;
  let account = null;
  let failureCode = null;
  let invalidSuccess = false;

  const deliverContext = (deliveredChainId, deliveredAccount) => {
    terminalCount += 1;
    if (terminalCount !== 1) return undefined;
    terminalKind = 'success';
    if (!patternMatches(CHAIN_ID_PATTERN, deliveredChainId)
        || !patternMatches(ACCOUNT_PATTERN, deliveredAccount)) {
      invalidSuccess = true;
      return undefined;
    }
    chainId = deliveredChainId;
    account = deliveredAccount;
    return undefined;
  };

  const reportFailure = (code) => {
    terminalCount += 1;
    if (terminalCount !== 1) return undefined;
    terminalKind = 'failure';
    failureCode = patternMatches(FAILURE_CODE_PATTERN, code)
      ? code
      : 'CONTEXT_FAILURE';
    return undefined;
  };

  let returnValue;
  let sourceThrew = false;
  try {
    returnValue = TRUSTED_REFLECT_APPLY(
      captureContext,
      undefined,
      [deliverContext, reportFailure],
    );
  } catch {
    sourceThrew = true;
  }

  if (terminalCount > 1) {
    fail(
      'POMRX_WG_CONTEXT_E_CONTRADICTORY',
      'trusted context source emitted duplicate or contradictory terminal callbacks',
    );
  }
  if (sourceThrew) {
    fail('POMRX_WG_CONTEXT_E_SOURCE_FAILURE', 'trusted context source threw');
  }
  if (returnValue !== undefined) {
    fail(
      'POMRX_WG_CONTEXT_E_RETURN_VALUE',
      'trusted context source must return undefined; return values are not evidence',
    );
  }
  if (terminalCount === 0) {
    fail('POMRX_WG_CONTEXT_E_MISSING', 'trusted context source emitted no terminal callback');
  }
  if (terminalKind === 'failure') {
    fail(
      'POMRX_WG_CONTEXT_E_SOURCE_FAILURE',
      `trusted context source reported ${failureCode}`,
    );
  }
  if (terminalKind !== 'success' || invalidSuccess || chainId === null || account === null) {
    fail('POMRX_WG_CONTEXT_E_INVALID', 'trusted context source emitted invalid context');
  }

  return makeContext(chainId, account);
}
