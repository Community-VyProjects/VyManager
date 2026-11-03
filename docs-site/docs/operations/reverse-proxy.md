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
TRUSTED_PROXY_HOPS=1
TRUSTED_PROXY_IPS=
```

`TRUSTED_PROXY_HOPS` is how many proxies append `X-Forwarded-For`, including the one that connects to the app. The examples above are `1` only when the proxy connects to the app from loopback, which is true if Next.js is listening on the host. The stock compose publishes `3000:3000` on a bridge network. A host nginx or Caddy that proxies to `127.0.0.1:3000` is then seen inside the container as the Docker bridge gateway, not as loopback. With hops set and `TRUSTED_PROXY_IPS` empty, every user shares that gateway bucket and 10 failures lock sign-in. Do not put the gateway in `TRUSTED_PROXY_IPS` while port 3000 is published: Docker's userland proxy uses that same source for other published-port clients, and those clients could then choose the bucket. For the compose deployment, run the proxy on `vymanager-network` with a fixed address, do not publish frontend port 3000, and set `TRUSTED_PROXY_IPS` to that address (an IPv4 CIDR is accepted; `0.0.0.0/0` is not). A count that is too high lets the client choose the bucket. A count that is too low puts every user in the inner proxy's bucket.

`TRUSTED_ORIGINS` must contain exactly the URLs users type into their browser — both the WebSocket origin check and Better Auth validate against it. `BETTER_AUTH_SECURE_COOKIES=true` marks session cookies `Secure` (the backend accepts both the plain and `__Secure-`-prefixed cookie names); only enable it once HTTPS works end to end.
