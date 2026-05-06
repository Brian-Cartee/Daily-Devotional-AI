FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.26.1

# Copy root workspace config files (needed for pnpm workspace resolution)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy only the workspace packages that api-server depends on
COPY lib/api-zod/ ./lib/api-zod/
COPY lib/db/ ./lib/db/

# Copy the api-server itself
COPY artifacts/api-server/ ./artifacts/api-server/

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build the API server
RUN pnpm --filter @workspace/api-server run build

# Railway injects PORT at runtime
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
