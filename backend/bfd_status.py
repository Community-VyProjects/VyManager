"""BFD operational peer status.

Parses the text output of the op-mode ``show bfd peers`` command (fetched via the
GraphQL ``Show`` op, path ``["bfd", "peers"]``) into structured per-session data.

This surfaces *running* BFD sessions — including ``dynamic`` peers created by a
routing protocol (BGP/OSPF/IS-IS with ``bfd`` enabled), which never appear under
``protocols bfd peer`` in the configuration and so are invisible to the config-driven
Peers table.
"""

import json
import re
from typing import List, Optional

from pydantic import BaseModel


class BfdPeerStatus(BaseModel):
    """A single live BFD session as reported by ``show bfd peers``."""
    peer: str
    peer_type: Optional[str] = None        # "configured" or "dynamic"
    status: Optional[str] = None           # "up" or "down"
    multihop: bool = False
    passive: bool = False
    local_address: Optional[str] = None
    vrf: Optional[str] = None
    interface: Optional[str] = None
    uptime: Optional[str] = None           # set when status == "up"
    downtime: Optional[str] = None         # set when status == "down"
    diagnostic: Optional[str] = None
    remote_diagnostic: Optional[str] = None
    minimum_ttl: Optional[int] = None
    detect_multiplier: Optional[int] = None
    receive_interval: Optional[int] = None     # ms (local)
    transmit_interval: Optional[int] = None     # ms (local)
    echo_receive_interval: Optional[int] = None  # ms (local), None when disabled


def bfd_peers_gql_query(key_literal: str) -> dict:
    """GraphQL body fetching ``show bfd peers`` via the generic ``Show`` op.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``).
    """
    path = json.dumps(["bfd", "peers"])
    field = f"BfdPeers: Show(data: {{key: {key_literal}, path: {path}}}) {{ data {{ result }} }}"
    return {"query": "{ " + field + " }"}


def _ms(value: str) -> Optional[int]:
    """Parse an interval like ``300ms`` to ``300``; ``disabled`` -> None."""
    if not value:
        return None
    m = re.match(r"^\s*(\d+)\s*ms\s*$", value)
    return int(m.group(1)) if m else None


def _int(value: str) -> Optional[int]:
    try:
        return int(value.strip())
    except (ValueError, AttributeError):
        return None


def _parse_header(line: str) -> dict:
    """Parse a ``peer <addr> [multihop] [local-address X] [vrf Y] [interface Z]`` line."""
    tokens = line.split()
    data = {
        "peer": tokens[1] if len(tokens) > 1 else "",
        "multihop": False,
        "local_address": None,
        "vrf": None,
        "interface": None,
    }
    i = 2
    while i < len(tokens):
        tok = tokens[i]
        if tok == "multihop":
            data["multihop"] = True
            i += 1
        elif tok in ("local-address", "vrf", "interface") and i + 1 < len(tokens):
            key = "local_address" if tok == "local-address" else tok
            data[key] = tokens[i + 1]
            i += 2
        else:
            i += 1
    return data


def parse_bfd_peers(text: str) -> List[BfdPeerStatus]:
    """Parse ``show bfd peers`` text output into a list of BfdPeerStatus."""
    peers: List[BfdPeerStatus] = []
    current: Optional[dict] = None
    section = "info"  # "info" | "local" | "remote"

    def _flush() -> None:
        if current is not None:
            peers.append(BfdPeerStatus(**current))

    for raw in (text or "").splitlines():
        line = raw.strip()
        if not line or line == "BFD Peers:":
            continue

        if line.startswith("peer "):
            _flush()
            current = _parse_header(line)
            section = "info"
            continue

        if current is None:
            continue

        if line == "Local timers:":
            section = "local"
            continue
        if line == "Remote timers:":
            section = "remote"
            continue

        if line in ("Active mode", "Passive mode"):
            current["passive"] = line == "Passive mode"
            continue

        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()

        if section == "info":
            if key == "Status":
                current["status"] = value.lower()
            elif key == "Uptime":
                current["uptime"] = value
            elif key == "Downtime":
                current["downtime"] = value
            elif key == "Diagnostics":
                current["diagnostic"] = value
            elif key == "Remote diagnostics":
                current["remote_diagnostic"] = value
            elif key == "Peer Type":
                current["peer_type"] = value.lower()
            elif key == "Minimum TTL":
                current["minimum_ttl"] = _int(value)
        elif section == "local":
            if key == "Detect-multiplier":
                current["detect_multiplier"] = _int(value)
            elif key == "Receive interval":
                current["receive_interval"] = _ms(value)
            elif key == "Transmission interval":
                current["transmit_interval"] = _ms(value)
            elif key == "Echo receive interval":
                current["echo_receive_interval"] = _ms(value)

    _flush()
    return peers
