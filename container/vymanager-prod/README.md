# VyManager Production Deployment

Production deployment using pre-built Docker images with Traefik reverse proxy and automatic Let's Encrypt SSL certificates.

> **See also**: [../README.md](../README.md) for deployment without Traefik or with external reverse proxy.

## Features

- ✅ Automatic HTTPS via Let's Encrypt
- ✅ HTTP to HTTPS redirect
- ✅ Security headers (XSS, HSTS, etc.)
- ✅ Pre-built images from GitHub Container Registry
- ✅ Traefik dashboard (optional)

## Prerequisites

1. **Domain**: DNS A record pointing to your server (e.g., `example.com`)
2. **Ports**: 80 and 443 open and accessible from the internet
3. **Docker**: Docker and Docker Compose installed

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

### 2. Configure Traefik

```bash
# Set up Let's Encrypt certificate storage
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# Update email for Let's Encrypt notifications
nano traefik/traefik.yml
# Change: email: your-email@example.com
```

### 3. (Optional) Update Domain

If using a different domain, update these files:
- `../../.env` - All URLs and domain settings
- `env-file-docker-compose.yml` - Traefik router rules (Host)
- `traefik/dynamic/middlewares.yml` - CORS origins

### 4. Start Services

```bash
docker compose -f env-file-docker-compose.yml up -d
```

### 5. Verify

```bash
# Check services
docker compose -f env-file-docker-compose.yml ps

# Check Traefik for certificate status
docker logs vymanager-traefik

# Test HTTPS
curl -I https://example.com
```

Access your VyManager at: `https://example.com` (or your domain)

## Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │                 example.com                    │
                    └─────────────────────────────────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │              Traefik (Port 80/443)              │
                    │         SSL/TLS Termination + Routing           │
                    └─────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
                    ▼                                           ▼
    ┌───────────────────────────────┐       ┌───────────────────────────────┐
    │   Frontend (Next.js :3000)    │       │   Backend (FastAPI :8000)     │
    │   Path: /* (priority: 1)      │       │   Paths: /vyos/*, /dashboard/*│
    │                               │       │          /user-management/*   │
    └───────────────────────────────┘       └───────────────────────────────┘
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          │
                                          ▼
                    ┌─────────────────────────────────────────────────┐
                    │         PostgreSQL (Internal :5432)             │
                    │              User & Session Data                │
                    └─────────────────────────────────────────────────┘
```

## URL Routing

| Path | Service | Description |
|------|---------|-------------|
| `/vyos/*` | Backend | VyOS API endpoints |
| `/dashboard/*` | Backend | Dashboard API |
| `/user-management/*` | Backend | User management API |
| `/session/*` | Backend | Session management API |
| `/docs` | Backend | Swagger documentation |
| `/openapi.json` | Backend | OpenAPI schema |
| `/traefik/*` | Traefik | Dashboard (auth required) |
| `/*` | Frontend | Next.js application |

## File Structure

```
vymanager/
├── .env.example                  # Unified environment template
├── .env                          # Your environment config (create from .env.example)
├── container/
│   └── vymanager-prod/
│       ├── env-file-docker-compose.yml  # Main compose file with Traefik
│       ├── README.md                     # This file
│       ├── traefik/
│       │   ├── traefik.yml              # Traefik static configuration
│       │   └── dynamic/
│       │       └── middlewares.yml       # Security headers & middleware
│       └── letsencrypt/
│           └── acme.json                 # Let's Encrypt certificates (auto-managed)
├── backend/                      # Backend source code
└── frontend/                     # Frontend source code
```

## Security Features

- **HTTPS Only**: HTTP automatically redirects to HTTPS
- **Security Headers**: XSS protection, Content-Type sniffing prevention, HSTS
- **Secure Cookies**: Enabled for authentication
- **Rate Limiting**: Available middleware (can be enabled per-route)
- **CORS**: Configured for the production domain

## Troubleshooting

### Certificate Issues

```bash
# Check Traefik logs
docker logs vymanager-traefik -f

# Verify DNS resolution
dig example.com

# Test Let's Encrypt challenge
curl http://example.com/.well-known/acme-challenge/test
```

### Service Not Accessible

```bash
# Check if services are healthy
docker compose -f env-file-docker-compose.yml ps

# Check individual service logs
docker logs vymanager-frontend
docker logs vymanager-backend
docker logs vymanager-postgres
```

### Database Connection Issues

```bash
# Check PostgreSQL is ready
docker exec vymanager-postgres pg_isready -U vymanager

# Check database logs
docker logs vymanager-postgres
```

## Updating

```bash
# Pull latest images
docker compose -f env-file-docker-compose.yml pull

# Restart services
docker compose -f env-file-docker-compose.yml up -d
```

## Backup

```bash
# Backup PostgreSQL data
docker exec vymanager-postgres pg_dump -U vymanager vymanager_auth > backup.sql

# Backup Let's Encrypt certificates
cp letsencrypt/acme.json acme.json.backup
```
