"""Source guards for routing-policy RBAC enforcement (audit D3-01).

The routing-policy family (route, route_map, local_route, access/prefix
lists, the BGP list routers) exposes ``/config`` (read), ``/batch`` and
``/reorder`` (write). Each handler must call its ``require_*_permission``
check — the read-only-token scope gate lives inside that check, so a
missing call means a VIEWER or a read-only API token can mutate routing
config. These tests parse the router sources so a regression fails the
suite without needing a database or a device.
"""

import ast
from pathlib import Path

import pytest

ROUTERS_DIR = Path(__file__).resolve().parents[1] / "routers"

# router file → {handler → required permission call}
GATED_HANDLERS = {
    "local_route/local_route.py": {
        "get_local_route_capabilities": "require_read_permission",
        "get_local_route_config": "require_read_permission",
        "local_route_batch_configure": "require_write_permission",
        "local_route_reorder_rules": "require_write_permission",
    },
    "as_path_list/as_path_list.py": {
        "get_as_path_list_config": "require_read_permission",
        "as_path_list_batch_configure": "require_write_permission",
        "reorder_as_path_list_rules": "require_write_permission",
    },
    "community_list/community_list.py": {
        "get_community_list_config": "require_read_permission",
        "community_list_batch_configure": "require_write_permission",
        "reorder_community_list_rules": "require_write_permission",
    },
    "extcommunity_list/extcommunity_list.py": {
        "get_extcommunity_list_config": "require_read_permission",
        "extcommunity_list_batch_configure": "require_write_permission",
        "reorder_extcommunity_list_rules": "require_write_permission",
    },
    "large_community_list/large_community_list.py": {
        "get_large_community_list_config": "require_read_permission",
        "large_community_list_batch_configure": "require_write_permission",
        "reorder_large_community_list_rules": "require_write_permission",
    },
    "route/route.py": {
        "get_route_config": "require_read_permission",
        "route_batch_configure": "require_write_permission",
        "reorder_rules": "require_write_permission",
    },
    "route_map/route_map.py": {
        "get_route_map_config": "require_read_permission",
        "route_map_batch_configure": "require_write_permission",
        "reorder_route_map_rules": "require_write_permission",
    },
    # the siblings the fix was copied from — keep them honest too
    "access_list/access_list.py": {
        "access_list_batch_configure": "require_write_permission",
        "reorder_access_list_rules": "require_write_permission",
    },
    "prefix_list/prefix_list.py": {},
}

# router file → handlers that dispatch getattr(builder, operation.op)
DYNAMIC_DISPATCH_FILES = [
    "local_route/local_route.py",
    "as_path_list/as_path_list.py",
    "community_list/community_list.py",
    "extcommunity_list/extcommunity_list.py",
    "large_community_list/large_community_list.py",
    "route/route.py",
    "route_map/route_map.py",
]


def _permission_calls(func_node):
    """Names of require_*_permission functions awaited inside a handler."""
    calls = set()
    for node in ast.walk(func_node):
        if isinstance(node, ast.Call):
            name = getattr(node.func, "id", None) or getattr(node.func, "attr", None)
            if name and name.startswith("require_"):
                calls.add(name)
    return calls


def _handlers(path):
    tree = ast.parse(path.read_text())
    return {
        node.name: node
        for node in ast.walk(tree)
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
    }


@pytest.mark.parametrize("rel_path", sorted(GATED_HANDLERS))
def test_handlers_call_their_permission_check(rel_path):
    handlers = _handlers(ROUTERS_DIR / rel_path)
    for handler, required_call in GATED_HANDLERS[rel_path].items():
        assert handler in handlers, f"{rel_path}: handler {handler} not found"
        calls = _permission_calls(handlers[handler])
        assert required_call in calls, (
            f"{rel_path}:{handler} must call {required_call} — "
            "a missing check lets a VIEWER or read-only token through (D3-01)"
        )


@pytest.mark.parametrize("rel_path", DYNAMIC_DISPATCH_FILES)
def test_batch_dispatch_guards_operation_names(rel_path):
    source = (ROUTERS_DIR / rel_path).read_text()
    assert "_INTERNAL_BUILDER_METHODS" in source, (
        f"{rel_path}: getattr(builder, operation.op) dispatch must allowlist "
        "operation names"
    )
    assert "method = getattr(builder, operation.op)\n" not in source, (
        f"{rel_path}: unguarded getattr dispatch on a client-supplied name"
    )
