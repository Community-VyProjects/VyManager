"""Shared SSH connection handling with per-instance host-key pinning."""

from typing import Any

import asyncssh


def _known_hosts_entry(host: str, port: int, public_key: bytes) -> str:
    host_pattern = host if port == 22 else f"[{host}]:{port}"
    return f"{host_pattern} {public_key.decode('utf-8')}"


async def connect(
    *,
    db_conn: Any,
    instance_id: str,
    host: str,
    port: int = 22,
    **kwargs: Any,
) -> asyncssh.SSHClientConnection:
    """Connect to SSH and pin the server key for this instance and endpoint.

    The database transaction serializes first-use connections for the same
    instance/endpoint. A missing key is accepted once and immediately stored;
    all subsequent connections are verified by AsyncSSH.
    """
    endpoint = f"{instance_id}:{host}:{port}"

    async def _connect_locked() -> asyncssh.SSHClientConnection:
        await db_conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", endpoint)
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

        if row and row["hostKey"]:
            kwargs["known_hosts"] = _known_hosts_entry(
                host, port, row["hostKey"].encode("utf-8")
            )
            return await asyncssh.connect(host, port=port, **kwargs)

        connection = await asyncssh.connect(
            host,
            port=port,
            known_hosts=None,
            **kwargs,
        )
        server_key = connection.get_server_host_key()
        if server_key is None:
            connection.close()
            raise asyncssh.HostKeyNotVerifiable(
                "SSH server did not provide a host key"
            )

        public_key = server_key.export_public_key().decode("utf-8")
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
        return connection

    if db_conn.is_in_transaction():
        return await _connect_locked()

    async with db_conn.transaction():
        return await _connect_locked()
