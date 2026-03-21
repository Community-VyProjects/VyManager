"""
Archive URL utilities for config restore from remote archive locations.

Handles:
  - Parsing archive URLs into components
  - Listing backup files at archive locations (SFTP, FTP, HTTP/S)
  - Transforming archive (save) URLs to load URLs (protocol-specific)
"""

import asyncio
import ftplib
import ipaddress
import logging
import re
import socket
from typing import Dict, List, Optional
from urllib.parse import urlparse, urlunparse

import asyncssh
import httpx

logger = logging.getLogger(__name__)

# Only allow filenames matching VyOS backup pattern
_FILENAME_RE = re.compile(r"^config\.boot[\w.\-]*$")

_CONNECTION_TIMEOUT = 10

# Schemes allowed for HTTP-based archive listing
_ALLOWED_HTTP_SCHEMES = frozenset({"http", "https"})


def parse_archive_url(archive_url: str) -> Dict[str, Optional[str]]:
    """Parse an archive URL into its components."""
    parsed = urlparse(archive_url)
    path = parsed.path
    if not path.endswith("/"):
        path += "/"
    return {
        "scheme": parsed.scheme,
        "username": parsed.username,
        "password": parsed.password,
        "hostname": parsed.hostname,
        "port": parsed.port,
        "path": path,
    }


def validate_filename(filename: str) -> bool:
    """Validate filename against allowlist to prevent path traversal."""
    return bool(_FILENAME_RE.match(filename))


def _validate_http_url(url: str) -> str:
    """
    Validate and sanitise a URL for outbound HTTP requests.

    Ensures:
      - Scheme is http or https
      - Hostname resolves to a non-private IP (prevents SSRF to internal services)

    Returns the validated, credential-free URL string.
    Raises ValueError if the URL is unsafe.
    """
    parsed = urlparse(url)

    if parsed.scheme not in _ALLOWED_HTTP_SCHEMES:
        raise ValueError(f"Unsupported HTTP scheme: {parsed.scheme}")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Missing hostname in URL")

    # Resolve hostname and reject private/loopback addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Cannot resolve hostname: {exc}") from exc

    for family, _type, _proto, _canon, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError("Archive HTTP URL must not point to a private address")

    # Rebuild URL without credentials
    clean = parsed._replace(
        netloc=f"{hostname}" + (f":{parsed.port}" if parsed.port else "")
    )
    return urlunparse(clean)


async def list_archive_files(archive_url: str) -> List[Dict[str, Optional[str | int]]]:
    """
    List config backup files at the given archive location.

    Returns list of {"filename": str, "modified": str|None, "size": int|None}
    sorted by filename descending (newest first, since filenames contain timestamps).
    """
    parsed = urlparse(archive_url)
    scheme = (parsed.scheme or "").lower().rstrip("+")
    hostname = parsed.hostname or ""
    port = parsed.port
    username = parsed.username
    password = parsed.password
    path = parsed.path
    if not path.endswith("/"):
        path += "/"

    if scheme in ("scp", "sftp"):
        return await _list_sftp(
            hostname=hostname, port=port or 22,
            username=username or "vyos", password=password,
            path=path,
        )
    elif scheme == "ftp":
        return await _list_ftp(
            hostname=hostname, port=port or 21,
            username=username or "anonymous", password=password or "",
            path=path,
        )
    elif scheme in ("http", "https"):
        return await _list_http(archive_url)
    elif scheme == "tftp":
        return []  # TFTP has no directory listing support
    elif scheme.startswith("git"):
        return []  # git+https not supported for listing
    else:
        return []


async def _list_sftp(
    *, hostname: str, port: int, username: str,
    password: Optional[str], path: str,
) -> List[Dict]:
    """List files via SFTP (works for both scp:// and sftp:// archive URLs)."""
    connect_kwargs: Dict = {
        "host": hostname,
        "port": port,
        "username": username,
        "known_hosts": None,
    }
    if password:
        connect_kwargs["password"] = password

    try:
        conn = await asyncio.wait_for(
            asyncssh.connect(**connect_kwargs),
            timeout=_CONNECTION_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.warning("SFTP connection timed out")
        return []
    except (OSError, asyncssh.Error):
        logger.warning("SFTP connection failed")
        return []

    files = []
    try:
        async with conn:
            async with conn.start_sftp_client() as sftp:
                for entry in await sftp.readdir(path):
                    name = entry.filename
                    if not _FILENAME_RE.match(name):
                        continue
                    attrs = entry.attrs
                    modified = None
                    if attrs.mtime is not None:
                        from datetime import datetime, timezone
                        modified = datetime.fromtimestamp(
                            attrs.mtime, tz=timezone.utc
                        ).isoformat()
                    files.append({
                        "filename": name,
                        "modified": modified,
                        "size": attrs.size,
                    })
    except (asyncssh.SFTPError, OSError):
        logger.warning("SFTP directory listing failed")
        return []

    files.sort(key=lambda f: f["filename"], reverse=True)
    return files


async def _list_ftp(
    *, hostname: str, port: int, username: str,
    password: str, path: str,
) -> List[Dict]:
    """List files via FTP."""

    def _do_ftp() -> List[Dict]:
        files = []
        try:
            ftp = ftplib.FTP()
            ftp.connect(hostname, port, timeout=_CONNECTION_TIMEOUT)
            ftp.login(username, password)
            ftp.cwd(path)

            listing: List[Dict] = []
            ftp.retrlines("MLSD", lambda line: listing.append(_parse_mlsd_line(line)))

            for entry in listing:
                name = entry.get("name", "")
                if not _FILENAME_RE.match(name):
                    continue
                files.append({
                    "filename": name,
                    "modified": entry.get("modify"),
                    "size": int(entry["size"]) if entry.get("size") else None,
                })

            ftp.quit()
        except Exception:
            logger.warning("FTP directory listing failed")
            # Fallback: try NLST if MLSD fails
            try:
                ftp2 = ftplib.FTP()
                ftp2.connect(hostname, port, timeout=_CONNECTION_TIMEOUT)
                ftp2.login(username, password)
                ftp2.cwd(path)
                names = ftp2.nlst()
                for name in names:
                    if _FILENAME_RE.match(name):
                        files.append({"filename": name, "modified": None, "size": None})
                ftp2.quit()
            except Exception:
                pass

        files.sort(key=lambda f: f["filename"], reverse=True)
        return files

    return await asyncio.get_event_loop().run_in_executor(None, _do_ftp)


def _parse_mlsd_line(line: str) -> Dict:
    """Parse a single MLSD response line into a dict."""
    parts = line.split(";")
    result: Dict = {}
    # Last part after space is the filename
    last = parts[-1]
    if " " in last:
        key_val, name = last.split(" ", 1)
        parts[-1] = key_val
        result["name"] = name.strip()
    for part in parts:
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            result[k.lower()] = v
    return result


async def _list_http(archive_url: str) -> List[Dict]:
    """Best-effort HTTP directory listing (many servers won't support this)."""
    parsed = urlparse(archive_url)

    # Extract auth before validation strips credentials
    auth = None
    if parsed.username:
        auth = (parsed.username, parsed.password or "")

    # Validate scheme and reject private/loopback targets (SSRF protection)
    try:
        safe_url = _validate_http_url(archive_url)
    except ValueError:
        logger.warning("HTTP archive URL failed safety validation")
        return []

    files = []
    try:
        async with httpx.AsyncClient(timeout=_CONNECTION_TIMEOUT, verify=True) as client:
            resp = await client.get(safe_url, auth=auth)
            if resp.status_code != 200:
                return []
            links = re.findall(r'href=["\']([^"\']+)["\']', resp.text)
            for link in links:
                name = link.rstrip("/").rsplit("/", 1)[-1]
                if _FILENAME_RE.match(name):
                    files.append({"filename": name, "modified": None, "size": None})
    except Exception:
        logger.warning("HTTP directory listing failed")

    files.sort(key=lambda f: f["filename"], reverse=True)
    return files


def transform_archive_to_load_url(archive_url: str, filename: str) -> str:
    """
    Transform an archive (save) URL + filename into a load URL.

    Protocol-specific transformations:
      - SCP: Insert ':' between host and path -> scp://user:pass@host:/path/file
      - HTTP/HTTPS: Strip credentials
      - SFTP/FTP: Append filename to path as-is
      - TFTP: Append filename
      - git+https: Not supported for load
    """
    if not validate_filename(filename):
        raise ValueError(f"Invalid filename: {filename}")

    parts = parse_archive_url(archive_url)
    scheme = (parts["scheme"] or "").lower()

    if scheme.startswith("git"):
        raise ValueError("git+https archives cannot be loaded via config_file_load")

    hostname = parts["hostname"] or ""
    port_str = f":{parts['port']}" if parts["port"] else ""
    path = parts["path"]
    if not path.endswith("/"):
        path += "/"

    username = parts["username"] or ""
    password = parts["password"] or ""
    cred_str = ""
    if username:
        cred_str = f"{username}:{password}@" if password else f"{username}@"

    if scheme == "scp":
        # SCP load format uses colon before path: scp://user:pass@host:/path/file
        return f"scp://{cred_str}{hostname}{port_str}:{path}{filename}"

    elif scheme in ("http", "https"):
        # Strip credentials from HTTP/HTTPS URLs
        return f"{scheme}://{hostname}{port_str}{path}{filename}"

    elif scheme in ("sftp", "ftp"):
        return f"{scheme}://{cred_str}{hostname}{port_str}{path}{filename}"

    elif scheme == "tftp":
        return f"tftp://{hostname}{port_str}{path}{filename}"

    else:
        raise ValueError(f"Unsupported protocol: {scheme}")
