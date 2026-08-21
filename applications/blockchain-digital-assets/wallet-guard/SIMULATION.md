# Wallet Guard reference simulation evidence

`simulation.mjs` is a Wallet Guard application-profile reference harness. It does not change shared POM-RX Core Gate, Witness, receipt, observation or reconciliation semantics. This lot adds a generic shared reference-data hardening primitive: `captureReferencePlainDataOutcome()` reports validation failure only when the `PomRxPlainDataError` was minted by that exact synchronous capture invocation, and the shared capture now binds its Proxy/reflection/array/key/freeze intrinsics at module initialization. The existing throwing `captureReferencePlainData()` API, limits and accepted inert-data model remain unchanged.

## Boundary

The harness accepts an exact locally normalized and branded Wallet Guard intent plus a caller request. Before the simulator callback is invoked, the request wrapper is validated as an exact non-Proxy plain `{method, params}` record with a dense, undecorated, standard-prototype params array. Method-specific payload is then captured through the shared bounded inert-data boundary, replay-normalized under the intent's trusted request id, origin, chain and account, and required to produce the same intent commitment. Replay uses the intent module's provenance-sensitive no-translation path: decoder errors keep their exact identity instead of being reclassified solely because they use the exported `WalletGuardDecoderError` class. Only a successful replay whose normalized semantic commitment differs becomes a local binding mismatch.

The wrapper is deliberately budgeted separately from payload semantics. `eth_signTypedData_v4` captures account and typed-data payload independently, so the typed-data object retains its full existing 1,000-node/depth/string budget. Generic `personal_sign` / `eth_sign` capture uses the same historical normalization projection `{params: request.params}`, so a payload exactly at that 1,000-node boundary remains simulatable instead of losing one node to the RPC method wrapper. Unsupported RPCs capture the same `{method, params}` projection used by normalization. No shared POM-RX Core ceiling is widened.

Normalization now enforces the same wrapper class for generic and typed-data requests. Generic signature payloads and send-transaction payloads also cross the shared inert-data boundary before a locally branded intent is minted. Hidden/non-enumerable fields, symbols, accessors, nested Proxies, sparse/decorated arrays and custom prototypes therefore fail closed during normalization or request capture rather than producing an intent/request pair that simulation cannot reproduce.

The shared reference-data capture recursively uses the Proxy detector and reflection/freeze intrinsics saved at Core module initialization. A later same-realm replacement of live `util.types.isProxy`, `Array.isArray`, object reflection helpers, key tests or `Object.freeze` cannot make a nested Proxy ordinary data, hide decoration or make the detached Core snapshot mutable. The simulation module then recursively re-freezes the already bounded detached request tree with its own saved `Object.freeze` as defense in depth before replay, request commitment and any asynchronous simulator callback. Poisoning before module initialization or a generally compromised runtime remains outside this scoped guarantee.

A separate domain-separated request commitment binds the **exact captured values** passed to the simulator, not merely their semantically normalized intent representation:

- For `eth_signTypedData_v4` JSON-string payloads, the request commitment uses a SHA-256 marker over an ASCII transcript of exact JavaScript UTF-16 code units. Distinct lone surrogates therefore cannot collapse through UTF-8 replacement.
- For object-form typed data, the existing proof canonicalizer remains only the bounded shape/byte validation contract. A separate deterministic type/length-framed transcript preserves exact UTF-16 string values and `0` versus `-0` while sorting object keys so insertion order remains irrelevant. Only the resulting digest marker enters the compact outer request-commitment projection; the original captured typed-data object remains the simulator input.
- For generic signature, unsupported RPC and other non-typed-data request snapshots, the complete already bounded inert request is hashed through the same exact type/length-framed transcript into a domain-separated compact marker. Consequently NFC-equivalent-but-exactly-distinct strings such as `"é"` and `"e\u0301"`, and `0` versus `-0`, produce distinct request commitments even when Wallet Guard's semantic intent normalization deliberately treats them the same. A stale callback result keyed to the first exact request therefore becomes local `mismatch` for the second.

The shared proof SDK canonicalizer and `sha256Hex()` retain their public canonical form, limits and digest values but bind their load-bearing canonicalization/hash intrinsics at module initialization. Later mutation of array sorting/classification or the mutable default `node:crypto` hash export cannot collapse request, intent or simulation commitments. This is generic SDK hardening rather than a Wallet Guard fork.

The shared capture outcome uses private per-invocation provenance, including across synchronous nested captures, so a foreign same-class error is not mistaken for expected malformed input. Expected bounded-data rejection remains fail-closed (`request invalid` before callback or local `mismatch` after callback), while foreign runtime failures preserve provenance.

The simulator callback must echo the exact request id, request commitment, intent commitment, origin, chain and account. `pass` and `fail` require lowercase SHA-256 state and effect commitments. `unavailable` requires both commitments to be null. Malformed output, identity substitution, invalid commitments or rejected plain-data output becomes local `mismatch` evidence. Evidence is branded per harness instance and additionally bound in a private `WeakMap` to the exact originating normalized intent object; commitment equality is not a substitute for local object provenance.

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
