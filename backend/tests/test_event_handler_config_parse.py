"""Event handler GET /config parse lives on the mapper (issue #966)."""

from pathlib import Path

from vyos_mappers.event_handler.event_handler_versions import (
    get_event_handler_mapper,
)


def _tree():
    return {
        "service": {
            "event-handler": {
                "event": {
                    "zeta": "not-a-dict",
                    "alpha": {
                        "filter": {
                            "pattern": "link down",
                            "syslog-identifier": "netlink",
                        },
                        "script": {
                            "path": "/config/scripts/notify.sh",
                            "arguments": "--now",
                            "environment": {
                                "zeta": {"value": "1"},
                                "alpha": {},
                                "beta": None,
                            },
                        },
                    },
                }
            }
        }
    }


def test_parse_config_is_explicit_and_version_falls_through():
    mapper = get_event_handler_mapper("1.4")
    assert "parse_config" in type(mapper).__dict__
    assert mapper.version == "1.4"
    assert get_event_handler_mapper("1.5").version == "1.5"


def test_events_filter_and_environment():
    parsed = get_event_handler_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    assert [event["name"] for event in parsed["events"]] == ["alpha", "zeta"]
    alpha = parsed["events"][0]
    assert alpha["filter"] == {
        "pattern": "link down",
        "syslog_identifier": "netlink",
    }
    assert alpha["script"]["path"] == "/config/scripts/notify.sh"
    assert alpha["script"]["arguments"] == "--now"
    assert alpha["script"]["environment"] == [
        {"name": "alpha", "value": None},
        {"name": "beta", "value": None},
        {"name": "zeta", "value": "1"},
    ]
    zeta = parsed["events"][1]
    assert zeta["filter"] == {"pattern": None, "syslog_identifier": None}
    assert zeta["script"] == {"path": None, "arguments": None, "environment": []}
    assert get_event_handler_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    empty = {"events": []}
    assert get_event_handler_mapper("1.4").parse_config({}) == empty
    assert get_event_handler_mapper("1.5").parse_config({"service": {}}) == empty
    assert (
        get_event_handler_mapper("1.5").parse_config(
            {"service": {"event-handler": {}}}
        )
        == empty
    )
    assert (
        get_event_handler_mapper("1.5").parse_config(
            {"service": {"event-handler": {"event": ["x"]}}}
        )
        == empty
    )


def test_router_has_no_parse_helpers():
    text = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("routers/event_handler/event_handler.py")
        .read_text()
    )
    assert "def _parse_" not in text
    parse_src = (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath("vyos_mappers/event_handler/config_parse.py")
        .read_text()
    )
    assert "pydantic" not in parse_src
    assert "fastapi" not in parse_src
    assert "routers" not in parse_src


def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_event_handler_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.event_handler.event_handler.require_read_permission", allow
    )
    monkeypatch.setattr(
        "routers.event_handler.event_handler.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.event_handler.event_handler import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/event-handler/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["events"][0]["name"] == expected["events"][0]["name"] == "alpha"
    assert body["events"][0]["filter"]["syslog_identifier"] == "netlink"
    assert body["events"][0]["script"]["environment"][2]["value"] == "1"
    assert body["events"][0]["script"]["environment"][1]["value"] is None
    assert body["events"][1]["script"]["environment"] == []
