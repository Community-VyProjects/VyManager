"""VyOS 1.4 DNS Forwarding mapper — zone-cache is 1.5-only.

Set methods raise. Delete helpers stay on the base mapper so a stale
zone-cache node can still be removed.
"""


class DNSForwardingMapperV1_4:
    def supports_zone_cache(self) -> bool:
        return False

    def get_zone_cache_url(self, zone: str, url: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_axfr(self, zone: str, ip: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_dnssec(self, zone: str, mode: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_max_zone_size(self, zone: str, size: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_refresh_interval(self, zone: str, interval: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_refresh_on_reload(self, zone: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_retry_interval(self, zone: str, interval: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_timeout(self, zone: str, timeout: str):
        raise NotImplementedError("not supported on this VyOS version")

    def get_zone_cache_zonemd(self, zone: str, mode: str):
        raise NotImplementedError("not supported on this VyOS version")
