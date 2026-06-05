"""TFTP server command mapper package."""
from .tftp_server import TFTPServerMapper
from .tftp_server_versions import get_tftp_server_mapper

__all__ = ["TFTPServerMapper", "get_tftp_server_mapper"]
