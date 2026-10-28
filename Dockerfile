# NetLodge Dockerfile — multi-stage build for Next.js standalone output
# Supports deployment to any container orchestration platform (K8s, ECS, Cloud Run, etc.)

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install bun for faster dependency installation
RUN npm install -g bun

# Copy lockfile and package.json
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry — disable in CI
ENV NEXT_TELEMETRY_DISABLED=1

# Build the standalone output
RUN bun run build

# ---- Stage 3: Runner (production image) ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
