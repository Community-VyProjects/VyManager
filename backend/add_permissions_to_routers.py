#!/usr/bin/env python3
"""
Script to add RBAC permission checks to all VyOS router files.

This script systematically updates all router files to include:
1. Import statements for permission helpers
2. Permission checks at the beginning of each endpoint
3. Documentation of required permissions

Usage:
    python add_permissions_to_routers.py
"""

import os
import re
from pathlib import Path

# Mapping of router prefixes to feature groups
ROUTER_TO_FEATURE = {
    "firewall": "FeatureGroup.FIREWALL",
    "nat": "FeatureGroup.NAT",  # Already done
    "dhcp": "FeatureGroup.DHCP",
    "interfaces": "FeatureGroup.INTERFACES",
    "static_routes": "FeatureGroup.STATIC_ROUTES",
    "static-routes": "FeatureGroup.STATIC_ROUTES",
    "route": "FeatureGroup.ROUTING_POLICIES",
    "route_map": "FeatureGroup.ROUTING_POLICIES",
    "route-map": "FeatureGroup.ROUTING_POLICIES",
    "access_list": "FeatureGroup.ROUTING_POLICIES",
    "access-list": "FeatureGroup.ROUTING_POLICIES",
    "as_path_list": "FeatureGroup.ROUTING_POLICIES",
    "as-path-list": "FeatureGroup.ROUTING_POLICIES",
    "community_list": "FeatureGroup.ROUTING_POLICIES",
    "community-list": "FeatureGroup.ROUTING_POLICIES",
    "extcommunity_list": "FeatureGroup.ROUTING_POLICIES",
    "extcommunity-list": "FeatureGroup.ROUTING_POLICIES",
    "large_community_list": "FeatureGroup.ROUTING_POLICIES",
    "large-community-list": "FeatureGroup.ROUTING_POLICIES",
    "prefix_list": "FeatureGroup.ROUTING_POLICIES",
    "prefix-list": "FeatureGroup.ROUTING_POLICIES",
    "local_route": "FeatureGroup.ROUTING_POLICIES",
    "local-route": "FeatureGroup.ROUTING_POLICIES",
    "system": "FeatureGroup.SYSTEM",
    "power": "FeatureGroup.SYSTEM",
    "config": "FeatureGroup.CONFIGURATION",
    "dashboard": "FeatureGroup.DASHBOARD",
}

# Files to skip (already updated or not VyOS routers)
SKIP_FILES = {
    "nat.py",  # Already updated
    "user_management.py",  # Uses require_super_admin
    "session.py",  # Session management, not VyOS config
    "show.py",  # Show commands, might need READ permission
}


def detect_router_prefix(file_path: str, content: str) -> str:
    """Detect the router prefix from the APIRouter definition."""
    match = re.search(r'router\s*=\s*APIRouter\(prefix="(/vyos/[^"]+)"', content)
    if match:
        prefix = match.group(1)
        # Extract feature name from prefix like "/vyos/firewall/groups"
        parts = prefix.split("/")
        if len(parts) >= 3:
            return parts[2]  # e.g., "firewall" from "/vyos/firewall/groups"

    # Fallback: use directory name
    dir_name = Path(file_path).parent.name
    if dir_name in ROUTER_TO_FEATURE:
        return dir_name

    return None


def get_feature_group(router_prefix: str) -> str:
    """Get the FeatureGroup for a router prefix."""
    return ROUTER_TO_FEATURE.get(router_prefix)


def needs_permission_import(content: str) -> bool:
    """Check if file already has permission imports."""
    return "from fastapi_permissions import" not in content


def add_permission_imports(content: str) -> str:
    """Add permission imports after the existing imports."""
    # Find the last import line
    import_pattern = r'^from [^\n]+$'
    import_matches = list(re.finditer(import_pattern, content, re.MULTILINE))

    if not import_matches:
        # No imports found, add after docstring
        docstring_end = content.find('"""', 3)
        if docstring_end > 0:
            insert_pos = content.find('\n', docstring_end) + 1
        else:
            insert_pos = 0
    else:
        # Add after last import
        last_import = import_matches[-1]
        insert_pos = last_import.end() + 1

    new_imports = """from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

"""

    return content[:insert_pos] + new_imports + content[insert_pos:]


def add_permission_check_to_endpoint(content: str, endpoint_match, feature_group: str):
    """Add permission check to a single endpoint."""
    func_start = endpoint_match.start()
    decorator = endpoint_match.group(1)  # e.g., "@router.get"

    # Determine if it's a READ or WRITE operation
    is_read_op = ".get(" in decorator
    permission_func = "require_read_permission" if is_read_op else "require_write_permission"
    permission_type = "READ" if is_read_op else "WRITE"

    # Find the function definition
    func_def_match = re.search(r'async def (\w+)\(([^)]+)\):', content[func_start:])
    if not func_def_match:
        return content, False

    func_name = func_def_match.group(1)
    func_params = func_def_match.group(2)

    # Check if permission check already exists
    func_body_start = func_start + func_def_match.end()
    next_100_chars = content[func_body_start:func_body_start + 200]
    if "require_read_permission" in next_100_chars or "require_write_permission" in next_100_chars:
        return content, False  # Already has permission check

    # Find the request parameter name
    request_param = "request"
    if "request:" in func_params.lower() or "http_request:" in func_params.lower():
        param_match = re.search(r'(\w+):\s*Request', func_params)
        if param_match:
            request_param = param_match.group(1)
    else:
        # No Request parameter - skip this endpoint
        return content, False

    # Find the docstring end
    docstring_start = content.find('"""', func_start)
    if docstring_start > func_start:
        docstring_end = content.find('"""', docstring_start + 3)
        if docstring_end > docstring_start:
            # Add "Requires:" to docstring
            insert_docstring = f"\n\n    Requires: {permission_type} permission on {feature_group.split('.')[-1]}\n    "
            content = content[:docstring_end] + insert_docstring + content[docstring_end:]

            # Update positions
            offset = len(insert_docstring)
            docstring_end += offset
        else:
            docstring_end = docstring_start
    else:
        docstring_end = func_body_start

    # Find where to insert permission check (after docstring, before try/first statement)
    insert_pos = content.find('\n', docstring_end) + 1

    # Find proper indentation
    next_line_match = re.search(r'\n(\s+)', content[insert_pos:insert_pos+50])
    indent = next_line_match.group(1) if next_line_match else "    "

    # Add permission check
    permission_check = f"{indent}# Check permission\n{indent}await {permission_func}({request_param}, {feature_group})\n\n"
    content = content[:insert_pos] + permission_check + content[insert_pos:]

    return content, True


def process_router_file(file_path: str):
    """Process a single router file to add permission checks."""
    print(f"Processing: {file_path}")

    with open(file_path, 'r') as f:
        content = f.read()

    # Detect router prefix
    router_prefix = detect_router_prefix(file_path, content)
    if not router_prefix:
        print(f"  ⚠ Skipping: Could not detect router prefix")
        return

    feature_group = get_feature_group(router_prefix)
    if not feature_group:
        print(f"  ⚠ Skipping: No feature group mapping for '{router_prefix}'")
        return

    print(f"  → Router prefix: {router_prefix}, Feature group: {feature_group}")

    # Add imports if needed
    if needs_permission_import(content):
        print(f"  → Adding permission imports")
        content = add_permission_imports(content)

    # Find all endpoint decorators
    endpoint_pattern = r'(@router\.(get|post|put|delete|patch)\([^)]*\))'
    endpoints = list(re.finditer(endpoint_pattern, content))

    print(f"  → Found {len(endpoints)} endpoints")

    # Add permission checks to each endpoint
    modified_count = 0
    for endpoint_match in reversed(endpoints):  # Process in reverse to maintain positions
        content, modified = add_permission_check_to_endpoint(content, endpoint_match, feature_group)
        if modified:
            modified_count += 1

    if modified_count > 0:
        print(f"  ✓ Added permission checks to {modified_count} endpoints")

        # Write back to file
        with open(file_path, 'w') as f:
            f.write(content)
    else:
        print(f"  → No changes needed (all endpoints already have checks)")


def main():
    """Main entry point."""
    routers_dir = Path(__file__).parent / "routers"

    print("=" * 70)
    print("Adding RBAC Permission Checks to VyOS Routers")
    print("=" * 70)
    print()

    # Find all Python router files
    router_files = []
    for root, dirs, files in os.walk(routers_dir):
        for file in files:
            if file.endswith('.py') and file not in SKIP_FILES and file != '__init__.py':
                router_files.append(os.path.join(root, file))

    print(f"Found {len(router_files)} router files to process\n")

    for file_path in sorted(router_files):
        try:
            process_router_file(file_path)
        except Exception as e:
            print(f"  ✗ Error processing {file_path}: {e}")
        print()

    print("=" * 70)
    print("Done!")
    print("=" * 70)


if __name__ == "__main__":
    main()
