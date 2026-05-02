FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile

# Move into backend ONLY
WORKDIR /app/artifacts/api-server

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]