# Docker proof relay

Build from the repository root:

```bash
docker build -f examples/proof-relay/Dockerfile -t swisstokint-proof-relay:0.2 .
```

Verify the local hashing and commitment without sending anything:

```bash
docker run --rm -i \
  -e PROOF_RECEIPT_DRY_RUN=true \
  -e PROOF_RECEIPT_SOURCE_KEY_ID=docker-relay-v2 \
  swisstokint-proof-relay:0.2 \
  < schemas/examples/proof-event-v0.2.json
```

Run one event through stdin:

```bash
docker run --rm -i \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --pids-limit=64 \
  --memory=128m \
  --cpus=0.50 \
  --mount type=bind,src=/secure/proof-ingest-secret,dst=/run/secrets/proof-ingest,readonly \
  -e SWISSTOKINT_PROOF_RECEIPT_URL=https://swisstokint.ch/api/proof-of-method/receipts \
  -e PROOF_RECEIPT_INGEST_SECRET_FILE=/run/secrets/proof-ingest \
  -e PROOF_RECEIPT_SOURCE_KEY_ID=docker-relay-v2 \
  swisstokint-proof-relay:0.2 \
  < schemas/examples/proof-event-v0.2.json
```

The secret file must contain at least 32 random bytes and be readable only by
the service account that starts the container. `PROOF_RECEIPT_INGEST_SECRET`
remains supported for orchestrators that cannot mount a secret file, but a file
or native secret-manager injection is preferred because environment variables
can be inspected by anyone with control of the Docker daemon.

The container has no exchange dependency and requires no trading permission. The bot can invoke it only after producing an internal event. The relay hashes the payload locally and transmits the v0.2 wire receipt without the raw payload.

Never mount the bot's exchange API key, withdrawal credential, wallet seed or
strategy configuration into this relay. Use a unique, revocable ingest secret
whose only permission is submitting Proof of Method receipts.

See
[`docs/CONTAINER_AND_SECRET_SECURITY_BASELINE.md`](../../docs/CONTAINER_AND_SECRET_SECURITY_BASELINE.md)
for the public-image threat model, rotation procedure and production gates.
