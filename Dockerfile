FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.26.1

COPY . .

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

CMD ["node", "artifacts/api-server/dist/index.mjs"]
