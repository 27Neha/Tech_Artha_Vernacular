# syntax=docker/dockerfile:1.7
#
# TechArtha API - NestJS + Prisma.
#
# THE BUILD CONTEXT IS THE REPO ROOT, not this directory. This is an npm workspaces
# monorepo, so `npm ci` needs the root lockfile and every workspace manifest:
#
#   docker build -f services/api/Dockerfile -t techartha-api:$(git rev-parse --short HEAD) .
#
# Two targets:
#   --target runner     the API server                      (default)
#   --target migrator   one-shot `prisma migrate deploy`    (pre-deploy ECS task)
#
# Debian slim rather than Alpine on purpose: Prisma's query engine wants glibc and
# OpenSSL, and the musl / binaryTargets dance is a recurring source of engine
# failures that only show up at runtime.

ARG NODE_VERSION=20-slim

# ---------------------------------------------------------------------------
# deps - full install including devDependencies, scoped to the api workspace.
# --workspace=api keeps Expo and React Native (apps/mobile) out of the build.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /repo

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Every workspace manifest has to be present even for workspaces we are not
# installing, or npm ci reports the lockfile as out of sync with package.json.
COPY package.json package-lock.json ./
COPY services/api/package.json      services/api/
COPY apps/web/package.json          apps/web/
COPY apps/mobile/package.json       apps/mobile/
COPY packages/config/package.json   packages/config/
COPY packages/i18n/package.json     packages/i18n/
COPY packages/types/package.json    packages/types/
COPY packages/ui/package.json       packages/ui/

RUN npm ci --workspace=api --include-workspace-root

# ---------------------------------------------------------------------------
# build - generate the Prisma client, then compile TypeScript.
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

# Generate before compiling: buckets.service.ts imports the `Prisma` namespace for
# its types, so `nest build` fails outright without a generated client.
#
# npm does NOT hoist prisma/@prisma to the root here - both land in
# services/api/node_modules, and `generate` writes the client to
# services/api/node_modules/.prisma. Verified against this lockfile; don't "simplify"
# these paths to ./node_modules without re-checking.
COPY services/api/prisma services/api/prisma
RUN ./services/api/node_modules/.bin/prisma generate --schema=services/api/prisma/schema.prisma

COPY services/api/ services/api/
RUN npm run build --workspace=api

# ---------------------------------------------------------------------------
# prod-deps - the same lockfile resolved without devDependencies.
# ---------------------------------------------------------------------------
FROM deps AS prod-deps
WORKDIR /repo
RUN npm ci --workspace=api --include-workspace-root --omit=dev

# ---------------------------------------------------------------------------
# migrator - short-lived container that applies migrations and exits.
# Built from `deps` because the Prisma CLI is a devDependency.
# ---------------------------------------------------------------------------
FROM deps AS migrator
WORKDIR /repo
ENV NODE_ENV=production
COPY services/api/prisma services/api/prisma
# `db:deploy` is `prisma migrate deploy` - it only applies committed migrations.
# Never `db:migrate`/`migrate dev` here: that one can drop and recreate the database.
CMD ["npm", "run", "db:deploy", "--workspace=api"]

# ---------------------------------------------------------------------------
# runner - the image the ECS service runs.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /repo

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates wget \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Runtime deps live in two places: @nestjs/* and friends hoist to the root, while
# @prisma/client stays nested under the workspace. Both are required.
COPY --from=prod-deps --chown=node:node /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /repo/services/api/node_modules ./services/api/node_modules

# The prod-only reinstall above has no generated client, so lift it from the build
# stage rather than shipping the Prisma CLI just to regenerate it here. The engine
# binary is platform-specific, which is why both stages share a base image.
COPY --from=build --chown=node:node /repo/services/api/node_modules/.prisma ./services/api/node_modules/.prisma
COPY --from=build --chown=node:node /repo/services/api/node_modules/@prisma/client ./services/api/node_modules/@prisma/client

COPY --from=build --chown=node:node /repo/services/api/dist ./services/api/dist
COPY --chown=node:node services/api/package.json ./services/api/

USER node
EXPOSE 3000

# Mirrors the ALB target-group check against the existing ApiHealthController route.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 || exit 1

CMD ["node", "services/api/dist/main"]
