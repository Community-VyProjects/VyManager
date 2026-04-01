# VyManager Demo Platform

This document describes the demo/multi-org system added to VyManager and how to maintain it alongside upstream updates.

## Architecture Overview

The demo system adds **multi-organization support** to VyManager. Each demo is an isolated organization with its own user, sites, and instances that auto-expires after 10 hours.

```
                    Traefik (*.d.vyprojects.org)
                         |
              +----------+----------+
              |                     |
     d.vyprojects.org      demo-abc123.d.vyprojects.org
              |                     |
         Admin login          Demo user login
         (all orgs)           (locked to demo org)
```

**Key concepts:**
- **Organization**: Isolation boundary. Sites belong to an org. Demo orgs have `isDemo=true` and an `expiresAt` timestamp.
- **Roles**: `PROJECT_ADMIN` has full access across all orgs (your account). `ORG_ADMIN` has full admin within their own org (demo users). `VIEWER` is read-only.
- **Demo user**: Created per-demo with `isDemo=true` and `ORG_ADMIN` role. Locked to their single org but can fully manage it.
- **Org scoping**: All API requests include an `X-Org-Id` header. Backend middleware resolves org context and scopes queries. Only `PROJECT_ADMIN` can access any org; `ORG_ADMIN` is restricted to their membership.
- **Auto-cleanup**: Background task runs every 5 minutes, deletes expired demo orgs (cascade) and orphaned demo users.

---

## Branch Structure

```
origin/beta  ----pull---->  local/beta  ----branch---->  local/demo (deployed)
                                               |
                                        Commit 1: HTTPS/proxy fixes (PR to upstream)
                                        Commit 2: Multi-org + demo platform
```

The `demo` branch sits on top of `beta` with 2 commits. When upstream updates arrive, rebase `demo` onto the updated `beta`.

---

## Update Workflow

### When upstream `beta` has new commits:

```bash
# 1. Fetch and update local beta
git fetch origin
git checkout beta
git pull origin beta

# 2. Rebase demo onto updated beta
git checkout demo
git rebase beta

# 3. If there are conflicts, resolve them (see "Conflict Resolution" below)

# 4. Verify the build
cd frontend && npx prisma generate && cd ..
# Optionally: docker build to test

# 5. Deploy (see "Deployment" below)
```

### Conflict Resolution

The most common conflict files and how to resolve them:

| File | Why it conflicts | How to resolve |
|------|------------------|----------------|
| `frontend/prisma/schema.prisma` | Both sides modify models | Accept both changes. Upstream adds features, ours adds Org models. They don't overlap. |
| `backend/app.py` | Upstream adds new router imports | Our changes are 3 lines at the top (import) and 2 lines at the bottom (include_router). Re-add them. |
| `backend/routers/session/session.py` | Upstream may modify site queries | Our changes are `org_id` scoping on existing queries (grep for `# DEMO:`). Re-apply the scoping. |
| `frontend/src/app/sites/page.tsx` | Large file, upstream adds features | Our changes are in the sidebar nav and imports. Grep for `DEMO:` to find them. |

**Tip:** All inline demo changes are marked with `DEMO:` comments. After resolving conflicts, run:
```bash
grep -rn "DEMO:" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.prisma"
```
to verify all demo markers are still present.

### Migration Ordering

Prisma migrations are ordered by directory timestamp. Our migration (`20260331_add_organizations`) sits in chronological order. New upstream migrations after this date run after ours automatically. If upstream modifies the `users` or `sites` tables, the `schema.prisma` file will need a manual merge, but the migration SQL files (separate directories) won't conflict.

---

## Deployment

### Build new images

```bash
# Backend
docker build -f Dockerfile.backend -t vymanager-backend:demo .

# Frontend (with demo domain)
docker build -f Dockerfile.frontend \
  --build-arg DEMO_BASE_DOMAIN=d.vyprojects.org \
  -t vymanager-frontend:demo .
```

### Deploy to production

```bash
# 1. Backup the database first
docker compose exec postgres pg_dump -U vymanager vymanager > backup_$(date +%Y%m%d).sql

# 2. Apply database migrations
docker compose exec frontend npx prisma migrate deploy

# 3. Update images and restart (rolling)
docker compose up -d --no-deps backend
# Wait for health check to pass (~30s)
docker compose up -d --no-deps frontend
# Wait for health check to pass (~30s)
```

### Rollback

```bash
# Revert containers to previous images
docker compose up -d --no-deps backend   # with previous image tag
docker compose up -d --no-deps frontend

# If migration broke data, restore from backup
docker compose exec -T postgres psql -U vymanager vymanager < backup_YYYYMMDD.sql
```

---

## Demo-Only Files

These files exist **only** on the `demo` branch and can be deleted entirely to remove demo functionality:

### Backend
- `backend/routers/demo.py` - Demo CRUD API + cleanup function
- `backend/routers/org.py` - Organization list/switch endpoints

### Frontend
- `frontend/src/components/demo/DemoManagement.tsx` - Demo admin panel
- `frontend/src/components/demo/CreateDemoModal.tsx` - Demo creation modal
- `frontend/src/components/layout/OrgSwitcher.tsx` - Org switcher dropdown
- `frontend/src/lib/api/demo.ts` - Demo API client
- `frontend/src/lib/api/org.ts` - Org API client
- `frontend/src/store/org-store.ts` - Org state management (Zustand)
- `frontend/src/app/api/demo/[...path]/route.ts` - Demo proxy route

### Database
- `frontend/prisma/migrations/20260331_add_organizations/` - Org migration

### Infrastructure
- `container/vymanager-traefik/` - Traefik multi-domain config

---

## Inline Changes in Core Files

These core files have demo-related modifications marked with `DEMO:` comments. To find them all:

```bash
grep -rn "DEMO:" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.prisma" --include="Dockerfile*"
```

### Backend
- **`backend/app.py`** (3 changes)
  - Import: `demo_router`, `org_router`, `cleanup_expired_demos`
  - Cleanup call: `await cleanup_expired_demos(conn)`
  - Router registration: `app.include_router(demo_router.router)`, `app.include_router(org_router.router)`

- **`backend/middleware/auth.py`** (5 changes)
  - SQL query: added `u.role, u."isDemo"` columns
  - Request state: added `user_role`
  - User dict: added `role` field
  - Org resolution block (~30 lines): resolves `request.state.org_id` from X-Org-Id header

- **`backend/routers/session/session.py`** (7 changes)
  - `list_user_sites`: org_id scoping on ADMIN and regular user queries
  - `create_site`: org resolution for new sites, `orgId` in INSERT

### Frontend
- **`frontend/src/app/sites/page.tsx`** (9 changes)
  - Imports: DemoManagement, OrgSwitcher, useOrgStore
  - NavSection type: added `"demos"`
  - State: currentOrg, userRole, isSiteAdmin
  - Effect dependency: `currentOrg?.id`
  - Sidebar: OrgSwitcher component
  - Nav: Demos button (admin only)
  - Content: DemoManagement panel

- **`frontend/src/app/login/page.tsx`** (6 changes)
  - `getDemoSlug()` function
  - `demoSlug` state
  - Conditional subtitle text
  - Demo banner block

- **`frontend/src/components/layout/AppLayout.tsx`** (3 changes)
  - Import: useOrgStore
  - Call: `loadOrgs()` on mount

- **`frontend/src/components/layout/Sidebar.tsx`** (2 changes)
  - Import: OrgSwitcher
  - Header: replaced static text with OrgSwitcher

- **`frontend/src/lib/api/client.ts`** (4 changes)
  - Org ID getter/setter functions
  - X-Org-Id header in requests

- **`frontend/src/lib/auth.ts`** (2 changes)
  - Demo subdomain wildcard in trustedOrigins

- **`frontend/src/app/api/*/[...path]/route.ts`** (4 files, 1 change each)
  - X-Org-Id header forwarding block

### Schema & Build
- **`frontend/prisma/schema.prisma`** (5 changes)
  - User: `isDemo` field, `orgMembers` relation
  - Site: `orgId` FK, unique constraint, org relation
  - Organization + OrgMember models + OrgRole enum

- **`frontend/prisma/seed.ts`** (4 changes)
  - Default org upsert block
  - Site upsert uses `orgId_name` compound key

- **`Dockerfile.frontend`** + **`frontend/Dockerfile`** (1 change each)
  - `DEMO_BASE_DOMAIN` build arg + env

---

## Complete Removal Guide

To strip all demo/org functionality and return to vanilla VyManager:

### 1. Delete demo-only files
```bash
rm backend/routers/demo.py
rm backend/routers/org.py
rm -rf frontend/src/components/demo/
rm frontend/src/components/layout/OrgSwitcher.tsx
rm frontend/src/lib/api/demo.ts
rm frontend/src/lib/api/org.ts
rm frontend/src/store/org-store.ts
rm -rf frontend/src/app/api/demo/
rm -rf frontend/prisma/migrations/20260331_add_organizations/
rm -rf container/vymanager-traefik/
```

### 2. Revert inline changes
Find and remove all `DEMO:` marked sections:
```bash
grep -rn "DEMO:" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.prisma" --include="Dockerfile*"
```

Key reversions:
- **`backend/app.py`**: Remove demo/org imports, cleanup call, and router registrations
- **`backend/middleware/auth.py`**: Remove `u.role, u."isDemo"` from SQL, remove `user_role` from state, remove entire org resolution block
- **`backend/routers/session/session.py`**: Remove org_id scoping from `list_user_sites` and `create_site`, restore original queries
- **`frontend/prisma/schema.prisma`**: Remove `isDemo` from User, remove `orgId` from Site (restore `name @unique`), remove Organization/OrgMember/OrgRole
- **`frontend/prisma/seed.ts`**: Remove org upsert, restore `where: { name: "Default Site" }`
- **`frontend/src/app/sites/page.tsx`**: Remove demo imports, org store usage, OrgSwitcher, demos nav section
- **`frontend/src/app/login/page.tsx`**: Remove getDemoSlug, demoSlug state, demo banner
- **`frontend/src/components/layout/Sidebar.tsx`**: Replace OrgSwitcher with static header
- **`frontend/src/components/layout/AppLayout.tsx`**: Remove useOrgStore import and loadOrgs call
- **`frontend/src/lib/api/client.ts`**: Remove org ID getter/setter and X-Org-Id header
- **`frontend/src/lib/auth.ts`**: Remove demo subdomain trusted origins block
- **API proxy routes** (4 files): Remove X-Org-Id forwarding blocks
- **Dockerfiles** (2 files): Remove DEMO_BASE_DOMAIN arg/env

### 3. Create a down migration
Create a Prisma migration to undo the schema changes:
```sql
-- Drop org-related tables
DROP TABLE IF EXISTS org_members;
DROP TABLE IF EXISTS organizations;
DROP TYPE IF EXISTS "OrgRole";

-- Revert Site model
ALTER TABLE sites DROP COLUMN IF EXISTS "orgId";
ALTER TABLE sites ADD CONSTRAINT sites_name_key UNIQUE (name);

-- Revert User model
ALTER TABLE users DROP COLUMN IF EXISTS "isDemo";
```

### 4. Rebuild and deploy
```bash
npx prisma generate
docker build ...
docker compose up -d
```
