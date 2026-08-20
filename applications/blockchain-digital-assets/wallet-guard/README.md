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
- controller-instance reference policy state with compare-and-swap replacement and an idempotent fail-safe kill switch;
- portable determinate preflight evidence from one exact locally normalized intent and policy evaluation into the shared `pom-rx/0.1` receipt format;
- strict policy/simulation object-boundary capture from exact own enumerable data descriptors, with accessor, Proxy, hidden/symbol/unknown-property and custom-prototype rejection;
- provider-observed chain/account sampling;
- bootstrap-captured origin that is not accepted from request fields;
- repeated context checks around the Core reference single-use Gate;
- a Gate-owned prepared request re-normalized immediately before a controlled provider call;
- per-request synthetic reference authorization metadata with local reuse rejection.

`json-ingress.mjs` closes one narrow parser-equivalence gap before raw JSON text from a controlled fixture is reduced to Wallet Guard request semantics. It lexically scans the supplied JavaScript string before `JSON.parse`, rejects duplicate decoded object keys (including escaped aliases such as `m\u0065thod` versus `method`), prototype-pollution keys, unpaired Unicode surrogates, non-canonical JSON number spellings, excessive bytes/depth/nodes/string/key sizes and ambiguous top-level envelopes. It then emits a frozen `{method, params}` request together with a raw-text SHA-256 and a shared-canonical-request SHA-256.

The ingress receives a JavaScript string, not the original browser/network byte stream. `raw_text_sha256` therefore commits only the supplied string encoding used by the local hashing helper, and `transport_bytes_proved=false` remains explicit. The ingress does not prove UTF-8/WebSocket/browser decoder correctness, origin authenticity, provider integrity, method-specific EVM semantics, policy authorization, Gate consumption or execution.

Canonical-request compatibility is delegated to the shared proof canonicalizer rather than duplicated in Wallet Guard. Expected canonical-payload rejection is recognized only through the shared `ProofPayloadValidationError` provenance contract. Generic or intrinsic `TypeError` failures are not classified by message text and propagate unchanged, including when their text happens to match a canonical validation message. This preserves the distinction between expected semantic rejection and an unrelated runtime failure.

`preflight-evidence.mjs` is a separate bounded evidence bridge. It requires the exact locally normalized/branded Wallet Guard intent, evaluates the existing hardened Wallet Guard policy with simulation fixed to `not_run`, samples one synchronous reference clock, and binds evidence/run identity, policy identity, normalized-input commitment, action commitment and the canonical Wallet Guard RPC method commitment. Determinate `ALLOW` and `DENY` results are committed through the existing shared `commitPomRxReceipt()` path. `INDETERMINATE` remains explicit standalone evidence and does not get collapsed into a binary portable receipt merely to satisfy the older preflight outcome vocabulary.

The preflight bridge does **not** claim authorization. Its companion evidence fixes `authorization_eligible=false`, `authorization_proved=false`, `simulation_evidence_proved=false`, `production_trusted_time_proved=false`, `normalized_input_only=true`, `raw_request_proved=false` and `reference_only=true`. The strict JSON ingress lot does not silently upgrade those flags: composing a raw-text commitment into later evidence is separate reviewed work. Unexpected runtime/intrinsic failures are not broadly translated into policy/receipt rejection; only typed Wallet Guard policy errors are normalized at the policy boundary.

The policy normalizer does not treat arbitrary JavaScript object behavior as policy data. Top-level policy and simulation records are snapshotted once from exact own enumerable data properties. Policy allowlists and `require_simulation_for` must be bounded dense standard arrays: accessors, Node Proxy wrappers, holes, symbol keys, hidden/extra properties and non-standard array prototypes fail closed before policy values participate in normalization or hashing. This prevents getter/Proxy/prototype behavior from substituting policy or simulation semantics in the Node reference runtime.

`policy-controller.mjs` adds a separate process-local reference state owner around that same hardened policy boundary. One controller instance fixes `policy_id`, starts at revision 0, applies full policy replacement only under exact compare-and-swap `expected_revision`, and can engage the kill switch idempotently. A re-enable requires an explicit full replacement at the current revision. Each published state is frozen and carries the normalized policy hash plus a domain-separated state commitment. Prospective state construction completes before the controller publishes a new current snapshot, so a failed prospective commitment does not partially advance revision/state.

The policy controller deliberately claims only `controller_instance_synchronous_atomicity=true`. It keeps `process_wide_policy_state_proved=false`, `durable_policy_state_proved=false`, `remote_operator_authorization_proved=false` and `provider_gate_state_binding_proved=false`. It does not authenticate an operator, persist state across restart, coordinate multiple controller instances, or automatically mutate an already-created provider/Gate instance. Those are separate composition and production-trust obligations.

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
- the bootstrap origin/provider authorities are trusted installation inputs;
- the caller-facing gateway does not expose the provider, but this alone does
  not prove that a browser/dApp has no second unguarded provider reference;
- strict JSON text parsing does not prove upstream transport-byte decoding;
- policy-state mutation authority is still a trusted in-process reference dependency and is not yet bound into provider/Gate state;
- portable reference preflight evidence does not prove a production Witness,
  authorization eligibility, Gate consumption or production trusted time;
- simulation evidence, production Witness enrollment/revocation/trusted time,
  external execution truth, independent observation and reconciliation are
  still separate lots;
- no real wallet, private key, testnet/mainnet transaction, custody path or
  uncontrolled malicious site is part of this reference layer.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. A later burner-wallet
local/testnet E2E requires a separate explicit human gate and must use no
meaningful funds.
