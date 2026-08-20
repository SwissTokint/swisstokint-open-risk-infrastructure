# POM-RX Wallet Guard

Wallet Guard is one POM-RX application profile under Blockchain and digital assets, with a cybersecurity overlap.

Target controlled path:

```text
controlled dApp
  -> trusted request capture
  -> normalized EVM intent
  -> decoded request-effect evidence
  -> policy / preflight
  -> Witness
  -> exact single-use Gate
  -> test wallet/provider
  -> independent observation
  -> reconciliation
```

## Current reference implementation

The current repository contains a bounded local reference slice for:

- strict JSON-text ingress for controlled EIP-1193/JSON-RPC request fixtures;
- EVM request normalization and exact intent commitments;
- deterministic decoded request-effect evidence for recognized native transfer,
  ERC-20 transfer/approval, operator-approval and exact Permit request classes;
- explicit `unknown` effect semantics for unknown calldata, unknown typed data,
  generic signatures and unsupported RPC methods rather than inventing a known
  downstream effect;
- deterministic fail-closed local policy;
- strict policy/simulation object-boundary capture from exact own enumerable data descriptors, with accessor, Proxy, hidden/symbol/unknown-property and custom-prototype rejection;
- bounded reference simulation evidence tied to one exact locally normalized intent and one exact captured request snapshot;
- provider-observed chain/account sampling;
- bootstrap-captured origin that is not accepted from request fields;
- repeated context checks around the Core reference single-use Gate;
- a Gate-owned prepared request re-normalized immediately before a controlled provider call;
- per-request synthetic reference authorization metadata with local reuse rejection.

`json-ingress.mjs` closes one narrow parser-equivalence gap before raw JSON text from a controlled fixture is reduced to Wallet Guard request semantics. It lexically scans the supplied JavaScript string before `JSON.parse`, rejects duplicate decoded object keys (including escaped aliases such as `m\u0065thod` versus `method`), prototype-pollution keys, unpaired Unicode surrogates, non-canonical JSON number spellings, excessive bytes/depth/nodes/string/key sizes and ambiguous top-level envelopes. It then emits a frozen `{method, params}` request together with a raw-text SHA-256 and a shared-canonical-request SHA-256.

The ingress receives a JavaScript string, not the original browser/network byte stream. `raw_text_sha256` therefore commits only the supplied string encoding used by the local hashing helper, and `transport_bytes_proved=false` remains explicit. The ingress does not prove UTF-8/WebSocket/browser decoder correctness, origin authenticity, provider integrity, method-specific EVM semantics, policy authorization, Gate consumption or execution.

Canonical-request compatibility is delegated to the shared proof canonicalizer rather than duplicated in Wallet Guard. Expected canonical-payload rejection is recognized only through the shared `ProofPayloadValidationError` provenance contract. Generic or intrinsic `TypeError` failures are not classified by message text and propagate unchanged, including when their text happens to match a canonical validation message. This preserves the distinction between expected semantic rejection and an unrelated runtime failure.

The policy normalizer does not treat arbitrary JavaScript object behavior as policy data. Top-level policy and simulation records are snapshotted once from exact own enumerable data properties. Policy allowlists and `require_simulation_for` must be bounded dense standard arrays: accessors, Node Proxy wrappers, holes, symbol keys, hidden/extra properties and non-standard array prototypes fail closed before policy values participate in normalization or hashing. This prevents getter/Proxy/prototype behavior from substituting policy or simulation semantics in the Node reference runtime.

`simulation.mjs` is a separate reference evidence harness. It accepts only the exact locally normalized/branded Wallet Guard intent object plus a bounded inert request snapshot captured through the shared Core plain-data boundary. The request snapshot is re-normalized under the intent's already trusted origin, chain, account and request id, and the resulting intent commitment must match the original intent commitment before the installed simulator callback is invoked. A separate domain-separated request commitment binds the exact captured request snapshot that is handed to the simulator.

The simulator callback must echo the exact request id, request commitment, intent commitment, origin, chain and account. A valid `pass` or `fail` additionally carries exact state/effect commitments; `unavailable` requires both commitments to be null. Malformed output, identity substitution, invalid commitments, accessors or Proxy output are reduced to local `mismatch` evidence. Generic callback/intrinsic failures are not broadly relabeled as simulator unavailability; ordinary unavailability must be returned explicitly through the callback status contract.

Simulation evidence is branded per harness instance. Structural clones or evidence minted by another simulator harness cannot be converted into policy simulation. The same-harness conversion also rechecks the exact locally normalized intent binding before reducing evidence to the policy's existing `{status}` vocabulary.

This remains a **reference simulator boundary**, not external EVM truth. Evidence fixes `reference_only=true`, `simulator_callback_trusted_bootstrap_assumed=true`, `simulator_truth_proved=false`, `external_state_proved=false`, `external_effect_proved=false`, `simulation_to_forwarding_bound=false` and `simulator_callback_return_channel_proved=false`. The installed async callback remains a trusted bootstrap dependency and JavaScript Promise/thenable behavior before the resolved callback value reaches the bounded capture sink is explicitly outside this lot's proof claim.

Decoded effect evidence is intentionally about **requested fields under the local
decoding convention**, not target-contract behavior or external-world state. A
recognized selector proves which fields this reference decoder extracted from
the request; it does not prove that the target bytecode implements the expected
ERC-20/ERC-721/ERC-1155 semantics. Likewise, `data=0x` does not prove that a
contract target has no receive/fallback side effects. The evidence therefore
keeps complete semantic projection, target-code semantics, external-state and
external-effect proof flags false.

A Permit signature request can still be represented as an allowance
authorization request without claiming that an allowance was actually changed
on-chain or that every signed typed-data field was projected into effect
fields.

`DENY` and critical `INDETERMINATE` paths are non-forwarding. The reference
provider integration is exercised only with controlled fake-provider tests.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the reference authorization supplier is synthetic and does not prove a real
  signed Witness acknowledgement;
- the bootstrap origin/provider/simulator authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- strict JSON text parsing does not prove upstream transport-byte decoding;
- reference simulation evidence is not yet bound atomically to the later provider/Gate forwarding state;
- production Witness enrollment/revocation/trusted time, external execution truth, independent observation and reconciliation remain separate obligations;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
