FROM node:18-alpine

WORKDIR /app

RUN corepack enable

# Copy ONLY backend
COPY artifacts/api-server ./api-server

WORKDIR /app/api-server

# Install ONLY backend deps
RUN pnpm install --no-frozen-lockfile

# Build backend
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/index.mjs"]