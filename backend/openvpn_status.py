"""OpenVPN live status for the dashboard stream.

Parses the structured ``ShowOpenvpn`` GraphQL op (one per mode: server / client /
site_to_site) into per-tunnel status with connected clients, and builds the
GraphQL alias fields the dashboard broadcaster folds into its shared query.

Note: the op-mode reports ``rx_bytes`` / ``tx_bytes`` as human-formatted strings
(e.g. "2.8 MB"), not raw integers — so this is connection/status data, not a live
bandwidth source.
"""

from typing import List, Optional

from pydantic import BaseModel

# GraphQL alias -> ShowOpenvpn mode (the mode is an enum, so it's unquoted).
_OPENVPN_MODES = [
    ("OpenvpnServer", "server"),
    ("OpenvpnClient", "client"),
    ("OpenvpnS2S", "site_to_site"),
]


class OpenVpnClient(BaseModel):
    name: Optional[str] = None
    remote_host: Optional[str] = None
    remote_port: Optional[str] = None
    tunnel: Optional[str] = None       # VPN-assigned IP
    rx_bytes: Optional[str] = None     # human-formatted, e.g. "2.8 MB"
    tx_bytes: Optional[str] = None
    online_since: Optional[str] = None


class OpenVpnTunnel(BaseModel):
    mode: str                          # server / client / site_to_site
    interface: str
    local_host: Optional[str] = None
    local_port: Optional[str] = None
    state: Optional[str] = None        # UP / DOWN
    description: Optional[str] = None
    date: Optional[str] = None         # status-file timestamp
    configured_clients: List[str] = []
    clients: List[OpenVpnClient] = []


def openvpn_configured(full_config) -> bool:
    """True when any OpenVPN interface is configured (gates the dashboard fetch)."""
    ifaces = (full_config or {}).get("interfaces", {}) or {}
    return bool(ifaces.get("openvpn"))


def openvpn_gql_fields(key_literal: str) -> List[str]:
    """GraphQL alias fields fetching OpenVPN status for all three modes.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``).
    """
    return [
        f"{alias}: ShowOpenvpn(data: {{key: {key_literal}, mode: {mode}}}) {{ success data {{ result }} }}"
        for alias, mode in _OPENVPN_MODES
    ]


def _op_result(data: dict, alias: str) -> list:
    """Extract a ShowOpenvpn op's list result, or [] (no tunnels of that mode)."""
    node = (data or {}).get(alias)
    if not isinstance(node, dict) or not node.get("success"):
        return []
    inner = node.get("data")
    if isinstance(inner, dict) and isinstance(inner.get("result"), list):
        return inner["result"]
    return []


def _parse_tunnels(result: list, mode_label: str) -> List[OpenVpnTunnel]:
    tunnels: List[OpenVpnTunnel] = []
    if not isinstance(result, list):
        return tunnels
    for t in result:
        if not isinstance(t, dict):
            continue
        clients = [
            OpenVpnClient(
                name=c.get("name"),
                remote_host=c.get("remote_host"),
                remote_port=c.get("remote_port"),
                tunnel=c.get("tunnel"),
                rx_bytes=c.get("rx_bytes"),
                tx_bytes=c.get("tx_bytes"),
                online_since=c.get("online_since"),
            )
            for c in (t.get("clients") or [])
            if isinstance(c, dict)
        ]
        tunnels.append(OpenVpnTunnel(
            mode=t.get("mode") or mode_label,
            interface=t.get("intf") or "",
            local_host=t.get("local_host") or None,
            local_port=t.get("local_port") or None,
            state=t.get("state") or None,
            description=t.get("description") or None,
            date=t.get("date") or None,
            configured_clients=t.get("configured_clients") or [],
            clients=clients,
        ))
    return tunnels


def build_openvpn_status(gql: dict) -> dict:
    """Build the ``openvpn-status`` SSE payload from the shared GraphQL result."""
    servers = _parse_tunnels(_op_result(gql, "OpenvpnServer"), "server")
    clients = _parse_tunnels(_op_result(gql, "OpenvpnClient"), "client")
    site_to_site = _parse_tunnels(_op_result(gql, "OpenvpnS2S"), "site_to_site")
    return {
        "servers": [t.dict() for t in servers],
        "clients": [t.dict() for t in clients],
        "site_to_site": [t.dict() for t in site_to_site],
    }
