FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

# install everything
RUN pnpm install --no-frozen-lockfile

# 🔥 ONLY build the real server
RUN cd artifacts/api-server && pnpm build

# run the real server
WORKDIR /app/artifacts/api-server

EXPOSE 3000

CMD ["node", "dist/index.mjs"]