# VyManager
## Enterprise-grade VyOS Router Management System

Centralized management platform for configuring, deploying and monitoring multi-site VyOS routers via a modern web interface

## Open Beta Community Release

Open beta release. We flexibly support all active VyOS versions, including rolling releases.

### [Skip to Quick Start](#quick-start)

**[Join our Discord community to receive official updates](https://discord.gg/k9SSkK7wPQ)**

**[Live Demo](https://vyprojects.org/)**

**Give us a ⭐ star to support us!**

---

### Screenshots

VyManager User Interface supports Light and Dark themes.

<img width="3799" height="1849" alt="Screenshot 1" src="https://github.com/user-attachments/assets/898081db-678f-4645-909d-f147baed23e7" />
<img width="3790" height="624" alt="Screenshot 2" src="https://github.com/user-attachments/assets/2bf95cc6-4ca8-4694-9822-d97bb90db1b8" />
<img width="3799" height="1335" alt="Screenshot 3" src="https://github.com/user-attachments/assets/74ccf55e-2839-492f-ad0e-4e9db2df5774" />
<img width="351" height="1000" alt="Screenshot 4" src="https://github.com/user-attachments/assets/7cef35d1-ae74-4e7d-bd88-c9cf1a353369" />
<img width="3802" height="1850" alt="Screenshot 5" src="https://github.com/user-attachments/assets/76505a31-3e3b-4dcc-98e5-00d2e899064c" />

---

## Quick Start


### Prerequisites

- **Docker & Docker Compose** installed on your host machine
- **VyOS Router** with REST API and GraphQL enabled (see [Step 1](#step-1-enable-the-vyos-rest-api))

---

## Deployment Guide

### Step 1: Enable the VyOS REST API

Before deploying VyManager, enable the REST API on your VyOS router(s).

Connect to your VyOS router via SSH and run:

```bash
# Enter configuration mode
configure

# Create an API key (replace YOUR_SECURE_API_KEY with a strong random key)
set service https api keys id vymanager key YOUR_SECURE_API_KEY

# Enable REST functionality (VyOS 1.5+ only)
set service https api rest

# Enable GraphQL (required for dashboard streaming)
set service https api graphql

# Set GraphQL authentication to use the API key defined above
set service https api graphql authentication type key

# Save and apply
commit
save
exit
```

> **Security Note**: Keep your API key secure! You'll need it during the VyManager setup wizard.

> **GraphQL is required** for the live dashboard cards (interface counters, system info, network speed graph, and WireGuard peers). All dashboard data is streamed via the VyOS GraphQL API using the same API key configured above.

### Step 2: Create the project directory

Create a new directory for VyManager and navigate into it:

```bash
mkdir vymanager
cd vymanager
```

You will create two files inside this directory: `docker-compose.yml` and `.env`.

### Step 3: Create the docker-compose.yml

Create a file named `docker-compose.yml` with the following contents:

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

### Step 4: Create the .env file

Create a file named `.env` in the same directory. Both the backend and frontend containers read from this single file.

You **must** change these values before starting:

1. **`POSTGRES_PASSWORD`** — Change this in **both** `docker-compose.yml` and `DATABASE_URL` below; they must match. Generate one with: `openssl rand -hex 32`
2. **`BETTER_AUTH_SECRET`** — Used to sign and verify session tokens; appears **twice** in the file (once for each service) and must be the **same value** in both places. Generate with: `openssl rand -base64 32`
3. **`SSH_ENCRYPTION_KEY`** — Used to encrypt stored SSH private keys at rest. Generate with: `openssl rand -hex 32`
4. **`BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`** — Replace `<YOUR_SERVER_IP>` with the IP or hostname users will open in their browser.
5. **`TRUSTED_ORIGINS`** — Comma-separated list of every URL users will access VyManager from.

```env
# ── Backend ──────────────────────────────────────────────
# CHANGE_ME_POSTGRES_PASSWORD must match POSTGRES_PASSWORD in docker-compose.yml
DATABASE_URL=postgresql://vymanager:CHANGE_ME_POSTGRES_PASSWORD@postgres:5432/vymanager
FRONTEND_URL=http://frontend:3000

# CHANGE THIS — use a long random string (e.g. openssl rand -base64 32)
# Must match the BETTER_AUTH_SECRET value below — both services use this file
BETTER_AUTH_SECRET=Change-This-To-Something-Secret

# CHANGE THIS — use a long random hex string (e.g. openssl rand -hex 32)
SSH_ENCRYPTION_KEY=Change-This-To-A-Hex-String

# ── Frontend ─────────────────────────────────────────────
NODE_ENV=production
VYMANAGER_ENV=production

# Must be the same value as BETTER_AUTH_SECRET above
BETTER_AUTH_SECRET=Change-This-To-Something-Secret

# CHANGE THIS — set to the URL where users access VyManager in their browser
BETTER_AUTH_URL=http://<YOUR_SERVER_IP>:3000
NEXT_PUBLIC_APP_URL=http://<YOUR_SERVER_IP>:3000

# Internal Docker network URL — do not change unless you rename the backend service
BACKEND_URL=http://backend:8000

# CHANGE THIS — comma-separated list of every URL users will access VyManager from
# Example: http://192.168.1.50:3000,http://vymanager.lan:3000
TRUSTED_ORIGINS=http://<YOUR_SERVER_IP>:3000,http://localhost:3000
```

> **Tip**: Generate a strong secret with: `openssl rand -hex 32`

### Step 5: Start VyManager

From inside the `vymanager` directory, run:

```bash
docker compose up -d
```

Docker will pull the images, start PostgreSQL, wait for it to be healthy, then start the backend and frontend. This may take a minute on first run.

Check that all three containers are running:

```bash
docker compose ps
```

You should see `vymanager-postgres`, `vymanager-backend`, and `vymanager-frontend` all in a **healthy** / **running** state.

### Step 6: Complete the Setup Wizard

1. **Open your browser** and navigate to `http://<YOUR_SERVER_IP>:3000`

2. The **onboarding wizard** will launch automatically on first visit:
   - **Step 1**: Create your admin account
   - **Step 2**: Create your first site (e.g., "Headquarters")
   - **Step 3**: Add your first VyOS instance
     - Name: Give it a friendly name
     - Host: Your VyOS router IP address
     - Port: 443 (default)
     - API Key: The key you created in Step 1
     - Version: Select your VyOS version (1.4 or 1.5)

3. **Start Managing!** You'll be automatically logged in and redirected to the dashboard.

---

## Managing the Deployment

### Common Docker Commands

```bash
# View logs (all services)
docker compose logs -f

# View logs for a single service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Stop all services
docker compose down

# Restart all services
docker compose restart

# Restart a single service
docker compose restart backend

# Pull latest images and recreate containers
docker compose pull
docker compose up -d

# Remove everything including the database volume
docker compose down -v
```

### Updating VyManager

When a new version is released, update by pulling the latest images:

```bash
cd vymanager
docker compose pull
docker compose up -d
```

Your database and configuration are preserved in the `postgres_data` volume.

---

## Architecture Overview

### Multi-Instance Management

VyManager uses a **multi-instance architecture** allowing you to manage multiple VyOS routers from a single interface:

- **Sites**: Logical groupings of VyOS instances (e.g., "Data Center 01", "Branch Office NYC")
- **Instances**: Individual VyOS routers within a site
- **Role-Based Access**: OWNER, ADMIN, and VIEWER roles per site
- **Active Session**: Connect to one instance at a time for configuration

### Database-Driven Configuration

VyManager stores all instance configurations in a PostgreSQL database:

```
PostgreSQL Database
├── users           # User accounts
├── sites           # Site groupings
├── instances       # VyOS router instances
├── permissions     # User-site role mappings
└── active_sessions # Current connections
```

All VyOS instances are managed through the web UI — no hardcoded configuration.

---

## Managing Multiple VyOS Instances

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
4. VyManager will test the connection, verify API credentials, and redirect you to the dashboard
5. You can now manage that VyOS router!

### Switching Between Instances

- Click **"Disconnect Instance"** in the sidebar
- You'll return to **Site Manager**
- Connect to a different instance

---

## Role-Based Access Control

VyManager implements granular role-based access:

| Role | Permissions |
|------|-------------|
| **OWNER** | Full control: manage site, add/edit/delete instances, grant permissions |
| **ADMIN** | Manage instances, edit configurations, cannot delete site or manage permissions |
| **VIEWER** | Read-only access to configurations |

Roles are assigned per-site, allowing flexible multi-tenant scenarios.

---

## Version-Aware Architecture

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

Every feature exposes a `/capabilities` endpoint that tells the frontend which features are available for the connected VyOS version. The frontend conditionally shows/hides features based on these capabilities.

---

## Development Setup

If you want to contribute or run VyManager from source, follow the instructions below.

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

## Tech Stack

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
- **Database**: PostgreSQL 16
- **Container Registry**: GitHub Container Registry (ghcr.io)

---

## Security Considerations

1. **Change Default Secrets**: Always change `BETTER_AUTH_SECRET` and database passwords before deploying
2. **Use HTTPS**: Enable SSL/TLS for production deployments (use a reverse proxy like Nginx or Traefik)
3. **Secure API Keys**: Store VyOS API keys securely, never commit them to git
4. **Database Backups**: Regularly backup the PostgreSQL database (`postgres_data` volume)
5. **Network Isolation**: Run VyManager in a secure network segment
6. **Update Regularly**: Keep VyManager and VyOS up to date

---

## Troubleshooting

### Custom CA Certificates

If your VyOS instances use certificates signed by a private CA (e.g., FreeIPA, Active Directory CS, internal PKI), you can add your CA certificates so that VyManager trusts them when "Verify SSL" is enabled.

1. Create a `certs` directory next to your `docker-compose.yml`:
   ```bash
   mkdir certs
   ```

2. Copy your CA certificate(s) into it. Files must be PEM-encoded with a `.crt` extension:
   ```bash
   cp /path/to/my-ca.crt ./certs/
   ```

3. Restart the backend container:
   ```bash
   docker compose restart backend
   ```

The backend will automatically import all `.crt` files from the `certs` directory on startup. You can add multiple CA certificates — all of them will be trusted.

> **Note**: The certificate must be in PEM format (starts with `-----BEGIN CERTIFICATE-----`). If you only have the raw base64 data, wrap it with the header and footer:
> ```
> -----BEGIN CERTIFICATE-----
> <your base64 certificate data>
> -----END CERTIFICATE-----
> ```

### Cannot Connect to VyOS Instance

1. **Check API Key**: Verify the API key in VyOS matches your input
2. **Check Network**: Ensure VyManager can reach the VyOS IP address
3. **Check Port**: Default is 443, verify it's not blocked by firewall
4. **Check SSL**: If using self-signed cert, set "Verify SSL" to false or add your CA certificate (see [Custom CA Certificates](#custom-ca-certificates))

### Containers Not Starting

```bash
# Check container status and health
docker compose ps

# Check logs for errors
docker compose logs postgres
docker compose logs backend
docker compose logs frontend
```

### Database Connection Failed

```bash
# Verify PostgreSQL is healthy
docker compose ps postgres

# Check that DATABASE_URL in .env matches the postgres service credentials
# The hostname must be "postgres" (the Docker service name), not "localhost"
```

### Frontend Cannot Reach Backend

- Verify `BACKEND_URL=http://backend:8000` in your `.env` file (uses Docker service name)
- Verify `TRUSTED_ORIGINS` includes the URL you are accessing VyManager from in your browser
- Check that the backend container is healthy: `docker compose ps backend`

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing architecture patterns
4. Test thoroughly on both VyOS 1.4 and 1.5
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

See LICENSE.md for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/Community-VyProjects/VyManager/issues)
- **Discord**: [Join our community](https://discord.gg/k9SSkK7wPQ)
- **API Docs**: http://localhost:8000/docs (when running)
- **VyOS Docs**: https://docs.vyos.io/

---

**Built with love for the VyOS community**
