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
  -e SWISSTOKINT_PROOF_RECEIPT_URL=https://swisstokint.ch/api/proof-of-method/receipts \
  -e PROOF_RECEIPT_INGEST_SECRET \
  -e PROOF_RECEIPT_SOURCE_KEY_ID=docker-relay-v2 \
  swisstokint-proof-relay:0.2 \
  < schemas/examples/proof-event-v0.2.json
```

`PROOF_RECEIPT_INGEST_SECRET` must already exist in the shell or secret manager. Do not place its value in the Dockerfile, image, command history or repository.

The container has no exchange dependency and requires no trading permission. The bot can invoke it only after producing an internal event. The relay hashes the payload locally and transmits the v0.2 wire receipt without the raw payload.
