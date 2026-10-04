#!/usr/bin/env python3
"""Render the chart and check the install contract.

These assertions fail on the chart before the schema wait, ingress
timeouts, test-hook cleanup, and floating-tag pull policy. The harness
lives outside the chart so helm package does not ship it.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHART = ROOT / "charts" / "vymanager"


def helm(*args: str) -> str:
    cmd = ["helm", "template", "rel", str(CHART), *args]
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(f"helm template failed: {args}")
    return result.stdout


def section(rendered: str, kind: str, name: str) -> str:
    docs = [doc for doc in rendered.split("\n---\n") if doc.strip()]
    matches = []
    for doc in docs:
        if f"kind: {kind}" not in doc:
            continue
        meta = doc.split("metadata:", 1)[-1]
        meta_name = ""
        for line in meta.splitlines():
            if line.startswith("  name:"):
                meta_name = line.split(":", 1)[1].strip().strip('"')
                break
        if meta_name == name or meta_name.endswith("-" + name) or f"-{name}-" in meta_name:
            matches.append(doc)
    if len(matches) != 1:
        raise SystemExit(f"expected one {kind} named *{name}, found {len(matches)}")
    return matches[0]


FAILURES: list[str] = []


def require(cond: bool, message: str) -> None:
    if not cond:
        FAILURES.append(message)


def main() -> None:
    lint = subprocess.run(
        ["helm", "lint", str(CHART)],
        check=False,
        capture_output=True,
        text=True,
    )
    require(lint.returncode == 0, lint.stdout + lint.stderr)

    with tempfile.TemporaryDirectory() as tmp:
        packaged = subprocess.run(
            ["helm", "package", str(CHART), "--destination", tmp],
            check=False,
            capture_output=True,
            text=True,
        )
        require(packaged.returncode == 0, packaged.stderr or packaged.stdout)
        tarballs = list(Path(tmp).glob("*.tgz"))
        require(len(tarballs) == 1, "helm package did not write a chart")
        listing = subprocess.run(
            ["tar", "-tzf", str(tarballs[0])],
            check=False,
            capture_output=True,
            text=True,
        )
        require(listing.returncode == 0, listing.stderr)
        require(
            "test_render_contract.py" not in listing.stdout,
            "helm package ships the render harness",
        )

    internal = helm("--set", "ingress.enabled=true", "--set", "ingress.className=nginx")
    backend = section(internal, "Deployment", "backend")
    frontend = section(internal, "Deployment", "frontend")
    require("name: wait-for-schema" in backend, "backend probes start before the schema is ready")
    init, _, app = backend.partition("\n      containers:")
    require("name: wait-for-schema" in init, "backend schema wait is not an initContainer")
    require("vymanager-frontend:beta" in init, "backend schema wait must use the migration image")
    require("vymanager-backend:" not in init, "backend schema wait used the backend image")
    require("vymanager-backend:beta" in app, "backend container image changed")
    require("name: wait-for-schema" in frontend, "frontend lost its schema wait")
    require('command: ["npm", "start"]' in frontend, "frontend must not migrate itself")
    require(backend.count("imagePullPolicy: Always") >= 2, "backend and its schema wait must pull Always for tag beta")
    require("imagePullPolicy: Always" in frontend, "frontend must pull Always for tag beta")
    require("http://frontend:3000" not in internal, "FRONTEND_INTERNAL_URL still uses the compose hostname")
    require(
        "http://rel-vymanager-frontend:3000" in backend,
        "FRONTEND_INTERNAL_URL does not point at this release's frontend Service",
    )
    ingress = section(internal, "Ingress", "rel-vymanager")
    require('proxy-read-timeout: "3600"' in ingress, "console websocket dies at the 60s read timeout")
    require('proxy-send-timeout: "3600"' in ingress, "console websocket dies at the 60s send timeout")
    test_pod = section(internal, "Pod", "test-connection")
    require(
        "before-hook-creation,hook-succeeded" in test_pod,
        "second helm test fails because the pod already exists",
    )
    require("kind: StatefulSet" in internal, "internal mode dropped PostgreSQL")
    require("npx prisma migrate deploy" in internal, "migration Job is gone")

    external = helm(
        "--set", "database.mode=external",
        "--set", "database.external.existingSecret=ext-db",
        "--set", "database.external.secretKey=DATABASE_URL",
    )
    require("kind: StatefulSet" not in external, "external mode still renders PostgreSQL")
    require("kind: Secret" not in external, "external mode copied a database Secret")
    ext_backend = section(external, "Deployment", "backend")
    require("name: wait-for-schema" in ext_backend, "external mode skipped the backend schema wait")
    require("name: ext-db" in ext_backend, "external mode does not use the supplied database Secret")

    pinned = helm(
        "--set", "frontend.image.tag=1.2.3",
        "--set", "frontend.image.pullPolicy=IfNotPresent",
        "--set", "backend.image.tag=1.2.3",
        "--set", "backend.image.pullPolicy=IfNotPresent",
    )
    require(
        "imagePullPolicy: IfNotPresent" in section(pinned, "Deployment", "frontend"),
        "a version tag must keep IfNotPresent",
    )
    require(
        "imagePullPolicy: IfNotPresent" in section(pinned, "Deployment", "backend"),
        "a versioned backend tag must keep IfNotPresent",
    )
    require(
        "imagePullPolicy: IfNotPresent" in section(pinned, "Job", "migrate"),
        "a versioned migration tag must keep IfNotPresent",
    )

    floating = helm(
        "--set", "frontend.image.pullPolicy=IfNotPresent",
        "--set", "backend.image.pullPolicy=IfNotPresent",
    )
    require(
        "imagePullPolicy: IfNotPresent" not in section(floating, "Deployment", "frontend"),
        "tag beta still rendered IfNotPresent",
    )
    require(
        "imagePullPolicy: Always" in section(floating, "Deployment", "backend"),
        "tag beta still rendered IfNotPresent on the backend",
    )
    require(
        "imagePullPolicy: Always" in section(floating, "Job", "migrate"),
        "tag beta still rendered IfNotPresent on the migration Job",
    )

    airgap = helm("--set", "frontend.image.pullPolicy=Never", "--set", "backend.image.pullPolicy=Never")
    require("imagePullPolicy: Never" in section(airgap, "Deployment", "frontend"), "Never must stay an explicit air-gap choice")

    with tempfile.NamedTemporaryFile("w", suffix=".yaml") as override:
        override.write(
            "ingress:\n"
            "  enabled: true\n"
            "  annotations:\n"
            "    nginx.ingress.kubernetes.io/proxy-read-timeout: \"30\"\n"
        )
        override.flush()
        overridden = helm("-f", override.name)
    over_ingress = section(overridden, "Ingress", "rel-vymanager")
    require('proxy-read-timeout: "30"' in over_ingress, "operators cannot override the read timeout")
    require('proxy-send-timeout: "3600"' in over_ingress, "overriding one annotation dropped the other")


if __name__ == "__main__":
    try:
        main()
    except SystemExit as exc:
        if exc.code not in (None, 0):
            FAILURES.append(str(exc.code))
    if FAILURES:
        print("\n".join(FAILURES))
        raise SystemExit(1)
    print("chart contract ok")
