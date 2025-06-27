# Running VyManager with Containers

This document describes how to run VyManager using **Docker** or **Podman**, which includes both the FastAPI backend and the Next.js frontend.

## Prerequisites

- Docker or Podman installed
- Docker Compose or Podman Compose installed (recommended)
- Properly configured `.env` files for both backend and frontend (see below)

---

## Configuration

Before running the application, create the following environment files:

### 1. Backend `.env` file (`/backend/.env`):
```env
VYOS_HOST=your-vyos-router-ip
VYOS_API_KEY=your-api-key
VYOS_HTTPS=true
TRUST_SELF_SIGNED=true  # Set to true if your VyOS router uses a self-signed certificate
ENVIRONMENT=production  # or development
````

### 2. Frontend `.env` file (`/frontend/.env`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Running with Prebuilt Docker Images (Recommended)

This is the fastest way to get started using Docker Compose.

```bash
cd container

# Start the application
docker-compose -f prebuilt_images_compose.yaml up -d

# View logs
docker-compose -f prebuilt_images_compose.yaml logs -f

# Stop the application
docker-compose -f prebuilt_images_compose.yaml down
```

---

## Building and Running Your Own Images

If you'd like to build the images yourself (e.g. for development or customization), use the following steps.

### Docker Compose

```bash
cd container

# Build and start
docker-compose -f env_file_compose.yaml up -d

# Logs
docker-compose -f env_file_compose.yaml logs -f

# Stop
docker-compose -f env_file_compose.yaml down
```

### Podman Compose

```bash
cd container

# Build and start
podman compose -f env_file_compose.yaml up -d

# Logs
podman compose -f env_file_compose.yaml logs -f

# Stop
podman compose -f env_file_compose.yaml down
```

---

## Running Without Compose (Advanced)

If you want to run the containers manually using Docker or Podman, follow this method:

```bash
cd container

# Build images manually
docker build -f ./backend/Containerfile -t vymanager-backend .
docker build -f ./frontend/Containerfile -t vymanager-frontend .

# Run containers manually
docker run -d -p 3001:3001 --env-file ../backend/.env --name vymanager-backend vymanager-backend
docker run -d -p 3000:3000 --env-file ../frontend/.env --name vymanager-frontend vymanager-frontend

# Logs
docker logs -f vymanager-backend
docker logs -f vymanager-frontend

# Stop
docker stop vymanager-backend
docker stop vymanager-frontend
```

> 🛠️ *Note*: If you encounter `sd-bus call: Interactive authentication required`, try running with `sudo`.

---

## Accessing the Application

* Frontend (Next.js): [http://localhost:3000](http://localhost:3000)
* Backend API (FastAPI): [http://localhost:3001](http://localhost:3001)

---

## Production Deployment Considerations

For production use, consider:

* Reverse proxy with HTTPS (e.g. Nginx or Traefik)
* Secure CORS and authentication
* Orchestration with Docker Swarm or Kubernetes
* Centralized logging and monitoring
* Persistent volume setup for long-term storage

---

## Troubleshooting

1. Check logs:

   * `docker-compose logs` or `docker logs <container-name>`
2. Confirm `.env` files are correctly set
3. Verify VyOS API access from the container
4. Test your VyOS connection outside Docker first
