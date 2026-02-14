"""
VyOS 1.4 System Option Performance Mapper

1.4 only supports: throughput, latency.
"""

from typing import List

from ..performance import SystemPerformanceMapper, PERFORMANCE_OPTION


class SystemPerformanceMapper_v1_4(SystemPerformanceMapper):
    """VyOS 1.4: system option performance has only throughput and latency."""

    def get_valid_performance_options(self) -> List[PERFORMANCE_OPTION]:
        return [
            ("throughput", "Throughput", "Tune for maximum network throughput"),
            ("latency", "Latency", "Tune for low network latency"),
        ]
