"""WireGuard show-text parsers for the dashboard stream.

VyOS returns WireGuard config and ``show interfaces wireguard <name> summary``
as text. Typed GraphQL ops do not cover the peer table. The live broadcaster
folds the parsed peers into the SSE payload and does not own this syntax.
"""

import re
from typing import Any, Optional


def _wg_alias(iface_name: str) -> str:
    """Return a valid GraphQL alias for a WireGuard interface name, e.g. 'WGStatus_wg0'."""
    safe = re.sub(r"[^_a-zA-Z0-9]", "_", iface_name)
    return f"WGStatus_{safe}"


def _gql_result(gql: dict, key: str):
    """Safely extract ``data.result`` from a named GraphQL alias."""
    entry = gql.get(key) or {}
    data = entry.get("data") or {}
    return data.get("result")


def _parse_vyos_text_config(text: str) -> dict:
    """
    Parse VyOS ``show configuration`` text format into a nested dict.

    Handles the following line patterns:
      ``key value {``   → {key: {value: <nested block>}}  (named block)
      ``key {``         → {key: <nested block>}            (unnamed block)
      ``key value``     → {key: "value"}
      ``key``           → {key: True}   (boolean flag, e.g. ``disable``)

    Repeated simple keys become a list so multiple ``allowed-ips`` lines
    are collected as ``["10.0.0.0/8", "192.168.1.0/24"]``.
    Repeated named blocks (e.g. two ``wireguard wgN {`` entries) are merged
    into the same parent dict under key ``wireguard``.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith("#")]

    def _set(d: dict, key: str, value: Any) -> None:
        """Append value to list if key already exists, otherwise set it."""
        if key in d:
            existing = d[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                d[key] = [existing, value]
        else:
            d[key] = value

    def _parse_block(pos: int) -> tuple:
        block: dict = {}
        while pos < len(lines):
            line = lines[pos]
            if line == "}":
                return block, pos + 1
            if line.endswith("{"):
                header = line[:-1].strip()
                parts = header.split(None, 1)
                if len(parts) == 0:
                    pos += 1
                    continue
                if len(parts) == 1:
                    # ``key {``
                    key = parts[0]
                    nested, pos = _parse_block(pos + 1)
                    _set(block, key, nested)
                else:
                    # ``key value {``
                    key, subkey = parts[0], parts[1].strip("\"'")
                    nested, pos = _parse_block(pos + 1)
                    if key not in block or not isinstance(block[key], dict):
                        block[key] = {}
                    block[key][subkey] = nested
            else:
                parts = line.split(None, 1)
                if len(parts) == 1:
                    block[parts[0]] = True
                else:
                    _set(block, parts[0], parts[1].strip("\"'"))
                pos += 1
        return block, pos

    result, _ = _parse_block(0)
    return result


def _collect_wg_from_gql(gql: dict, parsed_config: Optional[dict] = None) -> dict:
    """
    Build the wireguard-peers SSE payload entirely from GraphQL data.

    Uses:
      * ``WireGuardConfig`` alias — static peer definitions (from ShowConfig)
      * ``WGStatus_<name>`` aliases — per-interface live handshake / transfer data
        (from ``Show(data: {path: ["interfaces","wireguard","<name>","summary"]})``)

    ``parsed_config`` may be supplied by the caller to avoid re-parsing the config
    text when it has already been parsed in the same cycle.

    No pyvyos ``show`` calls are made.
    """
    if parsed_config is None:
        config_text = _gql_result(gql, "WireGuardConfig") or ""
        parsed_config = _parse_vyos_text_config(config_text)

    wg_ifaces: dict = parsed_config.get("wireguard") or {}
    if not isinstance(wg_ifaces, dict):
        wg_ifaces = {}

    # Collect live peer status from per-interface aliases.
    # Each alias is keyed by public key; merging across all interfaces is safe
    # because WireGuard public keys are globally unique.
    all_peer_status: dict = {}
    for iface_name in wg_ifaces:
        status_text = _gql_result(gql, _wg_alias(iface_name)) or ""
        if status_text:
            all_peer_status.update(_parse_wg_summary(status_text))

    interfaces = []
    for iface_name, iface_cfg in wg_ifaces.items():
        if not isinstance(iface_cfg, dict):
            continue

        config_peers: dict = {}
        for peer_name, peer_cfg in (iface_cfg.get("peer") or {}).items():
            if not isinstance(peer_cfg, dict):
                continue
            pub_key = peer_cfg.get("public-key", "") or ""
            allowed = peer_cfg.get("allowed-ips", [])
            if isinstance(allowed, str):
                allowed = [allowed]
            elif not isinstance(allowed, list):
                allowed = []
            config_peers[pub_key] = {
                "name": peer_name,
                "public_key": pub_key or None,
                "allowed_ips": allowed,
                "endpoint": None,
                "latest_handshake": None,
                "latest_handshake_seconds": None,
                "transfer_rx": None,
                "transfer_tx": None,
                "status": "never",
            }

        # Overlay live handshake / transfer data from the GraphQL show result
        for pub_key, live in all_peer_status.items():
            if pub_key in config_peers:
                secs = live.get("latest_handshake_seconds")
                config_peers[pub_key].update({
                    "endpoint": live.get("endpoint"),
                    "latest_handshake": live.get("latest_handshake"),
                    "latest_handshake_seconds": secs,
                    "transfer_rx": live.get("transfer_rx"),
                    "transfer_tx": live.get("transfer_tx"),
                    "status": (
                        "connected" if secs is not None and secs <= 180
                        else "idle" if secs is not None
                        else "never"
                    ),
                })

        addresses = iface_cfg.get("address", [])
        if isinstance(addresses, str):
            addresses = [addresses]

        interfaces.append({
            "name": iface_name,
            "description": iface_cfg.get("description"),
            "addresses": addresses,
            "port": iface_cfg.get("port"),
            "disabled": iface_cfg.get("disable") is True,
            "peers": list(config_peers.values()),
        })

    return {"interfaces": interfaces, "total": len(interfaces)}


# ========================================================================
# Helper: Parse WireGuard Interface Summary
# ========================================================================


def _parse_wg_handshake(s: str) -> int | None:
    """Convert a WireGuard handshake time string to seconds.

    Handles two formats:
      Stream release:  "1 minute, 30 seconds ago"  → 90
      Rolling release: "0:01:30"                   → 90
      No handshake:    "(none)"                    → None
    """
    if not s or s.strip().lower() in ("(none)", "none", "-", ""):
        return None
    s = s.strip()

    # H:MM:SS or M:SS
    m = re.match(r"^(\d+):(\d{2}):(\d{2})$", s)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    m = re.match(r"^(\d+):(\d{2})$", s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))

    # "X minutes, Y seconds ago"
    total = 0
    text = s.lower().replace(" ago", "")
    for pattern, factor in [(r"(\d+)\s*hour", 3600), (r"(\d+)\s*minute", 60), (r"(\d+)\s*second", 1)]:
        hit = re.search(pattern, text)
        if hit:
            total += int(hit.group(1)) * factor
    return total if total > 0 else None


def _parse_wg_summary(output: str) -> dict:
    """Parse 'show interfaces wireguard <iface> summary' output.

    Returns a dict keyed by public key with handshake/transfer/endpoint data.
    """
    peers: dict = {}
    current: dict | None = None

    def _is_pubkey(v: str) -> bool:
        return bool(re.match(r"^[A-Za-z0-9+/=]{43,44}$", v))

    def _save() -> None:
        if current and current.get("public_key"):
            peers[current["public_key"]] = current

    for raw_line in (output or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("peer:"):
            _save()
            val = line.split(":", 1)[1].strip()
            current = {
                "public_key": val if _is_pubkey(val) else None,
                "latest_handshake": None,
                "latest_handshake_seconds": None,
                "transfer_rx": None,
                "transfer_tx": None,
                "endpoint": None,
            }
        elif current is not None:
            lower = line.lower()
            if lower.startswith("public key:"):
                current["public_key"] = line.split(":", 1)[1].strip()
            elif "latest handshake:" in lower:
                hs = line.split(":", 1)[1].strip()
                current["latest_handshake"] = hs
                current["latest_handshake_seconds"] = _parse_wg_handshake(hs)
            elif lower.startswith("transfer:"):
                parts = line.split(":", 1)[1].strip().split(" received, ")
                if len(parts) == 2:
                    current["transfer_rx"] = parts[0].strip()
                    current["transfer_tx"] = parts[1].replace(" sent", "").strip()
            elif lower.startswith("endpoint:"):
                current["endpoint"] = line.split(":", 1)[1].strip()

    _save()
    return peers
