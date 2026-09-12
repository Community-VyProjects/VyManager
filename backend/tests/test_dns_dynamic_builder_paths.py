"""Golden (method, args, expected_path) cases for DNSDynamicBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from vyos_builders.dns_dynamic.dns_dynamic_batch_builder import DNSDynamicBatchBuilder

BASE = ["service", "dns", "dynamic"]
NAME = BASE + ["name", "home"]

CASES = [
    ("delete_dynamic", (), "delete", BASE),
    ("set_interval", ("300",), "set", BASE + ["interval", "300"]),
    ("delete_interval", (), "delete", BASE + ["interval"]),
    ("set_vrf", ("mgmt",), "set", BASE + ["vrf", "mgmt"]),
    ("delete_vrf", (), "delete", BASE + ["vrf"]),
    ("delete_name", ("home",), "delete", NAME),
    ("set_name_protocol", ("home", "dyndns2"), "set", NAME + ["protocol", "dyndns2"]),
    ("delete_name_protocol", ("home",), "delete", NAME + ["protocol"]),
    ("set_name_server", ("home", "members.dyndns.org"), "set", NAME + ["server", "members.dyndns.org"]),
    ("delete_name_server", ("home",), "delete", NAME + ["server"]),
    ("set_name_username", ("home", "user"), "set", NAME + ["username", "user"]),
    ("delete_name_username", ("home",), "delete", NAME + ["username"]),
    ("set_name_password", ("home", "secret"), "set", NAME + ["password", "secret"]),
    ("delete_name_password", ("home",), "delete", NAME + ["password"]),
    ("set_name_hostname", ("home", "host.example.com"), "set", NAME + ["host-name", "host.example.com"]),
    ("delete_name_hostname", ("home", "host.example.com"), "delete", NAME + ["host-name", "host.example.com"]),
    ("delete_name_hostnames", ("home",), "delete", NAME + ["host-name"]),
    ("set_name_ip_version", ("home", "ipv4"), "set", NAME + ["ip-version", "ipv4"]),
    ("delete_name_ip_version", ("home",), "delete", NAME + ["ip-version"]),
    ("set_name_address_interface", ("home", "eth0"), "set", NAME + ["address", "interface", "eth0"]),
    ("delete_name_address_interface", ("home",), "delete", NAME + ["address", "interface"]),
    ("set_name_address_web_url", ("home", "https://checkip.example"), "set", NAME + ["address", "web", "url", "https://checkip.example"]),
    ("delete_name_address_web_url", ("home",), "delete", NAME + ["address", "web", "url"]),
    ("set_name_address_web_skip", ("home", "CurrentIPAddress:"), "set", NAME + ["address", "web", "skip", "CurrentIPAddress:"]),
    ("delete_name_address_web_skip", ("home",), "delete", NAME + ["address", "web", "skip"]),
    ("set_name_description", ("home", "home-wan"), "set", NAME + ["description", "home-wan"]),
    ("delete_name_description", ("home",), "delete", NAME + ["description"]),
    ("set_name_ttl", ("home", "300"), "set", NAME + ["ttl", "300"]),
    ("delete_name_ttl", ("home",), "delete", NAME + ["ttl"]),
    ("set_name_key", ("home", "/config/auth/ddns.key"), "set", NAME + ["key", "/config/auth/ddns.key"]),
    ("delete_name_key", ("home",), "delete", NAME + ["key"]),
    ("set_name_expiry_time", ("home", "30"), "set", NAME + ["expiry-time", "30"]),
    ("delete_name_expiry_time", ("home",), "delete", NAME + ["expiry-time"]),
    ("set_name_wait_time", ("home", "60"), "set", NAME + ["wait-time", "60"]),
    ("delete_name_wait_time", ("home",), "delete", NAME + ["wait-time"]),
    ("set_name_zone", ("home", "example.com"), "set", NAME + ["zone", "example.com"]),
    ("delete_name_zone", ("home",), "delete", NAME + ["zone"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dns_dynamic_builder_paths(method, args, op, expected_path, version):
    builder = DNSDynamicBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
