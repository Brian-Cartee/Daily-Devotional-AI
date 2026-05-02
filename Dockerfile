FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

# Install all dependencies (workspace-aware)
RUN pnpm install --no-frozen-lockfile

# Move into the REAL backend
WORKDIR /app/artifacts/api-server

# Build only this service
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]