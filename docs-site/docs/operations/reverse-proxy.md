---
id: reverse-proxy
title: Reverse proxy and HTTPS
sidebar_position: 3
---

# Reverse proxy and HTTPS

The stock deployment serves plain HTTP on port 3000. For production, put a reverse proxy with TLS in front. Two rules make or break the setup:

1. **HTTP traffic goes to the frontend (port 3000).** The frontend proxies API calls to the backend itself; the backend port (8000) does not need to be exposed to users.
2. **WebSockets go directly to the backend (port 8000).** The monitoring and console pages open WebSocket connections to the same origin at `/vyos/monitoring/ws/...` and `/vyos/console/ws/...`; the proxy must upgrade those paths and forward them to the backend, or those two pages will not work.

## nginx example

This block is for Next.js listening on the host. Do not use it against the stock compose publish of port 3000. That path is covered below.

```nginx
server {
    listen 443 ssl;
    server_name vymanager.example.com;

    ssl_certificate     /etc/letsencrypt/live/vymanager.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vymanager.example.com/privkey.pem;

    # WebSockets: straight to the backend
    location ~ ^/vyos/(monitoring|console)/ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }

    # Everything else: frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Caddy example

```caddy
vymanager.example.com {
    @ws path /vyos/monitoring/ws/* /vyos/console/ws/*
    reverse_proxy @ws 127.0.0.1:8000
    reverse_proxy 127.0.0.1:3000
}
```

Caddy handles the certificate and WebSocket upgrades automatically.

## Matching environment settings

Update `.env` to the public URL and restart the stack:

```env
BETTER_AUTH_URL=https://vymanager.example.com
NEXT_PUBLIC_APP_URL=https://vymanager.example.com
TRUSTED_ORIGINS=https://vymanager.example.com
BETTER_AUTH_SECURE_COOKIES=true
TRUSTED_PROXY_HOPS=1
```

This block is only for the host nginx and Caddy examples above. `TRUSTED_PROXY_HOPS=1` is required there: the default of 0 counts every user as `127.0.0.1`, and 10 failures lock sign-in. Do not copy `TRUSTED_PROXY_HOPS=1` onto the stock compose.

The stock compose publishes `3000:3000` on a bridge network. A host proxy to `127.0.0.1:3000` is seen inside the container as the Docker bridge gateway, not as loopback. With hops set and `TRUSTED_PROXY_IPS` empty, every user shares that gateway bucket and 10 failures lock sign-in. Do not put the gateway in `TRUSTED_PROXY_IPS` while port 3000 is published: Docker's userland proxy uses that same source for other published-port clients, and those clients could then choose the bucket.

For the compose deployment, use `container/vymanager-prod/reverse-proxy-compose.yml` with `container/vymanager-prod/Caddyfile`. It is a complete file: postgres, migrate, backend, frontend, and a proxy at `172.28.10.10` and `fd28:10::10` on a dual-stack network. Frontend port 3000 is not published. Set `VYMANAGER_HOST` to the name users type, in the shell or in a `.env` file next to the compose file. The stack refuses to start if it is unset. Set `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `TRUSTED_ORIGINS` to `https://` plus that same name. Caddy issues an internal certificate for that name only and redirects port 80. The local CA is stored in the `caddy_data` volume so it survives a recreate. Leave `BETTER_AUTH_SECURE_COOKIES` unset until the browser trusts that CA. Run it from that directory with `docker compose -f reverse-proxy-compose.yml up -d`. It needs the same env files as the stock compose, plus `SSH_ENCRYPTION_KEY` and `VYMANAGER_HOST`.

IPv6 clients that reach a published port on an IPv4-only bridge are seen as the gateway, so they share one sign-in bucket. The compose file enables IPv6 and gives the proxy `fd28:10::10`, which is listed next to its IPv4 address. Turning the userland proxy off does not fix that: with the userland proxy off, Docker cannot forward IPv6 to an IPv4-only container.

A plain merge onto the stock compose is the wrong tool. A merge can add an address pool. It cannot drop the published `3000:3000` port, and that published port is what makes a host proxy look like the Docker gateway.

`TRUSTED_ORIGINS` must contain exactly the URLs users type into their browser — both the WebSocket origin check and Better Auth validate against it. `BETTER_AUTH_SECURE_COOKIES=true` marks session cookies `Secure` (the backend accepts both the plain and `__Secure-`-prefixed cookie names); only enable it once HTTPS works end to end.
