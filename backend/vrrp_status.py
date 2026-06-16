"""VRRP / high-availability live status for the dashboard stream.

Parses the text output of the op-mode ``show vrrp`` command (fetched via the
GraphQL ``Show`` op, path ``["vrrp"]``) into structured per-group state.

This surfaces the *running* VRRP groups managed by keepalived — including their
live ``MASTER`` / ``BACKUP`` / ``FAULT`` state, which never appears in the
configuration and so is invisible to the config-driven High Availability page.

The summary table looks like::

    Name         Interface      VRID  State      Priority  Last Transition
    -----------  -----------  ------  -------  ----------  -----------------
    foo          eth1             50  MASTER          150  1m4s

When VRRP is configured but no groups are active (or the daemon is not running)
VyOS prints a single human-readable line such as ``VRRP not configured!`` (1.4)
or ``VRRP data is not available ...`` (1.5); both parse to zero groups.
"""

from typing import List, Optional

from pydantic import BaseModel


class VrrpGroupStatus(BaseModel):
    """A single live VRRP group as reported by ``show vrrp``."""
    name: str
    interface: Optional[str] = None
    vrid: Optional[int] = None
    state: Optional[str] = None            # "MASTER" / "BACKUP" / "FAULT"
    priority: Optional[int] = None
    last_transition: Optional[str] = None  # e.g. "1m4s"


def vrrp_configured(full_config) -> bool:
    """True when any VRRP group is configured (gates the dashboard fetch)."""
    ha = (full_config or {}).get("high-availability", {}) or {}
    vrrp = ha.get("vrrp", {}) or {}
    return bool(vrrp.get("group"))


def vrrp_gql_fields(key_literal: str) -> List[str]:
    """GraphQL alias field fetching ``show vrrp`` via the generic ``Show`` op.

    ``key_literal`` must be a JSON-encoded API key (``json.dumps(key)``).
    """
    return [
        f'Vrrp: Show(data: {{key: {key_literal}, path: ["vrrp"]}}) {{ data {{ result }} }}'
    ]


def _int(value: str) -> Optional[int]:
    try:
        return int(value.strip())
    except (ValueError, AttributeError):
        return None


def _column_bounds(separator: str) -> List[tuple]:
    """Return (start, end) slice bounds for each dashed run in the header rule.

    The ``show vrrp`` summary aligns columns under a rule line of dash groups
    separated by spaces, e.g. ``-----  -----  ------``. Slicing each data row by
    these bounds tolerates the right-aligned numeric columns and values that
    contain spaces far better than ``str.split()``.
    """
    bounds: List[tuple] = []
    start: Optional[int] = None
    for i, ch in enumerate(separator):
        if ch == "-":
            if start is None:
                start = i
        elif start is not None:
            bounds.append((start, i))
            start = None
    if start is not None:
        bounds.append((start, len(separator)))
    return bounds


def parse_vrrp_summary(text: str) -> List[VrrpGroupStatus]:
    """Parse ``show vrrp`` summary text into a list of VrrpGroupStatus."""
    lines = (text or "").splitlines()

    # Locate the dashed rule line; the row above it is the header.
    sep_idx: Optional[int] = None
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped and set(stripped) <= {"-", " "} and "-" in stripped:
            sep_idx = idx
            break
    if sep_idx is None or sep_idx == 0:
        return []

    header = lines[sep_idx - 1]
    bounds = _column_bounds(lines[sep_idx])
    if not bounds:
        return []

    def cell(row: str, i: int) -> str:
        start, end = bounds[i]
        return row[start:end].strip() if start < len(row) else ""

    # Map header labels to column indices so ordering changes don't break parsing.
    col = {cell(header, i).lower(): i for i in range(len(bounds))}

    groups: List[VrrpGroupStatus] = []
    for row in lines[sep_idx + 1:]:
        if not row.strip():
            continue
        name = cell(row, col.get("name", 0))
        if not name:
            continue
        groups.append(VrrpGroupStatus(
            name=name,
            interface=cell(row, col["interface"]) or None if "interface" in col else None,
            vrid=_int(cell(row, col["vrid"])) if "vrid" in col else None,
            state=(cell(row, col["state"]).upper() or None) if "state" in col else None,
            priority=_int(cell(row, col["priority"])) if "priority" in col else None,
            last_transition=(cell(row, col["last transition"]) or None) if "last transition" in col else None,
        ))
    return groups


def build_vrrp_status(gql: dict) -> dict:
    """Build the ``vrrp-status`` SSE payload from the shared GraphQL result."""
    node = (gql or {}).get("Vrrp") or {}
    result = (node.get("data") or {}).get("result")
    groups = parse_vrrp_summary(result if isinstance(result, str) else "")
    return {"groups": [g.dict() for g in groups], "total": len(groups)}
