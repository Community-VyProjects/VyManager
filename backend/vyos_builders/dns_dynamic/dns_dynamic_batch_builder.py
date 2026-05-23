"""DNS Dynamic Service Batch Builder.

Generates VyOS set/delete operations for the dns dynamic service (ddclient).

Configuration lives under: service dns dynamic

Structure:
  service dns dynamic
    interval <60-3600>         # Update check interval (default: 300)
    vrf <name>                 # VRF instance
    name <name>                # Named DDNS entry (tagged)
      protocol <protocol>      # ddclient protocol (e.g. dyndns2, cloudflare)
      server <hostname>        # DDNS service server
      username <user>          # Authentication username
      password <pass>          # Authentication password
      host-name <fqdn>         # Hostname(s) to update (multi-value)
      ip-version ipv4|ipv6|both
      address
        interface <iface>      # Get IP from interface
        web
          url <url>            # Get IP from web service
          skip <words>         # Skip words in web response
      description <text>
      ttl <seconds>
      key <keyfile>
      expiry-time <days>
      wait-time <seconds>
      zone <zone>

The template structure is identical between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DNSDynamicBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["dns_dynamic"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "DNSDynamicBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DNSDynamicBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "interval": {
                    "supported": True,
                    "description": "Check interval in seconds (default: 300)",
                    "default": 300,
                    "min": 60,
                    "max": 3600,
                },
                "vrf": {
                    "supported": True,
                    "description": "VRF instance name",
                },
                "name": {
                    "supported": True,
                    "description": "Named Dynamic DNS entry",
                    "fields": {
                        "protocol": "ddclient protocol (e.g. dyndns2, cloudflare, namecheap)",
                        "server": "DDNS service hostname",
                        "username": "Authentication username",
                        "password": "Authentication password",
                        "host_name": "Hostname(s) to update (multi-value)",
                        "ip_version": "IP version: ipv4, ipv6, or both (default: ipv4)",
                        "address_interface": "Interface to get IP address from",
                        "address_web_url": "Web URL to get IP address from",
                        "address_web_skip": "Words to skip in web response",
                        "description": "Entry description",
                        "ttl": "DNS TTL in seconds",
                        "key": "Key file path",
                        "expiry_time": "Expiry time in days",
                        "wait_time": "Wait time between updates in seconds",
                        "zone": "DNS zone",
                    },
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global settings
    # -----------------------------------------------------------------------

    def delete_dynamic(self) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_dynamic_delete())

    def set_interval(self, value: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_interval(value))

    def delete_interval(self) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_interval_delete())

    def set_vrf(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_vrf(name))

    def delete_vrf(self) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_vrf_delete())

    # -----------------------------------------------------------------------
    # Named entries
    # -----------------------------------------------------------------------

    def delete_name(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_delete(name))

    def set_name_protocol(self, name: str, protocol: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_protocol(name, protocol))

    def delete_name_protocol(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_protocol_delete(name))

    def set_name_server(self, name: str, server: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_server(name, server))

    def delete_name_server(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_server_delete(name))

    def set_name_username(self, name: str, username: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_username(name, username))

    def delete_name_username(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_username_delete(name))

    def set_name_password(self, name: str, password: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_password(name, password))

    def delete_name_password(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_password_delete(name))

    def set_name_hostname(self, name: str, hostname: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_hostname(name, hostname))

    def delete_name_hostname(self, name: str, hostname: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_hostname_delete(name, hostname))

    def delete_name_hostnames(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_hostnames_delete(name))

    def set_name_ip_version(self, name: str, version: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_ip_version(name, version))

    def delete_name_ip_version(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_ip_version_delete(name))

    def set_name_address_interface(self, name: str, iface: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_address_interface(name, iface))

    def delete_name_address_interface(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_address_interface_delete(name))

    def set_name_address_web_url(self, name: str, url: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_address_web_url(name, url))

    def delete_name_address_web_url(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_address_web_url_delete(name))

    def set_name_address_web_skip(self, name: str, skip: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_address_web_skip(name, skip))

    def delete_name_address_web_skip(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_address_web_skip_delete(name))

    def set_name_description(self, name: str, description: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_description(name, description))

    def delete_name_description(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_description_delete(name))

    def set_name_ttl(self, name: str, ttl: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_ttl(name, ttl))

    def delete_name_ttl(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_ttl_delete(name))

    def set_name_key(self, name: str, key: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_key(name, key))

    def delete_name_key(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_key_delete(name))

    def set_name_expiry_time(self, name: str, value: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_expiry_time(name, value))

    def delete_name_expiry_time(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_expiry_time_delete(name))

    def set_name_wait_time(self, name: str, value: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_wait_time(name, value))

    def delete_name_wait_time(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_wait_time_delete(name))

    def set_name_zone(self, name: str, zone: str) -> "DNSDynamicBatchBuilder":
        return self.add_set(self.m.get_name_zone(name, zone))

    def delete_name_zone(self, name: str) -> "DNSDynamicBatchBuilder":
        return self.add_delete(self.m.get_name_zone_delete(name))
