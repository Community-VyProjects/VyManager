"""Path building utilities for VyOS configuration paths."""

from typing import List, Union


def build_path(*segments: Union[str, List[str]]) -> List[str]:
    """
    Build a configuration path from segments.
    
    Args:
        *segments: Path segments (strings or lists of strings)
    
    Returns:
        Flattened list of path segments
    
    Examples:
        build_path("interfaces", "ethernet", "eth0") 
        -> ["interfaces", "ethernet", "eth0"]
        
        build_path(["interfaces", "ethernet"], "address", "192.168.1.1/24")
        -> ["interfaces", "ethernet", "address", "192.168.1.1/24"]
    """
    result = []
    for segment in segments:
        if isinstance(segment, list):
            result.extend(segment)
        else:
            result.append(str(segment))
    return result

