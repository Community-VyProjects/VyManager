# ---- Build Stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Install required system packages
RUN apk add --no-cache openssl

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy rest of app source
COPY . .

# Generate Prisma Client in build stage
RUN npx prisma generate

# Build Next.js for production
RUN npm run build


# ---- Production Runtime Stage ----
FROM node:24-alpine AS runner

WORKDIR /app

# Install netcat for entrypoint checks
RUN apk add --no-cache netcat-openbsd

# Copy only necessary production artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
