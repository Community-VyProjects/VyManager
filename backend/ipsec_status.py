"""IPSec live status for the dashboard stream.

Parses the structured ``ShowConnectionsSummaryIpsec`` GraphQL op into per-tunnel
up/down state (with byte/packet counters and the negotiated ESP proposal), and
builds the GraphQL alias field the dashboard broadcaster folds into its shared
query.

This is the site-to-site connection view: one entry per configured tunnel, each
reporting whether its child SA is currently installed. It is the same op the
IPSec page's on-demand status refresh uses, so the dashboard card and the page
agree on tunnel state.
"""

from typing import List, Optional

from pydantic import BaseModel


class IPSecProposal(BaseModel):
    cipher: Optional[str] = None       # e.g. "AES"
    mode: Optional[str] = None         # e.g. "CBC"
    key_size: Optional[str] = None     # e.g. "256"
    hash: Optional[str] = None         # e.g. "HMAC_SHA2_256_128"
    dh: Optional[str] = None           # e.g. "MODP_2048" (None for ESP w/o PFS)


class IPSecTunnel(BaseModel):
    name: Optional[str] = None         # e.g. "peer5-tunnel-0"
    state: Optional[str] = None        # "up" / "down"
    local_ts: List[str] = []           # local traffic selectors (subnets)
    remote_ts: List[str] = []          # remote traffic selectors (subnets)
    bytes_in: Optional[str] = None
    bytes_out: Optional[str] = None
    packets_in: Optional[str] = None
    packets_out: Optional[str] = None
    esp_proposal: Optional[IPSecProposal] = None


def ipsec_configured(full_config) -> bool:
    """True when IPSec has peers/connections to show (gates the dashboard fetch).

    The op-mode summary errors out when strongSwan isn't running, so we only
    fetch it when there is actual site-to-site or remote-access config.
    """
    ipsec = ((full_config or {}).get("vpn", {}) or {}).get("ipsec") or {}
    return bool(ipsec.get("site-to-site") or ipsec.get("remote-access"))


def ipsec_gql_fields(key_literal: str) -> List[str]:
    """GraphQL alias field fetching the site-to-site connection summary.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``).
    """
    return [
        f"IpsecSummary: ShowConnectionsSummaryIpsec(data: {{key: {key_literal}}}) "
        "{ success data { result } }"
    ]


def _summary_result(gql: dict) -> Optional[dict]:
    """Extract the ShowConnectionsSummaryIpsec result object, or None on failure."""
    node = (gql or {}).get("IpsecSummary")
    if not isinstance(node, dict) or not node.get("success"):
        return None
    inner = node.get("data")
    if isinstance(inner, dict) and isinstance(inner.get("result"), dict):
        return inner["result"]
    return None


def _parse_proposal(raw) -> Optional[IPSecProposal]:
    if not isinstance(raw, dict):
        return None
    return IPSecProposal(
        cipher=raw.get("cipher"),
        mode=raw.get("mode"),
        key_size=raw.get("key_size"),
        hash=raw.get("hash"),
        dh=raw.get("dh"),
    )


def _parse_tunnels(result: dict) -> List[IPSecTunnel]:
    tunnels: List[IPSecTunnel] = []
    for t in (result.get("tunnels") or []):
        if not isinstance(t, dict):
            continue
        sa = t.get("sa") if isinstance(t.get("sa"), dict) else {}
        tunnels.append(IPSecTunnel(
            name=t.get("name"),
            state=t.get("state"),
            local_ts=t.get("local_ts") or [],
            remote_ts=t.get("remote_ts") or [],
            bytes_in=sa.get("bytes_in"),
            bytes_out=sa.get("bytes_out"),
            packets_in=sa.get("packets_in"),
            packets_out=sa.get("packets_out"),
            esp_proposal=_parse_proposal(t.get("esp_proposal")),
        ))
    return tunnels


def build_ipsec_status(gql: dict) -> dict:
    """Build the ``ipsec-status`` SSE payload from the shared GraphQL result.

    Returns counts plus the per-tunnel list. When the op failed (strongSwan down
    or nothing established), tunnels is empty and counts are zero.
    """
    result = _summary_result(gql)
    if result is None:
        return {"tunnels": [], "total": 0, "up": 0, "down": 0}
    tunnels = _parse_tunnels(result)
    # Prefer strongSwan's own counts; fall back to deriving from the parsed list.
    up = result.get("up")
    down = result.get("down")
    total = result.get("total")
    if not isinstance(up, int):
        up = sum(1 for t in tunnels if (t.state or "").lower() == "up")
    if not isinstance(down, int):
        down = sum(1 for t in tunnels if (t.state or "").lower() != "up")
    if not isinstance(total, int):
        total = len(tunnels)
    return {
        "tunnels": [t.dict() for t in tunnels],
        "total": total,
        "up": up,
        "down": down,
    }
