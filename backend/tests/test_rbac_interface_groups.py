"""Unit tests for the interface feature-group fallback (issue #428).

The six interface routers with dedicated feature groups (PSEUDO_ETHERNET,
VIRTUAL_ETHERNET, VPP, VTI, WIRELESS, WWAN) enforce their own group, and
``_apply_parent_child_permissions`` propagates an INTERFACES grant to those
groups. Together that gives the "dedicated group first, INTERFACES as
fallback" behavior: a dedicated grant works on its own, an INTERFACES-only
role keeps access, and a role with neither is denied.

These tests exercise the pure permission-dict logic only — no database or
FastAPI app needed.
"""

from pathlib import Path

from rbac_permissions import (
    FeatureGroup,
    PermissionLevel,
    _apply_parent_child_permissions,
)


DEDICATED_INTERFACE_GROUPS = [
    FeatureGroup.PSEUDO_ETHERNET,
    FeatureGroup.VIRTUAL_ETHERNET,
    FeatureGroup.VPP,
    FeatureGroup.VTI,
    FeatureGroup.WIRELESS,
    FeatureGroup.WWAN,
]

ROUTER_FILES = {
    FeatureGroup.PSEUDO_ETHERNET: "pseudo_ethernet.py",
    FeatureGroup.VIRTUAL_ETHERNET: "virtual_ethernet.py",
    FeatureGroup.VPP: "vpp.py",
    FeatureGroup.VTI: "vti.py",
    FeatureGroup.WIRELESS: "wireless.py",
    FeatureGroup.WWAN: "wwan.py",
}


def all_none():
    """Fresh permission dict, everything NONE — the state before grants apply."""
    return {feature: PermissionLevel.NONE for feature in FeatureGroup}


def effective(permissions, feature, required):
    """Mirror check_permission's level comparison on a computed dict."""
    level = permissions.get(feature, PermissionLevel.NONE)
    if required == PermissionLevel.READ:
        return level in (PermissionLevel.READ, PermissionLevel.WRITE)
    return level == PermissionLevel.WRITE


def test_dedicated_grant_alone_grants_access():
    for group in DEDICATED_INTERFACE_GROUPS:
        permissions = all_none()
        permissions[group] = PermissionLevel.WRITE
        _apply_parent_child_permissions(permissions)

        assert effective(permissions, group, PermissionLevel.WRITE)
        # The dedicated grant must not leak upward or sideways
        assert permissions[FeatureGroup.INTERFACES] == PermissionLevel.NONE
        for other in DEDICATED_INTERFACE_GROUPS:
            if other != group:
                assert permissions[other] == PermissionLevel.NONE


def test_interfaces_only_grant_still_covers_all_six():
    permissions = all_none()
    permissions[FeatureGroup.INTERFACES] = PermissionLevel.WRITE
    _apply_parent_child_permissions(permissions)

    for group in DEDICATED_INTERFACE_GROUPS:
        assert effective(permissions, group, PermissionLevel.WRITE), group


def test_interfaces_read_only_gives_read_not_write():
    permissions = all_none()
    permissions[FeatureGroup.INTERFACES] = PermissionLevel.READ
    _apply_parent_child_permissions(permissions)

    for group in DEDICATED_INTERFACE_GROUPS:
        assert effective(permissions, group, PermissionLevel.READ), group
        assert not effective(permissions, group, PermissionLevel.WRITE), group


def test_neither_grant_is_denied():
    permissions = all_none()
    _apply_parent_child_permissions(permissions)

    for group in DEDICATED_INTERFACE_GROUPS:
        assert not effective(permissions, group, PermissionLevel.READ), group


def test_dedicated_write_survives_interfaces_read():
    permissions = all_none()
    permissions[FeatureGroup.INTERFACES] = PermissionLevel.READ
    permissions[FeatureGroup.VTI] = PermissionLevel.WRITE
    _apply_parent_child_permissions(permissions)

    assert effective(permissions, FeatureGroup.VTI, PermissionLevel.WRITE)


def test_interfaces_write_upgrades_dedicated_read():
    permissions = all_none()
    permissions[FeatureGroup.INTERFACES] = PermissionLevel.WRITE
    permissions[FeatureGroup.WIRELESS] = PermissionLevel.READ
    _apply_parent_child_permissions(permissions)

    assert effective(permissions, FeatureGroup.WIRELESS, PermissionLevel.WRITE)


def test_routers_enforce_their_dedicated_group():
    """Guard against a router regressing to the generic INTERFACES check."""
    routers_dir = Path(__file__).resolve().parents[1] / "routers" / "interfaces"
    for group, filename in ROUTER_FILES.items():
        source = (routers_dir / filename).read_text()
        assert f"FeatureGroup.{group.name}" in source, filename
        assert "FeatureGroup.INTERFACES" not in source, filename
