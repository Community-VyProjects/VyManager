FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend dependencies
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the Next.js frontend
RUN npm run build

# Backend base
FROM python:3.11-slim AS backend-base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY main.py client.py utils.py ./
COPY frontend/app/ ./static/
COPY templates/ ./templates/
COPY endpoints/ ./endpoints/
COPY .env.example ./.env.example

# Create necessary directories
RUN mkdir -p /app/static /app/templates

# Copy frontend build from frontend-builder stage
FROM backend-base AS final

# Install Node.js and NPM in the final stage
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the built frontend from the previous stage
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package*.json /app/frontend/

# Install Next.js in the frontend directory
RUN cd /app/frontend && npm install next

# Create a directory for environment files
RUN mkdir -p /app/config

# Script to start both services
RUN echo '#!/bin/bash\n\
echo "Starting VyOS API Manager"\n\
\n\
# Check if .env exists, if not copy from example\n\
if [ ! -f "/app/.env" ]; then\n\
  if [ -f "/app/config/.env" ]; then\n\
    cp /app/config/.env /app/.env\n\
    echo "Using mounted .env file from /app/config/.env"\n\
  elif [ -f "/app/.env.example" ]; then\n\
    cp /app/.env.example /app/.env\n\
    echo "Created .env from example. Please update with your settings."\n\
  else\n\
    echo "No .env or .env.example found. Please provide configuration."\n\
    exit 1\n\
  fi\n\
fi\n\
\n\
# Start backend server in the background\n\
cd /app\n\
uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000} &\n\
BACKEND_PID=$!\n\
\n\
# Start frontend server\n\
cd /app/frontend\n\
if [ "$NODE_ENV" = "production" ]; then\n\
  echo "Starting Next.js in production mode..."\n\
  if command -v npx &> /dev/null; then\n\
    npx next start -p ${FRONTEND_PORT:-3000}\n\
  else\n\
    echo "npx not found, using node_modules directly"\n\
    node ./node_modules/.bin/next start -p ${FRONTEND_PORT:-3000}\n\
  fi\n\
else\n\
  echo "Starting Next.js in development mode..."\n\
  if command -v npx &> /dev/null; then\n\
    npx next dev -p ${FRONTEND_PORT:-3000}\n\
  else\n\
    echo "npx not found, using node_modules directly"\n\
    node ./node_modules/.bin/next dev -p ${FRONTEND_PORT:-3000}\n\
  fi\n\
fi\n\
\n\
# If frontend exits, kill the backend too\n\
kill $BACKEND_PID\n\
' > /app/start-services.sh && chmod +x /app/start-services.sh

# Set environment variables
ENV NODE_ENV=production
ENV BACKEND_PORT=8000
ENV FRONTEND_PORT=3000

# Expose ports
EXPOSE 3000 8000

# Set the entrypoint
ENTRYPOINT ["/app/start-services.sh"] 