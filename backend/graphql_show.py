"""Batch multiple op-mode ``show <path>`` commands into a single GraphQL call.

The VyOS HTTP API can resolve many ``Show(path: [...])`` queries in one POST via
field aliases (the dashboard does this for per-interface WireGuard status). This
helper exposes that as a reusable call: give it ``{alias: path}`` and get back
``{alias: text_result}``. Aliases that error or return no data are simply omitted
— partial GraphQL errors do not fail the whole batch, mirroring routers/show.py.
"""

import json
import logging
from typing import Dict, List

import httpx

logger = logging.getLogger(__name__)


async def gql_show_batch(
    service,
    alias_paths: Dict[str, List[str]],
    timeout: float = 15.0,
) -> Dict[str, str]:
    """Run several ``show`` commands in one GraphQL request.

    Args:
        service: session VyOS service (provides ``.config`` with connection info).
        alias_paths: GraphQL alias -> op-mode show path, e.g.
            ``{"Shaper": ["qos", "shaper", "detail"]}``. Aliases must be valid
            GraphQL identifiers (letters/digits/underscore, not starting with a
            digit) — use index-based names for paths containing arbitrary values.

    Returns:
        ``{alias: text}`` for each alias that returned a string result.
    """
    if not alias_paths:
        return {}

    cfg = service.config
    api_key = str(cfg.apikey)
    k = json.dumps(api_key)  # safely quoted/escaped GraphQL string literal
    fields = [
        f"{alias}: Show(data: {{key: {k}, path: {json.dumps(path)}}}) {{ data {{ result }} }}"
        for alias, path in alias_paths.items()
    ]
    payload = {"query": "{ " + " ".join(fields) + " }"}
    url = f"{cfg.protocol}://{cfg.hostname}:{cfg.port}/graphql"

    try:
        async with httpx.AsyncClient(verify=cfg.verify, timeout=timeout) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))
        if resp.status_code != 200:
            logger.error("GraphQL show batch HTTP %d for %s", resp.status_code, url)
            return {}
        body = resp.json()
        if "errors" in body:
            # Partial errors still carry data for the aliases that succeeded.
            logger.warning("GraphQL show batch field errors: %s", body["errors"])
        data = body.get("data") or {}
    except Exception:
        logger.exception("GraphQL show batch failed")
        return {}

    out: Dict[str, str] = {}
    for alias in alias_paths:
        node = data.get(alias)
        if isinstance(node, dict):
            inner = node.get("data")
            if isinstance(inner, dict) and isinstance(inner.get("result"), str):
                out[alias] = inner["result"]
    return out
