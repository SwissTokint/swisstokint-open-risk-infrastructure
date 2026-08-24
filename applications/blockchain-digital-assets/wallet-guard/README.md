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
- a Wallet Guard application-profile Witness authorization adapter that reduces a cryptographically verified Core source-envelope/Witness-acknowledgement candidate into the existing provider authorization-supplier contract;
- strict policy/simulation object-boundary capture from exact own enumerable data descriptors, with accessor, Proxy, hidden/symbol/unknown-property and custom-prototype rejection;
- provider-observed chain/account sampling;
- bootstrap-captured origin that is not accepted from request fields;
- repeated context checks around the Core reference single-use Gate;
- a Gate-owned prepared request re-normalized immediately before a controlled provider call;
- per-request synthetic reference authorization metadata with local reuse rejection remains available for older controlled fixtures;
- a controlled in-memory provider host whose returned `page` object graph exposes only the guarded `ethereum.request` path while the fake raw provider remains closure-owned.
- a clean-process callback-provider foundation with CSPRNG-owned sessions, strict JSON response binding and fixed chain/account command context; this foundation has no browser or socket host yet.

`json-ingress.mjs` closes one narrow parser-equivalence gap before raw JSON text from a controlled fixture is reduced to Wallet Guard request semantics. It lexically scans the supplied JavaScript string before `JSON.parse`, rejects duplicate decoded object keys (including escaped aliases such as `m\u0065thod` versus `method`), prototype-pollution keys, unpaired Unicode surrogates, non-canonical JSON number spellings, excessive bytes/depth/nodes/string/key sizes and ambiguous top-level envelopes. It then emits a frozen `{method, params}` request together with a raw-text SHA-256 and a shared-canonical-request SHA-256.

The ingress receives a JavaScript string, not the original browser/network byte stream. `raw_text_sha256` therefore commits only the supplied string encoding used by the local hashing helper, and `transport_bytes_proved=false` remains explicit. The ingress does not prove UTF-8/WebSocket/browser decoder correctness, origin authenticity, provider integrity, method-specific EVM semantics, policy authorization, Gate consumption or execution.

Canonical-request compatibility is delegated to the shared proof canonicalizer rather than duplicated in Wallet Guard. Expected canonical-payload rejection is recognized only through the shared `ProofPayloadValidationError` provenance contract. Generic or intrinsic `TypeError` failures are not classified by message text and propagate unchanged, including when their text happens to match a canonical validation message. This preserves the distinction between expected semantic rejection and an unrelated runtime failure.

`preflight-evidence.mjs` is a separate bounded evidence bridge. It requires the exact locally normalized/branded Wallet Guard intent, evaluates the existing hardened Wallet Guard policy with simulation fixed to `not_run`, samples one synchronous reference clock, and binds evidence/run identity, policy identity, normalized-input commitment, action commitment and the canonical Wallet Guard RPC method commitment. Determinate `ALLOW` and `DENY` results are committed through the existing shared `commitPomRxReceipt()` path. `INDETERMINATE` remains explicit standalone evidence and does not get collapsed into a binary portable receipt merely to satisfy the older preflight outcome vocabulary.

The preflight bridge does **not** claim authorization. Its companion evidence fixes `authorization_eligible=false`, `authorization_proved=false`, `simulation_evidence_proved=false`, `production_trusted_time_proved=false`, `normalized_input_only=true`, `raw_request_proved=false` and `reference_only=true`. The strict JSON ingress lot does not silently upgrade those flags: composing a raw-text commitment into later evidence is separate reviewed work. Unexpected runtime/intrinsic failures are not broadly translated into policy/receipt rejection; only typed Wallet Guard policy errors are normalized at the policy boundary.

`witness-authorization.mjs` is the application-profile bridge from the shared Core Witness trust lifecycle to the provider's existing synchronous `referenceAuthorizationForRequest` contract. It does not create a second Witness implementation. A trusted installation callback supplies one source envelope plus one Witness acknowledgement; both are captured as inert bounded plain data and passed to the shared Core `verifyAuthorizationCandidate()` path. Only a successful Core result with enrolled active source/Witness roles, valid signatures, witnessed mode, chronology and trust-bounded validity is accepted. The adapter then requires the signed allow-preflight receipt to match the provider request's exact method, policy and Wallet Guard action commitments and rejects a preflight timestamp after capability issuance or a trust window shorter than the requested capability.

The action commitment is the existing full normalized Wallet Guard intent commitment, so the adapter does not invent a separate application authorization hash. The provider still binds its separately computed `context_commitment` into the Core exact-authorization record and rechecks context at the Gate. The adapter does not claim that the Witness signed that redundant provider context digest as a separate field. It also does not prove the strict verifier/artifact tuple: `verification_profile`, `verifier_version`, `implementation_artifact_sha256` and `effective_verification_policy_sha256` remain an exact trusted bootstrap binding supplied to this reference adapter. The installed evidence callback and Core-verifier handle are trusted synchronous dependencies; malformed/Proxy/accessor return data fails closed after the callback returns, while unrelated verifier runtime failures preserve their original error provenance.

This Witness adapter therefore upgrades one narrow fixture property from opaque synthetic receipt/Witness hashes to cryptographically checked, enrolled Core Witness evidence, but it remains `reference_only`. It does not provide durable trust state, production trusted time, HSM/KMS key custody, operator authorization for trust mutations, remote attestation, distributed revocation, quorum, browser integrity, or production authorization. The current controlled host continues to use its synthetic fixture supplier unless a separately reviewed composition explicitly installs this adapter.

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

`controlled-host.mjs` narrows one demo-installation bypass property. Within the
exact object graph returned as `page`, there is no raw-provider, Core Gate,
capability-issuer or test-authority handle: the fake raw provider is owned by a
private closure and the separate `testAuthority` exists only for deterministic
fixture mutation and inspection. The authority is returned beside the page for
tests and is not reachable from `page` or `page.ethereum`.

That guarantee is **not** browser or JavaScript-realm integrity. It does not
prevent another provider installed elsewhere, a hostile extension or host that
already retained an independent provider reference, or compromise of trusted
runtime/bootstrap dependencies. The controlled host performs no network I/O,
holds no wallet keys and does not upgrade its synthetic reference authorization
supplier merely because the separate Witness adapter exists.

`trusted-provider-transport.mjs` also exposes a separate callback-provider
foundation for a later loopback MetaMask host. The factory owns a fresh
256-bit Node CSPRNG session, fixes one lowercase EVM account and one canonical
chain id, creates the native Promise inside the clean Node process, and admits
the resulting provider through the same private provenance registry. A
sensitive command carries the exact session, monotonically increasing
sequence, request id, expected chain/account and frozen request. The only
trusted dispatcher contract is synchronous
`dispatchSensitive(command, deliverRawJson, reportFailure) => undefined`.
Raw JSON success/error responses are parsed and bound inside the trusted
transport; duplicate keys, wrong session/sequence/request id, wrong observed
chain/account, unknown error codes and malformed transaction hashes fail
closed. Any ambiguous terminal failure destroys the session, so callers must
explicitly create a new transport rather than retry within a possibly live
wallet prompt.

By itself, this callback foundation does not authenticate an HTTP Host, browser
origin, page/extension, IPC peer or byte-frame boundary. It does not own a
timeout or cancellation mechanism and cannot prove that a displayed wallet
prompt was cancelled. The loopback prototype below supplies one narrow host
composition around that contract; those host controls do not become guarantees
of the callback foundation or arbitrary browser integrations.

## MetaMask burner prototype: Anvil first, then Sepolia

The stacked `prototype/` lot supplies that loopback host for a local burner
exercise. It binds only `127.0.0.1`, validates the exact Host and POST Origin,
uses a one-time 256-bit bootstrap URL to establish an HttpOnly SameSite cookie,
uses a fresh ephemeral HTTP port by default, clears prior origin cache/storage,
serves a CSP-constrained page with isolation/referrer headers, and accepts one
exact-content-type bounded Content-Length JSON body per POST. The browser
refuses a service worker, application cache/storage or opener. The browser
adapter never reads `window.ethereum`. It requests EIP-6963 announcements,
selects exactly one provider whose `rdns` is `io.metamask`, and rejects a
missing, malformed, duplicate or ambiguous MetaMask announcement. The selected
provider remains browser-only; Node receives bounded JSON observations, never
the provider object, a provider Promise or a wallet key.

On Anvil, the initial handshake binds the selected account and chain id
together with the MetaMask-visible genesis hash and latest block number/hash to
the same view captured through the Node RPC observer. On Sepolia, Node first
selects a `safe` checkpoint; MetaMask reads that exact block number and Node
then revalidates its hash. The same Node-selected checkpoint protocol runs
before the sensitive command, avoiding comparison of two moving `latest`
heads. Before an allowed command is
dispatched, Node stores a block/nonce observation baseline. Immediately before
the only sensitive EIP-1193 send, the browser samples chain, account, genesis
and latest block twice, submits the bound view to `/bridge/view`, and waits for
Node to recapture and exactly match the same view. Drift fails closed before
the send. Account/chain are sampled again after the wallet prompt. A hash
returned with late context drift is retained as ambiguous evidence and sent to
the observer instead of being discarded.

Prerequisites: Node.js 24, MetaMask with EIP-6963 support, and Foundry's `anvil`
plus `cast` on PATH. Use a newly created MetaMask burner account in a dedicated
clean browser profile with no other wallet extension, service worker or prior
storage for the prototype origin. Never enter a seed phrase into this project,
never import an Anvil development key, and never use mainnet or meaningful
funds. POM-RX Core does not receive or custody the burner key.

1. Run the complete automated prototype suites:

   ```sh
   npm run test:pom-rx:wallet-guard-prototype
   ```

   This runs the HTTP/session/ambiguity suite and the executable browser
   EIP-1193 plus fake-JSON-RPC observer suite.

2. Start a fresh disposable chain and verify its chain id:

   ```sh
   anvil --host 127.0.0.1 --port 8545 --chain-id 31337 --silent
   ```

   Leave that foreground process running. In another terminal:

   ```sh
   cast chain-id --rpc-url http://127.0.0.1:8545
   ```

   The expected output is `31337`. Do not reuse this Anvil process for another
   prototype session.

3. Copy only the public address of the dedicated MetaMask burner. Fund that
   public address with a small, valueless Anvil balance and verify it:

   ```sh
   POMRX_BURNER=0xPUBLIC_BURNER_ADDRESS
   cast rpc --rpc-url http://127.0.0.1:8545 anvil_setBalance "$POMRX_BURNER" 0x2386f26fc10000
   cast balance --rpc-url http://127.0.0.1:8545 "$POMRX_BURNER"
   ```

   `0x2386f26fc10000` is `0.01` Anvil ETH and is used only for local gas. No
   private key or seed is supplied to `cast`, Node or this repository.

4. In a separate terminal, start the clean-process Wallet Guard host:

   ```sh
   npm run prototype:wallet-guard:anvil
   ```

   Use the default RPC unless the full browser and observer configuration is
   intentionally reviewed together. The host binds to a fresh ephemeral port
   and prints a bootstrap URL containing a one-time secret.

5. In the dedicated profile, open the printed URL exactly once and click
   **Connecter MetaMask au réseau configuré**. The page requests one unambiguous MetaMask
   provider through EIP-6963, then explicitly adds/switches to chain `0x7a69`
   (31337) at `http://127.0.0.1:8545/`. Expected status includes
   `chain_view_bound=true`, the burner address and the selected provider
   metadata. A stale network entry pointing at another RPC is rejected when
   the MetaMask and Node chain views do not match.
6. Run **DENY approval illimité** first. Expected: `decision=DENY`,
   `forwarded=false`, sensitive-call count zero, and no MetaMask transaction
   confirmation.
7. Run **self-transfer 0 ETH** once. In MetaMask, confirm only an exact
   burner-to-itself transaction with value zero and empty data. Expected:
   `decision=ALLOW`, `forwarded=true`, one lowercase transaction hash and
   `observation.status=MATCH_REFERENCE`. The Node observer verifies chain,
   receipt success, transaction hash, from/to, zero value, empty input,
   block linkage and the expected pre-dispatch nonce.
8. Record the displayed result for review, stop the Node host, stop the
   disposable Anvil process, and discard the dedicated burner profile/wallet.
   The one-sensitive-call capacity is exhausted; starting a new host is a new
   session, never authority to retry an earlier or still-visible prompt.

A timeout, browser context event, malformed response, RPC observer failure or
process shutdown after delivery to MetaMask closes the session as
`AMBIGUOUS`; retry remains forbidden. A transaction hash returned later is
retained and reconciled against the same pre-dispatch Anvil block/nonce
baseline, but does not turn the operation into a normal success. Do not approve
a prompt after the page reports closure. Stop Anvil and discard the burner
after reconciliation. Restarting the Node host creates a new session, but it is
not a retry authorization for an earlier prompt.

### Sepolia burner promotion

Run this only after the Anvil exercise has passed and a separate human gate
authorizes the Sepolia transaction. Use a new burner in a dedicated clean
profile. Never reuse a wallet, enter/export its seed or private key, or fund it
beyond the minimum faucet Sepolia ETH needed for gas.

1. Enable Sepolia manually in MetaMask before starting the host. The prototype
   is switch-only on Sepolia: it never calls `wallet_addEthereumChain` and never
   sends an RPC URL to the browser. A MetaMask `4902` response stops setup;
   enable/add Sepolia outside this application and start a fresh session.
2. Select one reviewed public HTTPS Sepolia RPC for the Node observer. Prefer a
   credential-free endpoint. Userinfo, query parameters, fragments, IP
   literals, loopback/private addresses and metadata endpoints are rejected.
   If a provider requires an opaque token in the URL path, keep it only in the
   process environment: never commit, print or send it to the browser. The URL
   remains server-only. Redirects, unexpected response media types, duplicate
   JSON keys and DNS answers containing a non-public address fail closed; one
   validated public DNS answer is pinned for the TLS socket.

   ```sh
   export POMRX_WG_SEPOLIA_OBSERVER_RPC=https://YOUR_REVIEWED_PUBLIC_SEPOLIA_RPC/
   cast chain-id --rpc-url "$POMRX_WG_SEPOLIA_OBSERVER_RPC"
   cast balance --rpc-url "$POMRX_WG_SEPOLIA_OBSERVER_RPC" 0xPUBLIC_BURNER_ADDRESS
   ```

   The expected chain id is `11155111`; the burner balance must be non-zero and
   there must be no pending burner transaction.
3. Create a private directory outside the repository and bind this one run to
   one absolute durable-journal path. The journal contains only public
   operation metadata; it never contains the bootstrap cookie, an RPC URL, a
   seed or a private key.

   ```sh
   install -d -m 700 ../pomrx-wallet-run
   export POMRX_WG_SEPOLIA_JOURNAL="$(cd ../pomrx-wallet-run && pwd)/sepolia-operation.json"
   ```

   The host creates the journal and its ownership lock with mode `0600`. An
   existing journal or lock always blocks startup: it is evidence of another
   owner or an earlier run that must be reconciled, never permission to retry.
4. Run the suites again, then start the Sepolia host:

   ```sh
   npm run test:pom-rx:wallet-guard-prototype
   npm run prototype:wallet-guard:sepolia
   ```

5. Open the one-time URL, connect the burner, and verify chain `0xaa36a7`, the
   exact public burner address and `chain_view_bound=true`. Run **DENY approval
   illimité** first; it must remain non-forwarding with no MetaMask prompt.
6. Run the zero-value self-transfer once. Confirm only when `from` and `to` are
   the same burner, value is zero and data is empty. Node refuses dispatch when
   `latest` and `pending` nonces differ, the balance is zero, gas estimation
   fails, the observer is syncing, or MetaMask cannot reproduce the
   Node-selected `safe` checkpoint.
7. A mined receipt alone is not success. `MATCH_REFERENCE` requires at least
   two confirmations, a Sepolia `safe` head covering the inclusion block, and
   a final re-fetch of the receipt, transaction fields and canonical block
   hash. This can take several minutes. Timeout, safe-head lag beyond the
   bound, reorg, context change or observer failure is `AMBIGUOUS` and forbids
   retry; preserve the hash for reconciliation and stop.

After a terminal result, archive the journal with the captured evidence before
choosing a new path for any separately authorized run. After a crash or
`AMBIGUOUS`, first verify that the old Node process is dead, reconcile the
burner nonce and any retained transaction hash through the observer, then
archive the journal and stale `.lock` together. Never remove only the lock and
restart while an old owner or MetaMask prompt may still be live.

The Node observer endpoint is server-only, but the prototype cannot inspect
MetaMask's upstream. It therefore keeps `independent_observation_proved=false`.
A `safe` checkpoint is not represented as production consensus-finality or
independent reconciliation evidence.

This prototype still uses the provider's synthetic reference authorization
supplier and network-specific reference transaction/receipt checks. The EIP-6963 `rdns`
value is provider-supplied metadata, not cryptographic authentication of the
extension; the dedicated clean profile remains part of the operational trust
boundary. Matching sampled chain views detects endpoint/state divergence but
does not prove browser or extension integrity. Anvil uses the same loopback RPC
for the wallet and observer. Sepolia keeps a separately configured Node
endpoint, but cannot prove MetaMask's upstream or observer independence. The
prototype does not yet emit the private Gate authorization binding, Core
execution evidence, production finality evidence or independent
reconciliation. `MATCH_REFERENCE` is therefore a bounded reference
observation, not a production or cryptographic authorization claim. Every
Sepolia transaction remains subject to a separate human gate after the exact
Anvil evidence passes.

This is **not** yet the complete Wallet Guard security claim. In particular:

- the generic provider supplier and controlled-host fixture still support synthetic reference authorization; the separate Witness adapter must be explicitly composed to replace those opaque hashes with Core-verified reference Witness evidence;
- even with that adapter, the strict verifier/artifact tuple and evidence callback remain trusted reference bootstrap dependencies and production authorization is not proved;
- the bootstrap origin/provider authorities are trusted installation inputs;
- the controlled-host returned page graph removes a second raw-provider reference only inside that fixture; arbitrary browser/extension/host integrity and independently installed providers remain unproved;
- strict JSON text parsing does not prove upstream transport-byte decoding;
- policy-state mutation authority is still a trusted in-process reference dependency and is not yet bound into provider/Gate state;
- portable reference preflight evidence does not prove production trusted time or production Gate consumption;
- simulation evidence, durable/production Witness trust, external execution truth, independent observation and reconciliation are still separate lots;
- repository tests do not themselves prove that a real MetaMask prompt or
  Sepolia transaction occurred; that evidence comes only from the explicit
  human-gated burner exercise. Mainnet, meaningful funds, private-key handling,
  custody paths and uncontrolled malicious sites remain out of scope.

The first acceptable simulated demonstration must prove that a dangerous
approval/signature is denied before forwarding while an explicitly allowed
control request can be forwarded once and reconciled. The current
burner-wallet local/testnet E2E remains reference-only, requires a separate
explicit human gate for every run and must use no meaningful funds.
