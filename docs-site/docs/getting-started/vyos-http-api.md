---
id: vyos-http-api
title: Enabling the VyOS HTTP API
sidebar_position: 5
---

# Enabling the VyOS HTTP API

VyManager talks to each router over the VyOS HTTP API. Enable it on every router you want to manage before adding the router in the UI.

Connect to the router over SSH and run:

```bash
# Enter configuration mode
configure

# Create an API key (replace YOUR_SECURE_API_KEY with a strong random key)
set service https api keys id vymanager key YOUR_SECURE_API_KEY

# Enable REST functionality (VyOS 1.5 only; on 1.4 the API is active once a key exists)
set service https api rest

# Enable GraphQL (required for the live dashboard cards)
set service https api graphql

# Authenticate GraphQL with the API key defined above
set service https api graphql authentication type key

# Save and apply
commit
save
exit
```

GraphQL is required for the streaming dashboard data: interface counters, system info, the network speed graph and WireGuard peers. Everything else works over the REST endpoints, but the dashboard cards stay empty without GraphQL.

You enter the API key later in the VyManager UI when adding the router as an instance.

## Securing the API

The API key grants full configuration access to the router. Treat it like a root credential.

- Generate a long random key: `openssl rand -hex 32`. Use a separate key per router so one leaked key does not expose the whole fleet.
- Keep the API on HTTPS (port 443, the default). Do not switch an instance to plain HTTP outside of isolated lab networks — the key travels with every request.
- By default VyManager does not verify the router's TLS certificate ("Verify SSL" is off when adding an instance, because most routers ship self-signed certificates). For production, install a certificate from your CA on the router, enable "Verify SSL" on the instance, and if the CA is private, add it to the backend trust store — see [Custom CA certificates](install-docker#custom-ca-certificates).
- Restrict who can reach the router's HTTPS port. Use the router's own firewall to allow the VyManager host and management networks only.
