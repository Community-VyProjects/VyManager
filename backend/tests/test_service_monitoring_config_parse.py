"""Service monitoring GET /config parse lives on the mapper (issue #966)."""

from vyos_mappers.service_monitoring import ServiceMonitoringMapper
from vyos_mappers.service_monitoring.config_parse import MASKED_SECRET
from vyos_mappers.service_monitoring.service_monitoring_versions import (
    get_service_monitoring_mapper,
)


def _tree():
    return {
        "service": {
            "monitoring": {
                "telegraf": {
                    "source": {"net": {}, "cpu": {}},
                    "vrf": "mgmt",
                    "influxdb": {
                        "url": "https://influx.example",
                        "port": "8086",
                        "bucket": "edge",
                        "authentication": {"token": "tok", "organization": "ops"},
                    },
                    "loki": {
                        "url": "https://loki.example",
                        "port": "3100",
                        "metric-name-label": "name",
                        "authentication": {"username": "loki", "password": "secret"},
                    },
                    "splunk": {
                        "url": "https://splunk.example",
                        "authentication": {"token": "splunk-tok", "insecure": {}},
                    },
                    "azure-data-explorer": {
                        "url": "https://azure.example",
                        "database": "metrics",
                        "table": "host",
                        "group-metrics": "table",
                        "authentication": {
                            "client-id": "cid",
                            "client-secret": "csec",
                            "tenant-id": "tid",
                        },
                    },
                    "prometheus-client": {
                        "port": "9273",
                        "listen-address": "127.0.0.1",
                        "metric-version": "2",
                        "allow-from": ["10.0.0.2", "10.0.0.1"],
                        "authentication": {"username": "prom", "password": "pw"},
                    },
                },
                "zabbix-agent": {
                    "host-name": "edge",
                    "port": "10050",
                    "listen-address": {"10.1.1.1": {}, "10.1.1.2": {}},
                    "server": ["zbx-b", "zbx-a"],
                    "server-active": {
                        "10.2.2.2": None,
                        "10.2.2.1": {"port": "10051"},
                    },
                    "authentication": {
                        "mode": "psk",
                        "psk": {"id": "psk-id", "secret": "psk-secret"},
                    },
                    "limits": {"buffer-flush-interval": "5", "buffer-size": "100"},
                    "log": {
                        "debug-level": "3",
                        "size": "10",
                        "remote-commands": {},
                    },
                },
                "prometheus": {
                    "node-exporter": {
                        "port": "9100",
                        "listen-address": {"0.0.0.0": {}},
                        "vrf": "default",
                        "collectors": {"textfile": {}},
                    },
                    "frr-exporter": {"port": "9342", "vrf": "mgmt"},
                    "blackbox-exporter": {
                        "port": "9115",
                        "modules": {
                            "icmp": {
                                "name": {
                                    "ping": {
                                        "preferred-ip-protocol": "ipv4",
                                        "ip-protocol-fallback": {},
                                        "timeout": "2",
                                    },
                                    "bare": {},
                                },
                            },
                            "dns": {
                                "name": {
                                    "resolve": {
                                        "query-name": "example.com",
                                        "query-type": "A",
                                        "timeout": "1",
                                    }
                                },
                            },
                        },
                    },
                },
                "network-event": {
                    "log-level": "info",
                    "queue-size": "1000",
                    "event": {"link": {}, "addr": {}},
                },
            }
        }
    }


def _empty():
    return {
        "configured": False,
        "telegraf": None,
        "zabbix_agent": None,
        "prometheus": None,
        "network_event": None,
    }


def test_parse_config_lives_on_the_shared_class():
    assert "parse_config" in ServiceMonitoringMapper.__dict__
    assert isinstance(get_service_monitoring_mapper("1.4"), ServiceMonitoringMapper)
    assert isinstance(get_service_monitoring_mapper("1.5"), ServiceMonitoringMapper)


def test_secrets_are_masked():
    parsed = get_service_monitoring_mapper("1.5").parse_config(_tree())
    telegraf = parsed["telegraf"]
    assert telegraf["influxdb"]["authentication"]["token"] == MASKED_SECRET
    assert telegraf["loki"]["authentication"]["password"] == MASKED_SECRET
    assert telegraf["splunk"]["authentication"]["token"] == MASKED_SECRET
    assert telegraf["azure_data_explorer"]["authentication"]["client_secret"] == MASKED_SECRET
    assert telegraf["prometheus_client"]["authentication"]["password"] == MASKED_SECRET
    assert parsed["zabbix_agent"]["authentication"]["psk_secret"] == MASKED_SECRET
    values = []

    def walk(node):
        if isinstance(node, dict):
            for item in node.values():
                walk(item)
        elif isinstance(node, list):
            for item in node:
                walk(item)
        else:
            values.append(node)

    walk(parsed)
    for secret in ("tok", "secret", "splunk-tok", "csec", "pw", "psk-secret"):
        assert secret not in values


def test_unset_secret_stays_none():
    tree = {"service": {"monitoring": {"telegraf": {"loki": {"url": "https://loki.example"}}}}}
    loki = get_service_monitoring_mapper("1.5").parse_config(tree)["telegraf"]["loki"]
    assert loki["authentication"] == {"username": None, "password": None}


def test_bare_nodes_parse_as_configured():
    """A node with no children still exists on the device; it is not absent."""
    tree = {"service": {"monitoring": {
        "telegraf": {"loki": {}},
        "zabbix-agent": {},
        "prometheus": {"node-exporter": {}, "blackbox-exporter": {}},
        "network-event": {},
    }}}
    parsed = get_service_monitoring_mapper("1.5").parse_config(tree)
    assert parsed["telegraf"]["loki"]["url"] is None
    assert parsed["telegraf"]["influxdb"] is None
    assert parsed["zabbix_agent"]["servers"] == []
    assert parsed["prometheus"]["node_exporter"]["textfile_collector"] is False
    assert parsed["prometheus"]["frr_exporter"] is None
    assert parsed["prometheus"]["blackbox_exporter"]["icmp_modules"] == []
    assert parsed["network_event"]["events"] == []


def test_telegraf_zabbix_prometheus_and_events():
    parsed = get_service_monitoring_mapper("1.5").parse_config(_tree())
    assert type(parsed) is dict
    telegraf = parsed["telegraf"]
    assert telegraf["sources"] == ["cpu", "net"]
    assert telegraf["vrf"] == "mgmt"
    assert telegraf["influxdb"]["port"] == 8086
    assert telegraf["influxdb"]["authentication"]["organization"] == "ops"
    assert telegraf["loki"]["authentication"]["username"] == "loki"
    assert telegraf["splunk"]["authentication"]["insecure"] is True
    assert telegraf["azure_data_explorer"]["authentication"]["tenant_id"] == "tid"
    client = telegraf["prometheus_client"]
    assert client["metric_version"] == 2
    assert client["allow_from"] == ["10.0.0.1", "10.0.0.2"]
    assert client["authentication"]["username"] == "prom"

    zabbix = parsed["zabbix_agent"]
    assert zabbix["host_name"] == "edge"
    assert zabbix["port"] == 10050
    assert zabbix["listen_addresses"] == ["10.1.1.1", "10.1.1.2"]
    assert zabbix["servers"] == ["zbx-a", "zbx-b"]
    assert zabbix["servers_active"] == [
        {"address": "10.2.2.1", "port": 10051},
        {"address": "10.2.2.2", "port": None},
    ]
    assert zabbix["authentication"]["psk_id"] == "psk-id"
    assert zabbix["limits"]["buffer_size"] == 100
    assert zabbix["log"]["remote_commands"] is True

    prometheus = parsed["prometheus"]
    assert prometheus["node_exporter"]["textfile_collector"] is True
    assert prometheus["node_exporter"]["listen_addresses"] == ["0.0.0.0"]
    assert prometheus["frr_exporter"]["port"] == 9342
    assert prometheus["frr_exporter"]["vrf"] == "mgmt"
    blackbox = prometheus["blackbox_exporter"]
    assert [item["name"] for item in blackbox["icmp_modules"]] == ["bare", "ping"]
    assert blackbox["icmp_modules"][1]["ip_protocol_fallback"] is True
    assert blackbox["icmp_modules"][1]["timeout"] == 2
    assert blackbox["icmp_modules"][0]["preferred_ip_protocol"] is None
    assert blackbox["dns_modules"][0]["query_name"] == "example.com"
    assert blackbox["dns_modules"][0]["query_type"] == "A"

    assert parsed["network_event"]["log_level"] == "info"
    assert parsed["network_event"]["queue_size"] == 1000
    assert parsed["network_event"]["events"] == ["addr", "link"]
    assert get_service_monitoring_mapper("1.4").parse_config(_tree()) == parsed


def test_empty_tree():
    assert get_service_monitoring_mapper("1.4").parse_config({}) == _empty()
    assert get_service_monitoring_mapper("1.5").parse_config({"service": {}}) == _empty()


def test_bare_root_is_configured():
    """Deleting the last child leaves `service monitoring {}`; it still exists."""
    parsed = get_service_monitoring_mapper("1.5").parse_config({"service": {"monitoring": {}}})
    assert parsed == {**_empty(), "configured": True}



def test_get_config_returns_mapper_parse(monkeypatch):
    tree = _tree()
    expected = get_service_monitoring_mapper("1.5").parse_config(tree)

    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return tree

    monkeypatch.setattr(
        "routers.service_monitoring.service_monitoring.require_read_permission",
        allow,
    )
    monkeypatch.setattr(
        "routers.service_monitoring.service_monitoring.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.service_monitoring.service_monitoring import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    response = client.get("/vyos/service-monitoring/config")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["telegraf"]["splunk"]["authentication"]["insecure"] is True
    assert body["zabbix_agent"]["servers_active"][1]["port"] is None
    assert body["prometheus"]["blackbox_exporter"]["dns_modules"][0]["query_name"] == "example.com"
    assert body["network_event"]["events"] == expected["network_event"]["events"]
    assert body["telegraf"]["influxdb"]["authentication"]["token"] == MASKED_SECRET
    assert body["zabbix_agent"]["authentication"]["psk_secret"] == MASKED_SECRET
    assert body == expected
