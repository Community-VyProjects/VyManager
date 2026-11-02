"""Shared SSH connections with per-instance host-key pinning."""

import logging
from typing import Any

import asyncssh

logger = logging.getLogger(__name__)


class SshHostKeyRejected(Exception):
    """The pinned host key does not match the server.

    This is not an asyncssh.Error. Callers that treat asyncssh.Error as a
    generic connection failure must not swallow a changed key.
    """

    message = "SSH host key changed; connection refused"

    def __init__(self) -> None:
        super().__init__(self.message)


def _pinned_known_hosts(host: str, port: int, public_key: str) -> asyncssh.SSHKnownHosts:
    """Build a known-hosts object for one endpoint.

    AsyncSSH treats a str known_hosts value as a filename. A line of key
    material passed as a string is never checked.
    """
    key = (public_key or "").strip()
    if not key or "\n" in key or "\r" in key:
        raise SshHostKeyRejected()
    pattern = host if port == 22 else f"[{host}]:{port}"
    try:
        hosts = asyncssh.import_known_hosts(f"{pattern} {key}")
    except ValueError as exc:
        raise SshHostKeyRejected() from exc
    lookup_port = None if port == 22 else port
    if not hosts.match(host, "", lookup_port)[0]:
        raise SshHostKeyRejected()
    return hosts


async def connect(
    *,
    db_conn: Any,
    instance_id: str,
    host: str,
    port: int = 22,
    **kwargs: Any,
) -> asyncssh.SSHClientConnection:
    """Connect and pin the server host key for this instance and endpoint.

    The first connection to an endpoint is accepted once and stored. Later
    connections are verified against that key. A changed key is refused
    and the stored pin is left unchanged. Callers cannot disable the check
    by passing known_hosts.
    """
    if not instance_id or not host:
        raise ValueError("SSH host key pinning requires an instance and host")
    try:
        port = int(port)
    except (TypeError, ValueError) as exc:
        raise ValueError("SSH port must be an integer") from exc
    if port < 1 or port > 65535:
        raise ValueError("SSH port must be an integer")

    # A caller-supplied known_hosts=None would disable verification.
    kwargs.pop("known_hosts", None)
    endpoint = f"{instance_id}:{host}:{port}"

    async def _connect_locked() -> asyncssh.SSHClientConnection:
        await db_conn.execute(
            "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
            endpoint,
        )
        row = await db_conn.fetchrow(
            """
            SELECT "hostKey"
            FROM ssh_host_keys
            WHERE "instanceId" = $1 AND host = $2 AND port = $3
            """,
            instance_id,
            host,
            port,
        )

        if row is not None:
            pinned = _pinned_known_hosts(host, port, row["hostKey"])
            try:
                return await asyncssh.connect(
                    host,
                    port=port,
                    known_hosts=pinned,
                    **kwargs,
                )
            except asyncssh.HostKeyNotVerifiable as exc:
                logger.warning(
                    "SSH host key rejected for instance %s at %s:%s",
                    instance_id,
                    host,
                    port,
                )
                raise SshHostKeyRejected() from exc

        connection = await asyncssh.connect(
            host,
            port=port,
            known_hosts=None,
            **kwargs,
        )
        try:
            server_key = connection.get_server_host_key()
            if server_key is None:
                raise asyncssh.HostKeyNotVerifiable(
                    "SSH server did not provide a host key"
                )
            public_key = server_key.export_public_key().decode("utf-8").strip()
            if not public_key or "\n" in public_key or "\r" in public_key:
                raise asyncssh.HostKeyNotVerifiable(
                    "SSH server host key could not be pinned"
                )
            await db_conn.execute(
                """
                INSERT INTO ssh_host_keys ("instanceId", host, port, "hostKey")
                VALUES ($1, $2, $3, $4)
                """,
                instance_id,
                host,
                port,
                public_key,
            )
        except Exception:
            connection.close()
            raise
        return connection

    if db_conn.is_in_transaction():
        return await _connect_locked()

    async with db_conn.transaction():
        return await _connect_locked()
