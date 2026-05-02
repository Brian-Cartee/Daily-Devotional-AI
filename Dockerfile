FROM node:18-alpine

WORKDIR /app

RUN corepack enable

# copy only backend + minimal needed files
COPY artifacts/api-server ./api-server
COPY pnpm-lock.yaml ./
COPY package.json ./

WORKDIR /app/api-server

RUN pnpm install --no-frozen-lockfile

EXPOSE 3000

CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]