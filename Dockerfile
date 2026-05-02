FROM node:18-alpine

WORKDIR /app

RUN corepack enable

# Copy entire repo (yes — but controlled)
COPY . .

# Install once (workspace aware)
RUN pnpm install --frozen-lockfile

# Build ONLY backend package
RUN pnpm --filter @workspace/api-server build

# Move to backend
WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["pnpm", "start"]