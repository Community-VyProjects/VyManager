# 🖥️ VyManager
## Enterprise-grade VyOS Router Management System

Modern web interface to make configuring, deploying and monitoring VyOS routers easier

## 🎯 Open Beta Community Release

Open beta release. Expect lower stability and bugs. This release provides a lot of structural improvements over the older legacy version.
We now flexibly support all active VyOS versions, including rolling releases.

### [➡️ Skip to Quick Start](#-quick-start)

**[💭 Join our Discord community to receive official updates](https://discord.gg/k9SSkK7wPQ)**

**Give us a star ⭐ to support us!**

---

### 📸 Screenshots

<img width="1911" height="862" alt="image" src="https://github.com/user-attachments/assets/b23d2eb2-32bc-4e01-9d62-7eefc76e1526" />
<img width="532" height="403" alt="image" src="https://github.com/user-attachments/assets/eb1070eb-4996-4669-a165-d555d191173c" />
<img width="1919" height="933" alt="image" src="https://github.com/user-attachments/assets/caf5c99d-3b13-4ed8-a917-f64dda914911" />
<img width="1919" height="933" alt="image" src="https://github.com/user-attachments/assets/2f883341-8d2c-4022-a33d-17f9a93e33a7" />
<img width="1919" height="935" alt="image" src="https://github.com/user-attachments/assets/0ef645db-7c62-4f07-8b00-309f81773b3a" />


---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended for easiest setup)
- **VyOS Router** with REST API enabled (see Step 1 below)

---

## 🔧 Setup Guide

### Step 1: Setup VyOS Router REST API

Connect to your VyOS router via SSH and enable the API:

```bash
configure
set service https api keys id vymanager key YOUR_SECURE_API_KEY
set service https api rest    # VyOS 1.5+ only
commit
save
exit
```

> 💡 Save this API key - you'll need it during the setup wizard!

### Step 2: Choose Your Deployment Type

| Deployment | Best For | Domain Example | SSL |
|------------|----------|----------------|-----|
| **Public Domain** | Internet-accessible server | `vymanager.example.com` | Let's Encrypt (automatic) |
| **Local Network** | Home lab, internal use | `192.168.1.100` | Self-signed certificate |

### Step 3: Configure & Deploy

#### 📁 Files You'll Edit

You only need to edit **ONE file**: `.env` at the project root.

```bash
# Clone and enter the project
git clone https://github.com/Community-VyProjects/VyManager.git
cd VyManager

# Create your config file
cp .env.example .env
nano .env
```

---

#### 🌐 Option A: Public Domain (Let's Encrypt)

**Edit `.env`** - Set these values:

```env
# Your public domain
DOMAIN=vymanager.example.com
ACME_EMAIL=admin@example.com

# All URLs use your domain
FRONTEND_URL=https://vymanager.example.com
NEXT_PUBLIC_API_URL=https://vymanager.example.com
BETTER_AUTH_URL=https://vymanager.example.com
TRUSTED_ORIGINS=https://vymanager.example.com

# Keep these as-is for Docker
INTERNAL_API_URL=http://vymanager-backend:8000
DATABASE_URL=postgresql://vymanager:vymanager_secure_password@postgres:5432/vymanager_auth

# Security - generate a secret
BETTER_AUTH_SECRET=run-this-command-openssl-rand-base64-32
BETTER_AUTH_SECURE_COOKIES=true
```

**Deploy:**

```bash
cd container/vymanager-prod
touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json
docker compose -f docker-compose.letsencrypt.yml up -d
```

**Access:** `https://vymanager.example.com`

---

#### 🏠 Option B: Local Network (Self-Signed Cert)

**Edit `.env`** - Set these values (replace `192.168.1.100` with your server's IP):

```env
# Your local IP address
DOMAIN=192.168.1.100
ACME_EMAIL=                    # Leave empty for local

# All URLs use your IP
FRONTEND_URL=https://192.168.1.100
NEXT_PUBLIC_API_URL=https://192.168.1.100
BETTER_AUTH_URL=https://192.168.1.100
TRUSTED_ORIGINS=https://192.168.1.100

# Keep these as-is for Docker
INTERNAL_API_URL=http://vymanager-backend:8000
DATABASE_URL=postgresql://vymanager:vymanager_secure_password@postgres:5432/vymanager_auth

# Security - generate a secret
BETTER_AUTH_SECRET=run-this-command-openssl-rand-base64-32
BETTER_AUTH_SECURE_COOKIES=false   # Must be false for self-signed certs
```

**Deploy:**

```bash
cd container/vymanager-prod

# Generate certificate for your IP
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=192.168.1.100" -addext "subjectAltName=IP:192.168.1.100"

docker compose -f docker-compose.local-https.yml up -d
```

**Access:** `https://192.168.1.100` (accept the certificate warning)

---

#### 🔐 Generate Your Auth Secret

Run this command and paste the result into `.env`:

```bash
openssl rand -base64 32
```

---

### Step 4: Complete Setup Wizard

1. **Open your browser** to your URL (`https://your-domain` or `https://your-ip`)

2. **Onboarding Wizard** will guide you through:
   - ✅ Create your admin account
   - ✅ Create your first site (e.g., "Home Lab")
   - ✅ Add your VyOS router (use the API key from Step 1)

3. **Done!** Start managing your VyOS router

---

### 📋 Quick Reference

| Setting | Public Domain | Local Network |
|---------|--------------|---------------|
| `DOMAIN` | `vymanager.example.com` | `192.168.1.100` |
| `ACME_EMAIL` | `admin@example.com` | _(leave empty)_ |
| `BETTER_AUTH_SECURE_COOKIES` | `true` | `false` |
| Compose file | `docker-compose.letsencrypt.yml` | `docker-compose.local-https.yml` |
| SSL | Automatic | Self-signed (generate first) |

---

### 🔍 Verify It's Working

```bash
cd container/vymanager-prod

# Check all containers are running
docker compose -f docker-compose.letsencrypt.yml ps   # or docker-compose.local-https.yml

# View logs if something's wrong
docker compose -f docker-compose.letsencrypt.yml logs -f
```

---

## 🏗️ Architecture Overview

### Multi-Instance Management

VyManager uses a **multi-instance architecture** allowing you to manage multiple VyOS routers from a single interface:

- **Sites**: Logical groupings of VyOS instances (e.g., "Data Center 01", "Branch Office NYC")
- **Instances**: Individual VyOS routers within a site
- **Role-Based Access**: OWNER, ADMIN, and VIEWER roles per site
- **Active Session**: Connect to one instance at a time for configuration

### Database-Driven Configuration

Unlike traditional single-device management tools, VyManager stores all instance configurations in a PostgreSQL database:

```
PostgreSQL Database
├── users           # User accounts
├── sites           # Site groupings
├── instances       # VyOS router instances
├── permissions     # User-site role mappings
└── active_sessions # Current connections
```

All VyOS instances are managed through the web UI - no hardcoded configuration!

---

## 📁 Project Structure

```
vymanager/
├── frontend/              # Next.js 16 frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   │   ├── onboarding/    # First-time setup wizard
│   │   │   ├── sites/         # Site & instance management
│   │   │   ├── login/         # Authentication
│   │   │   └── [features]/    # VyOS configuration pages
│   │   ├── components/   # React components
│   │   │   ├── sites/         # Site management components
│   │   │   ├── layout/        # Navigation & layout
│   │   │   └── ui/            # shadcn/ui components
│   │   └── lib/          # Utilities and API clients
│   │       └── api/           # Backend API services
│   ├── prisma/           # Database schema & migrations
│   │   └── migrations/        # Multi-instance schema
│   ├── public/           # Static assets
│   └── Dockerfile        # Frontend container

├── backend/              # FastAPI backend application
│   ├── routers/          # API route handlers
│   │   ├── session/           # Session & instance management
│   │   ├── firewall/          # Firewall configuration
│   │   ├── network/           # Network configuration
│   │   ├── interfaces/        # Interface management
│   │   └── [features]/        # Other VyOS features
│   ├── vyos_mappers/     # VyOS version mappers (1.4 vs 1.5)
│   ├── vyos_builders/    # Configuration builders
│   ├── vyos_service.py   # VyOS device service layer
│   ├── app.py            # Main FastAPI application
│   └── Dockerfile        # Backend container

├── container/            # Docker deployment configurations
│   └── vymanager-prod/
│       ├── docker-compose.letsencrypt.yml  # Public domain with Let's Encrypt
│       └── docker-compose.local-https.yml  # Local network with custom certs

├── .env.example          # Unified environment configuration template
└── README.md             # This file
```

---

## 🎨 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Authentication**: Better-auth
- **State Management**: Zustand
- **Database ORM**: Prisma

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **VyOS SDK**: pyvyos (custom)
- **Database**: PostgreSQL
- **DB Driver**: asyncpg

### Infrastructure
- **Container**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Reverse Proxy**: Nginx (optional)

---

## 📜 Available Scripts

### Docker Commands (Recommended)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f
docker compose logs -f backend    # Backend only
docker compose logs -f frontend   # Frontend only

# Stop all services
docker compose down

# Rebuild after code changes
docker compose build
docker compose up -d

# Restart a specific service
docker compose restart backend
docker compose restart frontend

# Clean everything (including database)
docker compose down -v
```

### Root-level npm Commands

```bash
# Development
npm run dev              # Start all services with Docker
npm run dev:down         # Stop Docker services

# Production
npm start                # Start services in detached mode
npm stop                 # Stop all services

# Logs
npm run logs             # View all logs
npm run logs:frontend    # Frontend logs only
npm run logs:backend     # Backend logs only

# Build
npm run build:docker     # Build Docker images

# Maintenance
npm run clean            # Clean all build artifacts and containers
```

---

## 🔍 Managing Multiple VyOS Instances

### Adding More Sites

1. Navigate to **Site Manager** (click VyOS logo in sidebar)
2. Click **"Add Site"** button
3. Enter site name and description
4. Click **"Create Site"**

### Adding Instances to a Site

1. In **Site Manager**, select a site from the list
2. Click **"Add Instance"** button
3. Fill in instance details:
   - **Name**: Friendly name for this router
   - **Description**: Optional notes
   - **Host**: IP address or hostname
   - **Port**: HTTPS port (default 443)
   - **API Key**: The key from VyOS configuration
   - **Version**: Select 1.4 or 1.5
   - **Protocol**: HTTPS (recommended) or HTTP
4. Click **"Complete Setup"**

### Connecting to an Instance

1. Navigate to **Site Manager**
2. Select a site
3. Click **"Connect"** on any instance card
4. VyManager will:
   - Test the connection
   - Verify API credentials
   - Redirect you to the dashboard if successful
5. You can now manage that VyOS router!

### Switching Between Instances

- Click **"Disconnect Instance"** in the sidebar
- You'll return to **Site Manager**
- Connect to a different instance

---

## 🛡️ Role-Based Access Control

VyManager implements granular role-based access:

| Role | Permissions |
|------|-------------|
| **OWNER** | Full control: manage site, add/edit/delete instances, grant permissions |
| **ADMIN** | Manage instances, edit configurations, cannot delete site or manage permissions |
| **VIEWER** | Read-only access to configurations |

Roles are assigned per-site, allowing flexible multi-tenant scenarios.

---

## 🏗️ Version-Aware Architecture

VyManager supports multiple VyOS versions (1.4, 1.5+) using a version-aware backend architecture.

### How It Works

The backend uses a three-layer architecture:

```
Routers (API Endpoints)
    ↓
Builders (Batch Operations)
    ↓
Mappers (Version-Specific Commands)
    ↓
VyOS Device (1.4 or 1.5)
```

**Example**:
- **VyOS 1.4**: Uses `firewall group address-group`
- **VyOS 1.5**: Uses `firewall group address-group` (same)
- **New Features**: Automatically disabled on older versions

### Capabilities Endpoint

Every feature exposes a `/capabilities` endpoint:

```json
{
  "version": "1.5",
  "features": {
    "domain_groups": {
      "supported": true,
      "description": "Domain-based firewall groups"
    },
    "ipv6_nat": {
      "supported": true,
      "description": "IPv6 NAT rules"
    }
  }
}
```

The frontend conditionally shows/hides features based on capabilities.

---

## 🧪 Development Setup

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (with hot reload)
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build
```

### Backend Development

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn app:app --reload --host 0.0.0.0 --port 8000 --proxy-headers

> When serving behind Traefik/Nginx (HTTPS), make sure the proxy forwards `X-Forwarded-Proto`/`X-Forwarded-Port` so FastAPI can emit the correct scheme for redirects.

# View API docs
# Navigate to http://localhost:8000/docs
```

### Database Migrations

```bash
cd frontend

# Generate migration after schema changes
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# View database
npx prisma studio
```

---

## 🐳 Docker Production Deployment

### Deployment Options

| Option | Use Case | Compose File |
|--------|----------|-------------|
| **Let's Encrypt** | Public domains with automatic SSL | `docker-compose.letsencrypt.yml` |
| **Local HTTPS** | Local IPs with self-signed/custom certs | `docker-compose.local-https.yml` |

```bash
cd container/vymanager-prod

# Option A: Let's Encrypt (public domain)
touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json
docker compose -f docker-compose.letsencrypt.yml up -d

# Option B: Local HTTPS (self-signed cert)
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=192.168.1.100" -addext "subjectAltName=IP:192.168.1.100"
docker compose -f docker-compose.local-https.yml up -d

# View logs
docker compose -f docker-compose.letsencrypt.yml logs -f
```

### Environment Variables for Production

VyManager uses a single `.env` file at the project root. Key production settings:

```env
# Domain configuration
DOMAIN=example.com
ACME_EMAIL=admin@example.com

NODE_ENV=production
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_SECURE_COOKIES=true
BETTER_AUTH_URL=https://example.com
NEXT_PUBLIC_APP_URL=https://example.com
NEXT_PUBLIC_API_URL=https://example.com
INTERNAL_API_URL=http://vymanager-backend:8000
FRONTEND_URL=https://example.com
DATABASE_URL=postgresql://user:pass@postgres:5432/vymanager_auth
TRUSTED_ORIGINS=https://example.com
```

> See `.env.example` for complete documentation and deployment scenarios.

### Reverse Proxy (Nginx)

If using an external Nginx reverse proxy instead of Traefik:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 📚 Additional Documentation

- **Frontend**: See `frontend/README.md`
- **Backend**: See `backend/README.md`
- **API Docs**: http://localhost:8000/docs (when running)
- **VyOS Docs**: https://docs.vyos.io/
- **Architecture Guide**: See `CLAUDE.md` for feature development patterns

---

## 🔒 Security Considerations

1. **Change Default Secrets**: Always change `BETTER_AUTH_SECRET` and database passwords
2. **Use HTTPS**: Enable SSL/TLS for production deployments
3. **Secure API Keys**: Store VyOS API keys securely, never commit to git
4. **Database Backups**: Regularly backup the PostgreSQL database
5. **Network Isolation**: Run VyManager in a secure network segment
6. **Update Regularly**: Keep VyManager and VyOS up to date

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the architecture patterns in `CLAUDE.md`
4. Test thoroughly on both VyOS 1.4 and 1.5
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 🐛 Troubleshooting

### Cannot Connect to VyOS Instance

1. **Check API Key**: Verify the API key in VyOS matches your input
2. **Check Network**: Ensure VyManager can reach the VyOS IP address
3. **Check Port**: Default is 443, verify it's not blocked by firewall
4. **Check SSL**: If using self-signed cert, set "Verify SSL" to false

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps

# Check database logs
docker compose logs postgres

# Verify DATABASE_URL is correct in .env files
```

### Frontend Build Errors

```bash
# Clear node_modules and rebuild
cd frontend
rm -rf node_modules .next
npm install
npm run build
```

### Backend Import Errors

```bash
# Reinstall Python dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

---

## 📄 License

See LICENSE.md for details.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Community-VyProjects/VyManager/issues)
- **Discord**: [Join our community](https://discord.gg/k9SSkK7wPQ)
- **Documentation**: Check `CLAUDE.md` for development patterns

---

**Built with ❤️ for the VyOS community**
