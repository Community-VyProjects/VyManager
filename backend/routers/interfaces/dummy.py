"""
Dummy Interface Configuration Endpoints

All dummy (virtual) interface endpoints for VyOS configuration.
Dummy interfaces do not support physical properties like speed/duplex.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

from vyos_service import VyOSDeviceRegistry

# Router for dummy interface endpoints
router = APIRouter(prefix="/vyos/dummy", tags=["dummy-interface"])

# Shared device registry (will be set from app.py)
device_registry: VyOSDeviceRegistry = None

# Configured device name (will be imported from app.py)
CONFIGURED_DEVICE_NAME: Optional[str] = None


def set_device_registry(registry: VyOSDeviceRegistry):
    """Set the device registry for this router."""
    global device_registry
    device_registry = registry


def set_configured_device_name(name: str):
    """Set the configured device name for this router."""
    global CONFIGURED_DEVICE_NAME
    CONFIGURED_DEVICE_NAME = name


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class InterfaceDescription(BaseModel):
    """Model for setting interface description."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")
    description: str = Field(..., description="Interface description")


class InterfaceDelete(BaseModel):
    """Model for deleting an interface."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")


class InterfaceAddress(BaseModel):
    """Model for interface address operations."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")
    address: str = Field(..., description="IP address in CIDR notation (e.g., 10.0.0.1/32)")


class InterfaceMTU(BaseModel):
    """Model for setting interface MTU."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")
    mtu: str = Field(..., description="MTU value (e.g., 1500)")


class InterfaceVRF(BaseModel):
    """Model for VRF assignment."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")
    vrf: str = Field(..., description="VRF name")


class InterfaceDisable(BaseModel):
    """Model for disabling an interface."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")


class InterfaceBatchRequest(BaseModel):
    """Model for batch interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., dum0)")
    operations: List[Dict[str, str]] = Field(
        ...,
        description="List of interface operations",
        example=[
            {"op": "set_description", "value": "Loopback Interface"},
            {"op": "set_address", "value": "10.0.0.1/32"},
            {"op": "set_mtu", "value": "1500"}
        ]
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models (for READ operations)
# ============================================================================


class DummyInterfaceConfigResponse(BaseModel):
    """Dummy interface configuration from VyOS (read operation)"""

    name: str = Field(..., description="Interface name (e.g., dum0)")
    type: str = Field(..., description="Interface type (dummy)")
    addresses: List[str] = Field(default_factory=list, description="IP addresses with CIDR notation")
    description: Optional[str] = Field(None, description="Interface description")
    vrf: Optional[str] = Field(None, description="VRF assignment")
    mtu: Optional[str] = Field(None, description="MTU value")

    # Administrative state
    disable: Optional[bool] = Field(None, description="Whether interface is administratively disabled")

    class Config:
        populate_by_name = True


class DummyInterfacesConfigResponse(BaseModel):
    """Response containing all dummy interface configurations"""

    interfaces: List[DummyInterfaceConfigResponse] = Field(
        default_factory=list,
        description="List of all dummy interfaces"
    )
    total: int = Field(0, description="Total number of dummy interfaces")

    # Statistics
    by_type: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of interfaces by type (should be 'dummy': N)"
    )
    by_vrf: Dict[str, int] = Field(
        default_factory=dict,
        description="Count of interfaces by VRF"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "interfaces": [
                    {
                        "name": "dum0",
                        "type": "dummy",
                        "addresses": ["10.0.0.1/32"],
                        "description": "Loopback Interface"
                    }
                ],
                "total": 1,
                "by_type": {"dummy": 1},
                "by_vrf": {}
            }
        }


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=DummyInterfacesConfigResponse)
async def get_dummy_config() -> DummyInterfacesConfigResponse:
    """
    Get all dummy interface configurations from VyOS.

    Returns configuration details including addresses, description, VRF, MTU, etc.
    Note: Dummy interfaces do not have physical properties like speed/duplex/hw-id.
    """
    from vyos_mappers.interfaces import DummyInterfaceMapper

    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        # Get service and retrieve raw config from cache
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        full_config = service.get_full_config()
        raw_config = full_config.get("interfaces", {}).get("dummy", {})

        # Use mapper to parse config
        mapper = DummyInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        # Return as Pydantic model
        return DummyInterfacesConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Dummy Interface Batch Endpoint
# ============================================================================


@router.post("/batch")
async def configure_interface_batch(request: InterfaceBatchRequest) -> VyOSResponse:
    """
    Configure dummy interface using batch operations.

    This is the main endpoint for configuring dummy (virtual) interfaces. All operations
    are version-aware and sent to VyOS in a single batch for efficiency.

    **Note:** Dummy interfaces do NOT support physical properties like speed/duplex.

    **Supported Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_description` | Yes | Set interface description |
    | `delete_description` | No | Remove interface description |
    | `set_address` | Yes | Add IP address (CIDR notation) |
    | `delete_address` | Yes | Remove IP address |
    | `set_mtu` | Yes | Set MTU value |
    | `delete_mtu` | No | Remove MTU (reset to default) |
    | `set_vrf` | Yes | Assign interface to VRF |
    | `delete_vrf` | Yes | Remove interface from VRF |
    | `disable` | No | Administratively disable interface |
    | `enable` | No | Enable interface (remove disable flag) |
    | `delete_interface` | No | Delete entire interface configuration |

    **Example Request:**
    ```json
    {
        "interface": "dum0",
        "operations": [
            {"op": "set_description", "value": "Loopback Interface"},
            {"op": "set_address", "value": "10.0.0.1/32"},
            {"op": "set_address", "value": "2001:db8::1/128"},
            {"op": "delete_address", "value": "192.168.1.1/32"},
            {"op": "set_mtu", "value": "1500"},
            {"op": "set_vrf", "value": "MGMT"},
            {"op": "enable"}
        ]
    }
    ```

    **Example with Delete Operations:**
    ```json
    {
        "interface": "dum1",
        "operations": [
            {"op": "delete_description"},
            {"op": "delete_mtu"}
        ]
    }
    ```
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        batch = service.create_dummy_batch()

        # Process each operation
        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Map operation to batch method
            if op_type == "set_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_description(request.interface, value)
            elif op_type == "delete_description":
                # Delete description - no value needed
                batch.delete_interface_description(request.interface)
            elif op_type == "set_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_address(request.interface, value)
            elif op_type == "delete_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_address(request.interface, value)
            elif op_type == "set_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_mtu(request.interface, value)
            elif op_type == "delete_mtu":
                # Delete MTU - no value needed
                batch.delete_interface_mtu(request.interface)
            elif op_type == "set_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_vrf(request.interface, value)
            elif op_type == "delete_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_vrf(request.interface, value)
            elif op_type == "disable":
                # Disable interface - no value needed
                batch.set_interface_disable(request.interface)
            elif op_type == "enable":
                # Enable interface - no value needed
                batch.delete_interface_disable(request.interface)
            elif op_type == "delete_interface":
                # Delete entire interface - no value needed
                batch.delete_interface(request.interface)
            elif op_type in ["set_duplex", "set_speed", "delete_duplex", "delete_speed"]:
                # Reject ethernet-only operations
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op_type}' is not supported on dummy interfaces"
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

        # Execute the batch
        response = service.execute_batch(batch)

        return VyOSResponse(
            success=response.status == 200,
            data=response.result,
            error=response.error if response.error else None
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
