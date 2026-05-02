FROM node:18-alpine

WORKDIR /app

RUN corepack enable

# Copy backend ONLY
COPY artifacts/api-server ./api-server

WORKDIR /app/api-server

# 🔥 IMPORTANT: remove workspace references before install
RUN rm -rf node_modules pnpm-lock.yaml

# Install as standalone package (no workspace)
RUN pnpm install --no-workspace --no-frozen-lockfile

# Build
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/index.mjs"]