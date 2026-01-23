"""
QoS (Quality of Service) / Traffic Policy Configuration Endpoints

Supports all VyOS QoS policy types: Shaper, Rate-Control, Limiter,
FQ-CoDel, CAKE, Priority-Queue, Round-Robin, Network-Emulator, etc.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for QoS endpoints
router = APIRouter(prefix="/vyos/qos", tags=["qos"])


# ============================================================================
# Request Models
# ============================================================================


class QoSBatchRequest(BaseModel):
    """Model for batch QoS configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of QoS operations",
        json_schema_extra={
            "example": [
                {"op": "create_shaper", "name": "WAN-SHAPER", "bandwidth": "100mbit"},
                {"op": "add_shaper_class", "name": "WAN-SHAPER", "class_id": "10", "bandwidth": "50mbit"},
            ]
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models
# ============================================================================


class MatchRule(BaseModel):
    """Traffic match rule."""
    name: str
    description: Optional[str] = None
    interface: Optional[str] = None
    mark: Optional[str] = None
    vif: Optional[str] = None
    ip: Optional[Dict[str, Any]] = None
    ipv6: Optional[Dict[str, Any]] = None
    ether: Optional[Dict[str, Any]] = None


class ShaperClass(BaseModel):
    """Shaper policy class."""
    id: str
    bandwidth: Optional[str] = None
    ceiling: Optional[str] = None
    priority: Optional[str] = None
    burst: Optional[str] = None
    queue_type: Optional[str] = None
    set_dscp: Optional[str] = None
    matches: List[MatchRule] = Field(default_factory=list)


class LimiterClass(BaseModel):
    """Limiter policy class."""
    id: str
    bandwidth: Optional[str] = None
    burst: Optional[str] = None
    priority: Optional[str] = None
    matches: List[MatchRule] = Field(default_factory=list)


class PriorityQueueClass(BaseModel):
    """Priority-queue policy class."""
    id: str
    queue_type: Optional[str] = None
    queue_limit: Optional[str] = None
    matches: List[MatchRule] = Field(default_factory=list)


class RoundRobinClass(BaseModel):
    """Round-robin policy class."""
    id: str
    quantum: Optional[str] = None
    queue_limit: Optional[str] = None
    queue_type: Optional[str] = None
    matches: List[MatchRule] = Field(default_factory=list)


class RandomDetectPrecedence(BaseModel):
    """Random-detect precedence configuration."""
    id: str
    average_packet: Optional[str] = None
    mark_probability: Optional[str] = None
    minimum_threshold: Optional[str] = None
    maximum_threshold: Optional[str] = None
    queue_limit: Optional[str] = None


class QoSPolicy(BaseModel):
    """QoS policy."""
    name: str
    type: str
    description: Optional[str] = None
    bandwidth: Optional[str] = None
    classes: List[Dict[str, Any]] = Field(default_factory=list)
    default: Dict[str, Any] = Field(default_factory=dict)
    # Type-specific fields
    burst: Optional[str] = None
    latency: Optional[str] = None
    codel_quantum: Optional[str] = None
    flows: Optional[str] = None
    interval: Optional[str] = None
    queue_limit: Optional[str] = None
    target: Optional[str] = None
    flow_isolation: Optional[str] = None
    rtt: Optional[str] = None
    delay: Optional[str] = None
    loss: Optional[str] = None
    corruption: Optional[str] = None
    reordering: Optional[str] = None
    hash_interval: Optional[str] = None
    precedences: List[RandomDetectPrecedence] = Field(default_factory=list)


class InterfaceBinding(BaseModel):
    """Interface to policy binding."""
    interface: str
    egress: Optional[str] = None
    ingress: Optional[str] = None


class QoSConfigResponse(BaseModel):
    """Full QoS configuration response."""
    configured: bool
    policies: List[QoSPolicy] = Field(default_factory=list)
    interface_bindings: List[InterfaceBinding] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations
# ============================================================================


@router.get("/config", response_model=QoSConfigResponse)
async def get_qos_config(http_request: Request) -> QoSConfigResponse:
    """
    Get full QoS configuration from VyOS.

    Returns all QoS policies and interface bindings.
    """
    await require_read_permission(http_request, FeatureGroup.QOS)

    from vyos_mappers.qos import QoSMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = QoSMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return QoSConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_qos_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get QoS capabilities for the connected VyOS version.
    """
    await require_read_permission(http_request, FeatureGroup.QOS)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "policy_types": [
                {"value": "shaper", "label": "Shaper (HTB)", "description": "Hierarchical Token Bucket for egress traffic shaping"},
                {"value": "rate-control", "label": "Rate Control (TBF)", "description": "Token Bucket Filter for simple rate limiting"},
                {"value": "limiter", "label": "Limiter", "description": "Ingress traffic policing"},
                {"value": "fq-codel", "label": "FQ-CoDel", "description": "Fair Queue Controlled Delay"},
                {"value": "cake", "label": "CAKE", "description": "Common Applications Kept Enhanced"},
                {"value": "priority-queue", "label": "Priority Queue", "description": "Strict priority queueing"},
                {"value": "round-robin", "label": "Round Robin (DRR)", "description": "Deficit Round Robin scheduler"},
                {"value": "network-emulator", "label": "Network Emulator", "description": "Simulate network conditions"},
                {"value": "drop-tail", "label": "Drop Tail (FIFO)", "description": "Simple FIFO queue"},
                {"value": "fair-queue", "label": "Fair Queue (SFQ)", "description": "Stochastic Fair Queueing"},
                {"value": "random-detect", "label": "Random Detect (GRED)", "description": "Generic Random Early Detection"},
            ],
            "queue_types": [
                {"value": "fq-codel", "label": "FQ-CoDel"},
                {"value": "fair-queue", "label": "Fair Queue (SFQ)"},
                {"value": "drop-tail", "label": "Drop Tail (FIFO)"},
                {"value": "priority", "label": "Priority"},
                {"value": "random-detect", "label": "Random Detect"},
            ],
            "dscp_values": [
                {"value": "default", "label": "Default (BE)"},
                {"value": "CS0", "label": "CS0"},
                {"value": "CS1", "label": "CS1"},
                {"value": "CS2", "label": "CS2"},
                {"value": "CS3", "label": "CS3"},
                {"value": "CS4", "label": "CS4"},
                {"value": "CS5", "label": "CS5"},
                {"value": "CS6", "label": "CS6"},
                {"value": "CS7", "label": "CS7"},
                {"value": "AF11", "label": "AF11"},
                {"value": "AF12", "label": "AF12"},
                {"value": "AF13", "label": "AF13"},
                {"value": "AF21", "label": "AF21"},
                {"value": "AF22", "label": "AF22"},
                {"value": "AF23", "label": "AF23"},
                {"value": "AF31", "label": "AF31"},
                {"value": "AF32", "label": "AF32"},
                {"value": "AF33", "label": "AF33"},
                {"value": "AF41", "label": "AF41"},
                {"value": "AF42", "label": "AF42"},
                {"value": "AF43", "label": "AF43"},
                {"value": "EF", "label": "EF (Expedited Forwarding)"},
            ],
            "flow_isolation_modes": [
                {"value": "blind", "label": "Blind"},
                {"value": "src-host", "label": "Source Host"},
                {"value": "dst-host", "label": "Destination Host"},
                {"value": "dual-src-host", "label": "Dual Source Host"},
                {"value": "dual-dst-host", "label": "Dual Destination Host"},
                {"value": "flow", "label": "Flow"},
                {"value": "triple-isolate", "label": "Triple Isolate"},
            ],
            "protocols": [
                {"value": "tcp", "label": "TCP"},
                {"value": "udp", "label": "UDP"},
                {"value": "icmp", "label": "ICMP"},
                {"value": "gre", "label": "GRE"},
                {"value": "esp", "label": "ESP"},
                {"value": "ah", "label": "AH"},
            ],
            "bandwidth_units": ["bit", "kbit", "mbit", "gbit", "bps", "kbps", "mbps", "gbps"],
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def configure_qos_batch(
    request: QoSBatchRequest,
    http_request: Request,
) -> VyOSResponse:
    """
    Configure QoS using batch operations.

    **Policy Operations:**
    - create_shaper, delete_shaper
    - add_shaper_class, delete_shaper_class
    - set_shaper_default
    - create_rate_control, delete_rate_control
    - create_limiter, delete_limiter
    - add_limiter_class, delete_limiter_class
    - create_fq_codel, delete_fq_codel
    - create_cake, delete_cake
    - create_priority_queue, delete_priority_queue
    - create_round_robin, delete_round_robin
    - create_network_emulator, delete_network_emulator
    - create_drop_tail, delete_drop_tail
    - create_fair_queue, delete_fair_queue
    - create_random_detect, delete_random_detect

    **Class Match Operations:**
    - add_class_match_ip, delete_class_match

    **Interface Binding Operations:**
    - bind_interface_egress, unbind_interface_egress
    - bind_interface_ingress, unbind_interface_ingress
    """
    await require_write_permission(http_request, FeatureGroup.QOS)

    from vyos_mappers.qos import QoSMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = QoSMapper(service.get_version())

        set_commands = []
        delete_commands = []

        for operation in request.operations:
            op_type = operation.get("op")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Extract common parameters
            name = operation.get("name")
            bandwidth = operation.get("bandwidth")
            class_id = operation.get("class_id")
            interface = operation.get("interface")
            policy = operation.get("policy")

            # ================================================================
            # Shaper Operations
            # ================================================================

            if op_type == "create_shaper":
                if not name or not bandwidth:
                    raise HTTPException(status_code=400, detail="create_shaper requires 'name' and 'bandwidth'")
                set_commands.append(mapper.get_shaper_bandwidth(name, bandwidth))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("shaper", name, operation["description"]))

            elif op_type == "delete_shaper":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_shaper requires 'name'")
                delete_commands.append(mapper.get_policy_base("shaper", name))

            elif op_type == "add_shaper_class":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="add_shaper_class requires 'name' and 'class_id'")
                if bandwidth:
                    set_commands.append(mapper.get_shaper_class_bandwidth(name, class_id, bandwidth))
                if operation.get("ceiling"):
                    set_commands.append(mapper.get_shaper_class_ceiling(name, class_id, operation["ceiling"]))
                if operation.get("priority"):
                    set_commands.append(mapper.get_shaper_class_priority(name, class_id, str(operation["priority"])))
                if operation.get("burst"):
                    set_commands.append(mapper.get_shaper_class_burst(name, class_id, operation["burst"]))
                if operation.get("queue_type"):
                    set_commands.append(mapper.get_shaper_class_queue_type(name, class_id, operation["queue_type"]))
                if operation.get("set_dscp"):
                    set_commands.append(mapper.get_shaper_class_set_dscp(name, class_id, operation["set_dscp"]))

            elif op_type == "delete_shaper_class":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="delete_shaper_class requires 'name' and 'class_id'")
                delete_commands.append(mapper.get_shaper_class(name, class_id))

            elif op_type == "set_shaper_default":
                if not name:
                    raise HTTPException(status_code=400, detail="set_shaper_default requires 'name'")
                if bandwidth:
                    set_commands.append(mapper.get_shaper_default_bandwidth(name, bandwidth))
                if operation.get("ceiling"):
                    set_commands.append(mapper.get_shaper_default_ceiling(name, operation["ceiling"]))
                if operation.get("queue_type"):
                    set_commands.append(mapper.get_shaper_default_queue_type(name, operation["queue_type"]))

            elif op_type == "add_shaper_class_match":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="add_shaper_class_match requires 'name' and 'class_id'")
                match_name = operation.get("match_name")
                if not match_name:
                    raise HTTPException(status_code=400, detail="add_shaper_class_match requires 'match_name'")
                # IP matches
                if operation.get("ip_source"):
                    set_commands.append(mapper.get_shaper_class_match_ip_source(name, class_id, match_name, operation["ip_source"]))
                if operation.get("ip_destination"):
                    set_commands.append(mapper.get_shaper_class_match_ip_dest(name, class_id, match_name, operation["ip_destination"]))
                if operation.get("ip_dscp"):
                    set_commands.append(mapper.get_shaper_class_match_ip_dscp(name, class_id, match_name, operation["ip_dscp"]))
                if operation.get("ip_protocol"):
                    set_commands.append(mapper.get_shaper_class_match_ip_protocol(name, class_id, match_name, operation["ip_protocol"]))
                if operation.get("ip_source_port"):
                    set_commands.append(mapper.get_shaper_class_match_ip_source_port(name, class_id, match_name, operation["ip_source_port"]))
                if operation.get("ip_destination_port"):
                    set_commands.append(mapper.get_shaper_class_match_ip_dest_port(name, class_id, match_name, operation["ip_destination_port"]))

            elif op_type == "delete_shaper_class_match":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="delete_shaper_class_match requires 'name' and 'class_id'")
                match_name = operation.get("match_name")
                if not match_name:
                    raise HTTPException(status_code=400, detail="delete_shaper_class_match requires 'match_name'")
                delete_commands.append(mapper.get_shaper_class_match(name, class_id, match_name))

            # ================================================================
            # Rate-Control Operations
            # ================================================================

            elif op_type == "create_rate_control":
                if not name or not bandwidth:
                    raise HTTPException(status_code=400, detail="create_rate_control requires 'name' and 'bandwidth'")
                set_commands.append(mapper.get_rate_control_bandwidth(name, bandwidth))
                if operation.get("burst"):
                    set_commands.append(mapper.get_rate_control_burst(name, operation["burst"]))
                if operation.get("latency"):
                    set_commands.append(mapper.get_rate_control_latency(name, operation["latency"]))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("rate-control", name, operation["description"]))

            elif op_type == "delete_rate_control":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_rate_control requires 'name'")
                delete_commands.append(mapper.get_policy_base("rate-control", name))

            # ================================================================
            # Limiter Operations
            # ================================================================

            elif op_type == "create_limiter":
                if not name:
                    raise HTTPException(status_code=400, detail="create_limiter requires 'name'")
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("limiter", name, operation["description"]))
                if operation.get("default_bandwidth"):
                    set_commands.append(mapper.get_limiter_default_bandwidth(name, operation["default_bandwidth"]))
                if operation.get("default_burst"):
                    set_commands.append(mapper.get_limiter_default_burst(name, operation["default_burst"]))

            elif op_type == "delete_limiter":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_limiter requires 'name'")
                delete_commands.append(mapper.get_policy_base("limiter", name))

            elif op_type == "add_limiter_class":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="add_limiter_class requires 'name' and 'class_id'")
                if bandwidth:
                    set_commands.append(mapper.get_limiter_class_bandwidth(name, class_id, bandwidth))
                if operation.get("burst"):
                    set_commands.append(mapper.get_limiter_class_burst(name, class_id, operation["burst"]))
                if operation.get("priority"):
                    set_commands.append(mapper.get_limiter_class_priority(name, class_id, str(operation["priority"])))

            elif op_type == "delete_limiter_class":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="delete_limiter_class requires 'name' and 'class_id'")
                delete_commands.append(mapper.get_limiter_class(name, class_id))

            # ================================================================
            # FQ-CoDel Operations
            # ================================================================

            elif op_type == "create_fq_codel":
                if not name:
                    raise HTTPException(status_code=400, detail="create_fq_codel requires 'name'")
                # Need at least one setting to create the policy
                if operation.get("quantum"):
                    set_commands.append(mapper.get_fq_codel_quantum(name, operation["quantum"]))
                if operation.get("flows"):
                    set_commands.append(mapper.get_fq_codel_flows(name, operation["flows"]))
                if operation.get("interval"):
                    set_commands.append(mapper.get_fq_codel_interval(name, operation["interval"]))
                if operation.get("queue_limit"):
                    set_commands.append(mapper.get_fq_codel_queue_limit(name, operation["queue_limit"]))
                if operation.get("target"):
                    set_commands.append(mapper.get_fq_codel_target(name, operation["target"]))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("fq-codel", name, operation["description"]))

            elif op_type == "delete_fq_codel":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_fq_codel requires 'name'")
                delete_commands.append(mapper.get_policy_base("fq-codel", name))

            # ================================================================
            # CAKE Operations
            # ================================================================

            elif op_type == "create_cake":
                if not name or not bandwidth:
                    raise HTTPException(status_code=400, detail="create_cake requires 'name' and 'bandwidth'")
                set_commands.append(mapper.get_cake_bandwidth(name, bandwidth))
                if operation.get("flow_isolation"):
                    set_commands.append(mapper.get_cake_flow_isolation(name, operation["flow_isolation"]))
                if operation.get("rtt"):
                    set_commands.append(mapper.get_cake_rtt(name, operation["rtt"]))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("cake", name, operation["description"]))

            elif op_type == "delete_cake":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_cake requires 'name'")
                delete_commands.append(mapper.get_policy_base("cake", name))

            # ================================================================
            # Priority Queue Operations
            # ================================================================

            elif op_type == "create_priority_queue":
                if not name:
                    raise HTTPException(status_code=400, detail="create_priority_queue requires 'name'")
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("priority-queue", name, operation["description"]))

            elif op_type == "delete_priority_queue":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_priority_queue requires 'name'")
                delete_commands.append(mapper.get_policy_base("priority-queue", name))

            elif op_type == "add_priority_queue_class":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="add_priority_queue_class requires 'name' and 'class_id'")
                if operation.get("queue_type"):
                    set_commands.append(mapper.get_priority_queue_class_queue_type(name, class_id, operation["queue_type"]))
                if operation.get("queue_limit"):
                    set_commands.append(mapper.get_priority_queue_class_queue_limit(name, class_id, operation["queue_limit"]))

            # ================================================================
            # Network Emulator Operations
            # ================================================================

            elif op_type == "create_network_emulator":
                if not name or not bandwidth:
                    raise HTTPException(status_code=400, detail="create_network_emulator requires 'name' and 'bandwidth'")
                set_commands.append(mapper.get_network_emulator_bandwidth(name, bandwidth))
                if operation.get("delay"):
                    set_commands.append(mapper.get_network_emulator_delay(name, operation["delay"]))
                if operation.get("loss"):
                    set_commands.append(mapper.get_network_emulator_loss(name, operation["loss"]))
                if operation.get("corruption"):
                    set_commands.append(mapper.get_network_emulator_corruption(name, operation["corruption"]))
                if operation.get("reordering"):
                    set_commands.append(mapper.get_network_emulator_reordering(name, operation["reordering"]))
                if operation.get("queue_limit"):
                    set_commands.append(mapper.get_network_emulator_queue_limit(name, operation["queue_limit"]))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("network-emulator", name, operation["description"]))

            elif op_type == "delete_network_emulator":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_network_emulator requires 'name'")
                delete_commands.append(mapper.get_policy_base("network-emulator", name))

            # ================================================================
            # Drop-Tail Operations
            # ================================================================

            elif op_type == "create_drop_tail":
                if not name:
                    raise HTTPException(status_code=400, detail="create_drop_tail requires 'name'")
                if operation.get("queue_limit"):
                    set_commands.append(mapper.get_drop_tail_queue_limit(name, operation["queue_limit"]))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("drop-tail", name, operation["description"]))

            elif op_type == "delete_drop_tail":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_drop_tail requires 'name'")
                delete_commands.append(mapper.get_policy_base("drop-tail", name))

            # ================================================================
            # Fair-Queue Operations
            # ================================================================

            elif op_type == "create_fair_queue":
                if not name:
                    raise HTTPException(status_code=400, detail="create_fair_queue requires 'name'")
                if operation.get("hash_interval"):
                    set_commands.append(mapper.get_fair_queue_hash_interval(name, operation["hash_interval"]))
                if operation.get("queue_limit"):
                    set_commands.append(mapper.get_fair_queue_queue_limit(name, operation["queue_limit"]))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("fair-queue", name, operation["description"]))

            elif op_type == "delete_fair_queue":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_fair_queue requires 'name'")
                delete_commands.append(mapper.get_policy_base("fair-queue", name))

            # ================================================================
            # Round-Robin Operations
            # ================================================================

            elif op_type == "create_round_robin":
                if not name:
                    raise HTTPException(status_code=400, detail="create_round_robin requires 'name'")
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("round-robin", name, operation["description"]))

            elif op_type == "delete_round_robin":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_round_robin requires 'name'")
                delete_commands.append(mapper.get_policy_base("round-robin", name))

            elif op_type == "add_round_robin_class":
                if not name or not class_id:
                    raise HTTPException(status_code=400, detail="add_round_robin_class requires 'name' and 'class_id'")
                if operation.get("quantum"):
                    set_commands.append(mapper.get_round_robin_class_quantum(name, class_id, operation["quantum"]))
                if operation.get("queue_limit"):
                    set_commands.append(mapper.get_round_robin_class_queue_limit(name, class_id, operation["queue_limit"]))
                if operation.get("queue_type"):
                    set_commands.append(mapper.get_round_robin_class_queue_type(name, class_id, operation["queue_type"]))

            # ================================================================
            # Random-Detect Operations
            # ================================================================

            elif op_type == "create_random_detect":
                if not name or not bandwidth:
                    raise HTTPException(status_code=400, detail="create_random_detect requires 'name' and 'bandwidth'")
                set_commands.append(mapper.get_random_detect_bandwidth(name, bandwidth))
                if operation.get("description"):
                    set_commands.append(mapper.get_policy_description("random-detect", name, operation["description"]))

            elif op_type == "delete_random_detect":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_random_detect requires 'name'")
                delete_commands.append(mapper.get_policy_base("random-detect", name))

            elif op_type == "add_random_detect_precedence":
                if not name:
                    raise HTTPException(status_code=400, detail="add_random_detect_precedence requires 'name'")
                precedence = operation.get("precedence")
                if not precedence:
                    raise HTTPException(status_code=400, detail="add_random_detect_precedence requires 'precedence'")
                if operation.get("average_packet"):
                    set_commands.append(mapper.get_random_detect_precedence_avg_packet(name, str(precedence), operation["average_packet"]))
                if operation.get("min_threshold"):
                    set_commands.append(mapper.get_random_detect_precedence_min_threshold(name, str(precedence), operation["min_threshold"]))
                if operation.get("max_threshold"):
                    set_commands.append(mapper.get_random_detect_precedence_max_threshold(name, str(precedence), operation["max_threshold"]))
                if operation.get("mark_probability"):
                    set_commands.append(mapper.get_random_detect_precedence_mark_probability(name, str(precedence), operation["mark_probability"]))

            # ================================================================
            # Interface Binding Operations
            # ================================================================

            elif op_type == "bind_interface_egress":
                if not interface or not policy:
                    raise HTTPException(status_code=400, detail="bind_interface_egress requires 'interface' and 'policy'")
                set_commands.append(mapper.get_interface_egress(interface, policy))

            elif op_type == "unbind_interface_egress":
                if not interface:
                    raise HTTPException(status_code=400, detail="unbind_interface_egress requires 'interface'")
                delete_commands.append(mapper.get_interface_egress_path(interface))

            elif op_type == "bind_interface_ingress":
                if not interface or not policy:
                    raise HTTPException(status_code=400, detail="bind_interface_ingress requires 'interface' and 'policy'")
                set_commands.append(mapper.get_interface_ingress(interface, policy))

            elif op_type == "unbind_interface_ingress":
                if not interface:
                    raise HTTPException(status_code=400, detail="unbind_interface_ingress requires 'interface'")
                delete_commands.append(mapper.get_interface_ingress_path(interface))

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {op_type}"
                )

        # Execute delete commands first, then set commands
        result = await run_in_threadpool(
            service.batch_configure,
            set_paths=set_commands,
            delete_paths=delete_commands,
        )

        if not result.get("success", False):
            return VyOSResponse(
                success=False,
                error=result.get("error", "Unknown error during configuration")
            )

        return VyOSResponse(success=True, data=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
