"""The commit-confirm 409 from execute_batch reaches the client as a 409.

execute_batch raises HTTPException(409) while a commit-confirm is pending on
the router. A handler whose try catches Exception without first re-raising
HTTPException turns that into a generic 500, and the page loses the "confirm
it or wait" message.
"""

import ast
import pathlib
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROLLING = "2026.09.23-0027-rolling"
PENDING = "A commit-confirm is pending on this router. Confirm it or wait 42 seconds for it to run out."
ROUTERS = pathlib.Path(__file__).resolve().parent.parent / "routers"

# (router module, path, body)
ROUTES = [
    (
        "routers.mpls.mpls",
        "/vyos/mpls/batch",
        {"operations": [{"op": "set_interface", "value": "eth1"}]},
    ),
    (
        "routers.igmp_proxy.igmp_proxy",
        "/vyos/igmp-proxy/batch",
        {"groups": [{"interface": "eth1", "operations": [{"op": "set_interface_role", "value": "upstream"}]}]},
    ),
    (
        "routers.as_path_list.as_path_list",
        "/vyos/as-path-list/reorder",
        {
            "as_path_list_name": "AP1",
            "rules": [{"old_number": 10, "new_number": 20, "rule_data": {"rule_number": 10, "action": "permit", "regex": "65000"}}],
        },
    ),
    ("routers.system.system", "/vyos/system/general", {"hostname": "r1"}),
    ("routers.system.system", "/vyos/system/login-settings", {"timeout": 600}),
    ("routers.system.system", "/vyos/system/watchdog-settings", {"timeout": 30}),
    (
        "routers.interfaces.ethernet",
        "/vyos/ethernet/batch",
        {"interface": "eth1", "operations": [{"op": "set_description", "value": "uplink"}]},
    ),
]
IDS = [f"{module}:{path}" for module, path, _body in ROUTES]


def client_for(monkeypatch, module, error):
    """A client for one router whose commit raises error."""
    calls = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return ROLLING

        def create_ethernet_batch(self):
            return MagicMock()

        def execute_batch(self, batch):
            calls.append(batch)
            raise error

    monkeypatch.setattr(f"{module}.require_write_permission", allow)
    monkeypatch.setattr(f"{module}.get_session_vyos_service", lambda _req: Service())

    app = FastAPI()
    app.include_router(__import__(module, fromlist=["router"]).router)
    return TestClient(app, raise_server_exceptions=False), calls


@pytest.mark.parametrize("module,path,body", ROUTES, ids=IDS)
def test_pending_commit_confirm_is_a_409(monkeypatch, module, path, body):
    client, calls = client_for(monkeypatch, module, HTTPException(status_code=409, detail=PENDING))

    response = client.post(path, json=body)

    assert len(calls) == 1
    assert response.status_code == 409
    assert response.json() == {"detail": PENDING}


@pytest.mark.parametrize("module,path,body", ROUTES, ids=IDS)
def test_other_commit_errors_stay_a_generic_500(monkeypatch, module, path, body):
    client, calls = client_for(monkeypatch, module, RuntimeError("device said something private"))

    response = client.post(path, json=body)

    assert len(calls) == 1
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}


# Every VyOSService call that can raise the 409, plus the shared interface
# batch helper that commits for the interface routers.
COMMIT_CALLS = frozenset({
    "execute_batch",
    "execute_batch_with_confirm",
    "commit_operations",
    "load_config_file",
    "config_file_save",
    "confirm_commit",
    "run_interface_batch",
})
BROAD = ("Exception", "BaseException")


def _names(node):
    found = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Attribute):
            found.add(child.attr)
        elif isinstance(child, ast.Name):
            found.add(child.id)
    return found


def _committing_names(tree):
    """COMMIT_CALLS plus every function in this module that reaches one."""
    functions = [
        node for node in ast.walk(tree) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    reach = set(COMMIT_CALLS)
    grew = True
    while grew:
        grew = False
        for function in functions:
            if function.name not in reach and _names(function) & reach:
                reach.add(function.name)
                grew = True
    return reach


def _caught(handler):
    if handler.type is None:
        return ["BaseException"]
    types = handler.type.elts if isinstance(handler.type, ast.Tuple) else [handler.type]
    return [ast.unparse(item).rsplit(".", 1)[-1] for item in types]


def _reraises(statement, bound):
    """A bare raise, or a raise of the name the handler bound."""
    if not isinstance(statement, ast.Raise) or statement.cause is not None:
        return False
    if statement.exc is None:
        return True
    return bound is not None and isinstance(statement.exc, ast.Name) and statement.exc.id == bound


def _is_http_exception_check(test, bound):
    return (
        isinstance(test, ast.Call)
        and isinstance(test.func, ast.Name)
        and test.func.id == "isinstance"
        and len(test.args) == 2
        and isinstance(test.args[0], ast.Name)
        and test.args[0].id == bound
        and ast.unparse(test.args[1]).rsplit(".", 1)[-1] == "HTTPException"
    )


def _passes_http_exception(handler):
    """True when this handler hands an HTTPException on unchanged."""
    body = handler.body
    if len(body) == 1 and _reraises(body[0], handler.name):
        return True
    # except Exception as e: if isinstance(e, HTTPException): raise
    first = body[0]
    return (
        handler.name is not None
        and isinstance(first, ast.If)
        and _is_http_exception_check(first.test, handler.name)
        and len(first.body) == 1
        and _reraises(first.body[0], handler.name)
    )


def _swallows(block):
    """True when an HTTPException raised in this try's body is replaced."""
    leaves = (ast.Return, ast.Raise, ast.Break, ast.Continue)
    if any(isinstance(node, leaves) for part in block.finalbody for node in ast.walk(part)):
        return True
    for handler in block.handlers:
        caught = _caught(handler)
        if "HTTPException" in caught or any(name in BROAD for name in caught):
            # The first handler an HTTPException lands in decides.
            return not _passes_http_exception(handler)
    return False


def scan_source(source, label="<source>"):
    """Return (inspected, swallowing): every try that commits, and the bad ones."""
    tree = ast.parse(source)
    reach = _committing_names(tree)
    inspected, swallowing = [], []
    for function in ast.walk(tree):
        if not isinstance(function, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for block in ast.walk(function):
            if not isinstance(block, (ast.Try, ast.TryStar)):
                continue
            body_names = set().union(*(_names(statement) for statement in block.body))
            if not body_names & reach:
                continue
            where = f"{label}:{function.name}:{block.lineno}"
            inspected.append(where)
            if _swallows(block):
                swallowing.append(where)
    return inspected, swallowing


def scan_routers():
    inspected, swallowing = [], []
    for path in sorted(ROUTERS.rglob("*.py")):
        seen, bad = scan_source(path.read_text(), str(path.relative_to(ROUTERS)))
        inspected += seen
        swallowing += bad
    return inspected, swallowing


def test_no_router_catches_the_409_around_a_commit():
    inspected, swallowing = scan_routers()

    assert swallowing == []
    # The scan is not vacuous: it saw the handlers this file drives by HTTP.
    inspected_functions = {where.split(":")[1] for where in inspected}
    assert {
        "mpls_batch_configure",
        "igmp_proxy_batch_configure",
        "reorder_as_path_list_rules",
        "update_general_settings",
        "update_login_settings",
        "update_watchdog_settings",
        "configure_interface_batch",
        "confirm_commit",
    } <= inspected_functions
    assert len(inspected) >= 50


HANDLER = """
def handler(service, builder):
    try:
        return {commit}
{handlers}
"""

SAFE = [
    "    except HTTPException:\n        raise\n    except Exception:\n        raise HTTPException(500)",
    "    except fastapi.HTTPException as e:\n        raise e\n    except Exception:\n        raise HTTPException(500)",
    "    except Exception as e:\n        if isinstance(e, HTTPException):\n            raise\n        raise HTTPException(500)",
    "    except ValueError:\n        raise HTTPException(400)",
    "    except (HTTPException, Exception):\n        raise",
]
SWALLOWING = [
    "    except Exception:\n        raise HTTPException(500)",
    "    except:\n        raise HTTPException(500)",
    "    except (ValueError, Exception):\n        raise HTTPException(500)",
    "    except HTTPException:\n        raise HTTPException(500)\n    except Exception:\n        raise HTTPException(500)",
    "    except HTTPException:\n        return None\n    except Exception:\n        raise HTTPException(500)",
    "    except (HTTPException, Exception):\n        raise HTTPException(500)",
    "    except Exception as e:\n        if isinstance(e, ValueError):\n            raise HTTPException(400)\n        raise HTTPException(500)",
    "    except Exception as e:\n        if isinstance(e, HTTPException):\n            raise HTTPException(500)\n        raise HTTPException(500)",
    "    except HTTPException:\n        raise\n    finally:\n        return None",
    "    except* Exception:\n        raise HTTPException(500)",
]
COMMITS = ["service.execute_batch(builder)", "run_in_threadpool(service.config_file_save)", "_local_commit(service)"]
LOCAL_HELPER = "def _local_commit(service):\n    return service.commit_operations([])\n"


@pytest.mark.parametrize("handlers", SAFE)
@pytest.mark.parametrize("commit", COMMITS)
def test_scan_accepts_a_handler_that_passes_the_409(commit, handlers):
    inspected, swallowing = scan_source(LOCAL_HELPER + HANDLER.format(commit=commit, handlers=handlers))

    assert len(inspected) == 1
    assert swallowing == []


@pytest.mark.parametrize("handlers", SWALLOWING)
@pytest.mark.parametrize("commit", COMMITS)
def test_scan_flags_a_handler_that_replaces_the_409(commit, handlers):
    inspected, swallowing = scan_source(LOCAL_HELPER + HANDLER.format(commit=commit, handlers=handlers))

    assert len(inspected) == 1
    assert swallowing == inspected


def test_scan_ignores_a_try_that_does_not_commit():
    source = "def handler(service):\n    try:\n        return service.get_version()\n    except Exception:\n        raise HTTPException(500)\n"

    assert scan_source(source) == ([], [])


@pytest.mark.parametrize("leave", ["break", "continue"])
def test_scan_flags_a_finally_that_leaves_a_loop(leave):
    source = (
        "def handler(service, builder):\n"
        "    for _attempt in range(2):\n"
        "        try:\n"
        "            service.execute_batch(builder)\n"
        "        except HTTPException:\n"
        "            raise\n"
        "        finally:\n"
        f"            {leave}\n"
    )

    inspected, swallowing = scan_source(source)

    assert len(inspected) == 1
    assert swallowing == inspected


def test_scan_inspects_a_handler_named_like_the_commit_it_calls():
    source = (
        "def confirm_commit(service):\n"
        "    try:\n"
        "        return service.confirm_commit()\n"
        "    except Exception:\n"
        "        raise HTTPException(500)\n"
    )

    inspected, swallowing = scan_source(source)

    assert len(inspected) == 1
    assert swallowing == inspected
