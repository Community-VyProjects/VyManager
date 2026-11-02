"""Yarn v1 lock readers for docs-site pin tests."""


def yarn_versions(text: str, name: str) -> list[str]:
    """Return every resolved version of name, including quoted multi-range headers."""
    versions: list[str] = []
    in_block = False
    for line in text.splitlines():
        if line and not line.startswith(" ") and not line.startswith("#"):
            in_block = _header_matches(line, name)
            continue
        if in_block and line.startswith('  version "'):
            versions.append(line.split('"')[1])
    return versions


def _header_matches(line: str, name: str) -> bool:
    header = line[:-1] if line.endswith(":") else line
    for part in _split_descriptors(header):
        token = part.strip().strip('"')
        if token == name or token.startswith(f"{name}@"):
            return True
    return False


def _split_descriptors(header: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    quoted = False
    for ch in header:
        if ch == '"':
            quoted = not quoted
            buf.append(ch)
            continue
        if ch == "," and not quoted:
            parts.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    if buf:
        parts.append("".join(buf))
    return parts
