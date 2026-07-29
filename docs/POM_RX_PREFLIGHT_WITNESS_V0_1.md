# POM-RX preflight witness v0.1

Status: security-oriented prototype. It is not a production authorization
service, an independent audit or evidence that a trading bot is safe.

## Purpose

A local receipt can be generated after an event. POM-RX therefore needs an
external witness that receives and signs the preflight commitment before the
downstream financial action.

The witness:

1. verifies a source Ed25519 signature;
2. recomputes the exact POM-RX receipt commitment;
3. accepts the `preflight` phase only;
4. validates the allow or deny policy assertions;
5. persists the acknowledgement before responding;
6. returns a signed, timestamped and idempotent acknowledgement.

The bot or financial agent must verify that acknowledgement and fail closed
when a witnessed allow decision is required but unavailable.

## Blockchain utility boundary

For a centralized-exchange bot, the witness and later on-chain batch anchor
provide portable audit evidence. They cannot cryptographically force a
centralized venue to respect the receipt.

The stronger blockchain-native design is a **POM-RX Risk Gate**. A smart
account, wallet module or program must validate an unexpired acknowledgement
bound to the exact call before execution:

- on ERC-4337 accounts, the gate can participate in `validateUserOp`;
- on Soroban, contract authorization can require the committed preflight;
- on Solana, a program can require a PDA-held authorization and consume it
  atomically with the protected instruction.

In that mode, blockchain state is not decorative storage. It is the shared
enforcement and replay-protection layer. This contract-level gate, not the
off-chain witness alone, is the primary long-term protocol utility.

## Secret boundary

The service receives:

- a public source key;
- receipt and run identifiers;
- commitments to method, policy, inputs and action;
- named rule results and evidence commitments.

It must never receive an exchange key, wallet seed, raw order, balance,
position, account identifier, private strategy or uncommitted risk threshold.

The witness signing key is a distinct Ed25519 key. It authorizes
acknowledgements only. It must be mounted read-only at runtime and must never be
present in the repository, Dockerfile, image layer, build argument or log.

Generate a dedicated key outside the repository. The command refuses to
overwrite an existing key:

```text
npm run pom-rx:witness-keygen
```

The private key defaults to
`~/.config/swisstokint/pom-rx-witness-private.pem`. Use a different, dedicated
key for each environment and for each receipt source.

## API

### `POST /v1/preflight`

Content type: `application/json`.

The body is a `pom-rx-source-envelope/0.1` object containing the exact POM-RX
receipt, its domain-separated hash, the source public key and the source
signature.

Responses:

- `201`: a new acknowledgement was persisted;
- `200`: the exact receipt hash was already acknowledged and the original
  acknowledgement is returned;
- `413`: body exceeds 64 KiB;
- `415`: media type is not JSON;
- `422`: receipt, key binding, phase or signature is invalid;
- `429`: bounded process-level request limit exceeded.

### `GET /healthz`

Returns only service mode and witness key identifier. It exposes no secret and
does not prove that the ledger volume or external TLS proxy is healthy.

## Acknowledgement

The `pom-rx-witness-ack/0.1` acknowledgement binds:

- receipt hash, receipt ID and run ID;
- preflight outcome;
- source signing-key identifier;
- witness receipt time;
- short authorization expiry (`valid_until`);
- `dry_run` or `witnessed` mode;
- witness signing-key identifier.

The signature covers a canonical, domain-separated payload. A `dry_run`
acknowledgement must never unlock a live downstream adapter.

The default acceptance window rejects preflight receipts older than two
minutes or more than thirty seconds in the future. A new acknowledgement is
valid for thirty seconds by default and is bound to one exact receipt hash.

## Persistent mode

Persistent mode requires:

```text
POM_RX_WITNESS_DRY_RUN=false
POM_RX_WITNESS_PUBLIC_BASE_URL=https://witness.example
POM_RX_WITNESS_SIGNING_KEY_FILE=/run/secrets/pom-rx-witness-key.pem
POM_RX_WITNESS_LEDGER_FILE=/var/lib/pom-rx/acknowledgements.jsonl
```

The ledger is append-only JSON Lines. It contains public acknowledgements, not
signing keys. A corrupted, duplicated or signature-invalid line stops service
startup.

Terminate TLS in a reviewed proxy or managed ingress. Do not publish the
container port directly to the Internet. Restrict the signing-key mount to
read-only and the ledger mount to the service user.

## Container baseline

Use the same controls as the proof relay:

- unprivileged user;
- read-only root filesystem;
- all Linux capabilities dropped;
- `no-new-privileges`;
- explicit memory, CPU and process limits;
- no Docker socket;
- read-only signing-key mount;
- dedicated writable ledger volume;
- inbound access only through HTTPS, request limits and infrastructure rate
  limiting.

The built-in request limiter is a bounded prototype control and is not a
replacement for an authenticated gateway, DDoS protection or per-source
quotas.

## Remaining production gates

- independent protocol and application-security review;
- trusted time source and clock-drift monitoring;
- key rotation with overlapping verification keys;
- durable transactional storage instead of a JSONL prototype ledger;
- per-source enrollment, revocation and quotas;
- multi-witness or TEE profile for stronger non-collusion;
- bot-side fail-closed acknowledgement gate tested only in paper mode;
- recovery drill for ledger corruption and witness-key compromise.
