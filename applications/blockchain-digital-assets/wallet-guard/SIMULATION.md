# Wallet Guard reference simulation evidence

`simulation.mjs` is a Wallet Guard application-profile reference harness. It does not change shared POM-RX Core Gate, Witness, receipt, observation or reconciliation semantics. This lot adds one narrow shared reference-data hardening primitive: `captureReferencePlainDataOutcome()` reports validation failure only when the `PomRxPlainDataError` was minted by that exact synchronous capture invocation; the existing throwing `captureReferencePlainData()` API and accepted/rejected plain-data semantics remain unchanged.

## Boundary

The harness accepts an exact locally normalized and branded Wallet Guard intent plus a caller request. Before the simulator callback is invoked, the request is captured through a bounded inert plain-data boundary, replay-normalized under the intent's trusted request id, origin, chain and account, and required to produce the same intent commitment. Replay uses the intent module's provenance-sensitive no-translation path: decoder errors keep their exact identity instead of being reclassified solely because they use the exported `WalletGuardDecoderError` class. Only a successful replay whose normalized commitment differs becomes a local binding mismatch.

For all RPC methods other than an exact own-enumerable `eth_signTypedData_v4` request, request capture continues to use the shared `captureReferencePlainDataOutcome()` boundary unchanged. `eth_signTypedData_v4` uses a narrow Wallet Guard application-profile bridge because its decoder applies the 1,000-node/depth/string budget to the typed-data payload itself rather than to the surrounding EIP-1193 wrapper. The harness therefore validates the exact request object and two-element `params` wrapper as non-Proxy, plain, dense, undecorated data structures, then captures the account and typed-data payload separately through the unchanged shared plain-data boundary. This preserves the typed-data payload's full existing budget while rejecting Proxy/accessor/symbol/hidden/decorated/custom-prototype wrapper behavior before callback execution. The reconstructed frozen request contains the exact captured account and typed-data values and is the request used for replay and passed to the simulator callback. No shared POM-RX Core limit is widened and no Wallet Guard-specific rule is added to `core/reference-data`.

A separate domain-separated request commitment binds the exact captured request semantics passed to the simulator. Typed-data requests use compact application-profile projections only after the exact request has already been captured and successfully replayed:

- For `eth_signTypedData_v4` JSON-string payloads, Wallet Guard deliberately accepts the raw string up to its 16 KiB application-profile limit. The shared proof canonicalizer has a smaller generic per-string bound and is not widened. The request commitment therefore replaces only that raw string in the commitment projection with a domain-separated SHA-256 marker over an ASCII transcript of the exact JavaScript UTF-16 code units. This avoids the non-injective UTF-8 replacement behavior of hashing arbitrary lone-surrogate strings directly. The original captured JSON string is still passed unchanged to the simulator callback.
- For object-form typed data, the decoder already requires the typed-data object itself to fit the shared 16 KiB canonical payload bound. The request-commitment path keeps that canonicalizer call as the existing bounded shape/byte validation contract, then hashes a separate domain-separated ASCII transcript of the already captured inert value tree. The transcript uses deterministic object-key ordering and explicit value-type/length framing while preserving every string value's exact JavaScript UTF-16 code units, so NFC-equivalent but byte-distinct EIP-712 strings remain distinct request identities while property insertion order remains irrelevant. Only the resulting digest marker replaces the typed-data object in the outer commitment projection, so the method/account wrapper cannot consume the final generic canonical-byte headroom. The original captured typed-data object remains the simulator input.

These are application-profile representation bridges, not changes to POM-RX Core canonicalization limits or to Wallet Guard intent semantics.

The shared capture outcome uses private per-invocation provenance, including across synchronous nested captures, so a foreign same-class error from a poisoned later same-realm intrinsic is not mistaken for expected malformed input. The simulation harness uses that outcome for generic request capture, the typed-data account/payload captures and the resolved callback snapshot. Expected bounded-data rejection remains fail-closed (`request invalid` before callback or local `mismatch` after callback), while foreign runtime/intrinsic failures preserve exact provenance.

The simulator callback must echo the exact request id, request commitment, intent commitment, origin, chain and account. `pass` and `fail` require lowercase SHA-256 state and effect commitments. `unavailable` requires both commitments to be null. Malformed output, identity substitution, invalid commitments or rejected plain-data output becomes local `mismatch` evidence. Hash-shape checks use a module-captured regular-expression intrinsic and return mismatch without throwing/catching an exported callback-validation error, so an unrelated same-class failure cannot be misclassified as malformed hash data. Generic simulator rejection and unrelated intrinsic/runtime failures preserve their original provenance rather than being relabeled as unavailability.

Evidence is branded per harness instance and is additionally bound in a private `WeakMap` to the exact originating normalized intent object. `toPolicySimulation()` therefore rejects structural clones, evidence from another harness, another intent with different fields, and a distinct locally normalized intent object that happens to have the same semantic commitment. Commitment equality remains a content-integrity check; it is not treated as a substitute for exact local object provenance.

The simulation module captures `Object.freeze` at module initialization and uses that captured intrinsic for run snapshots, request-commitment projections, evidence payloads, minted evidence, policy projections and the returned harness surface. Replacing `Object.freeze` later in the same realm therefore cannot make newly minted local evidence mutable. This guarantee is intentionally narrow: arbitrary poisoning before module initialization or a generally compromised JavaScript realm remains outside scope.

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
