"""Appliance (on-box) deployment profile.

VYMANAGER_MODE=appliance seeds one site+instance and changes session chrome.
Unset keeps the VPS multi-site path.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

MODE_ENV = "VYMANAGER_MODE"
SITE_ID = "appliance_site"
INSTANCE_ID = "appliance_instance"
SITE_NAME = "Local"
INSTANCE_NAME = "This router"
ORG_ID = "default"
TIMEOUT_SECONDS = 300


def is_appliance() -> bool:
    return os.getenv(MODE_ENV, "").strip().lower() == "appliance"


def home_path() -> str:
    return "/" if is_appliance() else "/sites"


def no_instance_redirect() -> str:
    return home_path()


@dataclass(frozen=True)
class ApplianceSeedConfig:
    host: str
    api_key: str
    version: str
    port: int = 443
    protocol: str = "https"
    verify_ssl: bool = False
    timeout: int = TIMEOUT_SECONDS


def load_seed_config() -> ApplianceSeedConfig:
    missing: list[str] = []
    host = (os.getenv("VYMANAGER_APPLIANCE_HOST") or "").strip()
    api_key = (os.getenv("VYMANAGER_APPLIANCE_API_KEY") or "").strip()
    version = (os.getenv("VYMANAGER_APPLIANCE_VERSION") or "").strip()
    if not host:
        missing.append("VYMANAGER_APPLIANCE_HOST")
    if not api_key:
        missing.append("VYMANAGER_APPLIANCE_API_KEY")
    if version not in ("1.4", "1.5"):
        missing.append("VYMANAGER_APPLIANCE_VERSION")
    if missing:
        raise ValueError("appliance mode missing or invalid: " + ", ".join(missing))

    port_raw = (os.getenv("VYMANAGER_APPLIANCE_PORT") or "443").strip()
    try:
        port = int(port_raw)
    except ValueError as exc:
        raise ValueError("VYMANAGER_APPLIANCE_PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise ValueError("VYMANAGER_APPLIANCE_PORT out of range")

    protocol = (os.getenv("VYMANAGER_APPLIANCE_PROTOCOL") or "https").strip().lower()
    if protocol not in ("http", "https"):
        raise ValueError("VYMANAGER_APPLIANCE_PROTOCOL must be http or https")

    verify_raw = (os.getenv("VYMANAGER_APPLIANCE_VERIFY_SSL") or "").strip().lower()
    verify_ssl = verify_raw in {"1", "true", "t", "yes", "y"}
    return ApplianceSeedConfig(
        host=host,
        api_key=api_key,
        version=version,
        port=port,
        protocol=protocol,
        verify_ssl=verify_ssl,
        timeout=TIMEOUT_SECONDS,
    )


async def seed_appliance(conn) -> None:
    if not is_appliance():
        return
    cfg = load_seed_config()
    await conn.execute(
        """
        INSERT INTO sites (id, name, description, "orgId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        """,
        SITE_ID,
        SITE_NAME,
        "This router",
        ORG_ID,
    )
    await conn.execute(
        """
        INSERT INTO instances (
            id, "siteId", name, description, host, port, username, password,
            "apiKey", "vyosVersion", protocol, "verifySsl", "isActive",
            "sshPort", timeout, "createdAt", "updatedAt"
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, 'api', '',
            $7, $8, $9, $10, true,
            22, $11, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
        """,
        INSTANCE_ID,
        SITE_ID,
        INSTANCE_NAME,
        "Local VyOS instance",
        cfg.host,
        cfg.port,
        cfg.api_key,
        cfg.version,
        cfg.protocol,
        cfg.verify_ssl,
        cfg.timeout,
    )


async def local_instance_id(conn) -> Optional[str]:
    if not is_appliance():
        return None
    return await conn.fetchval(
        "SELECT id FROM instances WHERE id = $1",
        INSTANCE_ID,
    )
