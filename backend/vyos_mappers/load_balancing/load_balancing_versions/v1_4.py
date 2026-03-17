class LoadBalancingMapperV1_4:
    """
    VyOS 1.4 specific overrides for load-balancing.

    Key differences vs 1.5:
    - Uses 'reverse-proxy' instead of 'haproxy' (handled in base mapper via _rp_key)
    - No http-compression on services
    - listen-address is a multi node (list of IPs, no accept-proxy sub-option)
    - No server check port on backends
    - No wildcard-domain in backend rules
    - Log facility allows extra values: all, authpriv, mark
    - Log level allows extra value: all
    """
    pass
