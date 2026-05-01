FROM node:18-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy only package files first (better caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy rest of app
COPY . .

# Build ONLY api-server (no typecheck explosion)
RUN pnpm --filter @workspace/api-server run build

# Railway uses PORT automatically
ENV PORT=3000

EXPOSE 3000

# Start the built server directly
CMD ["node", "artifacts/api-server/dist/index.mjs"]

