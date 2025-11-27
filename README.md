# 🖥️ VyManager - Enterprise-grade VyOS Router Management System

Modern web interface to make configuring, deploying and monitoring VyOS routers easier

## 🎯 Open Beta Community Release

Open beta release. Expect lower stability and bugs. This release provides a lot of structural improvements over the older legacy version. 
We now flexibly support all active VyOS versions, including rolling releases.

**[➡️ Skip to Quick Start](https://github.com/Community-VyProjects/VyManager/tree/beta#prerequisites)**

[💭 Join our official Discord community to receive updates](https://discord.gg/k9SSkK7wPQ)

*Give us a star ⭐ to support us!*

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
- OR **Node.js 24.x** and **Python 3.11+** (for manual setup)

---

## 🔧 Configuration

Before you start, ensure you're connected to the VyOS router via the terminal/shell. You need to do follow both VyOS router setup and Environment values.

### Step 1) Setup VyOS routers:
Setup the HTTPS REST API in your VyOS router(s), using the following CLI commands:

1. Start configuration mode:
``` conf ```

2. Create a HTTPS key:
>💡Security Notice: replace KEY with a really secure key, it's like a password! You will need to enter this password in your backend .env file in the next steps!
``` set service https api keys id fastapi key KEY ```

3. (only required on VyOS 1.5 and above) Enable the REST functionality:
``` set service https api rest ```

4. (optional) Enable GraphQL functionality:
``` set service https api graphql ```

5. Save your changes in CLI (run these **two** commands chronologically):
``` commit ```, then ``` save ```

### Step 2) Configure environment values:

#### Root Configuration

Copy `env.example` to `.env` and fill in your environment values:

```env
NODE_ENV=production
BETTER_AUTH_SECRET=your-super-secret-key-change-in-production-CHANGE-THIS
BETTER_AUTH_URL=http://your-server-ip:3000
NEXT_PUBLIC_APP_URL=http://your-server-ip:3000
TRUSTED_ORIGINS=http://your-server-ip:3000,http://localhost:3000
```

#### Backend Configuration

Copy `backend/.env.example` to `backend/.env` and fill in your environment values:

```env
# VyOS Router Credentials
VYOS_NAME=vyos15
VYOS_HOSTNAME=100.64.64.4
VYOS_APIKEY=REST_API_KEY_HERE
VYOS_VERSION=1.5 # or 1.4
VYOS_PROTOCOL=https
VYOS_PORT=443
VYOS_VERIFY_SSL=false
VYOS_TIMEOUT=10
```

#### Frontend Configuration

Edit `frontend/.env.local`:

```env
# API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3) Edit `docker-compose.yml` and fill in your configuration values

---

## Installation

### Option 1: Docker Compose (Recommended)

Run both frontend and backend with a single command:

```bash
# Start all services
npm run dev

# Or using docker-compose directly
docker-compose up
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

Stop services:
```bash
npm run stop
# or
docker-compose down
```

### Option 2: Manual Development

**Terminal 1 - Backend:**
```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your VyOS router credentials

# Run backend server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# .env.local should have: NEXT_PUBLIC_API_URL=http://localhost:8000

# Run frontend dev server
npm run dev
```

## 📜 Available Scripts

### Root-level Commands

```bash
# Development
npm run dev              # Start both services with Docker
npm run dev:frontend     # Run only frontend (manual)
npm run dev:backend      # Run only backend (manual)
npm run dev:down         # Stop Docker services

# Build
npm run build            # Build frontend
npm run build:docker     # Build Docker images

# Production (Docker)
npm start                # Start services in detached mode
npm stop                 # Stop all services

# Logs
npm run logs             # View all logs
npm run logs:frontend    # View frontend logs only
npm run logs:backend     # View backend logs only

# Installation
npm run install:frontend # Install frontend dependencies
npm run install:backend  # Setup backend virtual env

# Maintenance
npm run clean            # Clean all build artifacts and containers
npm run lint:frontend    # Lint frontend code
npm run type-check:frontend # TypeScript type checking
```

---

## 📁 Project Structure

```
vymanager/
├── frontend/              # Next.js 16 frontend application
│   ├── src/              # Source code
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and API clients
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── Dockerfile        # Frontend container
│
├── backend/              # FastAPI backend application
│   ├── routers/          # API route handlers
│   ├── vyos_mappers/     # VyOS version mappers
│   ├── vyos_builders/    # Configuration builders
│   ├── pyvyos/           # VyOS Python SDK
│   ├── app.py            # Main FastAPI application
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend container
│
├── docker-compose.yml    # Multi-service orchestration
├── package.json          # Root-level convenience scripts
└── README.md             # This file
```

---

## 🎨 Frontend Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Theme**: Dark mode (enforced)

### Frontend Development

```bash
cd frontend

# Add shadcn/ui components
npx shadcn@latest add [component-name]

# Run dev server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

See `frontend/README.md` for more details.

## ⚙️ Backend Stack

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **VyOS SDK**: pyvyos (custom)
- **API Docs**: Auto-generated (OpenAPI/Swagger)

### Backend Development

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run with auto-reload
uvicorn app:app --reload

# Run tests
pytest

# View API documentation
# Navigate to http://localhost:8000/docs
```

See `backend/README.md` for more details.

## 🏗️ Developing Version-Specific Features

VyManager supports multiple VyOS versions (1.4, 1.5+) using a version-aware architecture. When adding new features, follow these patterns to ensure compatibility across versions.

### Backend Architecture Pattern

The backend uses a three-layer architecture for version management:

```
backend/
├── routers/              # API endpoints (version-agnostic)
│   └── [feature]/
│       └── [feature].py
├── vyos_builders/        # Batch operation builders
│   └── [feature]/
│       └── [feature].py
└── vyos_mappers/         # VyOS command mappers (version-specific)
    └── [feature]/
        ├── [feature].py              # Base mapper (v1.5 features)
        └── [feature]_versions/
            ├── v1_4.py              # v1.4 overrides
            └── v1_5.py              # v1.5 implementation
```

### Layer Responsibilities

**1. Routers (`routers/[feature]/`):**
- Define FastAPI endpoints
- Handle HTTP request/response
- Version-agnostic - work with any VyOS version
- Use builders for batch operations
- Return capabilities based on detected version

**2. Builders (`vyos_builders/[feature]/`):**
- Provide high-level operation methods
- Use mappers to generate version-specific commands
- Handle batch command execution
- Version-agnostic interface

**3. Mappers (`vyos_mappers/[feature]/`):**
- Generate VyOS configuration commands
- Parse VyOS configuration JSON
- **Base class** contains v1.5+ features
- **Version classes** override for version-specific behavior

### Example: Firewall Groups

```
vyos_mappers/firewall/
├── groups.py                    # Base mapper (v1.5 features)
└── groups_versions/
    ├── v1_4.py                 # v1.4 overrides
    └── v1_5.py                 # v1.5 implementation
```

**Base Mapper (`groups.py`):**
```python
class FirewallGroupsMapper(BaseFeatureMapper):
    """Base mapper with all v1.5 features"""

    def set_domain_group(self, name: str) -> List[str]:
        """Create domain group (v1.5+ feature)"""
        return ["firewall", "group", "domain-group", name]
```

**v1.4 Override (`groups_versions/v1_4.py`):**
```python
class FirewallGroupsMapper_v1_4(FirewallGroupsMapper):
    """v1.4 overrides - disable unsupported features"""

    def set_domain_group(self, name: str) -> List[str]:
        """Domain groups not available in v1.4"""
        raise ValueError("Domain groups require VyOS 1.5+")
```

**v1.5 Implementation (`groups_versions/v1_5.py`):**
```python
class FirewallGroupsMapper_v1_5(FirewallGroupsMapper):
    """v1.5 - inherits all features from base"""
    pass  # No overrides needed, base has all v1.5 features
```

### Example: Ethernet Interfaces

```
vyos_mappers/interfaces/
├── ethernet.py                  # Base mapper
└── ethernet_versions/
    ├── v1_4.py                 # v1.4 overrides
    └── v1_5.py                 # v1.5 implementation
```

**v1.4 Override for unavailable feature:**
```python
def get_ip_enable_directed_broadcast(self, interface: str) -> List[str]:
    """Directed broadcast is not available in v1.4"""
    raise ValueError("enable-directed-broadcast requires VyOS 1.5+")

def _parse_ip_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse IP config - normalize v1.5 features to None"""
    return {
        "source_validation": ip_config.get("source-validation"),
        "enable_directed_broadcast": None,  # Not available in v1.4
    }
```

### Creating a New Feature

**1. Create Base Mapper** (`vyos_mappers/[feature]/[feature].py`):
```python
from typing import List, Dict, Any
from ..base import BaseFeatureMapper

class FeatureMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # Command generation (for writes)
    def get_something(self, name: str, value: str) -> List[str]:
        return ["path", "to", "command", name, value]

    # Config parsing (for reads)
    def parse_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": config.get("name"),
            "value": config.get("value"),
        }
```

**2. Create Version Overrides** (`vyos_mappers/[feature]/[feature]_versions/`):

`v1_4.py`:
```python
from ..[feature] import FeatureMapper

class FeatureMapper_v1_4(FeatureMapper):
    """Override or block features not in v1.4"""

    def get_new_v15_feature(self, value: str) -> List[str]:
        raise ValueError("This feature requires VyOS 1.5+")
```

`v1_5.py`:
```python
from ..[feature] import FeatureMapper

class FeatureMapper_v1_5(FeatureMapper):
    """Inherit all base features"""
    pass
```

**3. Create Builder** (`vyos_builders/[feature]/[feature].py`):
```python
class FeatureBuilder:
    def __init__(self, device_name: str, registry):
        self.device = registry.get_device(device_name)
        self.mapper = self.device.get_mapper("feature")

    def set_something(self, name: str, value: str):
        path = self.mapper.get_something(name, value)
        self.device.vyos_set(path)
```

**4. Create Router** (`routers/[feature]/[feature].py`):
```python
from fastapi import APIRouter

router = APIRouter(prefix="/vyos/feature", tags=["feature"])

@router.get("/capabilities")
async def get_capabilities():
    mapper = device.get_mapper("feature")
    return {
        "version": device.version,
        "features": {
            "basic_feature": True,
            "v15_feature": hasattr(mapper, "get_new_v15_feature"),
        }
    }
```

**5. Register Mapper** (`vyos_mappers/[feature]/[feature]_versions/__init__.py`):
```python
def get_feature_mapper(version: str):
    if version.startswith("1.4"):
        from .v1_4 import FeatureMapper_v1_4
        return FeatureMapper_v1_4
    else:  # 1.5+
        from .v1_5 import FeatureMapper_v1_5
        return FeatureMapper_v1_5
```

### Frontend Integration

The frontend uses capabilities to determine available features:

```typescript
// Fetch capabilities
const capabilities = await service.getCapabilities();

// Show/hide features based on version
if (capabilities.features.v15_feature) {
  // Show v1.5+ feature UI
}
```

### Best Practices

1. **Base mapper = v1.5 features** - Implement all latest features in base class
2. **Version classes override/block** - v1.4 class raises errors for unavailable features
3. **Normalize data structures** - Return same structure across versions (use `null` for unavailable fields)
4. **Capabilities endpoint** - Always provide `/capabilities` to expose version-specific features
5. **Error messages** - Be specific: `"Feature X requires VyOS 1.5+"`
6. **Test both versions** - Verify features work on target version and fail gracefully on others

## 🐳 Docker Details

### Services

**Backend Service:**
- Port: 8000
- Auto-reloads on code changes
- Volume-mounted for development

**Frontend Service:**
- Port: 3000
- Auto-reloads on code changes
- Volume-mounted for development
- Depends on backend health check

### Docker Commands

```bash
# Rebuild images
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop and remove containers
docker-compose down

# Remove volumes too
docker-compose down -v

# Restart a specific service
docker-compose restart frontend
docker-compose restart backend
```

## 📚 Documentation

- **Frontend**: See `frontend/README.md`
- **Backend**: See `backend/README.md`
- **API Docs**: http://localhost:8000/docs (when running)
- **VyOS Docs**: https://docs.vyos.io/

## 🛠️ Development Workflow

1. **Make changes** in either `frontend/` or `backend/`
2. **Changes auto-reload** in development mode
3. **Test locally** at http://localhost:3000
4. **Commit changes** to git
5. **Deploy** (see deployment docs)

## 🔍 API Integration

The frontend communicates with the backend API. The API client is located at `frontend/src/lib/api/client.ts`.

Example usage:
```typescript
import { firewallService } from "@/lib/api/firewall";

// Get firewall rules
const rules = await firewallService.getRules();
```

## 🧪 Testing

**Frontend:**
```bash
cd frontend
npm run lint
npm run type-check
```

**Backend:**
```bash
cd backend
pytest
```

## 📝 Project Guidelines

- Follow TypeScript best practices for frontend
- Follow PEP 8 for Python backend code
- Use conventional commits for git messages
- Implement version-specific features following the patterns below

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Look at LICENSE.md

## 🆘 Support

For issues, questions, or contributions, please refer to the project documentation or create an issue.

---

**Built with ❤️ for VyOS management**
