# VyManager Backend API

FastAPI backend that provides version-aware VyOS router management. Automatically translates API requests into correct VyOS commands based on the detected device version (1.4 vs 1.5).

## What This Does

Frontend sends simple JSON requests → Backend translates to version-specific VyOS commands → Executes on VyOS device in optimized batches.

**Key Benefits:**
- ✅ Frontend doesn't need to know VyOS command syntax
- ✅ Handles version differences automatically (VyOS 1.4 vs 1.5)
- ✅ Batches multiple changes into ONE API call (faster!)
- ✅ Caches configuration for fast reads
- ✅ Clean, self-contained code - each interface type in its own complete file

---

## Quick Start

### 1. Configure VyOS Device

Edit `backend/.env` with your VyOS router details:

```env
VYOS_NAME=vyos-router
VYOS_HOSTNAME=192.168.1.1
VYOS_APIKEY=your-api-key-here
VYOS_VERSION=1.4
VYOS_PROTOCOL=https
VYOS_PORT=443
VYOS_VERIFY_SSL=false
```

### 2. Install and Run

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app:app --reload
```

The device is automatically registered on startup.

### 3. View Interactive Docs

Visit `http://localhost:8000/docs` to see all endpoints and try them in your browser!

### 4. Example API Calls

**Get firewall group capabilities:**
```bash
curl "http://localhost:8000/vyos/firewall/groups/capabilities"
```

**Configure ethernet interface (batch):**
```bash
curl -X POST "http://localhost:8000/vyos/ethernet/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "interface": "eth0",
    "operations": [
      {"op": "set_description", "value": "WAN Interface"},
      {"op": "set_address", "value": "10.0.0.1/24"},
      {"op": "set_mtu", "value": "1500"}
    ]
  }'
```

**Create VLAN:**
```bash
curl -X POST "http://localhost:8000/vyos/ethernet/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "interface": "eth0",
    "operations": [
      {"op": "set_vif", "value": "100"},
      {"op": "set_vif_description", "value": "100,VLAN 100"},
      {"op": "set_vif_address", "value": "100,192.168.100.1/24"}
    ]
  }'
```

**Read ethernet configuration:**
```bash
curl "http://localhost:8000/vyos/ethernet/config"
```

**Refresh config cache:**
```bash
curl -X POST "http://localhost:8000/vyos/config/refresh"
```

---

## How It Works (Simple Explanation)

```
┌─────────────┐
│  Frontend   │  Sends: {"interface": "eth0", "operations": [...]}
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Router (routers/interfaces/ethernet.py)        │
│  - Receives request                                     │
│  - Validates JSON with Pydantic models                  │
│  - Calls builder                                        │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Builder (vyos_builders/interfaces/ethernet.py)         │
│  - Self-contained batch builder                         │
│  - Takes operations and builds batch                    │
│  - Calls mapper to get correct VyOS commands            │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Mapper (vyos_mappers/interfaces/ethernet.py)           │
│  - Self-contained command mapper                        │
│  - Knows VyOS version (1.4 or 1.5)                      │
│  - Returns correct command path                         │
│  - Example: ["interfaces", "ethernet", "eth0", ...]     │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  VyOS Device                                            │
│  Executes: set interfaces ethernet eth0 description WAN │
└─────────────────────────────────────────────────────────┘
```

**For READ operations:**
```
┌─────────────┐
│  Frontend   │  GET request
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Router (routers/interfaces/ethernet.py)        │
│  - Retrieves cached config from service                 │
│  - Calls mapper to parse VyOS data                      │
│  - Returns structured JSON                              │
└─────────────────────────────────────────────────────────┘
```

**In short:**
1. **Router** = API endpoint (receives/returns JSON) - self-contained per interface type
2. **Builder** = Builds batch of commands - self-contained per interface type
3. **Mapper** = Translates to/from VyOS syntax based on version - self-contained per interface type

---

## Project Structure

```
backend/
├── app.py                              # Main FastAPI app
├── vyos_service.py                     # VyOS device registry & config caching
├── config_loader.py                    # Environment config loader
│
├── routers/                            # API endpoints (version-agnostic)
│   ├── firewall/
│   │   └── groups.py                   # Firewall groups endpoints
│   └── interfaces/
│       └── ethernet.py                 # Ethernet interface endpoints
│
├── vyos_builders/                      # Batch operation builders
│   ├── firewall/
│   │   └── groups.py                   # Firewall groups builder
│   └── interfaces/
│       └── ethernet.py                 # Ethernet interface builder
│
└── vyos_mappers/                       # VyOS command mappers (version-specific)
    ├── base.py                         # BaseFeatureMapper
    ├── firewall/
    │   ├── groups.py                   # Base mapper (v1.5 features)
    │   └── groups_versions/
    │       ├── v1_4.py                 # v1.4 overrides
    │       └── v1_5.py                 # v1.5 implementation
    └── interfaces/
        ├── ethernet.py                 # Base mapper (v1.5 features)
        └── ethernet_versions/
            ├── v1_4.py                 # v1.4 overrides
            └── v1_5.py                 # v1.5 implementation
```

### Key Architecture Principles

**✅ Version-Aware Mappers:**
- Base mapper contains all v1.5 features
- Version-specific classes (v1_4.py, v1_5.py) override for version differences
- Routers and builders remain version-agnostic

**✅ Three-Layer Architecture:**
1. **Routers** - Handle HTTP, validate input, return capabilities
2. **Builders** - Build batch operations, version-agnostic
3. **Mappers** - Generate version-specific VyOS commands

**✅ Capabilities-Based:**
- Each feature exposes `/capabilities` endpoint
- Frontend adapts UI based on version
- Example: Domain groups only available in v1.5+

**✅ Self-Contained Features:**
- Each feature (firewall/groups, interfaces/ethernet) is complete in its own files
- All operations for that feature in one place
- Easy to understand and maintain

**For detailed version-specific development patterns, see the main README.md "Developing Version-Specific Features" section.**

---

## How to Add a New Feature

For comprehensive instructions on adding version-aware features, **see the main README.md "Developing Version-Specific Features" section**.

This section provides a quick overview using a simplified example.

### Example: Adding a New Interface Type

Let's say you want to add **Bridge** interface support.

**Important:** Even if bridges share operations with ethernet, create separate self-contained files. Follow the firewall groups and ethernet patterns.

---

### Step 1: Create the Base Mapper

**File:** `vyos_mappers/interfaces/bridge.py`

Create the base mapper with all v1.5 features:

```python
"""
Bridge Interface Command Mapper

Handles bridge-specific interface commands.
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class BridgeInterfaceMapper(BaseFeatureMapper):
    """Bridge interface mapper with all bridge interface operations"""

    def __init__(self, version: str):
        """Initialize with VyOS version."""
        super().__init__(version)
        self.interface_type = "bridge"

    # ========================================================================
    # Command Path Methods (for WRITE operations)
    # ========================================================================

    def get_description(self, interface: str, description: str) -> List[str]:
        """Get command path for setting interface description."""
        return ["interfaces", self.interface_type, interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        """Get command path for description property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        """Get command path for setting interface address."""
        return ["interfaces", self.interface_type, interface, "address", address]

    def get_member(self, interface: str, member: str) -> List[str]:
        """Get command path for adding bridge member (bridge-specific)."""
        return ["interfaces", self.interface_type, interface, "member", "interface", member]

    # Add all other bridge operations...

    # ========================================================================
    # Config Parsing Methods (for READ operations)
    # ========================================================================

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a single bridge interface configuration from VyOS."""
        if self.version == "1.4":
            return self._parse_interface_v14(name, config)
        elif self.version == "1.5":
            return self._parse_interface_v15(name, config)
        else:
            return self._parse_interface_v15(name, config)

    def _parse_interface_v14(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse bridge interface configuration for VyOS 1.4.x."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]

        # Parse bridge members
        members = []
        if "member" in config and "interface" in config["member"]:
            member_config = config["member"]["interface"]
            if isinstance(member_config, dict):
                members = list(member_config.keys())

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "members": members,
            "disable": "disable" in config if "disable" in config else None,
        }

    def _parse_interface_v15(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse bridge interface configuration for VyOS 1.5.x."""
        # Same as 1.4 for now, but can differ in future
        return self._parse_interface_v14(name, config)

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse all bridge interfaces."""
        interfaces = []
        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": {},
        }
```

---

### Step 2: Create Version Overrides

**File:** `vyos_mappers/interfaces/bridge_versions/v1_4.py`

```python
from ..bridge import BridgeInterfaceMapper

class BridgeMapper_v1_4(BridgeInterfaceMapper):
    """v1.4 overrides - block features not available in 1.4"""

    def get_new_v15_feature(self, interface: str) -> List[str]:
        raise ValueError("This feature requires VyOS 1.5+")
```

**File:** `vyos_mappers/interfaces/bridge_versions/v1_5.py`

```python
from ..bridge import BridgeInterfaceMapper

class BridgeMapper_v1_5(BridgeInterfaceMapper):
    """v1.5 - inherits all features from base"""
    pass
```

**File:** `vyos_mappers/interfaces/bridge_versions/__init__.py`

```python
def get_bridge_mapper(version: str):
    if version.startswith("1.4"):
        from .v1_4 import BridgeMapper_v1_4
        return BridgeMapper_v1_4
    else:
        from .v1_5 import BridgeMapper_v1_5
        return BridgeMapper_v1_5
```

---

### Step 3: Create the Builder

**File:** `vyos_builders/interfaces/bridge.py`

This provides ALL batch operations for bridges in ONE file:

```python
"""
Bridge Interface Batch Builder

Provides all bridge interface batch operations.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BridgeInterfaceBuilderMixin:
    """Complete batch builder for bridge interface operations"""

    def __init__(self, version: str):
        """Initialize bridge interface batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_bridge"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BridgeInterfaceBuilderMixin":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BridgeInterfaceBuilderMixin":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Bridge Interface Operations
    # ========================================================================

    def set_interface_description(
        self, interface: str, description: str
    ) -> "BridgeInterfaceBuilderMixin":
        """Set interface description"""
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def add_bridge_member(
        self, interface: str, member: str
    ) -> "BridgeInterfaceBuilderMixin":
        """Add interface to bridge (bridge-specific)"""
        path = self.mappers[self.interface_mapper_key].get_member(interface, member)
        return self.add_set(path)

    # Add all other bridge operations...
```

---

### Step 4: Create the Router

Add a `/capabilities` endpoint to expose version-specific features:

**File:** `routers/interfaces/bridge.py`

This creates ALL endpoints for bridges in ONE file:

```python
"""
Bridge Interface Configuration Endpoints

All bridge interface endpoints for VyOS configuration.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

from vyos_service import VyOSDeviceRegistry

router = APIRouter(prefix="/vyos/{device_name}/bridge", tags=["bridge-interface"])

device_registry: VyOSDeviceRegistry = None


def set_device_registry(registry: VyOSDeviceRegistry):
    """Set the device registry for this router."""
    global device_registry
    device_registry = registry


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================

class InterfaceDescription(BaseModel):
    """Model for setting interface description."""
    interface: str = Field(..., description="Interface name (e.g., br0)")
    description: str = Field(..., description="Interface description")


class BridgeMember(BaseModel):
    """Model for bridge member operations."""
    interface: str = Field(..., description="Bridge name (e.g., br0)")
    member: str = Field(..., description="Member interface (e.g., eth0)")


class InterfaceBatchRequest(BaseModel):
    """Model for batch interface configuration."""
    interface: str = Field(..., description="Interface name (e.g., br0)")
    operations: List[Dict[str, str]] = Field(
        ...,
        description="List of interface operations"
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models (for READ operations)
# ============================================================================

class BridgeInterfaceConfigResponse(BaseModel):
    """Bridge interface configuration from VyOS (read operation)"""
    name: str = Field(..., description="Interface name (e.g., br0)")
    type: str = Field(..., description="Interface type (bridge)")
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    members: List[str] = Field(default_factory=list, description="Bridge member interfaces")
    disable: Optional[bool] = None


class BridgeInterfacesConfigResponse(BaseModel):
    """Response containing all bridge interface configurations"""
    interfaces: List[BridgeInterfaceConfigResponse] = Field(default_factory=list)
    total: int = Field(0)
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)


# ============================================================================
# READ Operations (GET)
# ============================================================================

@router.get("/config", response_model=BridgeInterfacesConfigResponse)
async def get_bridge_config(device_name: str) -> BridgeInterfacesConfigResponse:
    """Get all bridge interface configurations from VyOS."""
    from vyos_mappers.interfaces import BridgeInterfaceMapper

    try:
        service = device_registry.get(device_name)
        full_config = service.get_full_config()
        raw_config = full_config.get("interfaces", {}).get("bridge", {})

        mapper = BridgeInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return BridgeInterfacesConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Bridge Interface Batch Endpoint
# ============================================================================

@router.post("/batch")
async def configure_interface_batch(
    device_name: str, request: InterfaceBatchRequest
) -> VyOSResponse:
    """
    Configure bridge interface using batch operations.

    Supported operations:
    - set_description
    - delete_description
    - set_address
    - delete_address
    - add_member
    - delete_member
    - delete_interface
    """
    try:
        service = device_registry.get(device_name)
        batch = service.create_bridge_batch()

        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(status_code=400, detail="Operation must have 'op' key")

            # Handle each operation type...
            if op_type == "set_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_description(request.interface, value)
            elif op_type == "add_member":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.add_bridge_member(request.interface, value)
            # ... handle all other operations

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result,
            error=response.error if response.error else None
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Add a capabilities endpoint to the router:

```python
@router.get("/capabilities")
async def get_capabilities() -> dict:
    """Get bridge interface capabilities based on VyOS version."""
    mapper = device.get_mapper("interface_bridge")
    return {
        "version": device.version,
        "features": {
            "basic": True,
            "v15_feature": hasattr(mapper, "get_new_v15_feature"),
        }
    }
```

---

### Step 5: Register Everything

**Mapper** (`vyos_mappers/__init__.py`):
```python
from .interfaces.bridge_versions import get_bridge_mapper
registry.register_versioned_feature("interface_bridge", get_bridge_mapper)
```

**Builder** (`vyos_builders/__init__.py`):
```python
from .interfaces.bridge import BridgeBatchBuilder
__all__ = [..., "BridgeBatchBuilder"]
```

**Router** (`app.py`):
```python
from routers.interfaces import bridge
bridge.set_device_registry(device_registry)
app.include_router(bridge.router)
```

---

## Quick Reference Checklist

When adding a new feature (e.g., bridge interface, NAT, VPN), create these files:

**Mappers (version-specific):**
```
☐ vyos_mappers/[feature]/[feature].py
   - Base mapper with all v1.5 features
   - Inherits from BaseFeatureMapper
   - Contains command generation methods
   - Contains parsing methods

☐ vyos_mappers/[feature]/[feature]_versions/v1_4.py
   - Overrides/blocks features not in v1.4
   - Raises errors for unsupported features

☐ vyos_mappers/[feature]/[feature]_versions/v1_5.py
   - Inherits all features from base
   - Usually just: pass

☐ vyos_mappers/[feature]/[feature]_versions/__init__.py
   - Version selection function
```

**Builders (version-agnostic):**
```
☐ vyos_builders/[feature]/[feature].py
   - Batch operation builder
   - Uses mapper for commands
```

**Routers (version-agnostic):**
```
☐ routers/[feature]/[feature].py
   - API endpoints
   - Pydantic models
   - GET /capabilities endpoint (IMPORTANT!)
   - GET /config endpoint
   - POST /batch endpoint
```

**Registration:**
```
☐ vyos_mappers/__init__.py          - Register versioned mapper
☐ vyos_builders/__init__.py         - Export builder
☐ app.py                             - Include router
```

---

## Architecture Patterns

### Configuration Caching (for READ operations)

```python
# In vyos_service.py
def get_full_config(self, refresh: bool = False) -> Dict[str, Any]:
    """Get full VyOS config (cached unless refresh=True)"""
    if self._cached_config is not None and not refresh:
        return self._cached_config

    response = self.device.show(path=["configuration", "json", "pretty"])
    self._cached_config = json.loads(response.result)
    return self._cached_config
```

### Version-Aware Parsing

```python
# In each mapper file
def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Version-aware parsing dispatcher"""
    if self.version == "1.4":
        return self._parse_interface_v14(name, config)
    elif self.version == "1.5":
        return self._parse_interface_v15(name, config)
    else:
        return self._parse_interface_v15(name, config)
```

### Batch Operations

```python
# Single operation
{
    "interface": "eth0",
    "operations": [
        {"op": "set_description", "value": "WAN"}
    ]
}

# Multiple operations in one batch
{
    "interface": "eth0",
    "operations": [
        {"op": "set_description", "value": "WAN"},
        {"op": "set_address", "value": "10.0.0.1/24"},
        {"op": "set_mtu", "value": "9000"},
        {"op": "enable"}
    ]
}
```

---

## API Endpoints

Visit `http://localhost:8000/docs` for full interactive documentation.

### Configuration Management
- `POST /vyos/config/refresh` - Pull and cache full VyOS config
- `GET /vyos/config` - Get cached config

### Firewall Groups
- `GET /vyos/firewall/groups/capabilities` - Get version-specific capabilities
- `GET /vyos/firewall/groups/config` - Get all firewall groups
- `POST /vyos/firewall/groups/batch` - Create/modify firewall groups

### Ethernet Interfaces
- `GET /vyos/ethernet/capabilities` - Get version-specific capabilities
- `GET /vyos/ethernet/config` - Get all ethernet interfaces
- `POST /vyos/ethernet/batch` - Configure ethernet interface (batch, including VLANs)

---

## Best Practices

**Version Handling:**
- **Base mapper** = All v1.5 features
- **v1.4 override** = Raise errors for unsupported features
- **v1.5 class** = Inherit everything from base (usually empty)
- **Routers/Builders** = Version-agnostic (let mappers handle it)

**Capabilities:**
- Always provide `/capabilities` endpoint
- Frontend uses it to adapt UI to version
- Return specific feature availability

**Testing:**
- Test with both VyOS 1.4 and 1.5
- Use interactive docs at `/docs`
- Verify errors for unsupported features

**Development:**
- Follow firewall groups and ethernet patterns
- Keep features in separate self-contained files
- Use batch operations for efficiency
- Always normalize data structures across versions

---

## Documentation & Support

**Project Documentation:**
- **Main README**: See `../README.md` for comprehensive version-specific development guide
- **Frontend README**: See `../frontend/README.md` for frontend integration
- **API Docs**: http://localhost:8000/docs (interactive)

**VyOS Documentation:**
- VyOS 1.4: https://docs.vyos.io/en/sagitta/
- VyOS 1.5: https://docs.vyos.io/en/latest/

**Examples:**
- Firewall Groups: See `vyos_mappers/firewall/groups*` for version handling
- Ethernet Interfaces: See `vyos_mappers/interfaces/ethernet*` for VLAN support
