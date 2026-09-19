# Build Stage
FROM node:20-slim AS builder

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY packages/types/package*.json ./packages/types/
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build all monorepo packages (types, backend TS, frontend Vite dist)
RUN npm run build:all

# Production Stage
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y sqlite3 openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=apps/backend"]
