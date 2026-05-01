FROM node:18-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy everything
COPY . .

# Install dependencies (workspace-aware)
RUN pnpm install --no-frozen-lockfile

# Build ONLY the actual server
RUN cd artifacts/api-server && pnpm build

# Move into server directory for runtime
WORKDIR /app/artifacts/api-server

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.mjs"]