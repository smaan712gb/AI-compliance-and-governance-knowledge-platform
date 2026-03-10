# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build the application ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Increase Node memory limit to prevent OOM on large Next.js builds
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + compiled query engine binaries (owned by nextjs).
# @prisma/client is already bundled inside .next/standalone/node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user BEFORE npm install so files are created with
# correct ownership — eliminates the slow `chown -R` on node_modules.
USER nextjs

# Install the Prisma CLI with ALL its transitive deps.
# Runs as nextjs so all installed files are already owned correctly.
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
RUN npm install --no-audit --no-fund prisma && rm package.json
EXPOSE 3000

# Sync DB schema then start server.
# Uses the freshly installed prisma CLI (with all deps) so db push works.
CMD ["sh", "-c", "echo 'Running prisma db push...' && npx prisma db push --skip-generate 2>&1 || echo 'WARNING: prisma db push failed, starting server anyway'; exec node server.js"]
