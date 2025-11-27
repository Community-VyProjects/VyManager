# Frontend Dockerfile for VyManager (Next.js)
FROM node:24-alpine

# Install netcat for health checks and wait scripts
RUN apk add --no-cache netcat-openbsd

# Set working directory
WORKDIR /app

# Copy package files and prisma schema first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Copy and set entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
