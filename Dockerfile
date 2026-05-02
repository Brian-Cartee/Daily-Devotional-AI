FROM node:18-alpine

WORKDIR /app

RUN corepack enable

# Copy ONLY what backend needs
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install workspace deps properly
RUN pnpm install --no-frozen-lockfile

# Build backend via workspace
RUN pnpm --filter ./artifacts/api-server build

# Move into backend
WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.mjs"]