# Multi-stage Dockerfile for Invari
# Builds both engine and web-console in a single optimized image

# ===================================
# Stage 1: Base with pnpm
# ===================================
FROM node:20-alpine AS base
RUN npm install -g pnpm@8.11.0
WORKDIR /app

# ===================================
# Stage 2: Install dependencies
# ===================================
FROM base AS dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY engine/package.json ./engine/
COPY web-console/package.json ./web-console/
RUN pnpm install --frozen-lockfile

# ===================================
# Stage 3: Build engine 
# ===================================
FROM dependencies AS build-engine
COPY engine ./engine
RUN pnpm --filter @invari/engine build

# ===================================
# Stage 4: Build web-console 
# ===================================
FROM dependencies AS build-web
COPY web-console ./web-console
RUN pnpm --filter @invari/web-console build

# ===================================
# Stage 5: Production image
# ===================================
FROM node:20-alpine AS production
RUN npm install -g pnpm@8.11.0 && \
    apk add --no-cache postgresql-client

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy engine package.json and install production dependencies only
COPY engine/package.json ./engine/
RUN pnpm install --frozen-lockfile --prod

# Copy built engine
COPY --from=build-engine /app/engine/dist ./engine/dist

# Copy migration files and scripts (needed for db:migrate)
COPY engine/drizzle ./engine/drizzle
COPY engine/scripts ./engine/scripts
COPY engine/drizzle.config.ts ./engine/

# Copy built web-console
COPY --from=build-web /app/web-console/dist ./web-console/dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
