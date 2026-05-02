FROM node:18-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy entire repo (needed for workspace)
COPY . .

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build ONLY the api server properly via workspace
RUN pnpm --filter ./artifacts/api-server build

# Move into the backend
WORKDIR /app/artifacts/api-server

# Expose Railway port
EXPOSE 3000

# Start using workspace script (NOT direct file)
CMD ["pnpm", "start"]