FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter ./artifacts/api-server build

WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.mjs"]
