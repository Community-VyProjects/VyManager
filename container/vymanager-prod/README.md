# VyManager Production Deployment

Production deployment using pre-built Docker images with Traefik reverse proxy.

## Deployment Options

| Option | Use Case | SSL Certificate |
|--------|----------|-----------------|
| [Let's Encrypt](#option-1-lets-encrypt-public-domain) | Public domain with automatic SSL | Auto-generated, trusted |
| [Local HTTPS](#option-2-local-https-self-signedcustom-cert) | Local network / IP address | Self-signed or custom |

---

## Option 1: Let's Encrypt (Public Domain)

Best for: Production servers with a public domain name.

### Prerequisites

- **Domain**: DNS A record pointing to your server
- **Ports**: 80 and 443 open and accessible from the internet
- **Docker**: Docker and Docker Compose installed

### Quick Start

```bash
cd /path/to/vymanager

# 1. Configure environment
cp .env.example .env
nano .env
# Set: DOMAIN=yourdomain.com
# Set: ACME_EMAIL=admin@yourdomain.com
# Update all URLs from example.com to your domain

# 2. Generate auth secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
sed -i "s/your-super-secret-key-change-in-production/$BETTER_AUTH_SECRET/" .env

# 3. Prepare Let's Encrypt storage
cd container/vymanager-prod
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# 4. Start services
docker compose -f docker-compose.letsencrypt.yml up -d
```

### Verify

```bash
docker compose -f docker-compose.letsencrypt.yml ps
docker logs vymanager-traefik
curl -I https://yourdomain.com
```

---

## Option 2: Local HTTPS (Self-Signed/Custom Cert)

Best for: Local network deployments, lab environments, or when using your own certificates.

### Prerequisites

- **Docker**: Docker and Docker Compose installed
- **Network**: Local IP accessible from your devices

### Quick Start

```bash
cd /path/to/vymanager

# 1. Configure environment
cp .env.example .env
nano .env
# Set: DOMAIN=192.168.1.100 (your local IP)
# Set: BETTER_AUTH_SECURE_COOKIES=false (for self-signed certs)
# Update all URLs to use your IP: https://192.168.1.100

# 2. Generate auth secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
sed -i "s/your-super-secret-key-change-in-production/$BETTER_AUTH_SECRET/" .env

# 3. Generate self-signed certificate
cd container/vymanager-prod
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -subj "/CN=192.168.1.100" \
  -addext "subjectAltName=IP:192.168.1.100"

# 4. Start services
docker compose -f docker-compose.local-https.yml up -d
```

### Using Your Own Certificate

If you have your own SSL certificate (from a CA or internal PKI):

```bash
cd container/vymanager-prod/certs

# Place your certificate files here:
# - server.crt (certificate file)
# - server.key (private key file)

# If you have a certificate chain, concatenate them:
cat your-cert.crt intermediate.crt root.crt > server.crt
cp your-key.key server.key

# Ensure proper permissions
chmod 644 server.crt
chmod 600 server.key
```

### Trusting Self-Signed Certificates

To avoid browser warnings, add the certificate to your system's trust store:

**Linux:**
```bash
sudo cp certs/server.crt /usr/local/share/ca-certificates/vymanager.crt
sudo update-ca-certificates
```

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/server.crt
```

**Windows:**
1. Double-click `server.crt`
2. Click "Install Certificate"
3. Select "Local Machine" → "Trusted Root Certification Authorities"

### Verify

```bash
docker compose -f docker-compose.local-https.yml ps
docker logs vymanager-traefik
curl -k https://192.168.1.100  # -k to skip cert verification
```

---

## Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │           yourdomain.com / 192.168.1.100        │
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
| `/*` | Frontend | Next.js application |

## File Structure

```
vymanager/
├── .env.example                           # Unified environment template
├── .env                                   # Your config (create from .env.example)
└── container/vymanager-prod/
    ├── docker-compose.letsencrypt.yml     # Public domain with Let's Encrypt
    ├── docker-compose.local-https.yml     # Local network with custom certs
    ├── README.md                          # This file
    ├── certs/                             # Custom SSL certificates
    │   ├── server.crt
    │   └── server.key
    ├── traefik/
    │   ├── traefik.yml                    # Config for Let's Encrypt
    │   ├── traefik-local.yml              # Config for local HTTPS
    │   └── dynamic/
    │       └── middlewares.yml            # Security headers
    └── letsencrypt/
        └── acme.json                      # Let's Encrypt certs (auto-managed)
```

## Troubleshooting

### Certificate Issues (Let's Encrypt)

```bash
docker logs vymanager-traefik -f
dig yourdomain.com
curl http://yourdomain.com/.well-known/acme-challenge/test
```

### Certificate Issues (Self-Signed)

```bash
# Verify certificate is valid
openssl x509 -in certs/server.crt -text -noout

# Check certificate matches key
openssl x509 -noout -modulus -in certs/server.crt | md5sum
openssl rsa -noout -modulus -in certs/server.key | md5sum
# Both should output the same hash
```

### Service Not Accessible

```bash
# Let's Encrypt deployment
docker compose -f docker-compose.letsencrypt.yml ps
docker compose -f docker-compose.letsencrypt.yml logs -f

# Local HTTPS deployment
docker compose -f docker-compose.local-https.yml ps
docker compose -f docker-compose.local-https.yml logs -f
```

### Database Connection Issues

```bash
docker exec vymanager-postgres pg_isready -U vymanager
docker logs vymanager-postgres
```

## Updating

```bash
# Let's Encrypt deployment
docker compose -f docker-compose.letsencrypt.yml pull
docker compose -f docker-compose.letsencrypt.yml up -d

# Local HTTPS deployment
docker compose -f docker-compose.local-https.yml pull
docker compose -f docker-compose.local-https.yml up -d
```

## Backup

```bash
# Backup PostgreSQL data
docker exec vymanager-postgres pg_dump -U vymanager vymanager_auth > backup.sql

# Backup certificates
cp -r letsencrypt/ letsencrypt-backup/  # Let's Encrypt
cp -r certs/ certs-backup/               # Custom certs
```
