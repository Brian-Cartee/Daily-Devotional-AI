FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.26.1

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build only the API server
RUN pnpm --filter @workspace/api-server run build

# Expose port (Railway will inject PORT)
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]