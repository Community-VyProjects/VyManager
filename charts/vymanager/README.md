# VyManager Helm chart

This chart installs the VyManager frontend, backend, and Prisma migration Job.
PostgreSQL can be managed by the chart or supplied as an existing external
service.

## Prerequisites

- Kubernetes 1.23 or newer
- Helm 3
- an Ingress controller when `ingress.enabled=true`
- for external database mode, PostgreSQL reachable from the namespace and a
  role allowed to create and migrate VyManager tables

## Application Secret

Both database modes require stable application keys. Create them before the
installation:

```bash
kubectl create namespace vymanager
kubectl -n vymanager create secret generic vymanager-secrets \
  --from-literal=BETTER_AUTH_SECRET='replace-with-a-long-random-value' \
  --from-literal=SSH_ENCRYPTION_KEY='replace-with-exactly-64-hex-characters'
```

The Secret name and key names can be changed through `applicationSecrets`.

## Internal PostgreSQL (default)

With `database.mode=internal`, the chart creates:

- a single-replica PostgreSQL StatefulSet;
- a ClusterIP Service;
- an automatically generated PostgreSQL password and `DATABASE_URL` Secret;
- an 8 Gi PVC from the cluster's default StorageClass.

The generated password is reused on upgrades. Its Secret carries the Helm
`keep` policy, and the StatefulSet PVC is retained by Kubernetes when the
release is removed. Back up both the database and its Secret before uninstalling
or moving the release.

Example configuration:

```yaml
database:
  mode: internal
  internal:
    persistence:
      size: 20Gi
      storageClass: fast-ssd
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 1
        memory: 1Gi
```

Set `database.internal.persistence.existingClaim` to reuse a prepared PVC. Set
`persistence.enabled=false` only for disposable environments; PostgreSQL then
uses `emptyDir` and loses all data when its pod is replaced.

The username and database name are applied only while PostgreSQL initializes an
empty data directory. Do not change them after the PVC has been initialized.

## External PostgreSQL

Set `database.mode=external` and point the chart at an existing Secret whose key
contains the complete connection URL:

```bash
kubectl -n vymanager create secret generic vymanager-database \
  --from-literal=DATABASE_URL='postgresql://vymanager:password@postgres.example:5432/vymanager'
```

```yaml
database:
  mode: external
  external:
    existingSecret: vymanager-database
    secretKey: DATABASE_URL
```

No PostgreSQL Service, StatefulSet, Secret, or PVC is rendered in external mode.
The chart only references the supplied Secret and never copies its value into
Helm release metadata.

## Install

Create a values file containing the public URLs, resource policy, and optional
Ingress configuration:

```yaml
frontend:
  config:
    betterAuthUrl: https://vymanager.example.com
    nextPublicAppUrl: https://vymanager.example.com
    trustedOrigins: https://vymanager.example.com
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 1Gi

backend:
  config:
    frontendUrl: https://vymanager.example.com
    trustedOrigins: https://vymanager.example.com
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 1Gi

migrations:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 1Gi

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: vymanager.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: vymanager-tls
      hosts:
        - vymanager.example.com
```

Install the release:

```bash
helm upgrade --install vymanager ./charts/vymanager \
  --namespace vymanager \
  --create-namespace \
  --values my-values.yaml \
  --wait \
  --wait-for-jobs
```

The migration Job waits for internal PostgreSQL and applies Prisma migrations.
Frontend and backend both wait until that schema is clean before their probes
start. A failed migration therefore prevents the rollout from becoming ready.
Migrations are forward-only; back up PostgreSQL before an upgrade.

## Resource limits

Requests and limits can be set independently for every pod-producing component:

- `frontend.resources`
- `backend.resources`
- `database.internal.resources`
- `migrations.resources`
- `tests.resources` (pod created only by `helm test`)

Application and database resources are empty by default because appropriate
values depend on cluster policy and workload size.

## Custom CA certificates

To trust a private CA when the backend connects to VyOS, create a ConfigMap whose
keys end in `.crt` and reference it:

```bash
kubectl -n vymanager create configmap vymanager-custom-ca \
  --from-file=site-ca.crt=/path/to/site-ca.crt
```

```yaml
customCa:
  existingConfigMap: vymanager-custom-ca
```

Alternatively set `customCa.existingSecret`. Do not set both options.

## WebSockets and Ingress

The frontend proxies HTTP API calls internally, but cannot proxy WebSockets.
The chart therefore routes `/vyos/console/ws` and `/vyos/monitoring/ws` directly
to the backend on every configured Ingress host. Ingress annotations default
`proxy-read-timeout` and `proxy-send-timeout` to 3600 so those sockets are not
cut at the controller's 60 second limit. Override `ingress.annotations` to
change them. For a separate WebSocket host, set `frontend.config.publicWsUrl`
and customize `ingress.backendPaths` or provide a separate Ingress.

