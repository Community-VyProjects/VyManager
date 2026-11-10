"""Named async routes must not call blocking VyOS I/O on the event loop.

Same rule as NTP and BFD: execute_batch goes through run_in_threadpool.
generate_openvpn_shared_secret has no execute_batch; its blocking call is
device.generate, and that call is offloaded the same way.
"""

import ast
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]

# handler, file, blocking attribute, expected offload count
OFFLOADED = [
    ("wireguard_interface_batch", "routers/wireguard/wireguard.py", "execute_batch", 1),
    ("wireguard_peer_batch", "routers/wireguard/wireguard.py", "execute_batch", 1),
    ("container_batch_configure", "routers/container/container.py", "execute_batch", 1),
    ("pim6_batch_configure", "routers/pim6/pim6.py", "execute_batch", 1),
    ("console_server_batch_configure", "routers/console_server/console_server.py", "execute_batch", 1),
    ("event_handler_batch_configure", "routers/event_handler/event_handler.py", "execute_batch", 1),
    ("batch_configure_nat", "routers/nat/nat.py", "execute_batch", 1),
    ("reorder_nat_rules", "routers/nat/nat.py", "execute_batch", 1),
    ("batch_configure", "routers/high_availability/high_availability.py", "execute_batch", 1),
    ("pki_batch_configure", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_ca", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_key_pair", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_dh", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_certificate", "routers/pki/pki.py", "execute_batch", 1),
    ("generate_openvpn_shared_secret", "routers/pki/pki.py", "generate", 1),
    ("generate_openssh", "routers/pki/pki.py", "execute_batch", 2),
]


def _handler(path: Path, name: str) -> ast.AsyncFunctionDef:
    tree = ast.parse(path.read_text())
    return next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name
    )


def _direct_calls(handler: ast.AST, attr: str) -> list[ast.Call]:
    return [
        node
        for node in ast.walk(handler)
        if isinstance(node, ast.Call) and getattr(node.func, "attr", None) == attr
    ]


def _offloaded(handler: ast.AST, attr: str) -> list[ast.Await]:
    found = []
    for node in ast.walk(handler):
        if not isinstance(node, ast.Await):
            continue
        call = node.value
        if not isinstance(call, ast.Call):
            continue
        func = call.func
        if not (isinstance(func, ast.Name) and func.id == "run_in_threadpool"):
            continue
        if (
            call.args
            and isinstance(call.args[0], ast.Attribute)
            and call.args[0].attr == attr
        ):
            found.append(node)
    return found


@pytest.mark.parametrize(
    "name,rel,attr,count",
    OFFLOADED,
    ids=[row[0] for row in OFFLOADED],
)
def test_named_handler_runs_blocking_io_off_the_event_loop(name, rel, attr, count):
    handler = _handler(BACKEND / rel, name)
    assert not _direct_calls(handler, attr), f"{attr} must not run on the event loop"
    assert len(_offloaded(handler, attr)) == count, (
        f"{attr} must go through run_in_threadpool"
    )
