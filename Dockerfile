# syntax=docker/dockerfile:1
# Build on a CI runner, ship only the standalone server. NEXT_PUBLIC_* and the
# rewrite target are baked into the build, so they are build args, not runtime env.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUITED_SERVER
ARG NEXT_PUBLIC_SUITED_WS
ARG NEXT_PUBLIC_SUITED_OFFLINE
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_CHAIN_RPC_URL
ARG NEXT_PUBLIC_CHAIN_EXPLORER_URL
ARG NEXT_PUBLIC_SOLANA_RPC_URL
ARG NEXT_PUBLIC_WALLETCONNECT_ID
ARG SUITED_BACKEND
ENV NEXT_PUBLIC_SUITED_SERVER=$NEXT_PUBLIC_SUITED_SERVER \
    NEXT_PUBLIC_SUITED_WS=$NEXT_PUBLIC_SUITED_WS \
    NEXT_PUBLIC_SUITED_OFFLINE=$NEXT_PUBLIC_SUITED_OFFLINE \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_CHAIN_RPC_URL=$NEXT_PUBLIC_CHAIN_RPC_URL \
    NEXT_PUBLIC_CHAIN_EXPLORER_URL=$NEXT_PUBLIC_CHAIN_EXPLORER_URL \
    NEXT_PUBLIC_SOLANA_RPC_URL=$NEXT_PUBLIC_SOLANA_RPC_URL \
    NEXT_PUBLIC_WALLETCONNECT_ID=$NEXT_PUBLIC_WALLETCONNECT_ID \
    SUITED_BACKEND=$SUITED_BACKEND \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
