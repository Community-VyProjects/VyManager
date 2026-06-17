"""BGP live session status for the dashboard stream.

Parses the structured ``ShowSummaryBgp`` GraphQL op (FRR ``show bgp summary json``)
into per-address-family session state, and builds the GraphQL alias field the
dashboard broadcaster folds into its shared query.

This surfaces the *running* BGP sessions — their live ``Established`` / ``Active``
/ ``Connect`` / ``Idle`` state, uptime and prefix counts — which never appear in
the configuration and so are invisible to the config-driven BGP page.

The op returns a JSON object keyed by address family, e.g.::

    {
      "ipv4_unicast": {
        "router_id": "10.0.0.1", "as": 65001, "vrf_name": "default",
        "peer_count": 1, "rib_count": 0,
        "peers": {
          "192_168_9_1": {
            "remote_as": 65002, "state": "Established", "peer_uptime": "01:23:45",
            "msg_rcvd": 10, "msg_sent": 12, "pfx_rcd": 3, "pfx_snt": 5,
            "id_type": "ipv4"
          }
        }
      }
    }

The VyOS GraphQL serializer replaces dots/colons in dict keys with underscores,
so the neighbor address only survives in the peer key (``192_168_9_1``); it is
reconstructed from that key using the peer's ``id_type``.
"""

from typing import List, Optional

from pydantic import BaseModel


class BgpPeerStatus(BaseModel):
    """A single live BGP neighbor as reported by ``show bgp summary``."""
    neighbor: str
    remote_as: Optional[int] = None
    state: Optional[str] = None            # "Established" / "Active" / "Connect" / "Idle" / ...
    established: bool = False
    uptime: Optional[str] = None           # e.g. "01:23:45" or "never"
    msg_rcvd: Optional[int] = None
    msg_sent: Optional[int] = None
    pfx_rcd: Optional[int] = None
    pfx_snt: Optional[int] = None


class BgpAddressFamilyStatus(BaseModel):
    """Live state for one BGP address family (one summary section)."""
    afi: str                               # raw key, e.g. "ipv4_unicast"
    label: str                             # display label, e.g. "IPv4 Unicast"
    router_id: Optional[str] = None
    local_as: Optional[int] = None
    vrf_name: Optional[str] = None
    rib_count: Optional[int] = None
    peers: List[BgpPeerStatus] = []


def bgp_configured(full_config) -> bool:
    """True when BGP is configured in the default VRF (gates the dashboard fetch)."""
    protocols = (full_config or {}).get("protocols", {}) or {}
    return bool(protocols.get("bgp"))


def bgp_gql_fields(key_literal: str) -> List[str]:
    """GraphQL alias field fetching ``show bgp summary`` via ``ShowSummaryBgp``.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``).
    """
    return [
        f"Bgp: ShowSummaryBgp(data: {{key: {key_literal}}}) {{ success data {{ result }} }}"
    ]


def _int(value) -> Optional[int]:
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _decode_peer_addr(key: str, id_type: Optional[str]) -> str:
    """Reconstruct a neighbor address from its underscore-encoded summary key.

    VyOS replaces ``.`` (IPv4) and ``:`` (IPv6) in JSON keys with ``_``; the
    peer's ``id_type`` tells us which separator to restore. Interface / hostname
    peers (no separators) round-trip unchanged.
    """
    if id_type == "ipv4":
        return key.replace("_", ".")
    if id_type == "ipv6":
        return key.replace("_", ":")
    return key


# Pretty labels for the address-family key fragments.
_AFI_WORDS = {
    "ipv4": "IPv4",
    "ipv6": "IPv6",
    "l2vpn": "L2VPN",
    "evpn": "EVPN",
    "vpn": "VPN",
    "unicast": "Unicast",
    "multicast": "Multicast",
    "labeled": "Labeled",
    "flowspec": "Flowspec",
}


def _afi_label(afi: str) -> str:
    return " ".join(_AFI_WORDS.get(part, part.title()) for part in afi.split("_"))


def _parse_address_family(afi: str, section: dict) -> BgpAddressFamilyStatus:
    peers: List[BgpPeerStatus] = []
    for key, peer in (section.get("peers") or {}).items():
        if not isinstance(peer, dict):
            continue
        state = peer.get("state")
        peers.append(BgpPeerStatus(
            neighbor=_decode_peer_addr(key, peer.get("id_type")),
            remote_as=_int(peer.get("remote_as")),
            state=state,
            established=(isinstance(state, str) and state.lower() == "established"),
            uptime=peer.get("peer_uptime"),
            msg_rcvd=_int(peer.get("msg_rcvd")),
            msg_sent=_int(peer.get("msg_sent")),
            pfx_rcd=_int(peer.get("pfx_rcd")),
            pfx_snt=_int(peer.get("pfx_snt")),
        ))
    # Stable ordering: established first, then by neighbor address.
    peers.sort(key=lambda p: (not p.established, p.neighbor))
    return BgpAddressFamilyStatus(
        afi=afi,
        label=_afi_label(afi),
        router_id=section.get("router_id"),
        local_as=_int(section.get("as")),
        vrf_name=section.get("vrf_name"),
        rib_count=_int(section.get("rib_count")),
        peers=peers,
    )


def build_bgp_status(gql: dict) -> dict:
    """Build the ``bgp-status`` SSE payload from the shared GraphQL result."""
    node = (gql or {}).get("Bgp") or {}
    result = (node.get("data") or {}).get("result") if node.get("success") else None

    families: List[BgpAddressFamilyStatus] = []
    if isinstance(result, dict):
        for afi, section in result.items():
            if isinstance(section, dict):
                families.append(_parse_address_family(afi, section))

    total_peers = sum(len(f.peers) for f in families)
    established_peers = sum(1 for f in families for p in f.peers if p.established)
    return {
        "address_families": [f.dict() for f in families],
        "total_peers": total_peers,
        "established_peers": established_peers,
    }
