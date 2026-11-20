"""No async route may call blocking VyOS I/O directly on the event loop.

Deny by default: scans every module under routers/ instead of a list of named
handlers, so a new handler that forgets run_in_threadpool fails here.
Passing the bound method to run_in_threadpool (or calling it from a nested sync
function that is itself offloaded) is fine.
"""

import ast
from pathlib import Path

ROUTERS = Path(__file__).resolve().parents[1] / "routers"

# VyOSService methods that talk to the router
SERVICE_IO = {
    "execute_batch",
    "execute_batch_with_confirm",
    "refresh_config",
    "confirm_commit",
    "config_file_save",
    "show_config",
    "commit_operations",
    "configure_batch",
}


def _is_device(node: ast.expr) -> bool:
    return (isinstance(node, ast.Name) and node.id == "device") or (
        isinstance(node, ast.Attribute) and node.attr == "device"
    )


def _blocking_calls(path: Path):
    tree = ast.parse(path.read_text())
    parent = {c: n for n in ast.walk(tree) for c in ast.iter_child_nodes(n)}
    for fn in ast.walk(tree):
        if not isinstance(fn, ast.AsyncFunctionDef):
            continue
        for node in ast.walk(fn):
            if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
                continue
            if not (node.func.attr in SERVICE_IO or _is_device(node.func.value)):
                continue
            if isinstance(parent.get(node), ast.Await):
                continue
            # skip calls inside a nested sync function or lambda
            up = parent.get(node)
            while up is not None and up is not fn and not isinstance(
                up, (ast.FunctionDef, ast.Lambda)
            ):
                up = parent.get(up)
            if up is not fn:
                continue
            yield f"{path.relative_to(ROUTERS.parent)}:{node.lineno} {fn.name}: {ast.unparse(node.func)}()"


def test_no_blocking_vyos_io_in_async_routes():
    offenders = [hit for path in sorted(ROUTERS.rglob("*.py")) for hit in _blocking_calls(path)]
    assert not offenders, "use await run_in_threadpool(...) for:\n" + "\n".join(offenders)
