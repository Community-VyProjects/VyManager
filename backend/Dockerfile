# Backend Dockerfile for VyOS Management API (FastAPI)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy and set entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as an unprivileged user; the app only reads /app
RUN groupadd --gid 1000 vymanager \
    && useradd --uid 1000 --gid vymanager --no-create-home --home-dir /app --shell /usr/sbin/nologin vymanager
USER 1000:1000

# Expose port
EXPOSE 8000

# Use entrypoint script (imports custom CAs, then starts uvicorn)
ENTRYPOINT ["docker-entrypoint.sh"]
