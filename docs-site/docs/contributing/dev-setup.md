---
id: dev-setup
title: Development setup
sidebar_position: 1
---

# Development setup

The PR process, commit conventions and code guidelines live in `CONTRIBUTING.md` in the repository. This page covers getting a working dev environment.

## Prerequisites

Python 3.11+, Node.js 24, and PostgreSQL 16 (a container is fine).

## Database

```bash
docker run -d --name vymanager-postgres \
  -e POSTGRES_USER=vymanager \
  -e POSTGRES_PASSWORD=vymanager_secure_password \
  -e POSTGRES_DB=vymanager_auth \
  -p 5432:5432 postgres:16-alpine
```

## Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # set DATABASE_URL, SSH_ENCRYPTION_KEY, BETTER_AUTH_SECRET
uvicorn app:app --reload --host 0.0.0.0 --port 8000 --proxy-headers
```

Interactive API docs at `http://localhost:8000/docs`. `BETTER_AUTH_SECRET` must match the frontend's or logins will not validate.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env    # set BACKEND_URL=http://localhost:8000, TRUSTED_ORIGINS, DATABASE_URL, BETTER_AUTH_*
npx prisma generate
npx prisma migrate deploy
npm run dev
```

`npm run lint` runs ESLint; `npm run build` is the production build. Schema changes go through Prisma: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <migration_name>` — never edit an applied migration.

## Dev containers

`container/vymanager-dev/env-file-docker-compose.yml` builds backend and frontend images from the working tree instead of pulling from GHCR — useful for testing the containerized stack against local changes.

## Feature architecture

New VyOS features follow the three-layer pattern — router (`routers/<feature>/`), builder (`vyos_builders/<feature>/`), mapper (`vyos_mappers/<feature>/` with per-version implementations) — plus a `/capabilities` endpoint and RBAC checks on every route. `CONTRIBUTING.md` names the firewall module as the reference for complex features and the dummy interface for simple ones.
