"""Configuration loader for VyOS device from .env file."""

import os
from typing import Literal, Optional
from dotenv import load_dotenv
from vyos_service import VyOSDeviceConfig


class DeviceConfigFromEnv:
    """Represents the single device configuration loaded from environment variables."""

    def __init__(
        self,
        name: str,
        hostname: str,
        apikey: str,
        version: Literal["1.4", "1.5"],
        protocol: str = "https",
        port: int = 443,
        verify_ssl: bool = False,
        timeout: int = 10,
    ):
        self.name = name
        self.hostname = hostname
        self.apikey = apikey
        self.version = version
        self.protocol = protocol
        self.port = port
        self.verify_ssl = verify_ssl
        self.timeout = timeout

    def to_vyos_config(self) -> tuple[str, VyOSDeviceConfig]:
        """Convert to VyOSDeviceConfig for registration."""
        config = VyOSDeviceConfig(
            hostname=self.hostname,
            apikey=self.apikey,
            version=self.version,
            protocol=self.protocol,
            port=self.port,
            verify=self.verify_ssl,
            timeout=self.timeout,
        )
        return self.name, config


def load_env_file(env_path: str = ".env") -> None:
    """Load environment variables from .env file."""
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"✓ Loaded environment variables from {env_path}")
    else:
        print(f"⚠ No {env_path} file found - device configuration required")


def parse_device_from_env() -> Optional[DeviceConfigFromEnv]:
    """
    Parse single device configuration from environment variables.

    Looks for VYOS_* variables:
    Required variables:
        - VYOS_NAME: Unique identifier for the device
        - VYOS_HOSTNAME: IP address or hostname of VyOS device
        - VYOS_APIKEY: API key for authentication
        - VYOS_VERSION: VyOS version (1.4 or 1.5)

    Optional variables (with defaults):
        - VYOS_PROTOCOL: http or https (default: https)
        - VYOS_PORT: Port number 1-65535 (default: 443)
        - VYOS_VERIFY_SSL: SSL verification true/false (default: false)
        - VYOS_TIMEOUT: Request timeout in seconds (default: 10)

    Returns:
        DeviceConfigFromEnv object or None if configuration is missing/invalid
    """
    # Check required fields
    name = os.getenv("VYOS_NAME")
    hostname = os.getenv("VYOS_HOSTNAME")
    apikey = os.getenv("VYOS_APIKEY")
    version = os.getenv("VYOS_VERSION")

    if not all([name, hostname, apikey, version]):
        missing = []
        if not name:
            missing.append("VYOS_NAME")
        if not hostname:
            missing.append("VYOS_HOSTNAME")
        if not apikey:
            missing.append("VYOS_APIKEY")
        if not version:
            missing.append("VYOS_VERSION")
        print(f"✗ Missing required environment variables: {', '.join(missing)}")
        return None

    # Validate version
    if version not in ["1.4", "1.5"]:
        print(f"✗ Invalid VYOS_VERSION '{version}' (must be 1.4 or 1.5)")
        return None

    # Parse optional fields with defaults
    protocol = os.getenv("VYOS_PROTOCOL", "https").lower()
    if protocol not in ["http", "https"]:
        print(f"✗ Invalid VYOS_PROTOCOL '{protocol}' (must be http or https)")
        return None

    try:
        port = int(os.getenv("VYOS_PORT", "443"))
        if not (1 <= port <= 65535):
            raise ValueError()
    except ValueError:
        print(f"✗ Invalid VYOS_PORT (must be 1-65535)")
        return None

    verify_ssl_str = os.getenv("VYOS_VERIFY_SSL", "false").lower()
    verify_ssl = verify_ssl_str in ["true", "1", "yes"]

    try:
        timeout = int(os.getenv("VYOS_TIMEOUT", "10"))
        if timeout <= 0:
            raise ValueError()
    except ValueError:
        print(f"✗ Invalid VYOS_TIMEOUT (must be positive integer)")
        return None

    # Create device config
    device = DeviceConfigFromEnv(
        name=name,
        hostname=hostname,
        apikey=apikey,
        version=version,  # type: ignore
        protocol=protocol,
        port=port,
        verify_ssl=verify_ssl,
        timeout=timeout,
    )

    print(f"✓ Loaded device config: {device.name} ({device.hostname}, VyOS {device.version})")
    return device


def load_device_from_env(env_path: str = ".env") -> Optional[DeviceConfigFromEnv]:
    """
    Load .env file and parse device configuration.

    Args:
        env_path: Path to .env file (default: .env)

    Returns:
        DeviceConfigFromEnv object or None if configuration is missing/invalid
    """
    load_env_file(env_path)
    return parse_device_from_env()
