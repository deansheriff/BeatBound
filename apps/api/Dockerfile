# Build stage - install dependencies
FROM oven/bun:1.0 AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Production stage
FROM oven/bun:1.0-slim AS runner

WORKDIR /app

# Copy all files from builder (Bun runs TypeScript directly, no build step needed)
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check - use bun's fetch for health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run directly with Bun (no build step - Bun handles TypeScript natively)
CMD ["bun", "run", "src/index.ts"]
