# Changelog

## [Unreleased]

### Added

#### Auto-Update - One-click update process (#125)

- **Dashboard button** - Site ADMINs now see an "Update now" button in the Open Beta banner when a new version is available, replacing the previous static link.
- **Update progress dialog** - A modal shows real-time progress through each phase: pulling frontend image -> pulling backend image -> applying -> waiting for services to restart. The page reloads automatically once the backend comes back online.
- **Backend self-update endpoint** (`POST /vyos/version/update/start`) - Pulls new images from GHCR and recreates containers via a `docker:cli` helper. Requires Site ADMIN role and Docker socket access.
- **Update status endpoint** (`GET /vyos/version/update/status`) - Returns the current update phase and message, polled by the frontend every 1.5 seconds. No authentication required.
- **Simulation mode** (`?simulate=true`) - Cycles through all update phases with delays without touching Docker, useful for testing in local dev environments.
- **Docker socket mount** - Added `/var/run/docker.sock` volume to the backend service in `docker-compose.yml` to allow the backend to interact with the Docker daemon.
- **Python Docker SDK** - Added `docker==7.1.0` to `backend/requirements.txt`.

### Fixed

- **Site ADMIN permissions without active VyOS session** - `get_user_feature_permissions` previously returned 404 for Site ADMINs with no active VyOS instance. Site ADMINs now receive full permissions immediately without requiring an active session.
