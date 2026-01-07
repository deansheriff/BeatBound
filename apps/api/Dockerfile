# Build stage
FROM oven/bun:1.0 AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (without frozen-lockfile since we don't commit bun.lockb)
RUN bun install

# Copy source code
COPY . .

# Build
RUN bun run build

# Production stage
FROM oven/bun:1.0-slim AS runner

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check - use wget instead of curl (alpine-based)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run
CMD ["bun", "run", "dist/index.js"]
