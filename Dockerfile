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

# Build if needed
RUN pnpm run build || true

EXPOSE 3000

CMD ["pnpm", "start"]s

