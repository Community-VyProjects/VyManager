---
id: install-docker
title: Docker Compose install
sidebar_position: 2
---

# Docker Compose install

This is the standard way to run VyManager. It uses the prebuilt images from GitHub Container Registry:

- `ghcr.io/community-vyprojects/vymanager-backend:beta`
- `ghcr.io/community-vyprojects/vymanager-frontend:beta`

Enable the HTTP API on your VyOS routers first. See [Enabling the VyOS HTTP API](vyos-http-api).

## Option A: interactive installer

The repository ships an installer script that installs Docker if needed, asks for your URL and ports, generates secrets, writes `/opt/vymanager/docker-compose.yml` and `/opt/vymanager/.env`, and starts the stack:

```bash
sudo bash install.sh
```

Run it as root from a clone or download of the repository. After it finishes, open the application URL you entered and continue with [First run](first-run).

## Option B: manual compose setup

Create a directory and two files inside it: `docker-compose.yml` and `.env`.

```bash
mkdir vymanager
cd vymanager
```

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: vymanager-postgres
    environment:
      POSTGRES_USER: vymanager
      POSTGRES_PASSWORD: CHANGE_ME_POSTGRES_PASSWORD
      POSTGRES_DB: vymanager
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - vymanager-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vymanager -d vymanager"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    image: ghcr.io/community-vyprojects/vymanager-backend:beta
    container_name: vymanager-backend
    ports:
      - "8000:8000"
    volumes:
      - ./certs:/usr/local/share/ca-certificates/custom:ro
    env_file:
      - .env
    restart: unless-stopped
    networks:
      - vymanager-network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/docs"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: ghcr.io/community-vyprojects/vymanager-frontend:beta
    container_name: vymanager-frontend
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      backend:
        condition: service_healthy
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - vymanager-network

networks:
  vymanager-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

### .env

Both containers read the same `.env` file. Change these values before starting:

1. `POSTGRES_PASSWORD` — must match in `docker-compose.yml` and in `DATABASE_URL`. Generate with `openssl rand -hex 32`.
2. `BETTER_AUTH_SECRET` — signs and verifies session tokens. Generate with `openssl rand -base64 32`.
3. `SSH_ENCRYPTION_KEY` — encrypts stored SSH private keys at rest. Must be 64 hex characters. Generate with `openssl rand -hex 32`.
4. `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — replace `<YOUR_SERVER_IP>` with the IP or hostname users will open in their browser.
5. `TRUSTED_ORIGINS` — comma-separated list of every URL users will access VyManager from.

```env
# ── Shared Variables ─────────────────────────────────────
# CHANGE THIS — use a long random string (e.g. openssl rand -base64 32)
BETTER_AUTH_SECRET=Change-This-To-Something-Secret

# ── Backend ──────────────────────────────────────────────
# CHANGE_ME_POSTGRES_PASSWORD must match POSTGRES_PASSWORD in docker-compose.yml
DATABASE_URL=postgresql://vymanager:CHANGE_ME_POSTGRES_PASSWORD@postgres:5432/vymanager
FRONTEND_URL=http://frontend:3000

# CHANGE THIS — use a long random hex string (e.g. openssl rand -hex 32)
SSH_ENCRYPTION_KEY=Change-This-To-A-Hex-String

# ── Frontend ─────────────────────────────────────────────
NODE_ENV=production
VYMANAGER_ENV=production

# CHANGE THIS — set to the URL where users access VyManager in their browser
BETTER_AUTH_URL=http://<YOUR_SERVER_IP>:3000
NEXT_PUBLIC_APP_URL=http://<YOUR_SERVER_IP>:3000

# Internal Docker network URL — do not change unless you rename the backend service
BACKEND_URL=http://backend:8000

# CHANGE THIS — comma-separated list of every URL users will access VyManager from
# Example: http://192.168.1.50:3000,http://vymanager.lan:3000
TRUSTED_ORIGINS=http://<YOUR_SERVER_IP>:3000,http://localhost:3000
```

Every variable is documented in the [environment variable reference](environment-variables).

### Start

```bash
docker compose up -d
docker compose ps
```

All three containers (`vymanager-postgres`, `vymanager-backend`, `vymanager-frontend`) should reach a healthy or running state. First start takes a minute: the frontend entrypoint generates the Prisma client and applies database migrations before Next.js starts.

Open `http://<YOUR_SERVER_IP>:3000` and continue with [First run](first-run).

## Custom CA certificates

If your VyOS routers use certificates from a private CA and you want "Verify SSL" enabled, mount the CA certificates into the backend. The default compose file already mounts `./certs`:

```bash
mkdir certs
cp /path/to/my-ca.crt ./certs/
docker compose restart backend
```

The backend entrypoint imports every PEM-encoded `.crt` file from that directory on startup and points Python's HTTP clients at the system trust store. Files must start with `-----BEGIN CERTIFICATE-----`.

## Managing the deployment

```bash
# Logs
docker compose logs -f
docker compose logs -f backend

# Stop / start
docker compose down
docker compose up -d

# Update to the latest images (database is preserved in the postgres_data volume)
docker compose pull
docker compose up -d
```

`docker compose down -v` deletes the database volume, including all users, sites and instances. Do not run it unless you want to start over.
