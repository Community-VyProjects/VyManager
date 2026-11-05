"""Request-parsing behavior the backend relies on from Starlette.

Both cases are anonymous-reachable sinks in this app, so they must hold on
whatever Starlette backend/requirements.txt resolves (#984):

- AuthenticationMiddleware allows PUBLIC_PATHS by ``request.url.path``. A
  Host header carrying ``/`` or ``?`` must not rewrite that path to a public
  one while the router still dispatches the real, protected path
  (GHSA-86qp-5c8j-p5mr).
- The backup restore routes take ``Form()`` fields and are optional-auth, so
  an anonymous urlencoded body is parsed before any handler check. The form
  field limit must apply to urlencoded bodies too (GHSA-82w8-qh3p-5jfq).
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.responses import PlainTextResponse

from middleware.auth import AuthenticationMiddleware
from routers.session import session as session_router


def _auth_app() -> FastAPI:
    app = FastAPI()

    @app.get("/protected")
    async def protected():
        return PlainTextResponse("handler ran")

    app.add_middleware(AuthenticationMiddleware)
    return app


def test_poisoned_host_does_not_make_a_protected_path_public():
    assert "/" in AuthenticationMiddleware.PUBLIC_PATHS
    client = TestClient(_auth_app())

    # Without the fix this rebuilds request.url as
    # http://testserver/?x=/protected, so url.path is "/" (public) while the
    # router still runs /protected.
    response = client.get("/protected", headers={"host": "testserver/?x="})

    assert response.status_code == 401
    assert response.text != "handler ran"


def test_unauthenticated_request_to_protected_path_is_rejected():
    # Control: the same request with a normal Host is rejected, so the case
    # above fails only because of the Host header.
    client = TestClient(_auth_app())
    response = client.get("/protected")
    assert response.status_code == 401


def test_restore_preview_rejects_urlencoded_body_over_field_limit():
    app = FastAPI()
    app.include_router(session_router.router)
    client = TestClient(app, raise_server_exceptions=False)

    # Starlette's default max_fields is 1000. One more field must be refused
    # by the body parser instead of being built into FormData.
    body = "&".join(f"f{i}=v" for i in range(1001)) + "&passphrase=x"
    response = client.post(
        "/session/restore/preview",
        content=body,
        headers={"content-type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == 400
    assert "Too many fields" in response.text
