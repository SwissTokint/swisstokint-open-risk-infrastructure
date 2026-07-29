FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2

LABEL org.opencontainers.image.source="https://github.com/SwissTokint/swisstokint-open-risk-infrastructure"
LABEL org.opencontainers.image.description="SwissTokint POM-RX preflight witness"

WORKDIR /app

COPY --chown=node:node sdk/typescript/swisstokint-proof.mjs ./sdk/typescript/swisstokint-proof.mjs
COPY --chown=node:node sdk/typescript/pom-rx.mjs ./sdk/typescript/pom-rx.mjs
COPY --chown=node:node sdk/typescript/pom-rx-witness.mjs ./sdk/typescript/pom-rx-witness.mjs
COPY --chown=node:node scripts/pom-rx-preflight-witness.mjs ./scripts/pom-rx-preflight-witness.mjs

ENV NODE_ENV=production
ENV POM_RX_WITNESS_DRY_RUN=true
ENV POM_RX_WITNESS_HOST=127.0.0.1
ENV POM_RX_WITNESS_PORT=8787

USER node

ENTRYPOINT ["node", "scripts/pom-rx-preflight-witness.mjs"]
