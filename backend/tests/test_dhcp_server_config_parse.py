"""DHCP server GET /config, lease clear, and batch error handling."""

import asyncio

import pytest
from fastapi import HTTPException

from routers.dhcp_server import dhcp_server as router_mod
from routers.dhcp_server.dhcp_server import (
    DHCPBatchOperation,
    DHCPBatchRequest,
    DHCPConfigResponse,
    dhcp_batch_configure,
)
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.dhcp_server import DHCPServerMapper
from vyos_mappers.dhcp_server.dhcp_server_versions import (
    DHCPServerMapperV1_4,
    DHCPServerMapperV1_5,
)

V15 = "2026.09.23-0027-rolling"

TREE_15 = {
    "service": {
        "dhcp-server": {
            "listen-interface": {"eth1": {}},
            "dynamic-dns-update": {
                "send-updates": "enable",
                "tsig-key": {"K1": {"algorithm": "sha256", "secret": "c2VjcmV0"}},
                "forward-domain": {
                    "example.com": {
                        "key-name": "K1",
                        "dns-server": {"1": {"address": "192.0.2.53", "port": "53"}},
                    }
                },
            },
            "shared-network-name": {
                "LAN": {
                    "option": {"name-server": ["192.0.2.1", "192.0.2.2"]},
                    "subnet": {
                        "192.168.9.0/24": {
                            "subnet-id": "1",
                            "option": {"default-router": "192.168.9.1"},
                            "static-mapping": {
                                "pc": {"ip-address": "192.168.9.5", "mac": "00:11:22:33:44:55"}
                            },
                        }
                    },
                }
            },
        }
    }
}

TREE_14 = {
    "service": {
        "dhcp-server": {
            "host-decl-name": {},
            "shared-network-name": {
                "LAN": {
                    "name-server": "192.0.2.1",
                    "subnet": {
                        "192.168.9.0/24": {
                            "default-router": "192.168.9.1",
                            "static-mapping": {
                                "pc": {"ip-address": "192.168.9.5", "mac-address": "00:11:22:33:44:55"}
                            },
                        }
                    },
                }
            },
        }
    }
}


def _mapper(version: str) -> DHCPServerMapper:
    mapper = CommandMapperRegistry.get_mapper("dhcp_server", version)
    assert isinstance(mapper, DHCPServerMapper)
    return mapper


def test_parse_config_reads_15_option_and_mac_leaves():
    response = DHCPConfigResponse(**_mapper(V15).parse_config(TREE_15))
    network = response.shared_networks[0]
    subnet = network.subnets[0]
    assert network.name_servers == ["192.0.2.1", "192.0.2.2"]
    assert subnet.subnet_id == 1
    assert subnet.default_router == "192.168.9.1"
    assert subnet.static_mappings[0].mac_address == "00:11:22:33:44:55"
    assert response.global_config.listen_interfaces == ["eth1"]
    assert response.total_subnets == 1
    assert response.total_static_mappings == 1


def test_parse_config_reads_14_direct_leaves():
    response = DHCPConfigResponse(**_mapper("1.4.3").parse_config(TREE_14))
    subnet = response.shared_networks[0].subnets[0]
    assert response.shared_networks[0].name_servers == ["192.0.2.1"]
    assert subnet.default_router == "192.168.9.1"
    assert subnet.static_mappings[0].mac_address == "00:11:22:33:44:55"
    assert response.global_config.host_decl_name is True


def test_parse_config_masks_tsig_secret():
    ddns = DHCPConfigResponse(**_mapper(V15).parse_config(TREE_15)).ddns
    assert ddns.present is True
    assert ddns.tsig_keys[0].secret == "***"
    assert ddns.tsig_keys[0].algorithm == "sha256"
    assert ddns.forward_domains[0].dns_servers[0].port == "53"
    assert "c2VjcmV0" not in DHCPConfigResponse(**_mapper(V15).parse_config(TREE_15)).model_dump_json()


def test_parse_config_without_dhcp_server_is_empty():
    response = DHCPConfigResponse(**_mapper(V15).parse_config({"service": {}}))
    assert response.shared_networks == []
    assert response.ddns.present is False


def test_lease_clear_mutation_comes_from_the_subclass():
    v14 = _mapper("1.4.3")
    v15 = _mapper(V15)
    assert isinstance(v14, DHCPServerMapperV1_4)
    assert isinstance(v15, DHCPServerMapperV1_5)
    query14, vars14 = v14.lease_clear_request("192.0.2.5", "inet", None)
    query15, vars15 = v15.lease_clear_request("192.0.2.5", "inet", "red")
    assert "ClearReleaseLeaseDhcp" in query14 and vars14 == {"ip": "192.0.2.5"}
    assert "ClearDhcpServerLeaseDhcp" in query15
    assert vars15 == {"family": "inet", "address": "192.0.2.5", "vrf": "red"}


class _Service:
    def __init__(self, error=None):
        self.error = error
        self.calls = 0

    def get_version(self):
        return V15

    def execute_batch(self, builder):
        self.calls += 1
        if self.error:
            raise self.error

        class _Response:
            status = 200
            result = None
            error = None

        return _Response()


def _run(monkeypatch, service, operations, **request):
    async def _allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(router_mod, "get_session_vyos_service", lambda _r: service)
    monkeypatch.setattr(router_mod, "require_write_permission", _allow)
    body = DHCPBatchRequest(
        network_name=request.get("network_name", "LAN"),
        subnet=request.get("subnet"),
        operations=[DHCPBatchOperation(**op) for op in operations],
    )
    return asyncio.run(dhcp_batch_configure(object(), body))  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "op",
    [
        {"op": "set_ddns_tsig_key_secret", "value": "K1"},
        {"op": "set_ddns_tsig_key_secret", "value": "K1|"},
        {"op": "set_ddns_tsig_key"},
        {"op": "set_ddns_tsig_key", "value": ""},
    ],
)
def test_batch_missing_value_is_400(monkeypatch, op):
    service = _Service()
    with pytest.raises(HTTPException) as exc:
        _run(monkeypatch, service, [op])
    assert exc.value.status_code == 400
    assert service.calls == 0


def test_batch_version_gate_is_400(monkeypatch):
    service = _Service()
    service.get_version = lambda: "1.4.3"  # type: ignore[method-assign]
    with pytest.raises(HTTPException) as exc:
        _run(monkeypatch, service, [{"op": "set_client_class", "value": "LAN"}])
    assert exc.value.status_code == 400


def test_batch_execute_value_error_stays_500(monkeypatch):
    service = _Service(error=ValueError("empty batch"))
    with pytest.raises(HTTPException) as exc:
        _run(monkeypatch, service, [{"op": "set_ddns_tsig_key", "value": "K1"}])
    assert exc.value.status_code == 500
    assert service.calls == 1
