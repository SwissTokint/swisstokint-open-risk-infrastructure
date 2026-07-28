# Container and secret security baseline

Status: mandatory deployment baseline for prototypes and pilots, 28 July 2026.

## What is public

The reference Dockerfile and its source code are public. A published image
must be treated as completely inspectable: its layers, copied files, labels,
default environment and command are not confidential.

The image intentionally contains only:

- the Proof of Method receipt relay;
- the portable TypeScript proof SDK;
- the pinned official Node runtime.

It must never contain a `.env` file, exchange key, wallet seed, grant-portal
credential, member record, private strategy or production receipt secret.

Running Docker Desktop does not by itself make a container public. Exposure
occurs when an operator publishes a port, opens a firewall or router rule,
creates a tunnel, exposes the Docker socket, or grants another user access to
the Docker daemon.

## Secret separation

Use four distinct trust domains:

| Secret | Owner | May be available to the relay? |
| --- | --- | --- |
| Exchange read/trade key | Private bot service | No |
| Exchange withdrawal key | Do not create for the bot | No |
| Wallet or deployment key | Offline/deployment workflow | No |
| Proof receipt ingest secret | Receipt relay only | Yes |

The receipt secret grants only the ability to submit a bounded, signed proof
receipt. It must not authorize trades, withdrawals, user access or contract
deployment.

Prefer a native secret manager or a read-only file mounted at runtime:

```text
PROOF_RECEIPT_INGEST_SECRET_FILE=/run/secrets/proof-ingest
```

Do not bake the value into the image, pass it as a Docker build argument, write
it to the repository, print it in logs or place it directly in a shell command.
Anyone with administrative access to the Docker daemon or host must be treated
as trusted because that access can inspect containers and mounted secrets.

## Runtime baseline

Run the relay:

- as the image's unprivileged `node` user;
- with a read-only root filesystem;
- with every Linux capability dropped;
- with `no-new-privileges`;
- with explicit memory, CPU and process limits;
- without the Docker socket;
- without an inbound published port;
- with outbound access restricted to the SwissTokint receipt endpoint and
  required DNS/time services;
- with logs configured to exclude input payloads, headers and environment.

The relay accepts at most 64 KiB from standard input and requires HTTPS outside
dry-run mode. It sends only the compact receipt produced after local
sensitive-field validation and hashing.

## Rotation and incident response

1. Disable the affected receipt source at the receiving API.
2. Revoke and replace only its dedicated ingest secret.
3. Review receipt identifiers, timestamps, nonces and rate-limit events for the
   affected source.
4. Rebuild from a reviewed commit and the pinned base-image digest.
5. Restart with a newly mounted secret; never reuse the exposed value.
6. If an exchange credential may have entered an image, Git history, log or
   container, revoke it at the exchange immediately. Removing the file is not
   sufficient.

## Gates before connecting a trading bot

- The bot remains in dry-run or paper mode until its risk policy is calibrated.
- The bot has no withdrawal permission.
- The relay receives a sanitized internal event, never the exchange request or
  response object.
- The receipt endpoint uses a different secret from every user, database,
  exchange and deployment credential.
- A secret scan covers the working tree, Git history and built image.
- The built image has an SBOM and vulnerability scan attached to its release.
- A second person reviews the key permissions, emergency stop and rotation
  test before live trading is considered.

This baseline reduces exposure but is not an independent security audit or a
guarantee that a trading system is safe to operate with real funds.
