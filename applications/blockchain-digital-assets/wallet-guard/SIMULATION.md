# Wallet Guard reference simulation evidence

`simulation.mjs` is a Wallet Guard application-profile reference harness. It does not change shared POM-RX Core Gate, Witness, receipt, observation or reconciliation semantics. This lot adds one narrow shared reference-data hardening primitive: `captureReferencePlainDataOutcome()` reports validation failure only when the `PomRxPlainDataError` was minted by that exact synchronous capture invocation; the existing throwing `captureReferencePlainData()` API and accepted/rejected plain-data semantics remain unchanged.

## Boundary

The harness accepts an exact locally normalized and branded Wallet Guard intent plus a caller request. Before the simulator callback is invoked, the request is captured through the shared bounded plain-data boundary, re-normalized under the intent's trusted request id, origin, chain and account, and required to produce the same intent commitment. A separate domain-separated request commitment binds the exact captured request snapshot passed to the simulator.

For `eth_signTypedData_v4` requests whose EIP-712 payload is supplied as a bounded JSON string, Wallet Guard deliberately accepts that raw string up to its 16 KiB application-profile limit. The shared proof canonicalizer has a smaller generic per-string bound and is not widened for this application. The simulation request commitment therefore replaces only that already captured and successfully replayed raw JSON string with a domain-separated SHA-256 commitment marker before canonicalizing the request projection. Different raw JSON text therefore produces a different request commitment, while the original captured JSON string is still passed unchanged to the simulator callback. Object-form typed data and all other request shapes continue to use the ordinary captured request snapshot directly. This is an application-profile representation bridge, not a change to POM-RX Core canonicalization limits.

The shared capture outcome uses private per-invocation provenance, including across synchronous nested captures, so a foreign same-class error from a poisoned later same-realm intrinsic is not mistaken for expected malformed input. The simulation harness uses that outcome both for its request snapshot and resolved callback snapshot. Expected bounded-data rejection remains fail-closed (`request invalid` before callback or local `mismatch` after callback), while foreign runtime/intrinsic failures preserve exact provenance.

The simulator callback must echo the exact request id, request commitment, intent commitment, origin, chain and account. `pass` and `fail` require lowercase SHA-256 state and effect commitments. `unavailable` requires both commitments to be null. Malformed output, identity substitution, invalid commitments or rejected plain-data output becomes local `mismatch` evidence. Hash-shape checks use a module-captured regular-expression intrinsic and return mismatch without throwing/catching an exported callback-validation error, so an unrelated same-class failure cannot be misclassified as malformed hash data. Generic simulator rejection and unrelated intrinsic/runtime failures preserve their original provenance rather than being relabeled as unavailability.

Evidence is branded per harness instance and is additionally bound in a private `WeakMap` to the exact originating normalized intent object. `toPolicySimulation()` therefore rejects structural clones, evidence from another harness, another intent with different fields, and a distinct locally normalized intent object that happens to have the same semantic commitment. Commitment equality remains a content-integrity check; it is not treated as a substitute for exact local object provenance.

## Deliberate non-claims

This is reference simulation evidence only. The installed asynchronous simulator callback is a trusted bootstrap dependency, and JavaScript Promise/thenable behavior before the resolved callback value reaches the bounded capture sink is not proved. The evidence therefore fixes:

- `reference_only=true`;
- `simulator_callback_trusted_bootstrap_assumed=true`;
- `simulator_truth_proved=false`;
- `external_state_proved=false`;
- `external_effect_proved=false`;
- `simulation_to_forwarding_bound=false`;
- `simulator_callback_return_channel_proved=false`.

A simulation `pass` cannot authorize, consume the Core Gate, forward to a provider, establish external EVM truth or prove an eventual effect. Atomic simulation-to-provider/Gate composition remains a separate reviewed lot.

No private key, seed, secret, real or funded wallet, network transaction, testnet/mainnet execution or meaningful funds are introduced by this harness.
