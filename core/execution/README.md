# POM-RX Core — Reference Execution Evidence

This directory owns the shared POM-RX **reference execution-evidence commitment** layer between exact authorization / Gate work and later observation/reconciliation.

The current recorder is deliberately bounded and reference-only. It:

- validates and recommits one complete exact-authorization binding through shared Core;
- accepts one local recorder opening per authorization commitment;
- opens only while the authorization is active under the half-open window `issued_at <= trusted_now < expires_at`;
- keeps a recorder-instance monotonic synchronous reference clock;
- records only recorder chronology (`recording_started_at`, `recorded_at`), not native execution time;
- snapshots outcome/effect data through the shared bounded plain-data boundary;
- commits bounded adapter-reported effects for known `success` / `error` outcomes;
- converts malformed or ambiguous outcome data to explicit `unknown` evidence rather than manufacturing a known effect;
- scopes local evidence provenance to the recorder instance;
- fails closed after 1,000 distinct authorization openings rather than evicting replay memory and accidentally allowing local reuse.

Expected shared canonical-payload rejection is recognized only through the shared `ProofPayloadValidationError` class. Unrelated runtime/intrinsic `TypeError` failures are not normalized into `unknown` evidence; they propagate and leave the local handle fail-closed.

## Non-claims

A record from this module is **not permission to execute** and is not proof that the common Gate consumed the capability. The current evidence therefore fixes these proof flags to false:

- `gate_consumption_proved=false`;
- `native_execution_time_proved=false`;
- `external_execution_proved=false`;
- `external_effect_proved=false`.

The effect commitment proves only what the installed reference adapter reported to this recorder. It does not prove an external transaction, RPC honesty, contract behavior, finality, host integrity or external state truth.

The in-memory replay set and 1,000-authorization ceiling are process/recorder-local. Production replay durability must be provided by a separately reviewed durable Gate/claim mechanism; this module intentionally does not evict old authorization identities because eviction could silently re-enable replay.

The installed synchronous clock is also a reference dependency. Monotonic samples and authorization-window checks do not establish production trusted wall-clock time.

## Architecture

Execution-evidence commitments are common POM-RX Core behavior. Application profiles such as Wallet Guard may provide bounded adapters/effect projections, but they must not fork this commitment/lifecycle layer.

No private key, seed, real or funded wallet, network transaction, testnet/mainnet execution or funds are part of this reference module.
