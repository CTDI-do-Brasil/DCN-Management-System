# -----------------------------------------------------------------------------
# Stage 1: Build stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build tools)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy project source code
COPY . .

# Build Vite frontend and Express server
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production runner stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

# Copy package manifests and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client for runner environment
RUN npx prisma generate

# Copy built frontend and server from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

EXPOSE 80 3000

# Push Prisma schema (se DATABASE_URL estiver configurada), executa seed se RUN_SEED=true e inicia o servidor Express
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then npx prisma db push --skip-generate && if [ \"$RUN_SEED\" = \"true\" ]; then node dist-server/seed.cjs; fi; fi && node dist-server/index.cjs"]
