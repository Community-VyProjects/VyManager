class LoadBalancingMapperV1_5:
    """
    VyOS 1.5 specific overrides for load-balancing.

    Key differences vs 1.4:
    - Uses 'haproxy' instead of 'reverse-proxy' (handled in base mapper via _rp_key)
    - http-compression available on services
    - listen-address is a tag node (per-address options, accept-proxy sub-option)
    - server check port available on backends
    - wildcard-domain available in backend rules
    - WAN rules support source/destination group matching
    """
    pass
