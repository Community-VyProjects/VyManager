#!/usr/bin/env python3
"""
Migration Script: Old Permissions → New RBAC System

This script migrates from the old site-level permissions system to the new
instance-level RBAC system with fine-grained permissions.

What it does:
1. Sets users with OWNER site role to SUPER_ADMIN global role
2. Migrates all site permissions to instance-level permissions
3. Creates appropriate user_instance_roles for all existing permissions

Run this ONCE to migrate your system.
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

# Get database connection details
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment")


async def migrate():
    """Run the migration."""
    print("=" * 70)
    print("RBAC Migration: Old Permissions → New System")
    print("=" * 70)
    print()

    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Step 1: Identify and upgrade OWNER users to SUPER_ADMIN
        print("[Step 1/4] Upgrading OWNER users to SUPER_ADMIN...")
        owner_users = await conn.fetch(
            """
            SELECT DISTINCT u.id, u.email, u.name, u.role as current_role
            FROM users u
            JOIN permissions p ON u.id = p."userId"
            WHERE p.role = 'OWNER'
            """
        )

        print(f"  → Found {len(owner_users)} users with OWNER site permissions")

        for user in owner_users:
            await conn.execute(
                """
                UPDATE users
                SET role = 'SUPER_ADMIN', "updatedAt" = NOW()
                WHERE id = $1
                """,
                user["id"]
            )
            print(f"  ✓ {user['email']} ({user['current_role']} → SUPER_ADMIN)")

        print()

        # Step 2: Count current permissions to migrate
        print("[Step 2/4] Analyzing permissions to migrate...")
        permissions = await conn.fetch(
            """
            SELECT p.id, p."userId", p."siteId", p.role,
                   u.email, u.name,
                   s.name as site_name,
                   COUNT(i.id) as instance_count
            FROM permissions p
            JOIN users u ON p."userId" = u.id
            JOIN sites s ON p."siteId" = s.id
            LEFT JOIN instances i ON s.id = i."siteId"
            GROUP BY p.id, p."userId", p."siteId", p.role, u.email, u.name, s.name
            """
        )

        print(f"  → Found {len(permissions)} site permissions to migrate")
        total_instances = sum(p["instance_count"] for p in permissions)
        print(f"  → Will create {total_instances} instance-level role assignments")
        print()

        # Step 3: Migrate permissions to user_instance_roles
        print("[Step 3/4] Migrating to instance-level permissions...")

        migrated_count = 0
        skipped_count = 0

        for perm in permissions:
            user_id = perm["userId"]
            site_id = perm["siteId"]
            site_role = perm["role"]

            # Map site role to built-in role
            # OWNER → ADMIN (site owners become admins on all instances)
            # ADMIN → ADMIN
            # VIEWER → VIEWER
            if site_role == "OWNER":
                built_in_role = "ADMIN"
            else:
                built_in_role = site_role

            # Get all instances in this site
            instances = await conn.fetch(
                """
                SELECT id, name FROM instances WHERE "siteId" = $1
                """,
                site_id
            )

            print(f"  → Migrating {perm['email']} ({site_role}) on site '{perm['site_name']}'")
            print(f"    {len(instances)} instances...")

            for instance in instances:
                # Check if assignment already exists
                existing = await conn.fetchval(
                    """
                    SELECT id FROM user_instance_roles
                    WHERE "userId" = $1 AND "instanceId" = $2 AND "builtInRole" = $3
                    """,
                    user_id,
                    instance["id"],
                    built_in_role
                )

                if existing:
                    skipped_count += 1
                    continue

                # Create instance-level permission
                await conn.execute(
                    """
                    INSERT INTO user_instance_roles
                    (id, "userId", "instanceId", "roleType", "builtInRole", "createdAt", "updatedAt", "assignedBy")
                    VALUES (gen_random_uuid()::text, $1, $2, 'BUILT_IN', $3, NOW(), NOW(), $1)
                    """,
                    user_id,
                    instance["id"],
                    built_in_role
                )
                migrated_count += 1

        print(f"  ✓ Created {migrated_count} instance-level permissions")
        if skipped_count > 0:
            print(f"  ⚠ Skipped {skipped_count} (already existed)")
        print()

        # Step 4: Verify migration
        print("[Step 4/4] Verifying migration...")

        # Count new permissions
        new_perms = await conn.fetchval(
            """
            SELECT COUNT(*) FROM user_instance_roles
            """
        )

        # Count users
        users_with_access = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT "userId") FROM user_instance_roles
            """
        )

        print(f"  ✓ Total instance-level permissions: {new_perms}")
        print(f"  ✓ Users with instance access: {users_with_access}")
        print()

        print("=" * 70)
        print("Migration Complete!")
        print("=" * 70)
        print()
        print("Next steps:")
        print("1. Test that users can log in and see their instances")
        print("2. Verify permissions work correctly")
        print("3. Once confirmed, you can remove the old permissions table")
        print()

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
