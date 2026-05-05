FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]