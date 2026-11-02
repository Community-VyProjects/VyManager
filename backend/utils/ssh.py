"""Shared SSH connections with per-instance host-key pinning."""

import logging
from typing import Any, Callable

import asyncssh

logger = logging.getLogger(__name__)


class SshHostKeyRejected(Exception):
    """The pinned host key does not match the server.

    This is not an asyncssh.Error. Callers that treat asyncssh.Error as a
    generic connection failure must not swallow a changed key.
    """

    message = (
        "SSH host key changed; connection refused. "
        "An administrator can reset the host key in instance SSH settings."
    )

    def __init__(self) -> None:
        super().__init__(self.message)


def _changed_host_key(exc: BaseException) -> bool:
    """True only for a host-key mismatch, not a cipher or kex failure.

    AsyncSSH reports a different host-key type as KeyExchangeFailed with
    'server host key' in the reason. Other negotiation failures use that
    same exception and must stay generic connection errors.
    """
    if isinstance(exc, asyncssh.HostKeyNotVerifiable):
        return True
    return (
        isinstance(exc, asyncssh.KeyExchangeFailed)
        and "server host key" in str(exc)
    )


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


async def forget_instance_pins(db_conn: Any, instance_id: str) -> None:
    """Drop every pin for an instance. The next connection accepts one new key."""
    await db_conn.execute(
        'DELETE FROM ssh_host_keys WHERE "instanceId" = $1',
        instance_id,
    )


async def forget_replaced_router_pin(
    db_conn: Any,
    instance_id: str,
    old_host: str,
    old_port: int,
    new_host: str,
    new_port: int,
) -> None:
    """Drop the router pin when the instance host or SSH port changes.

    Archive pins are for other hosts and are left in place.
    """
    if old_host == new_host and int(old_port) == int(new_port):
        return
    await db_conn.execute(
        """
        DELETE FROM ssh_host_keys
        WHERE "instanceId" = $1 AND host = $2 AND port = $3
        """,
        instance_id,
        old_host,
        int(old_port),
    )


async def _in_transaction(db: Any, work):
    """Run work inside the caller's org transaction, or a short one."""
    if db.is_in_transaction():
        return await work(db)
    async with db.transaction():
        return await work(db)


async def _read_pin(open_conn: Callable, instance_id: str, host: str, port: int):
    async with open_conn() as db:
        async def read(conn):
            return await conn.fetchrow(
                """
                SELECT "hostKey"
                FROM ssh_host_keys
                WHERE "instanceId" = $1 AND host = $2 AND port = $3
                """,
                instance_id,
                host,
                port,
            )

        return await _in_transaction(db, read)


async def _store_pin(
    open_conn: Callable,
    instance_id: str,
    host: str,
    port: int,
    public_key: str,
    endpoint: str,
) -> bool:
    """Commit the pin before the caller uses the SSH connection.

    Returns False when a different key was stored first. The lock covers
    only this insert, not the handshake. open_conn must be a short
    org-scoped connection, not one held across the handshake.
    """
    async with open_conn() as db:
        async def store(conn) -> bool:
            await conn.execute(
                "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
                endpoint,
            )
            existing = await conn.fetchrow(
                """
                SELECT "hostKey"
                FROM ssh_host_keys
                WHERE "instanceId" = $1 AND host = $2 AND port = $3
                """,
                instance_id,
                host,
                port,
            )
            if existing is not None:
                return (existing["hostKey"] or "").strip() == public_key
            await conn.execute(
                """
                INSERT INTO ssh_host_keys ("instanceId", host, port, "hostKey")
                VALUES ($1, $2, $3, $4)
                """,
                instance_id,
                host,
                port,
                public_key,
            )
            return True

        return await _in_transaction(db, store)


async def connect(
    *,
    open_conn: Callable,
    instance_id: str,
    host: str,
    port: int = 22,
    **kwargs: Any,
) -> asyncssh.SSHClientConnection:
    """Connect and pin the server host key for this instance and endpoint.

    open_conn returns a short org-scoped connection. It is closed before
    the handshake and opened again only to commit a first-use pin. The
    first connection to an endpoint is accepted once. Later connections
    are verified against that key. A changed key is refused and the stored
    pin is left unchanged. Callers cannot disable the check by passing
    known_hosts.
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

    row = await _read_pin(open_conn, instance_id, host, port)
    if row is not None:
        pinned = _pinned_known_hosts(host, port, row["hostKey"])
        try:
            return await asyncssh.connect(
                host,
                port=port,
                known_hosts=pinned,
                **kwargs,
            )
        except (asyncssh.HostKeyNotVerifiable, asyncssh.KeyExchangeFailed) as exc:
            if not _changed_host_key(exc):
                raise
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
        stored_same = await _store_pin(
            open_conn, instance_id, host, port, public_key, endpoint,
        )
        if not stored_same:
            raise SshHostKeyRejected()
    except BaseException:
        connection.close()
        raise
    return connection
