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
```

`TRUSTED_ORIGINS` must contain exactly the URLs users type into their browser — both the WebSocket origin check and Better Auth validate against it. `BETTER_AUTH_SECURE_COOKIES=true` marks session cookies `Secure` (the backend accepts both the plain and `__Secure-`-prefixed cookie names); only enable it once HTTPS works end to end.
