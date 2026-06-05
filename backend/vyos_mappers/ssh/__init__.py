"""SSH service command mapper package."""
from .ssh import SSHMapper
from .ssh_versions import get_ssh_mapper

__all__ = ["SSHMapper", "get_ssh_mapper"]
