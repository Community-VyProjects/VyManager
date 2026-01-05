# VyManager Container Deployments

This folder contains Docker Compose configurations for deploying VyManager in different environments.

## Deployment Options

| Folder | Use Case | SSL/TLS | Images |
|--------|----------|---------|--------|
| `vymanager-prod/` | Production with Traefik | ✅ Let's Encrypt | Pre-built from GHCR |
| `vymanager-dev/` | Development with Traefik | ✅ Let's Encrypt | Built from source |

---

## Quick Start

### Option 1: Production with HTTPS (Traefik + Let's Encrypt)

Best for: Production deployments with a domain name.

```bash
cd vymanager-prod
cp frontend.env.example ../../frontend/.env
cp backend.env.example ../../backend/.env

# Generate auth secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
sed -i "s/your-super-secret-key-change-in-production/$BETTER_AUTH_SECRET/" ../../frontend/.env

# Setup Let's Encrypt
touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json

# Start
docker compose -f env-file-docker-compose.yml up -d
```

Access at: `https://your-domain.com`

### Option 2: Development with HTTPS (Traefik + Let's Encrypt)

Best for: Testing with real HTTPS before production.

```bash
cd vymanager-dev
cp ../vymanager-prod/frontend.env.example ../../frontend/.env
cp ../vymanager-prod/backend.env.example ../../backend/.env

# Generate auth secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
sed -i "s/your-super-secret-key-change-in-production/$BETTER_AUTH_SECRET/" ../../frontend/.env

# Start (builds from source)
docker compose -f env-file-docker-compose.yml up -d --build
```

Access at: `https://your-domain.com`

### Option 3: Simple HTTP (No Traefik)

Best for: Local development, testing, or when using an external reverse proxy.

Create a simple compose file or use modified versions without Traefik labels.

See [Deployment Without Traefik](#deployment-without-traefik) below.

---

## Deployment Without Traefik

If you prefer to use your own reverse proxy (nginx, Caddy, HAProxy) or run without HTTPS:

### Simple Docker Compose (HTTP Only)

Create `docker-compose-simple.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: vymanager-postgres
    environment:
      POSTGRES_USER: vymanager
      POSTGRES_PASSWORD: vymanager_secure_password
      POSTGRES_DB: vymanager_auth
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vymanager -d vymanager_auth"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    image: ghcr.io/community-vyprojects/vymanager-backend:beta
    container_name: vymanager-backend
    ports:
      - "8000:8000"
    env_file:
      - ../backend/.env
    restart: unless-stopped
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
      - ../frontend/.env
    restart: unless-stopped
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Environment Files for HTTP

**frontend/.env** (for HTTP):
```env
NODE_ENV=production
VYMANAGER_ENV=production

BETTER_AUTH_SECRET=your-generated-secret-here
BETTER_AUTH_SECURE_COOKIES=false  # Set to false for HTTP

BETTER_AUTH_URL=http://your-server-ip:3000
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
NEXT_PUBLIC_API_URL=http://your-server-ip:8000

TRUSTED_ORIGINS=http://your-server-ip:3000,http://localhost:3000
DATABASE_URL=postgresql://vymanager:vymanager_secure_password@postgres:5432/vymanager_auth
```

**backend/.env** (for HTTP):
```env
DATABASE_URL=postgresql://vymanager:vymanager_secure_password@postgres:5432/vymanager_auth
FRONTEND_URL=http://your-server-ip:3000
```

### Using External Reverse Proxy

If you're using nginx, Caddy, or another reverse proxy for SSL termination:

1. Use the simple compose file above (services exposed on ports 3000 and 8000)
2. Configure your reverse proxy to:
   - Route `/` to `localhost:3000` (frontend)
   - Route `/vyos/*`, `/dashboard/*`, `/user-management/*`, `/session/*`, `/docs`, `/openapi.json` to `localhost:8000` (backend)
3. Set `BETTER_AUTH_SECURE_COOKIES=true` in frontend/.env
4. Update URLs to use HTTPS in both .env files

#### Example Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Backend API routes
    location ~ ^/(vyos|dashboard|user-management|session|docs|openapi\.json) {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (everything else)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Example Caddy Configuration

```caddyfile
your-domain.com {
    # Backend API routes
    handle /vyos/* {
        reverse_proxy localhost:8000
    }
    handle /dashboard/* {
        reverse_proxy localhost:8000
    }
    handle /user-management/* {
        reverse_proxy localhost:8000
    }
    handle /session/* {
        reverse_proxy localhost:8000
    }
    handle /docs {
        reverse_proxy localhost:8000
    }
    handle /openapi.json {
        reverse_proxy localhost:8000
    }

    # Frontend (everything else)
    handle {
        reverse_proxy localhost:3000
    }
}
```

---

## Environment Variables Reference

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (`production` or `development`) | Yes |
| `BETTER_AUTH_SECRET` | Secret for session encryption (min 32 chars) | Yes |
| `BETTER_AUTH_SECURE_COOKIES` | `true` for HTTPS, `false` for HTTP | Yes |
| `BETTER_AUTH_URL` | Full URL where app is accessible | Yes |
| `NEXT_PUBLIC_APP_URL` | Same as BETTER_AUTH_URL | Yes |
| `NEXT_PUBLIC_API_URL` | Backend URL for browser requests | Yes |
| `INTERNAL_API_URL` | Backend URL for Docker internal requests | Yes (with Traefik) |
| `TRUSTED_ORIGINS` | Comma-separated list of allowed origins | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

---

## Customizing the Domain

To use your own domain instead of `infra.vyprojects.org`:

1. **Update Traefik labels** in `env-file-docker-compose.yml`:
   ```yaml
   - "traefik.http.routers.frontend.rule=Host(`your-domain.com`)"
   - "traefik.http.routers.backend.rule=Host(`your-domain.com`) && ..."
   ```

2. **Update environment files**:
   - `frontend/.env`: Update all URLs
   - `backend/.env`: Update `FRONTEND_URL`

3. **Update Traefik email** in `traefik/traefik.yml` for Let's Encrypt notifications

---

## Troubleshooting

### Common Issues

**"Onboarding wizard not showing"**
- Check that the backend is reachable from the frontend container
- Verify `INTERNAL_API_URL` is set correctly in frontend/.env
- Check logs: `docker logs vymanager-frontend`

**"Certificate not issued"**
- Ensure DNS points to your server
- Ports 80 and 443 must be accessible from the internet
- Check Traefik logs: `docker logs vymanager-traefik`

**"Database connection refused"**
- Wait for PostgreSQL to be healthy
- Check: `docker exec vymanager-postgres pg_isready -U vymanager`

**"CORS errors"**
- Verify `FRONTEND_URL` in backend/.env matches actual frontend URL
- Check `TRUSTED_ORIGINS` in frontend/.env

### Useful Commands

```bash
# View all container logs
docker compose -f env-file-docker-compose.yml logs -f

# Restart a specific service
docker compose -f env-file-docker-compose.yml restart frontend

# Rebuild and restart (dev only)
docker compose -f env-file-docker-compose.yml up -d --build

# Check container health
docker compose -f env-file-docker-compose.yml ps

# Access PostgreSQL
docker exec -it vymanager-postgres psql -U vymanager -d vymanager_auth
```
