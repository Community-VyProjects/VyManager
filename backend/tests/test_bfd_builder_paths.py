"""Golden (method, args, expected_path) cases for BfdBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from vyos_builders.bfd.bfd_batch_builder import BfdBatchBuilder

PEER = "192.0.2.1"
PROFILE = "CORE"

CASES = [
    ("set_peer", (PEER,), "set", ["protocols", "bfd", "peer", PEER]),
    ("delete_peer", (PEER,), "delete", ["protocols", "bfd", "peer", PEER]),
    (
        "set_peer_echo_mode",
        (PEER,),
        "set",
        ["protocols", "bfd", "peer", PEER, "echo-mode"],
    ),
    (
        "set_peer_interval_echo_interval",
        (PEER, "50"),
        "set",
        ["protocols", "bfd", "peer", PEER, "interval", "echo-interval", "50"],
    ),
    (
        "delete_peer_interval_echo_interval",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "interval", "echo-interval"],
    ),
    (
        "set_peer_interval_multiplier",
        (PEER, "3"),
        "set",
        ["protocols", "bfd", "peer", PEER, "interval", "multiplier", "3"],
    ),
    (
        "delete_peer_interval_multiplier",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "interval", "multiplier"],
    ),
    (
        "set_peer_interval_receive",
        (PEER, "300"),
        "set",
        ["protocols", "bfd", "peer", PEER, "interval", "receive", "300"],
    ),
    (
        "delete_peer_interval_receive",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "interval", "receive"],
    ),
    (
        "set_peer_interval_transmit",
        (PEER, "300"),
        "set",
        ["protocols", "bfd", "peer", PEER, "interval", "transmit", "300"],
    ),
    (
        "delete_peer_interval_transmit",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "interval", "transmit"],
    ),
    (
        "set_peer_minimum_ttl",
        (PEER, "2"),
        "set",
        ["protocols", "bfd", "peer", PEER, "minimum-ttl", "2"],
    ),
    (
        "delete_peer_minimum_ttl",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "minimum-ttl"],
    ),
    (
        "set_peer_multihop",
        (PEER,),
        "set",
        ["protocols", "bfd", "peer", PEER, "multihop"],
    ),
    (
        "set_peer_passive",
        (PEER,),
        "set",
        ["protocols", "bfd", "peer", PEER, "passive"],
    ),
    (
        "set_peer_profile",
        (PEER, PROFILE),
        "set",
        ["protocols", "bfd", "peer", PEER, "profile", PROFILE],
    ),
    (
        "delete_peer_profile",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "profile"],
    ),
    (
        "set_peer_shutdown",
        (PEER,),
        "set",
        ["protocols", "bfd", "peer", PEER, "shutdown"],
    ),
    (
        "set_peer_source_address",
        (PEER, "192.0.2.8"),
        "set",
        ["protocols", "bfd", "peer", PEER, "source", "address", "192.0.2.8"],
    ),
    (
        "delete_peer_source_address",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "source", "address"],
    ),
    (
        "set_peer_source_interface",
        (PEER, "eth0"),
        "set",
        ["protocols", "bfd", "peer", PEER, "source", "interface", "eth0"],
    ),
    (
        "delete_peer_source_interface",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "source", "interface"],
    ),
    (
        "set_peer_vrf",
        (PEER, "mgmt"),
        "set",
        ["protocols", "bfd", "peer", PEER, "vrf", "mgmt"],
    ),
    (
        "delete_peer_vrf",
        (PEER,),
        "delete",
        ["protocols", "bfd", "peer", PEER, "vrf"],
    ),
    ("set_profile", (PROFILE,), "set", ["protocols", "bfd", "profile", PROFILE]),
    (
        "delete_profile",
        (PROFILE,),
        "delete",
        ["protocols", "bfd", "profile", PROFILE],
    ),
    (
        "set_profile_echo_mode",
        (PROFILE,),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "echo-mode"],
    ),
    (
        "set_profile_interval_echo_interval",
        (PROFILE, "50"),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "interval", "echo-interval", "50"],
    ),
    (
        "delete_profile_interval_echo_interval",
        (PROFILE,),
        "delete",
        ["protocols", "bfd", "profile", PROFILE, "interval", "echo-interval"],
    ),
    (
        "set_profile_interval_multiplier",
        (PROFILE, "3"),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "interval", "multiplier", "3"],
    ),
    (
        "delete_profile_interval_multiplier",
        (PROFILE,),
        "delete",
        ["protocols", "bfd", "profile", PROFILE, "interval", "multiplier"],
    ),
    (
        "set_profile_interval_receive",
        (PROFILE, "300"),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "interval", "receive", "300"],
    ),
    (
        "delete_profile_interval_receive",
        (PROFILE,),
        "delete",
        ["protocols", "bfd", "profile", PROFILE, "interval", "receive"],
    ),
    (
        "set_profile_interval_transmit",
        (PROFILE, "300"),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "interval", "transmit", "300"],
    ),
    (
        "delete_profile_interval_transmit",
        (PROFILE,),
        "delete",
        ["protocols", "bfd", "profile", PROFILE, "interval", "transmit"],
    ),
    (
        "set_profile_minimum_ttl",
        (PROFILE, "2"),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "minimum-ttl", "2"],
    ),
    (
        "delete_profile_minimum_ttl",
        (PROFILE,),
        "delete",
        ["protocols", "bfd", "profile", PROFILE, "minimum-ttl"],
    ),
    (
        "set_profile_passive",
        (PROFILE,),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "passive"],
    ),
    (
        "set_profile_shutdown",
        (PROFILE,),
        "set",
        ["protocols", "bfd", "profile", PROFILE, "shutdown"],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_bfd_builder_paths(method, args, op, expected_path, version):
    builder = BfdBatchBuilder(version=version)
    getattr(builder, method)(*args)
    ops = builder.get_operations()
    assert [(item["op"], item["path"]) for item in ops] == [(op, expected_path)]
