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
```

Leave `TRUSTED_PROXY_HOPS` unset on the stock compose. The nginx and Caddy blocks above are for Next.js listening on the host, where the proxy's TCP peer is loopback and hops is `1`. They are not the stock container.

The stock compose publishes `3000:3000` on a bridge network. A host proxy to `127.0.0.1:3000` is seen inside the container as the Docker bridge gateway, not as loopback. With hops set and `TRUSTED_PROXY_IPS` empty, every user shares that gateway bucket and 10 failures lock sign-in. Do not put the gateway in `TRUSTED_PROXY_IPS` while port 3000 is published: Docker's userland proxy uses that same source for other published-port clients, and those clients could then choose the bucket.

For the compose deployment, give the network an address pool, run the proxy on that network at a fixed address, do not publish frontend port 3000, and set the hop count to the number of proxies that append the header. This fragment is a separate file, not a merge onto the stock compose (a merge cannot assign `ipv4_address` on a network that has no pool):

```yaml
services:
  frontend:
    image: ghcr.io/community-vyprojects/vymanager-frontend:beta
    environment:
      TRUSTED_PROXY_HOPS: "1"
      TRUSTED_PROXY_IPS: 172.28.10.10
    networks:
      - vymanager-network
  proxy:
    image: caddy:2
    ports:
      - "443:443"
      - "80:80"
    networks:
      vymanager-network:
        ipv4_address: 172.28.10.10
networks:
  vymanager-network:
    ipam:
      config:
        - subnet: 172.28.10.0/24
```

Point the proxy at `frontend:3000` for page traffic and `backend:8000` for the WebSocket paths. `TRUSTED_PROXY_IPS` accepts an exact address or an IPv4 CIDR. `0.0.0.0/0` is ignored. A count that is too high lets the client choose the bucket. A count that is too low puts every user in the inner proxy's bucket.

`TRUSTED_ORIGINS` must contain exactly the URLs users type into their browser — both the WebSocket origin check and Better Auth validate against it. `BETTER_AUTH_SECURE_COOKIES=true` marks session cookies `Secure` (the backend accepts both the plain and `__Secure-`-prefixed cookie names); only enable it once HTTPS works end to end.
