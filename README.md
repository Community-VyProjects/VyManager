# VyManager

> **Multi-tenant network management platform** to configure, deploy, and monitor VyOS instances across multiple sites.

[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=flat-square&logo=discord)](https://discord.gg/k9SSkK7wPQ)
[![Docs](https://img.shields.io/badge/Docs-VyProjects-0078D4?style=flat-square&logo=gitbook)](https://docs.vyprojects.org/)
[![GitHub stars](https://img.shields.io/github/stars/Community-VyProjects/VyManager?style=flat-square)](https://github.com/Community-VyProjects/VyManager/stargazers)
[![Docker Pulls](https://img.shields.io/docker/pulls/ghcr.io/community-vyprojects/vymanager-backend?style=flat-square)](https://github.com/Community-VyProjects/VyManager/pkgs/container/vymanager-backend)

[Quick Start](#-quick-start) · [Documentation](https://docs.vyprojects.org/) · [Discord](https://discord.gg/k9SSkK7wPQ)

Give us a ⭐ star to support us❤️

---

## 📖 Table of Contents

- [About VyManager](#-about-vymanager)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
  - [Automated Script (Linux)](#automated-script-linux)
  - [Manual Docker Setup](#manual-docker-setup)
- [Configuration](#-configuration)
- [Post‑Installation Setup Wizard](#-postinstallation-setup-wizard)
- [Managing Your Deployment](#-managing-your-deployment)
- [Managing Multiple VyOS Instances](#-managing-multiple-vyos-instances)
- [Version‑Aware Architecture](#-versionaware-architecture)
- [Tech Stack](#-tech-stack)
- [Development / Manual Setup](#-development--manual-setup)
- [Security Considerations](#-security-considerations)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🖼️ Screenshots

*User Interface supports Light, Dark and Custom themes.*  
<img width="3799" height="1849" alt="Screenshot 1" src="https://github.com/user-attachments/assets/898081db-678f-4645-909d-f147baed23e7" />
<img width="3790" height="624" alt="Screenshot 2" src="https://github.com/user-attachments/assets/2bf95cc6-4ca8-4694-9822-d97bb90db1b8" />
<img width="3799" height="1335" alt="Screenshot 3" src="https://github.com/user-attachments/assets/74ccf55e-2839-492f-ad0e-4e9db2df5774" />

---

## 🚀 About VyManager

VyManager is an open‑source, enterprise‑grade control plane for **VyOS** routers. It provides a modern web interface to manage **multiple instances** across different sites, with role‑based access control, live dashboards, and configuration deployment – all from a single pane of glass.

- **Multi‑site** – organise routers into logical sites (e.g., datacenters, branch offices).
- **Version‑aware** – supports VyOS 1.4, 1.5, and rolling releases.
- **Secure** – API‑key authentication, encrypted SSH credentials, and fine‑grained permissions.
- **Extensible** – built with Next.js, FastAPI, and PostgreSQL.

---

## ✨ Features

- **Centralised Management** – add, remove, and configure VyOS instances from one UI.
- **Live Dashboards** – real‑time interface counters, system info, network graphs, and WireGuard peers via GraphQL.
- **Role‑Based Access Control** – OWNER, ADMIN, VIEWER per site.
- **Multi‑Version Support** – automatically adapts features based on the connected VyOS version.
- **Docker‑First Deployment** – runs anywhere with Docker Compose.
- **Light & Dark Themes** – choose what suits you.

---

## ⚡ Quick Start

The fastest way to get VyManager running is with our **automated install script** (Linux only) or the **manual Docker Compose** method.

- **Documentation**: [https://docs.vyprojects.org/](https://docs.vyprojects.org/)
- **Community**: [Discord](https://discord.gg/k9SSkK7wPQ)

---

## 📦 Installation

### Automated Script (Linux)

> [!IMPORTANT]  
> The install script supports **Ubuntu/Debian**, **Fedora**, **CentOS/RHEL**, **Arch Linux**, and **openSUSE**. It automatically installs Docker, Docker Compose, and pulls the VyManager stack.

Run the following command as **root** or a user with `sudo` privileges:

```bash
curl -fsSL https://raw.githubusercontent.com/Community-VyProjects/VyManager/beta/install.sh | bash
```

The script will:
- Check for Docker & Docker Compose, install them if missing.
- Create a `vymanager` directory with a pre‑populated `.env` and `docker-compose.yml`.
- Start all containers.
- Show you the access URL.

> [!NOTE]  
> If you are on a system that does **not** support KVM (e.g., Docker Desktop on macOS/Windows), the script will warn you about macvlan limitations. See the [Troubleshooting](#-troubleshooting) section.

---

### Manual Docker Setup

If you prefer full control, or you’re running on a platform not covered by the script, follow these steps.

#### Prerequisites

- **Docker** and **Docker Compose** (v2) installed.
- A **VyOS router** with the REST API and GraphQL enabled (see [Enable the VyOS REST API](#enable-the-vyos-rest-api)).

---

#### 1. Enable the VyOS REST API

On each VyOS router you want to manage, SSH in and run:

```bash
configure
set service https api keys id vymanager key YOUR_SECURE_API_KEY
set service https api rest
set service https api graphql
set service https api graphql authentication type key
commit
save
exit
```

> [!IMPORTANT]  
> GraphQL is required for live dashboard data. The API key you set here will be used in VyManager.

---

#### 2. Create the Project Directory

```bash
mkdir vymanager && cd vymanager
```

---

#### 3. Create `docker-compose.yml`

Copy the [docker-compose.yml](https://raw.githubusercontent.com/Community-VyProjects/VyManager/main/docker-compose.yml) from the repository, or use the snippet below:

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

---

#### 4. Create the `.env` File

Create a `.env` file in the same directory. **You must change the following values**:

| Variable | Description | Generate with |
|----------|-------------|---------------|
| `POSTGRES_PASSWORD` | Database password (must match in `DATABASE_URL`) | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | Session token secret (must be the **same** in both places in the file) | `openssl rand -base64 32` |
| `SSH_ENCRYPTION_KEY` | Encryption key for SSH private keys at rest | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | The URL users will use to access VyManager | e.g., `http://192.168.1.50:3000` |
| `TRUSTED_ORIGINS` | Comma‑separated list of all allowed origins | e.g., `http://192.168.1.50:3000,http://localhost:3000` |

Example `.env` (replace placeholders):

```env
# Shared
BETTER_AUTH_SECRET=Change-This-To-Something-Secret

# Backend
DATABASE_URL=postgresql://vymanager:CHANGE_ME_POSTGRES_PASSWORD@postgres:5432/vymanager
FRONTEND_URL=http://frontend:3000
SSH_ENCRYPTION_KEY=Change-This-To-A-Hex-String

# Frontend
NODE_ENV=production
VYMANAGER_ENV=production
BETTER_AUTH_URL=http://<YOUR_SERVER_IP>:3000
NEXT_PUBLIC_APP_URL=http://<YOUR_SERVER_IP>:3000
BACKEND_URL=http://backend:8000
TRUSTED_ORIGINS=http://<YOUR_SERVER_IP>:3000,http://localhost:3000
```

> [!WARNING]  
> Never commit the `.env` file to version control. Keep your secrets safe.

---

#### 5. Start VyManager

```bash
docker compose up -d
```

Wait a minute for all services to become healthy, then open your browser to `http://<YOUR_SERVER_IP>:3000`.

---

## ⚙️ Configuration

### Custom CA Certificates

If your VyOS routers use certificates signed by a private CA, you can add your CA certificates to the backend container:

1. Create a `certs` directory next to your `docker-compose.yml`:
   ```bash
   mkdir certs
   ```
2. Place your PEM‑encoded `.crt` files inside:
   ```bash
   cp /path/to/my-ca.crt ./certs/
   ```
3. Restart the backend:
   ```bash
   docker compose restart backend
   ```

> [!NOTE]  
> All `.crt` files in that directory will be automatically imported on startup.

---

## 🧭 Post‑Installation Setup Wizard

On first visit, the onboarding wizard will guide you through:

1. **Create an admin account** – your first user.
2. **Create your first site** – e.g., "Headquarters".
3. **Add a VyOS instance** – provide the host, port, API key, and version.

After completing the wizard, you’ll be logged in and redirected to the dashboard.

---

## 🛠️ Managing Your Deployment

### Common Docker Commands

```bash
# View logs
docker compose logs -f

# Stop all services
docker compose down

# Restart
docker compose restart

# Update to latest images
docker compose pull
docker compose up -d

# Remove everything (including database volume)
docker compose down -v
```

---

## 🗂️ Managing Multiple VyOS Instances

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

## 🧩 Version‑Aware Architecture

VyManager supports multiple VyOS versions (1.4, 1.5+) using a version‑aware backend architecture.

### How It Works

The backend uses a three‑layer architecture:

```
Routers (API Endpoints)
    ↓
Builders (Batch Operations)
    ↓
Mappers (Version‑Specific Commands)
    ↓
VyOS Device (1.4 or 1.5)
```

Every feature exposes a `/capabilities` endpoint that tells the frontend which features are available for the connected VyOS version. The frontend conditionally shows/hides features based on these capabilities.

> [!NOTE]  
> This design ensures that VyManager remains compatible with future VyOS releases without requiring major rewrites.

---

## 🧰 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Authentication**: Better‑auth
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

## 👨‍💻 Development / Manual Setup

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

## 🔒 Security Considerations

- **Always** change default secrets (`BETTER_AUTH_SECRET`, database password) before deploying.
- Use **HTTPS** in production (place a reverse proxy like Nginx or Traefik in front).
- Store VyOS API keys securely – they are never logged or exposed.
- Regularly backup the PostgreSQL volume (`postgres_data`).
- Keep VyManager and VyOS updated.

---

## ❓ Troubleshooting

### Cannot Connect to VyOS Instance

- Verify the API key is correct and the REST/GraphQL services are enabled.
- Ensure network connectivity between VyManager and the router.
- If using self‑signed certificates, disable SSL verification or add your CA certificate (see [Custom CA Certificates](#custom-ca-certificates)).

### Containers Not Starting

Check logs:
```bash
docker compose logs postgres
docker compose logs backend
docker compose logs frontend
```

### Database Connection Failed

Ensure the `DATABASE_URL` in `.env` uses `postgres` as the hostname (the Docker service name) and the credentials match.

### Docker Desktop & KVM Limitations

> [!IMPORTANT]  
> Docker Desktop on Linux, macOS, and Windows does **not** provide KVM access to containers. If you need macvlan networking, consider running on a native Linux host or using a second macvlan interface as a workaround.

> [!NOTE]  
> The install script will detect this and warn you accordingly.

### VyOS API Timeouts with Large Configurations

> [!NOTE]  
> VyOS has known performance issues with large configurations, causing commits and boot times to take longer. See [VyOS T5388](https://vyos.dev/T5388).

When making changes (e.g., reordering NAT rules) and the commit via the API takes longer than the default timeout, the operation may appear to fail or the UI may refresh before the commit completes.

**Solution:**
- Increase the **API timeout** in VyManager to a higher value (maximum 300 seconds). You can set this in the instance settings or via the `VYOS_API_TIMEOUT` environment variable (if supported).
- Verify that the commit actually applied by manually reloading the configuration or checking the logs.

> [!TIP]  
> If you notice the UI refreshing too quickly, try increasing the timeout further and avoid performing large operations simultaneously.

### SSH Key Generation Fails

If you see **"Failed to generate SSH key"** when setting up SSH for real-time monitoring, the `SSH_ENCRYPTION_KEY` is most likely missing from your `.env` file.

**Cause:**  
VyManager uses this key to encrypt the generated SSH private key before storing it in the database. Without it, generation cannot complete.

**Solution:**
1. Generate a strong hex key:
   ```bash
   openssl rand -hex 32
   ```
2. Add it to your `.env`:
   ```env
   SSH_ENCRYPTION_KEY=your-generated-hex-key
   ```
3. Restart the backend container:
   ```bash
   docker compose restart backend
   ```
4. Try generating the SSH key again via the VyManager UI.

> [!IMPORTANT]  
> Also verify that you have entered the correct SSH username and port (e.g., `imam` and port `7842`). The SSH service on VyOS must be running and the user must have sufficient privileges.

> [!TIP]  
> Check the backend logs for errors:
> ```bash
> docker compose logs backend | grep -i ssh
> ```

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](https://github.com/Community-VyProjects/VyManager/blob/main/CONTRIBUTING.md) for guidelines.

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feat/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

See [LICENSE.md](https://github.com/Community-VyProjects/VyManager/blob/main/LICENSE.md) for details.

---

## 💬 Support

- **Documentation**: [https://docs.vyprojects.org/](https://docs.vyprojects.org/)
- **Issues**: [GitHub Issues](https://github.com/Community-VyProjects/VyManager/issues)
- **Discord**: [Join our community](https://discord.gg/k9SSkK7wPQ)

---

**Built with ❤️ for the VyOS community**
