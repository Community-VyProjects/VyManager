from routers.container.container import _is_newer_image_tag, _parse_image_reference


def test_parse_image_reference_handles_default_registry_and_tag():
    registry, repository, tag = _parse_image_reference("docker.io/library/nginx:1.25.5")

    assert registry == "docker.io"
    assert repository == "library/nginx"
    assert tag == "1.25.5"


def test_parse_image_reference_handles_repo_without_registry():
    registry, repository, tag = _parse_image_reference("ghcr.io/community-vyprojects/vymanager:latest")

    assert registry == "ghcr.io"
    assert repository == "community-vyprojects/vymanager"
    assert tag == "latest"


def test_parse_image_reference_handles_short_repo_tag_without_slash():
    registry, repository, tag = _parse_image_reference("redis:7.2")

    assert registry == "docker.io"
    assert repository == "redis"
    assert tag == "7.2"


def test_is_newer_image_tag_detects_semver_upgrades():
    assert _is_newer_image_tag("1.25.2", "1.26.0") is True
    assert _is_newer_image_tag("1.26.0", "1.25.2") is False
    assert _is_newer_image_tag("latest", "1.26.0") is False
    assert _is_newer_image_tag("v1.25.2", "v1.26.0") is True
