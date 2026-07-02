---
id: install-manual
title: Manual install
sidebar_position: 3
---

# Manual install

Run VyManager from source without Docker. You need Python 3.11+, Node.js 24 and PostgreSQL 16 on the host.

## PostgreSQL

Create a database and user:

```sql
CREATE USER vymanager WITH PASSWORD 'your-db-password';
CREATE DATABASE vymanager OWNER vymanager;
```

## Backend

```bash
cd backend

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (the backend loads it automatically on startup):

```env
DATABASE_URL=postgresql://vymanager:your-db-password@localhost:5432/vymanager
FRONTEND_URL=http://localhost:3000
BETTER_AUTH_SECRET=same-secret-as-frontend
SSH_ENCRYPTION_KEY=64-hex-chars-from-openssl-rand-hex-32
TRUSTED_ORIGINS=http://localhost:3000
```

`BETTER_AUTH_SECRET` must be the same value as in the frontend environment — the backend uses it to verify the session cookies the frontend issues. When backend and frontend run on separate hosts, also set `FRONTEND_INTERNAL_URL` to a URL the backend can reach the frontend on (defaults to `http://frontend:3000`, which only works inside Docker).

Start the backend:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers
```

Interactive API documentation is served at `http://localhost:8000/docs`.

## Frontend

```bash
cd frontend

npm install
```

Create `frontend/.env`:

```env
NODE_ENV=production
BETTER_AUTH_SECRET=same-secret-as-backend
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
TRUSTED_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://vymanager:your-db-password@localhost:5432/vymanager
```

Generate the Prisma client, apply the migrations, build and start:

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

For development, use `npm run dev` instead of build/start to get hot reload.

Open `http://localhost:3000` and continue with [First run](first-run).
