# ---- Build Stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Install required system packages
RUN apk add --no-cache openssl

# Copy package files and prisma schema
COPY package*.json ./
COPY scripts/ensure-minimatch-callable.js ./scripts/ensure-minimatch-callable.js
COPY prisma ./prisma/
COPY next.config.* ./

# Install all dependencies (including dev) for the build
RUN npm install --include=dev

# Copy rest of app source
COPY . .

# Generate Prisma Client in build stage
RUN npx prisma generate

# Build Next.js for production
ENV NODE_ENV=production
RUN npm run build


# ---- Production Runtime Stage ----
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install netcat for entrypoint checks
RUN apk add --no-cache netcat-openbsd && chown node:node /app

# Copy only necessary production artifacts
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER 1000:1000

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
