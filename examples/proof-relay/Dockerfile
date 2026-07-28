FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2

LABEL org.opencontainers.image.source="https://github.com/SwissTokint/swisstokint-open-risk-infrastructure"
LABEL org.opencontainers.image.description="Credential-free SwissTokint Proof of Method receipt relay"

WORKDIR /app

COPY --chown=node:node sdk/typescript/swisstokint-proof.mjs ./sdk/typescript/swisstokint-proof.mjs
COPY --chown=node:node scripts/proof-receipt-relay.mjs ./scripts/proof-receipt-relay.mjs

ENV NODE_ENV=production

USER node

ENTRYPOINT ["node", "scripts/proof-receipt-relay.mjs"]
