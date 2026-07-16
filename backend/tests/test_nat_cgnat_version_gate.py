"""CGNAT version gating (audit D2-02).

CGNAT (``nat cgnat ...``) only exists from VyOS 1.5. The 1.4 mapper must
refuse every CGNAT path instead of emitting a command the device rejects
at commit — the same convention the firewall groups v1_4 mapper uses for
domain/remote groups.
"""

import inspect

import pytest

from vyos_mappers.nat.nat import NATMapper
from vyos_mappers.nat.nat_versions import get_nat_mapper


def _dummy_args(method):
    """1 for int-ish params, 'x' otherwise — enough to reach the body."""
    params = list(inspect.signature(method).parameters.values())
    return ["1" if "number" in p.name or p.name == "seq" else "x" for p in params]


CGNAT_METHODS = [
    name for name, _ in inspect.getmembers(NATMapper, predicate=inspect.isfunction)
    if name.startswith("get_cgnat")
]


def test_base_mapper_defines_cgnat_methods():
    assert len(CGNAT_METHODS) >= 17


@pytest.mark.parametrize("name", CGNAT_METHODS)
def test_v14_rejects_every_cgnat_path(name):
    mapper = get_nat_mapper("1.4")
    method = getattr(mapper, name)
    with pytest.raises(ValueError, match="1.5"):
        method(*_dummy_args(method))


@pytest.mark.parametrize("name", CGNAT_METHODS)
def test_v15_still_emits_cgnat_paths(name):
    mapper = get_nat_mapper("1.5")
    method = getattr(mapper, name)
    path = method(*_dummy_args(method))
    assert path[:2] == ["nat", "cgnat"]
