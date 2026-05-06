##############################################################
# Stage 1 — Builder
# Full install (including devDeps) + esbuild compile
##############################################################
FROM node:18-alpine AS builder

WORKDIR /workspace

RUN npm install -g pnpm@10.26.1

# Workspace config in its own layer (cache-friendly)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Only the workspace packages api-server depends on
COPY lib/api-zod/ ./lib/api-zod/
COPY lib/db/     ./lib/db/

# The api-server source
COPY artifacts/api-server/ ./artifacts/api-server/

# Install everything (devDeps needed for esbuild)
RUN pnpm install --no-frozen-lockfile

# esbuild bundles all workspace deps into dist/index.mjs
RUN pnpm --filter @workspace/api-server run build

# Create a standalone production bundle:
# - only production node_modules (no devDeps, no source)
RUN pnpm deploy --filter @workspace/api-server --prod /deploy

##############################################################
# Stage 2 — Runner
# Minimal image: prod node_modules + compiled dist only
##############################################################
FROM node:18-alpine AS runner

WORKDIR /app

# Production dependencies from deploy step
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /deploy/package.json ./package.json

# esbuild output (index.mjs + pino worker shims)
COPY --from=builder /workspace/artifacts/api-server/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
