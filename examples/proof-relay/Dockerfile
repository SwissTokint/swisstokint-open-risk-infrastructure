FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node sdk/typescript/swisstokint-proof.mjs ./sdk/typescript/swisstokint-proof.mjs
COPY --chown=node:node scripts/proof-receipt-relay.mjs ./scripts/proof-receipt-relay.mjs

USER node

ENTRYPOINT ["node", "scripts/proof-receipt-relay.mjs"]
