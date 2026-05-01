FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile

# ✅ ONLY build the REAL server
RUN cd artifacts/api-server && pnpm install && pnpm build

WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.mjs"]