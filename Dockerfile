FROM node:18-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile

# 🔥 FIXED BUILD STEP
RUN cd artifacts/api-server && pnpm build

EXPOSE 3000

# 🔥 FIXED START
CMD ["node", "artifacts/api-server/dist/index.mjs"]