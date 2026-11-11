"""Named async routes must not call blocking VyOS I/O on the event loop.

Same rule as NTP and BFD: execute_batch goes through run_in_threadpool.
generate_openvpn_shared_secret has no execute_batch; its blocking call is
device.generate, and that call is offloaded the same way.
get_full_config on the named config handlers is offloaded the same way.
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

# Same offload, added for the remaining config readers and the batch
# handlers in those files. Ids include the path so they stay unique.
REMAINING_OFFLOADED = [
    ("get_config", "routers/nat64/nat64.py", "get_full_config", 1),
    ("batch_configure", "routers/nat64/nat64.py", "execute_batch", 1),
    ("reorder_nat64_rules", "routers/nat64/nat64.py", "execute_batch", 1),
    ("get_config", "routers/nat66/nat66.py", "get_full_config", 1),
    ("batch_configure", "routers/nat66/nat66.py", "execute_batch", 1),
    ("reorder_nat66_rules", "routers/nat66/nat66.py", "execute_batch", 1),
    ("get_l2tp_config", "routers/l2tp/l2tp.py", "get_full_config", 1),
    ("l2tp_batch_configure", "routers/l2tp/l2tp.py", "execute_batch", 1),
    ("get_ipsec_config", "routers/ipsec/ipsec.py", "get_full_config", 1),
    ("ipsec_batch_configure", "routers/ipsec/ipsec.py", "execute_batch", 1),
    ("get_config", "routers/load_balancing/load_balancing.py", "get_full_config", 1),
    ("batch_configure", "routers/load_balancing/load_balancing.py", "execute_batch", 1),
    ("get_available_ethernet_interfaces", "routers/show.py", "get_full_config", 1),
    ("get_available_ethernet_interfaces", "routers/show.py", "show", 1),
    ("get_interface_counters", "routers/show.py", "show", 1),
    ("get_system_updates", "routers/show.py", "show", 1),
    ("get_dhcp_config", "routers/dhcp_server/dhcp_server.py", "get_full_config", 1),
    ("dhcp_batch_configure", "routers/dhcp_server/dhcp_server.py", "execute_batch", 1),
]

# handler, file, blocking attribute, expected offload count
CONFIG_OFFLOADED = [
    ("get_pki_config", "routers/pki/pki.py", "get_full_config", 1),
    ("reveal_pki_value", "routers/pki/pki.py", "get_full_config", 1),
    ("generate_certificate", "routers/pki/pki.py", "get_full_config", 1),
    ("get_wireguard_config", "routers/wireguard/wireguard.py", "get_full_config", 1),
    ("get_config", "routers/high_availability/high_availability.py", "get_full_config", 1),
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


@pytest.mark.parametrize(
    "name,rel,attr,count",
    CONFIG_OFFLOADED,
    ids=[row[0] for row in CONFIG_OFFLOADED],
)
def test_named_config_handler_reads_config_off_the_event_loop(name, rel, attr, count):
    handler = _handler(BACKEND / rel, name)
    assert not _direct_calls(handler, attr), f"{attr} must not run on the event loop"
    assert len(_offloaded(handler, attr)) == count, (
        f"{attr} must go through run_in_threadpool"
    )


@pytest.mark.parametrize(
    "name,rel,attr,count",
    REMAINING_OFFLOADED,
    ids=[f"{row[1]}:{row[0]}:{row[2]}" for row in REMAINING_OFFLOADED],
)
def test_remaining_config_io_runs_off_the_event_loop(name, rel, attr, count):
    handler = _handler(BACKEND / rel, name)
    assert not _direct_calls(handler, attr), f"{attr} must not run on the event loop"
    assert len(_offloaded(handler, attr)) == count, (
        f"{attr} must go through run_in_threadpool"
    )


def _handler_names(exc):
    names = set()
    etype = exc.type
    if isinstance(etype, ast.Name):
        names.add(etype.id)
    elif isinstance(etype, ast.Tuple):
        names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
    return names


def test_load_balancing_value_error_does_not_wrap_execute_batch():
    """A missing leaf is HTTP 400. An empty batch ValueError stays a 500."""
    handler = _handler(
        BACKEND / "routers/load_balancing/load_balancing.py",
        "batch_configure",
    )
    value_error_tries = []
    for node in ast.walk(handler):
        if not isinstance(node, ast.Try):
            continue
        for exc in node.handlers:
            if isinstance(exc, ast.ExceptHandler) and "ValueError" in _handler_names(exc):
                value_error_tries.append(node)

    assert value_error_tries, "batch_configure must catch ValueError"
    for try_node in value_error_tries:
        for call in ast.walk(try_node):
            if not isinstance(call, ast.Call):
                continue
            func = call.func
            name = getattr(func, "attr", None) or getattr(func, "id", None)
            assert name != "execute_batch", "ValueError handler must not wrap execute_batch"

    offloaded = _offloaded(handler, "execute_batch")
    assert len(offloaded) == 1
    covered = set()
    for try_node in value_error_tries:
        covered.update(range(try_node.lineno, (try_node.end_lineno or try_node.lineno) + 1))
    for node in offloaded:
        assert node.lineno not in covered
