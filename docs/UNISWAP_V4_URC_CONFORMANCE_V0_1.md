# Uniswap v4 URC Conformance Report v0.1

Status: self-funded pre-grant prototype. It is not an audit, a solvency proof,
a binding quote, a Uniswap Foundation endorsement or a grant deliverable.

This profile turns externally observed hook behavior into a deterministic,
portable report for:

- the 14 address-encoded permissions used by Uniswap v4 core;
- URC-2 `HookSwap` event behavior for custom-accounting fills;
- URC-3 total reserves and immediately effective liquidity reporting;
- the trust boundary between a hook and a separate stats provider.

## Why this scope

Custom accounting can make core `Swap` events incomplete for data consumers.
URC-2 proposes one canonical hook-fill event, while URC-3 separates total
managed reserves from liquidity that is immediately swappable. The two drafts
are complementary, but neither a report nor a stats pointer is proof of
solvency or successful execution.

SwissTokint's conformance report records what was observed, rejects internally
inconsistent fixtures, and commits to the normalized result. It never receives
funds, signs swaps, submits transactions or claims that a hook is safe.

## Checks

### Address permissions

- Decode all 14 low-bit permissions from the hook address.
- Require the declared permission set to match the encoded set exactly.
- Reject return-delta flags whose parent callback flag is absent.

### URC-2

- Exactly one `HookSwap` for a successful swap with a non-zero hook delta.
- No `HookSwap` for zero-delta or reverted operations.
- Exact pool ID, callback sender and hook-fill deltas.
- Signed deltas must fit `int128`; the fee must fit `uint24`.
- No core-AMM-only `sqrtPriceX96`, `liquidity` or `tick` fields.
- Core and hook legs are added once to expose a normalized total.

### URC-3

- Effective liquidity cannot exceed total reserves for either token.
- ERC-165 and `IHookStats` support are explicit.
- The accounting basis is documented.
- A separate stats provider must carry same-deployer or registry-pinned
  association evidence; a self-reported hook pointer alone is rejected.

## Reproduce

```bash
node scripts/validate-uniswap-v4-urc.mjs \
  schemas/examples/uniswap-v4-urc-conformance-input-v0.1.json
```

The command exits `0` for a conforming fixture, `1` for a report with findings,
and `2` for malformed input or operational failure.

## Limitations

The v0.1 prototype validates supplied observations offline. It does not yet:

- fetch receipts or state from an Ethereum or Unichain RPC;
- simulate swaps against a fork;
- verify proxy implementation or upgrade authority;
- prove reserves, settlement availability or economic safety;
- replace a professional smart-contract audit.

Those capabilities remain prospective grant work and must not be represented
as complete.

## Primary references

- Uniswap v4 `Hooks.sol`:
  https://github.com/Uniswap/v4-core/blob/main/src/libraries/Hooks.sol
- URC-2 discussion:
  https://gov.uniswap.org/t/urc-2-custom-accounting-hook-swap-event/26154
- URC-3 discussion:
  https://gov.uniswap.org/t/urc-3-hook-tvl-and-effective-liquidity-reporting/26155
- Uniswap Hooks Security Framework:
  https://github.com/uniswapfoundation/security-framework
