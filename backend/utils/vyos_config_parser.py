"""
Lightweight VyOS config.boot format parser.

Converts VyOS hierarchical config text (the format used in config.boot and
`show configuration` output) into a plain Python dict that matches the
structure returned by `show configuration json`.

Format rules:
  - key { ... }           → unnamed block   → {key: {...}}
  - key value { ... }     → named instance  → {key: {value: {...}}}
  - key value             → leaf node       → {key: "value"}
  - key (alone on line)   → presence flag   → {key: {}}
  - Repeated leaf key     → list            → {key: ["v1", "v2"]}
  - Quoted strings strip surrounding quotes.

The tokenizer emits a "\n" sentinel at the end of each source line so
the parser can distinguish a presence-flag key (nothing else on its line)
from a key followed by a value on the same line.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple


def parse_vyos_config(text: str) -> Dict[str, Any]:
    tokens = _tokenize(text)
    result, _ = _parse_block(tokens, 0)
    return result


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

_QUOTED_RE = re.compile(r'"(?:[^"\\]|\\.)*"')
_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)


def _tokenize(text: str) -> List[str]:
    # Strip /* ... */ block comments first (may span multiple lines)
    text = _BLOCK_COMMENT_RE.sub(" ", text)

    tokens: List[str] = []
    for line in text.splitlines():
        # Strip // line comments only when not preceded by a non-whitespace
        # character, so https:// and similar URLs are preserved.
        line = re.split(r"(?<!\S)//", line, maxsplit=1)[0]
        # Strip # only if it starts the line (not inside values like US-FREE#112).
        stripped = line.lstrip()
        if stripped.startswith("#"):
            continue
        line = line.strip()
        if not line:
            continue

        line_had_tokens = False
        i = 0
        while i < len(line):
            c = line[i]
            if c in " \t":
                i += 1
            elif c in "{}":
                tokens.append(c)
                line_had_tokens = True
                i += 1
            elif c == '"':
                m = _QUOTED_RE.match(line, i)
                if m:
                    tokens.append(m.group())
                    line_had_tokens = True
                    i = m.end()
                else:
                    i += 1
            else:
                j = i
                while j < len(line) and line[j] not in " \t{}\"":
                    j += 1
                tokens.append(line[i:j])
                line_had_tokens = True
                i = j

        if line_had_tokens:
            tokens.append("\n")  # sentinel: end of source line

    return tokens


# ---------------------------------------------------------------------------
# Recursive block parser
# ---------------------------------------------------------------------------

def _parse_block(tokens: List[str], pos: int) -> Tuple[Dict[str, Any], int]:
    result: Dict[str, Any] = {}

    while pos < len(tokens):
        tok = tokens[pos]

        if tok == "}":
            return result, pos + 1

        if tok == "\n":
            pos += 1
            continue

        # tok is a key
        key = _unquote(tok)
        pos += 1

        # If the next token is a newline, end-of-block, or end-of-stream
        # then this key stands alone on its line → presence flag.
        if pos >= len(tokens) or tokens[pos] in ("\n", "}"):
            _merge(result, key, {})
            continue  # leave the \n / } for the outer loop to consume

        next_tok = tokens[pos]

        if next_tok == "{":
            # key { ... } — unnamed block
            sub, pos = _parse_block(tokens, pos + 1)
            _merge(result, key, sub)

        elif pos + 1 < len(tokens) and tokens[pos + 1] == "{":
            # key value { ... } — named instance
            name = _unquote(next_tok)
            pos += 2  # consume value + '{'
            sub, pos = _parse_block(tokens, pos)
            if key not in result or not isinstance(result[key], dict):
                result[key] = {}
            result[key][name] = sub

        else:
            # key value — leaf node
            value = _unquote(next_tok)
            pos += 1
            _merge(result, key, value)

    return result, pos


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unquote(s: str) -> str:
    if s.startswith('"') and s.endswith('"') and len(s) >= 2:
        return s[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    return s


def _merge(d: Dict[str, Any], key: str, value: Any) -> None:
    """Insert value; convert to list on duplicate leaf keys."""
    if key not in d:
        d[key] = value
        return
    existing = d[key]
    if isinstance(existing, list):
        existing.append(value)
    else:
        d[key] = [existing, value]
