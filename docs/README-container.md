# Running VyOS API Manager with Container

This document describes how to run the VyOS API Manager using Docker or Podman, which includes both the FastAPI backend and Next.js frontend.

## Prerequisites

- Docker or Podman installed on your system
- Docker Compose or Podman Compose installed on your system (optional but recommended)

## Configuration

Before building the container image, make sure you have a proper configuration:

1. Create a `.env` file in the /backend directory with your VyOS router connection details:

```
VYOS_HOST=your-vyos-router-ip
VYOS_API_KEY=your-api-key
VYOS_HTTPS=true
TRUST_SELF_SIGNED=true  # Set to true if your VyOS router uses a self-signed certificate
ENVIRONMENT=production  # or development
```

2. Create a `.env` file in the /frontend directory with the following configuration:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Build and Run Using Compose (Recommended)

The simplest way to run the application is using Compose:


#### Docker Compose
```bash

cd container

# Build and start the container
docker-compose -f env_file_compose.yaml up -d

# View logs
docker-compose -f env_file_compose.yaml logs -f

# Stop the container
docker-compose -f env_file_compose.yaml down
```

#### Podman Compose
```bash

cd container

# Build and start the container
podman compose -f env_file_compose.yaml up -d

# View logs
podman compose -f env_file_compose.yaml logs -f

# Stop the container
podman compose -f env_file_compose.yaml down
```


## Build and Run Using Docker or Podman directly

If you prefer to use Docker or Podman commands directly, the example below is with docker, but works the same for podman, simply change `docker` to `podman`:
*Note: If you are getting an error like "sd-bus call: Interactive authentication required.: Permission denied" make sure to use sudo while running the commands.*

```bash

cd container

# Build the Docker images
docker build -f ./backend/Containerfile -t vymanager-backend .
docker build -f ./frontend/Containerfile -t vymanager-frontend .

# Run the Docker containers
docker run -p 3000:3000 -v ../backend/.env:/app/.env:ro --name vymanager-backend vymanager-backend
docker run -p 3001:3001 -v ../frontend/.env:/app/.env:ro --name vymanager-frontend vymanager-frontend

# View logs
docker logs -f vymanager-backend
docker logs -f vymanager-frontend

# Stop the container
docker stop vymanager-frontend
docker stop vymanager-backend
```

## Accessing the Application

After starting the container:

- The Next.js frontend is available at: http://localhost:3000
- The FastAPI backend API is available at: http://localhost:3001

## Production Deployment Considerations

For production deployments, consider the following:

1. Use a reverse proxy like Nginx to handle SSL termination
2. Set proper CORS settings in the FastAPI app
3. Use Docker Swarm or Kubernetes for orchestration
4. Set up proper logging and monitoring
5. Configure backups for any persistent data

## Troubleshooting

If you encounter issues:

1. Check the logs: `docker-compose -f env_file_compose.yaml logs` or `docker logs vymanager-frontend` or `docker logs vymanager-backend`
2. Verify your `.env` configuration
3. Ensure your VyOS router is accessible from the Docker container
4. For connection issues, test if your VyOS API is working correctly outside the container 