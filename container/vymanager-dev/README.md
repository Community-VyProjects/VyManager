# VyManager Development Deployment

Development deployment that builds images from source with Traefik reverse proxy and automatic Let's Encrypt SSL certificates.

> **See also**: [../README.md](../README.md) for deployment without Traefik or with external reverse proxy.

## Features

- ✅ Builds from local source code
- ✅ Hot-reload with volume mounts
- ✅ Automatic HTTPS via Let's Encrypt
- ✅ HTTP to HTTPS redirect
- ✅ Same Traefik configuration as production

## When to Use

- Testing changes before pushing to production
- Development with real HTTPS (required for secure cookies)
- Debugging production-like issues

## Prerequisites

1. **Domain**: DNS A record pointing to your server
2. **Ports**: 80 and 443 open and accessible
3. **Docker**: Docker and Docker Compose installed
4. **Source Code**: VyManager repository cloned

## Quick Start

### 1. Configure Environment

```bash
cd /path/to/vymanager

# Copy the unified environment template
cp .env.example .env

# Generate and set auth secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
sed -i "s/your-super-secret-key-change-in-production/$BETTER_AUTH_SECRET/" .env

# (Optional) Update domain in .env if not using example.com
nano .env
```

### 2. Start Services (with build)

```bash
cd container/vymanager-dev
docker compose -f docker-compose.letsencrypt.yml up -d --build
```

### 3. Verify

```bash
# Check services
docker compose -f docker-compose.letsencrypt.yml ps

# View logs
docker compose -f docker-compose.letsencrypt.yml logs -f
```

## Development Workflow

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker compose -f docker-compose.letsencrypt.yml up -d --build frontend

# Rebuild all
docker compose -f docker-compose.letsencrypt.yml up -d --build
```

### View Logs

```bash
# All services
docker compose -f docker-compose.letsencrypt.yml logs -f

# Specific service
docker compose -f docker-compose.letsencrypt.yml logs -f frontend
```

### Restart Services

```bash
docker compose -f docker-compose.letsencrypt.yml restart
```

### Stop Everything

```bash
docker compose -f docker-compose.letsencrypt.yml down
```

### Clean Rebuild (fresh start)

```bash
docker compose -f docker-compose.letsencrypt.yml down -v
docker compose -f docker-compose.letsencrypt.yml up -d --build
```

## Volume Mounts

The dev compose mounts local source directories for easier development:

| Container | Mount | Purpose |
|-----------|-------|---------|
| frontend | `../../frontend:/app` | Source code |
| frontend | `/app/node_modules` | Preserved dependencies |
| frontend | `/app/.next` | Build cache |
| backend | `../../backend:/app` | Source code |

## Differences from Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Images | Built from source | Pre-built from GHCR |
| Volumes | Source mounted | No source mounts |
| Rebuild | Requires `--build` | Just pull new images |
| Use case | Testing/debugging | Live deployment |

## Traefik Configuration

This setup shares Traefik configuration with production:
- `../vymanager-prod/traefik/traefik.yml` - Static config
- `../vymanager-prod/traefik/dynamic/` - Dynamic middlewares
- `../vymanager-prod/letsencrypt/` - Certificate storage

## Troubleshooting

### Build Fails

```bash
# Check build logs
docker compose -f docker-compose.letsencrypt.yml build --no-cache frontend

# Clear Docker cache
docker builder prune
```

### Container Won't Start

```bash
# Check container logs
docker logs vymanager-frontend
docker logs vymanager-backend

# Check health status
docker compose -f docker-compose.letsencrypt.yml ps
```

### Database Issues

```bash
# Reset database
docker compose -f docker-compose.letsencrypt.yml down -v
docker compose -f docker-compose.letsencrypt.yml up -d
```
