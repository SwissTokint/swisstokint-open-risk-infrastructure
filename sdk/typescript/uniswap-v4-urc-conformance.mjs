import { createHash } from "node:crypto";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const UINT24_MAX = (1n << 24n) - 1n;
const INT128_MIN = -(1n << 127n);
const INT128_MAX = (1n << 127n) - 1n;

export const HOOK_FLAGS = Object.freeze({
  beforeInitialize: 1n << 13n,
  afterInitialize: 1n << 12n,
  beforeAddLiquidity: 1n << 11n,
  afterAddLiquidity: 1n << 10n,
  beforeRemoveLiquidity: 1n << 9n,
  afterRemoveLiquidity: 1n << 8n,
  beforeSwap: 1n << 7n,
  afterSwap: 1n << 6n,
  beforeDonate: 1n << 5n,
  afterDonate: 1n << 4n,
  beforeSwapReturnDelta: 1n << 3n,
  afterSwapReturnDelta: 1n << 2n,
  afterAddLiquidityReturnDelta: 1n << 1n,
  afterRemoveLiquidityReturnDelta: 1n
});

const RETURN_DELTA_PARENTS = Object.freeze({
  beforeSwapReturnDelta: "beforeSwap",
  afterSwapReturnDelta: "afterSwap",
  afterAddLiquidityReturnDelta: "afterAddLiquidity",
  afterRemoveLiquidityReturnDelta: "afterRemoveLiquidity"
});

function issue(code, path, message) {
  return { code, path, message };
}

function requireObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  return value;
}

function requireKnownKeys(value, allowed, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new TypeError(`${path}.${key} is not allowed`);
  }
}

function requireAddress(value, path) {
  if (typeof value !== "string" || !ADDRESS.test(value)) {
    throw new TypeError(`${path} must be a 20-byte EVM address`);
  }
  return value.toLowerCase();
}

function requireBytes32(value, path) {
  if (typeof value !== "string" || !BYTES32.test(value)) {
    throw new TypeError(`${path} must be bytes32`);
  }
  return value.toLowerCase();
}

function requireInteger(value, path) {
  if (typeof value !== "string" || !/^-?(0|[1-9][0-9]*)$/.test(value)) {
    throw new TypeError(`${path} must be a canonical decimal integer string`);
  }
  return BigInt(value);
}

function requireUint(value, path) {
  const parsed = requireInteger(value, path);
  if (parsed < 0n) throw new RangeError(`${path} must be unsigned`);
  return parsed;
}

function requireInt128(value, path) {
  const parsed = requireInteger(value, path);
  if (parsed < INT128_MIN || parsed > INT128_MAX) {
    throw new RangeError(`${path} must fit int128`);
  }
  return parsed;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function decodeHookPermissions(hookAddress) {
  const normalized = requireAddress(hookAddress, "hookAddress");
  const addressValue = BigInt(normalized);
  const permissions = {};
  for (const [name, flag] of Object.entries(HOOK_FLAGS)) {
    permissions[name] = (addressValue & flag) !== 0n;
  }
  return permissions;
}

export function validateHookPermissions(hookAddress, expectedPermissions = []) {
  if (!Array.isArray(expectedPermissions)) {
    throw new TypeError("expectedPermissions must be an array");
  }
  const permissions = decodeHookPermissions(hookAddress);
  const issues = [];
  const expected = new Set(expectedPermissions);
  if (expected.size !== expectedPermissions.length) {
    issues.push(issue("DUPLICATE_PERMISSION", "expectedPermissions", "Permissions must be unique"));
  }

  for (const name of expected) {
    if (!(name in HOOK_FLAGS)) {
      issues.push(issue("UNKNOWN_PERMISSION", "expectedPermissions", `Unknown permission ${name}`));
    } else if (!permissions[name]) {
      issues.push(issue("EXPECTED_PERMISSION_MISSING", "hookAddress", `${name} is not encoded in the address`));
    }
  }
  for (const [name, enabled] of Object.entries(permissions)) {
    if (enabled && !expected.has(name)) {
      issues.push(issue("UNEXPECTED_PERMISSION", "hookAddress", `${name} is enabled but not declared`));
    }
  }
  for (const [deltaPermission, parentPermission] of Object.entries(RETURN_DELTA_PARENTS)) {
    if (permissions[deltaPermission] && !permissions[parentPermission]) {
      issues.push(
        issue(
          "ORPHAN_RETURN_DELTA_PERMISSION",
          "hookAddress",
          `${deltaPermission} requires ${parentPermission}`
        )
      );
    }
  }

  return { valid: issues.length === 0, hookAddress: hookAddress.toLowerCase(), permissions, issues };
}

function validateSwap(swap, index) {
  requireObject(swap, `swaps[${index}]`);
  const path = `swaps[${index}]`;
  requireKnownKeys(
    swap,
    [
      "poolId",
      "callbackSender",
      "zeroForOne",
      "amountSpecified",
      "hookDelta",
      "coreDelta",
      "hookSwapEvents",
      "reverted"
    ],
    path
  );
  const issues = [];
  if (typeof swap.zeroForOne !== "boolean") {
    throw new TypeError(`${path}.zeroForOne must be boolean`);
  }
  const id = requireBytes32(swap.poolId, `${path}.poolId`);
  const callbackSender = requireAddress(swap.callbackSender, `${path}.callbackSender`);
  const amountSpecified = requireInt128(swap.amountSpecified, `${path}.amountSpecified`);
  requireObject(swap.hookDelta, `${path}.hookDelta`);
  requireKnownKeys(swap.hookDelta, ["amount0", "amount1"], `${path}.hookDelta`);
  requireObject(swap.coreDelta, `${path}.coreDelta`);
  requireKnownKeys(swap.coreDelta, ["amount0", "amount1"], `${path}.coreDelta`);
  const hookAmount0 = requireInt128(swap.hookDelta?.amount0, `${path}.hookDelta.amount0`);
  const hookAmount1 = requireInt128(swap.hookDelta?.amount1, `${path}.hookDelta.amount1`);
  const coreAmount0 = requireInt128(swap.coreDelta?.amount0, `${path}.coreDelta.amount0`);
  const coreAmount1 = requireInt128(swap.coreDelta?.amount1, `${path}.coreDelta.amount1`);
  const events = Array.isArray(swap.hookSwapEvents) ? swap.hookSwapEvents : [];
  const contributesDelta = hookAmount0 !== 0n || hookAmount1 !== 0n;

  if (swap.reverted === true) {
    if (events.length !== 0) {
      issues.push(issue("EVENT_FOR_REVERTED_SWAP", `${path}.hookSwapEvents`, "Reverted swaps must not emit HookSwap"));
    }
  } else if (contributesDelta && events.length !== 1) {
    issues.push(
      issue(
        "HOOK_SWAP_EVENT_COUNT",
        `${path}.hookSwapEvents`,
        "A successful swap with a hook delta must emit exactly one HookSwap"
      )
    );
  } else if (!contributesDelta && events.length !== 0) {
    issues.push(
      issue("ZERO_DELTA_EVENT", `${path}.hookSwapEvents`, "A zero hook delta must not emit HookSwap")
    );
  }

  if (events.length === 1) {
    const event = requireObject(events[0], `${path}.hookSwapEvents[0]`);
    requireKnownKeys(
      event,
      ["poolId", "sender", "amount0", "amount1", "swapFee", "sqrtPriceX96", "liquidity", "tick"],
      `${path}.hookSwapEvents[0]`
    );
    const eventAmount0 = requireInt128(event.amount0, `${path}.hookSwapEvents[0].amount0`);
    const eventAmount1 = requireInt128(event.amount1, `${path}.hookSwapEvents[0].amount1`);
    const swapFee = requireUint(event.swapFee, `${path}.hookSwapEvents[0].swapFee`);
    if (swapFee > UINT24_MAX) {
      issues.push(issue("SWAP_FEE_RANGE", `${path}.hookSwapEvents[0].swapFee`, "swapFee must fit uint24"));
    }
    if (requireBytes32(event.poolId, `${path}.hookSwapEvents[0].poolId`) !== id) {
      issues.push(issue("POOL_ID_MISMATCH", `${path}.hookSwapEvents[0].poolId`, "Event poolId differs from the swap"));
    }
    if (requireAddress(event.sender, `${path}.hookSwapEvents[0].sender`) !== callbackSender) {
      issues.push(
        issue("CALLBACK_SENDER_MISMATCH", `${path}.hookSwapEvents[0].sender`, "Event sender must be the callback sender")
      );
    }
    if (eventAmount0 !== hookAmount0 || eventAmount1 !== hookAmount1) {
      issues.push(
        issue("HOOK_DELTA_MISMATCH", `${path}.hookSwapEvents[0]`, "Event deltas must equal the hook fill deltas")
      );
    }
    for (const forbidden of ["sqrtPriceX96", "liquidity", "tick"]) {
      if (Object.hasOwn(event, forbidden)) {
        issues.push(
          issue("FORBIDDEN_AMM_FIELD", `${path}.hookSwapEvents[0].${forbidden}`, `${forbidden} is not part of URC-2`)
        );
      }
    }
  }

  const totalAmount0 = hookAmount0 + coreAmount0;
  const totalAmount1 = hookAmount1 + coreAmount1;
  if (amountSpecified < 0n && swap.zeroForOne === true && !(totalAmount0 < 0n && totalAmount1 >= 0n)) {
    issues.push(issue("DELTA_SIGN_CONVENTION", path, "token0 exact-input must total negative token0 and non-negative token1"));
  }
  if (amountSpecified < 0n && swap.zeroForOne === false && !(totalAmount1 < 0n && totalAmount0 >= 0n)) {
    issues.push(issue("DELTA_SIGN_CONVENTION", path, "token1 exact-input must total negative token1 and non-negative token0"));
  }

  return {
    valid: issues.length === 0,
    poolId: id,
    totalAmount0: totalAmount0.toString(),
    totalAmount1: totalAmount1.toString(),
    issues
  };
}

function validateStats(stats) {
  requireObject(stats, "stats");
  requireKnownKeys(
    stats,
    [
      "hookAddress",
      "providerAddress",
      "supportsIERC165",
      "supportsIHookStats",
      "associationEvidence",
      "accountingBasis",
      "reserves",
      "effectiveLiquidity"
    ],
    "stats"
  );
  requireObject(stats.reserves, "stats.reserves");
  requireKnownKeys(stats.reserves, ["token0", "token1"], "stats.reserves");
  requireObject(stats.effectiveLiquidity, "stats.effectiveLiquidity");
  requireKnownKeys(stats.effectiveLiquidity, ["token0", "token1"], "stats.effectiveLiquidity");
  const issues = [];
  const hookAddress = requireAddress(stats.hookAddress, "stats.hookAddress");
  const providerAddress = requireAddress(stats.providerAddress, "stats.providerAddress");
  const reserves0 = requireUint(stats.reserves?.token0, "stats.reserves.token0");
  const reserves1 = requireUint(stats.reserves?.token1, "stats.reserves.token1");
  const effective0 = requireUint(stats.effectiveLiquidity?.token0, "stats.effectiveLiquidity.token0");
  const effective1 = requireUint(stats.effectiveLiquidity?.token1, "stats.effectiveLiquidity.token1");

  if (effective0 > reserves0 || effective1 > reserves1) {
    issues.push(
      issue(
        "EFFECTIVE_LIQUIDITY_EXCEEDS_RESERVES",
        "stats.effectiveLiquidity",
        "URC-3 requires effective liquidity to be no greater than reserves"
      )
    );
  }
  if (stats.supportsIERC165 !== true || stats.supportsIHookStats !== true) {
    issues.push(issue("INTERFACE_SUPPORT_MISSING", "stats", "ERC-165 and IHookStats support are required"));
  }
  if (typeof stats.accountingBasis !== "string" || stats.accountingBasis.trim().length < 12) {
    issues.push(issue("ACCOUNTING_BASIS_MISSING", "stats.accountingBasis", "Document the reserve accounting basis"));
  }
  if (providerAddress === hookAddress) {
    if (stats.associationEvidence !== "direct") {
      issues.push(issue("DIRECT_ASSOCIATION_REQUIRED", "stats.associationEvidence", "Direct providers must declare direct association"));
    }
  } else if (!["same-deployer", "registry-pinned"].includes(stats.associationEvidence)) {
    issues.push(
      issue(
        "UNVERIFIED_STATS_PROVIDER",
        "stats.associationEvidence",
        "A separate provider needs same-deployer or registry-pinned evidence"
      )
    );
  }

  return {
    valid: issues.length === 0,
    hookAddress,
    providerAddress,
    reserveUtilizationBps: {
      token0: reserves0 === 0n ? null : Number((effective0 * 10_000n) / reserves0),
      token1: reserves1 === 0n ? null : Number((effective1 * 10_000n) / reserves1)
    },
    issues
  };
}

export function evaluateUrcConformance(input) {
  requireObject(input, "input");
  requireKnownKeys(
    input,
    ["schema", "inputId", "hookAddress", "expectedPermissions", "swaps", "stats"],
    "input"
  );
  if (input.schema !== "swisstokint-uniswap-v4-urc-conformance-v0.1") {
    throw new TypeError("unsupported schema");
  }
  const permissions = validateHookPermissions(input.hookAddress, input.expectedPermissions);
  if (!Array.isArray(input.swaps) || input.swaps.length === 0) {
    throw new TypeError("input.swaps must be a non-empty array");
  }
  const swaps = input.swaps.map(validateSwap);
  const stats = validateStats(input.stats);
  const issues = [...permissions.issues, ...swaps.flatMap((swap) => swap.issues), ...stats.issues];
  const report = {
    schema: "swisstokint-uniswap-v4-urc-report-v0.1",
    inputId: requireBytes32(input.inputId, "input.inputId"),
    valid: issues.length === 0,
    permissions,
    swaps,
    stats,
    issues
  };
  return {
    ...report,
    reportHash: `0x${createHash("sha256").update(stableJson(report)).digest("hex")}`
  };
}
