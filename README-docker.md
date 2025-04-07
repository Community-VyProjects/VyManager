# Running VyOS API Manager with Docker

This document describes how to run the VyOS API Manager using Docker, which includes both the FastAPI backend and Next.js frontend.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system (optional but recommended)

## Configuration

Before building the Docker image, make sure you have a proper configuration:

1. Create a `.env` file in the root directory with your VyOS router connection details:

```
VYOS_HOST=your-vyos-router-ip
VYOS_API_KEY=your-api-key
VYOS_HTTPS=true
TRUST_SELF_SIGNED=true  # Set to true if your VyOS router uses a self-signed certificate
ENVIRONMENT=production  # or development
```

## Build and Run Using Docker Compose (Recommended)

The simplest way to run the application is using Docker Compose:

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

## Build and Run Using Docker Directly

If you prefer to use Docker commands directly:

```bash
# Build the Docker image
docker build -t vyosapi .

# Run the Docker container
docker run -p 3000:3000 -p 8000:8000 -v $(pwd)/.env:/app/config/.env:ro --name vyosapi vyosapi

# View logs
docker logs -f vyosapi

# Stop the container
docker stop vyosapi
```

## Accessing the Application

After starting the container:

- The Next.js frontend is available at: http://localhost:3000
- The FastAPI backend API is available at: http://localhost:8000

## Production Deployment Considerations

For production deployments, consider the following:

1. Use a reverse proxy like Nginx to handle SSL termination
2. Set proper CORS settings in the FastAPI app
3. Use Docker Swarm or Kubernetes for orchestration
4. Set up proper logging and monitoring
5. Configure backups for any persistent data

## Troubleshooting

If you encounter issues:

1. Check the Docker logs: `docker-compose logs` or `docker logs vyosapi`
2. Verify your `.env` configuration
3. Ensure your VyOS router is accessible from the Docker container
4. For connection issues, test if your VyOS API is working correctly outside Docker 