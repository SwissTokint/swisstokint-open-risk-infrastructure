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

function captureRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') {
    fail(
      'POMRX_WG_CONTEXT_E_RUNTIME',
      'trusted context capture requires an application-owned primordial runtime',
    );
  }

  const objectCreate = runtime.objectCreate;
  const objectDefineProperty = runtime.objectDefineProperty;
  const objectFreeze = runtime.objectFreeze;
  const reflectApply = runtime.reflectApply;
  const regexpExec = runtime.regexpExec;

  if (typeof objectCreate !== 'function'
      || typeof objectDefineProperty !== 'function'
      || typeof objectFreeze !== 'function'
      || typeof reflectApply !== 'function'
      || typeof regexpExec !== 'function') {
    fail(
      'POMRX_WG_CONTEXT_E_RUNTIME',
      'trusted context primordial runtime is incomplete',
    );
  }

  return {
    objectCreate,
    objectDefineProperty,
    objectFreeze,
    reflectApply,
    regexpExec,
  };
}

function apply(runtime, fn, receiver, args) {
  return runtime.reflectApply(fn, receiver, args);
}

function patternMatches(runtime, pattern, value) {
  return typeof value === 'string'
    && apply(runtime, runtime.regexpExec, pattern, [value]) !== null;
}

function defineFrozenData(runtime, target, key, value) {
  const descriptor = apply(runtime, runtime.objectCreate, undefined, [null]);
  descriptor.value = value;
  descriptor.enumerable = true;
  descriptor.configurable = false;
  descriptor.writable = false;
  apply(runtime, runtime.objectDefineProperty, undefined, [target, key, descriptor]);
}

function makeContext(runtime, chainId, account) {
  const context = apply(runtime, runtime.objectCreate, undefined, [null]);
  defineFrozenData(runtime, context, 'chain_id', chainId);
  defineFrozenData(runtime, context, 'account', account);
  return apply(runtime, runtime.objectFreeze, undefined, [context]);
}

/**
 * Capture already-trusted provider context through a synchronous scalar callback.
 *
 * `trustedRuntime` is part of the application TCB and must contain primordial
 * operations captured before untrusted same-realm code can mutate ambient
 * intrinsics (or obtained from an independently trusted realm). This module
 * deliberately does not capture Object/Reflect/RegExp operations at evaluation
 * time, so importing it after ambient mutation cannot silently bless poisoned
 * globals as trusted.
 *
 * The context source is also part of the application TCB. It must own current
 * wallet context independently of an untrusted Promise-return channel and
 * synchronously invoke exactly one terminal callback before returning.
 */
export function captureWalletGuardTrustedContext(captureContext, trustedRuntime) {
  if (typeof captureContext !== 'function') {
    fail('POMRX_WG_CONTEXT_E_INVALID', 'trusted context source must be callable');
  }

  const runtime = captureRuntime(trustedRuntime);
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
    if (!patternMatches(runtime, CHAIN_ID_PATTERN, deliveredChainId)
        || !patternMatches(runtime, ACCOUNT_PATTERN, deliveredAccount)) {
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
    failureCode = patternMatches(runtime, FAILURE_CODE_PATTERN, code)
      ? code
      : 'CONTEXT_FAILURE';
    return undefined;
  };

  let returnValue;
  let sourceThrew = false;
  try {
    returnValue = apply(
      runtime,
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

  return makeContext(runtime, chainId, account);
}
