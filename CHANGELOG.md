# Changelog

## [Unreleased]

### Added

- **One-click update** (#125) - Site ADMINs can update VyManager directly from the dashboard banner. A dedicated `vymanager-updater` sidecar container handles all Docker operations (pull, tag, recreate), keeping the backend free of any Docker coupling. A progress dialog polls the update status and reloads the page once services are back online.
- **Update rollback** - Before pulling new images, the updater tags the current images as `:rollback`. Site ADMINs can revert to the previous version via a rollback button that appears after a successful update.
- **Updater sidecar** (`updater/`) - Minimal FastAPI service (~150 lines) with the Docker socket. Exposes `POST /update`, `POST /rollback`, `GET /update/status`, `GET /rollback/status`, `DELETE /rollback/images`. Only reachable from the internal Docker network.

### Fixed

- **Site ADMIN permissions** - `get_user_feature_permissions` returned 404 for admins with no active VyOS instance. Site ADMINs now get full WRITE permissions without requiring an active session.
