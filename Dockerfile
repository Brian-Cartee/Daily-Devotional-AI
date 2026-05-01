FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

# install deps (fix lockfile issue)
RUN pnpm install --no-frozen-lockfile

# build ONLY the real server
RUN pnpm --filter @workspace/api-server build

# move into the correct runtime directory
WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.mjs"]