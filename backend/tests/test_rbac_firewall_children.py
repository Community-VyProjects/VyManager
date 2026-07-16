"""FIREWALL_BRIDGE / FIREWALL_FLOWTABLES must sit on the live grant paths.

Both groups gate their routers, but they only appeared in the dead
BUILT_IN_PERMISSIONS dicts — so any non-site-ADMIN (instance-ADMIN
grant, org ADMIN/OWNER under enforcement, FIREWALL=WRITE operator)
resolved them to NONE and got a hard 403 on the whole bridge-firewall
and flowtables pages (audit finding, Domain 2 Medium).
"""

from rbac_permissions import (
    FeatureGroup,
    PermissionLevel,
    _INSTANCE_ADMIN_FEATURES,
    _apply_parent_child_permissions,
)

CHILDREN = [FeatureGroup.FIREWALL_BRIDGE, FeatureGroup.FIREWALL_FLOWTABLES]


def all_none():
    return {feature: PermissionLevel.NONE for feature in FeatureGroup}


def test_firewall_write_propagates_to_bridge_and_flowtables():
    permissions = all_none()
    permissions[FeatureGroup.FIREWALL] = PermissionLevel.WRITE
    _apply_parent_child_permissions(permissions)
    for child in CHILDREN:
        assert permissions[child] == PermissionLevel.WRITE, child


def test_firewall_read_propagates_to_bridge_and_flowtables():
    permissions = all_none()
    permissions[FeatureGroup.FIREWALL] = PermissionLevel.READ
    _apply_parent_child_permissions(permissions)
    for child in CHILDREN:
        assert permissions[child] == PermissionLevel.READ, child


def test_instance_admin_gets_bridge_and_flowtables():
    for child in CHILDREN:
        assert child in _INSTANCE_ADMIN_FEATURES, child
