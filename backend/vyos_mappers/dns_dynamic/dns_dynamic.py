"""DNS Dynamic Service Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "dns", "dynamic"]


class DNSDynamicMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Global settings
    # ========================================================================

    def get_dynamic_delete(self) -> List[str]:
        return BASE

    def get_interval(self, value: str) -> List[str]:
        return BASE + ["interval", value]

    def get_interval_delete(self) -> List[str]:
        return BASE + ["interval"]

    def get_vrf(self, name: str) -> List[str]:
        return BASE + ["vrf", name]

    def get_vrf_delete(self) -> List[str]:
        return BASE + ["vrf"]

    # ========================================================================
    # Named Dynamic DNS entries (tagged: name/<name>/...)
    # ========================================================================

    def get_name(self, name: str) -> List[str]:
        return BASE + ["name", name]

    def get_name_delete(self, name: str) -> List[str]:
        return BASE + ["name", name]

    def get_name_protocol(self, name: str, protocol: str) -> List[str]:
        return BASE + ["name", name, "protocol", protocol]

    def get_name_protocol_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "protocol"]

    def get_name_server(self, name: str, server: str) -> List[str]:
        return BASE + ["name", name, "server", server]

    def get_name_server_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "server"]

    def get_name_username(self, name: str, username: str) -> List[str]:
        return BASE + ["name", name, "username", username]

    def get_name_username_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "username"]

    def get_name_password(self, name: str, password: str) -> List[str]:
        return BASE + ["name", name, "password", password]

    def get_name_password_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "password"]

    def get_name_hostname(self, name: str, hostname: str) -> List[str]:
        return BASE + ["name", name, "host-name", hostname]

    def get_name_hostname_delete(self, name: str, hostname: str) -> List[str]:
        return BASE + ["name", name, "host-name", hostname]

    def get_name_hostnames_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "host-name"]

    def get_name_ip_version(self, name: str, version: str) -> List[str]:
        return BASE + ["name", name, "ip-version", version]

    def get_name_ip_version_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "ip-version"]

    def get_name_address_interface(self, name: str, iface: str) -> List[str]:
        return BASE + ["name", name, "address", "interface", iface]

    def get_name_address_interface_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "address", "interface"]

    def get_name_address_web_url(self, name: str, url: str) -> List[str]:
        return BASE + ["name", name, "address", "web", "url", url]

    def get_name_address_web_url_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "address", "web", "url"]

    def get_name_address_web_skip(self, name: str, skip: str) -> List[str]:
        return BASE + ["name", name, "address", "web", "skip", skip]

    def get_name_address_web_skip_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "address", "web", "skip"]

    def get_name_description(self, name: str, description: str) -> List[str]:
        return BASE + ["name", name, "description", description]

    def get_name_description_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "description"]

    def get_name_ttl(self, name: str, ttl: str) -> List[str]:
        return BASE + ["name", name, "ttl", ttl]

    def get_name_ttl_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "ttl"]

    def get_name_key(self, name: str, key: str) -> List[str]:
        return BASE + ["name", name, "key", key]

    def get_name_key_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "key"]

    def get_name_expiry_time(self, name: str, value: str) -> List[str]:
        return BASE + ["name", name, "expiry-time", value]

    def get_name_expiry_time_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "expiry-time"]

    def get_name_wait_time(self, name: str, value: str) -> List[str]:
        return BASE + ["name", name, "wait-time", value]

    def get_name_wait_time_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "wait-time"]

    def get_name_zone(self, name: str, zone: str) -> List[str]:
        return BASE + ["name", name, "zone", zone]

    def get_name_zone_delete(self, name: str) -> List[str]:
        return BASE + ["name", name, "zone"]
