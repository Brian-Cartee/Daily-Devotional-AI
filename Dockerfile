FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm@10.26.1

# Copy everything (we'll control via .dockerignore)
COPY . .

# Install deps
RUN pnpm install --no-frozen-lockfile

# Build only api-server
RUN pnpm --filter @workspace/api-server run build

# Start server
CMD ["node", "artifacts/api-server/dist/index.mjs"]
