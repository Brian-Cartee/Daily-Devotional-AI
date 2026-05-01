FROM node:18-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy EVERYTHING (required for workspace)
COPY . .

# Install ALL workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build ALL packages in workspace
RUN pnpm -r build

# Expose port
EXPOSE 3000

# Start app
CMD ["pnpm", "start"]
