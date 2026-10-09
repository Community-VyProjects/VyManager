"""DHCP catalog paths and version gates."""

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder
from vyos_mappers.dhcp.dhcp import DHCPMapper
from vyos_mappers.dhcp.dhcp_catalog import parse_scope


def test_ignore_client_id_is_15_only_and_not_under_option():
    mapper = DHCPMapper("1.5")
    path = mapper.catalog_set(
        "subnet", "ignore-client-id", ("LAN", "192.168.9.0/24")
    )
    assert path == [
        "service", "dhcp-server", "shared-network-name", "LAN",
        "subnet", "192.168.9.0/24", "ignore-client-id",
    ]
    assert "option" not in path
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").catalog_set("subnet", "ignore-client-id", ("LAN", "192.168.9.0/24"))
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").catalog_delete("subnet", "ignore-client-id", ("LAN", "192.168.9.0/24"))


def test_bootfile_size_path_differs_by_version():
    v14 = DHCPMapper("1.4").catalog_set(
        "subnet", "bootfile-size", ("LAN", "192.168.1.0/24"), ("4",)
    )
    v15 = DHCPMapper("1.5").catalog_set(
        "subnet", "bootfile-size", ("LAN", "192.168.1.0/24"), ("4",)
    )
    assert v14[-2:] == ["bootfile-size", "4"]
    assert "option" not in v14
    assert v15[-3:] == ["option", "bootfile-size", "4"]


def test_static_route_includes_next_hop():
    path = DHCPMapper("1.5").catalog_set(
        "subnet",
        "static-route",
        ("LAN", "192.168.1.0/24"),
        ("10.0.0.0/24", "192.0.2.1"),
    )
    assert path[-4:] == ["static-route", "10.0.0.0/24", "next-hop", "192.0.2.1"]
    deleted = DHCPMapper("1.5").catalog_delete(
        "subnet", "static-route", ("LAN", "192.168.1.0/24"), ("10.0.0.0/24",)
    )
    assert deleted[-2:] == ["static-route", "10.0.0.0/24"]


def test_client_class_rejected_on_14():
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").get_client_class("LAN")
    with pytest.raises(ValueError, match="not supported"):
        DHCPMapper("1.4").get_client_class_path("LAN")
    path = DHCPMapper("1.5").get_client_class_circuit_id("LAN", "ge-0")
    assert path[-2:] == ["circuit-id", "ge-0"]


def test_capabilities_hide_15_only_leaf_on_14():
    cat14 = DHCPBatchBuilder("1.4").get_capabilities()["catalog"]["subnet"]
    cat15 = DHCPBatchBuilder("1.5").get_capabilities()["catalog"]["subnet"]
    tokens14 = {item["token"] for item in cat14}
    tokens15 = {item["token"] for item in cat15}
    assert "ignore-client-id" not in tokens14
    assert "ignore-client-id" in tokens15
    assert "name-server" not in tokens15
    assert DHCPBatchBuilder("1.4").get_capabilities()["fields"]["client_class"]["supported"] is False
    assert DHCPBatchBuilder("1.5").get_capabilities()["fields"]["client_class"]["supported"] is True


def test_builder_emits_ignore_client_id():
    builder = DHCPBatchBuilder("1.5")
    builder.set_subnet_catalog("LAN", "192.168.9.0/24", "ignore-client-id")
    ops = builder.get_operations()
    assert ops == [{
        "op": "set",
        "path": [
            "service", "dhcp-server", "shared-network-name", "LAN",
            "subnet", "192.168.9.0/24", "ignore-client-id",
        ],
    }]


def test_parse_scope_reads_flag_and_route():
    parsed = parse_scope(
        {
            "ignore-client-id": {},
            "option": {
                "static-route": {"10.0.0.0/24": {"next-hop": "192.0.2.1"}},
                "bootfile-size": "4",
            },
        },
        "1.5",
        "subnet",
    )
    assert parsed["ignore-client-id"] is True
    assert parsed["bootfile-size"] == "4"
    assert parsed["static-route"] == [{"prefix": "10.0.0.0/24", "next_hop": "192.0.2.1"}]
    assert parsed["ip-forwarding"] is False


def test_pipe_in_catalog_value_is_rejected_not_truncated():
    mapper = DHCPMapper("1.5")
    with pytest.raises(ValueError, match="cannot contain"):
        mapper.catalog_set(
            "subnet", "bootfile-name", ("LAN", "192.168.1.0/24"), ("pxe|linux",)
        )
    with pytest.raises(ValueError, match="cannot contain"):
        mapper.catalog_delete(
            "subnet", "pop-server", ("LAN", "192.168.1.0/24"), ("192.0.2.1|extra",)
        )


def test_pipe_in_client_class_id_is_rejected():
    mapper = DHCPMapper("1.5")
    with pytest.raises(ValueError, match="cannot contain"):
        mapper.get_client_class_circuit_id("LAN", "ge-0|extra")
    with pytest.raises(ValueError, match="cannot contain"):
        mapper.get_client_class_remote_id("LAN", "aa|bb")


def test_split_packed_value_keeps_extra_pipes_on_the_last_arg():
    from routers.dhcp.dhcp import split_packed_value

    assert split_packed_value("ge-0|extra", 1) == ["ge-0|extra"]
    assert split_packed_value("LAN|ge-0|extra", 2) == ["LAN", "ge-0|extra"]
    assert split_packed_value("a|b", 2) == ["a", "b"]


@pytest.mark.parametrize(
    "scope,token,anchors,value",
    [
        ("subnet", "subnet-parameters", ("LAN", "192.168.1.0/24"), "ping-check"),
        ("shared-network", "shared-network-parameters", ("LAN",), "authoritative"),
        ("static-mapping", "static-mapping-parameters", ("LAN", "192.168.1.0/24", "host1"), "duid"),
        ("global", "global-parameters", (), "hostfile-update"),
    ],
)
def test_14_only_parameter_leaf_raises_on_15(scope, token, anchors, value):
    mapper = DHCPMapper("1.5")
    with pytest.raises(ValueError, match="not supported"):
        mapper.catalog_set(scope, token, anchors, (value,))
    with pytest.raises(ValueError, match="not supported"):
        mapper.catalog_delete(scope, token, anchors)


def test_range_and_mapping_catalog_ops_include_child_id():
    builder = DHCPBatchBuilder("1.5")
    builder.set_range_catalog("LAN", "192.168.1.0/24", "0|bootfile-size|4")
    builder.delete_range_catalog("LAN", "192.168.1.0/24", "0|pop-server|192.0.2.1")
    builder.set_mapping_catalog("LAN", "192.168.1.0/24", "host1|bootfile-name|pxelinux.0")
    builder.delete_mapping_catalog("LAN", "192.168.1.0/24", "host1|static-route|10.0.0.0/24")
    ops = builder.get_operations()
    assert ops[0]["op"] == "set"
    assert ops[0]["path"][-5:] == ["range", "0", "option", "bootfile-size", "4"]
    assert ops[1]["op"] == "delete"
    assert ops[1]["path"][-4:] == ["0", "option", "pop-server", "192.0.2.1"]
    assert ops[2]["path"][-5:-1] == ["static-mapping", "host1", "option", "bootfile-name"]
    assert ops[2]["path"][-1] == "pxelinux.0"
    assert ops[3]["op"] == "delete"
    assert ops[3]["path"][-3:] == ["option", "static-route", "10.0.0.0/24"]


def test_child_spec_rejects_a_bare_token():
    builder = DHCPBatchBuilder("1.5")
    with pytest.raises(ValueError, match="requires an id"):
        builder.set_range_catalog("LAN", "192.168.1.0/24", "bootfile-size")


def test_delete_flag_takes_no_packed_value():
    builder = DHCPBatchBuilder("1.5")
    with pytest.raises(ValueError, match="wrong number of values"):
        builder.delete_subnet_catalog("LAN", "192.168.9.0/24", "ignore-client-id|extra")


def test_parse_client_classes_reads_relay_ids():
    from vyos_mappers.dhcp.dhcp_catalog import parse_client_classes

    parsed = parse_client_classes({
        "client-class": {
            "LAN": {
                "disable": {},
                "relay-agent-information": {
                    "circuit-id": "ge-0",
                    "remote-id": "aa",
                },
            }
        }
    })
    assert parsed == [{
        "name": "LAN",
        "disable": True,
        "circuit_id": "ge-0",
        "remote_id": "aa",
    }]


def test_batch_dispatch_rejects_a_pipe_in_circuit_id(monkeypatch):
    import asyncio

    from fastapi import HTTPException

    from routers.dhcp.dhcp import DHCPBatchOperation, DHCPBatchRequest, dhcp_batch_configure

    class _Service:
        def get_version(self):
            return "1.5"

        def execute_batch(self, builder):
            raise AssertionError("a rejected value must not be committed")

    async def _allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr("routers.dhcp.dhcp.get_session_vyos_service", lambda request: _Service())
    monkeypatch.setattr("routers.dhcp.dhcp.require_write_permission", _allow)

    request = DHCPBatchRequest(
        network_name="_global",
        operations=[
            DHCPBatchOperation(op="set_client_class_circuit_id", value="LAN|ge-0|extra"),
        ],
    )

    with pytest.raises((ValueError, HTTPException), match="cannot contain"):
        asyncio.run(dhcp_batch_configure(object(), request))  # type: ignore[arg-type]


def test_batch_dispatch_sends_range_catalog_to_the_builder(monkeypatch):
    import asyncio

    from routers.dhcp.dhcp import DHCPBatchOperation, DHCPBatchRequest, dhcp_batch_configure

    seen = {}

    class _Service:
        def get_version(self):
            return "1.5"

        def execute_batch(self, builder):
            seen["ops"] = builder.get_operations()

            class _Response:
                status = 200
                result = {"ok": True}
                error = None

            return _Response()

    async def _allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr("routers.dhcp.dhcp.get_session_vyos_service", lambda request: _Service())
    monkeypatch.setattr("routers.dhcp.dhcp.require_write_permission", _allow)

    request = DHCPBatchRequest(
        network_name="LAN",
        subnet="192.168.1.0/24",
        operations=[
            DHCPBatchOperation(op="set_range_catalog", value="0|bootfile-size|4"),
        ],
    )
    asyncio.run(dhcp_batch_configure(object(), request))  # type: ignore[arg-type]
    assert seen["ops"][0]["path"][-5:] == ["range", "0", "option", "bootfile-size", "4"]


def test_get_config_puts_catalog_and_classes_on_the_response(monkeypatch):
    import asyncio

    from routers.dhcp.dhcp import get_dhcp_config

    class _Service:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return {
                "service": {
                    "dhcp-server": {
                        "client-class": {
                            "LAN": {
                                "relay-agent-information": {"circuit-id": "ge-0"},
                            }
                        },
                        "shared-network-name": {
                            "LAN": {
                                "subnet": {
                                    "192.168.9.0/24": {
                                        "ignore-client-id": {},
                                        "range": {"0": {"start": "192.168.9.10"}},
                                    }
                                }
                            }
                        },
                    }
                }
            }

    async def _allow(*_args, **_kwargs):
        return None

    async def _pool(fn, **kwargs):
        return fn(**kwargs)

    monkeypatch.setattr("routers.dhcp.dhcp.get_session_vyos_service", lambda request: _Service())
    monkeypatch.setattr("routers.dhcp.dhcp.require_read_permission", _allow)
    monkeypatch.setattr("routers.dhcp.dhcp.run_in_threadpool", _pool)

    response = asyncio.run(get_dhcp_config(object()))  # type: ignore[arg-type]
    assert response.client_classes[0].name == "LAN"
    assert response.client_classes[0].circuit_id == "ge-0"
    subnet = response.shared_networks[0].subnets[0]
    assert subnet.catalog["ignore-client-id"] is True
    assert subnet.ranges[0].catalog is not None
