# syntax=docker/dockerfile:1.7
#
# TechArtha web - Next.js 14, standalone output.
#
# THE BUILD CONTEXT IS THE REPO ROOT, not this directory:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.techartha.example \
#     -t techartha-web:$(git rev-parse --short HEAD) .
#
# NEXT_PUBLIC_API_URL is inlined into the client bundle by the compiler, so it is a
# BUILD argument, not a runtime variable. Setting it in the ECS task definition does
# nothing. One image per environment, and staging/prod cannot share a tag.

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# deps - scoped to the web workspace so Expo and the NestJS toolchain stay out.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /repo

# Every workspace manifest has to be present even for workspaces we are not
# installing, or npm ci reports the lockfile as out of sync with package.json.
COPY package.json package-lock.json ./
COPY apps/web/package.json          apps/web/
COPY apps/mobile/package.json       apps/mobile/
COPY services/api/package.json      services/api/
COPY packages/config/package.json   packages/config/
COPY packages/i18n/package.json     packages/i18n/
COPY packages/types/package.json    packages/types/
COPY packages/ui/package.json       packages/ui/

RUN npm ci --workspace=web --include-workspace-root

# ---------------------------------------------------------------------------
# build - produces .next/standalone.
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1

COPY apps/web apps/web

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build --workspace=web

# ---------------------------------------------------------------------------
# runner - serves the standalone bundle.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /repo

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next's standalone server binds localhost by default, which is unreachable from
# outside the container and fails every ALB health check.
ENV HOSTNAME=0.0.0.0

# next.config.js sets experimental.outputFileTracingRoot to the repo root, so the
# standalone bundle mirrors the monorepo layout: node_modules at the root, the
# server entrypoint at apps/web/server.js. Static assets and public/ are not traced
# and have to be copied in separately.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

CMD ["node", "apps/web/server.js"]
