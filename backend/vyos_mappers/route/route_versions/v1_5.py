"""VyOS 1.5 policy route mapper.

VyOS 1.5 adds:
  - source/destination geoip {country-code, asn, inverse-match}
  - tcp mss
  - set vrf
and splits the ``ipsec`` match into in/out leaves; ``limit rate`` takes
``<n>/<unit>``.
"""

from typing import List, Tuple

from ..route import RouteMapper

# Lab `allowed:` / syntax on 1.5.
IPSEC_DIRECTIONAL_LEAVES = ("match-ipsec-in", "match-ipsec-out", "match-none-in", "match-none-out")
LIMIT_RATE_UNITS = ("second", "minute", "hour", "day")
GEOIP_COUNTRY_CODES = (
    "ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az",
    "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs",
    "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn",
    "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee",
    "eg", "eh", "er", "es", "et", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf",
    "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm",
    "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm",
    "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc",
    "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mf", "mg", "mh", "mk",
    "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na",
    "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg",
    "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw",
    "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss",
    "st", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to",
    "tr", "tt", "tv", "tw", "tz", "ua", "ug", "um", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi",
    "vn", "vu", "wf", "ws", "ye", "yt", "za", "zm", "zw",
)


class RouteMapperV1_5(RouteMapper):
    """VyOS 1.5 policy route mapper with the 1.5-only paths."""

    # ========================================================================
    # Value lists
    # ========================================================================

    def ipsec_values(self) -> Tuple[str, ...]:
        return IPSEC_DIRECTIONAL_LEAVES

    def limit_rate_units(self) -> Tuple[str, ...]:
        return LIMIT_RATE_UNITS

    def geoip_country_codes(self) -> Tuple[str, ...]:
        return GEOIP_COUNTRY_CODES

    # ========================================================================
    # GeoIP, tcp mss, set vrf
    # ========================================================================

    def get_match_source_geoip_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "geoip"]

    def get_match_source_geoip_country_code(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["source", "geoip", "country-code", value]

    def get_match_source_geoip_asn(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["source", "geoip", "asn", value]

    def get_match_source_geoip_inverse(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["source", "geoip", "inverse-match"]

    def get_match_destination_geoip_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "geoip"]

    def get_match_destination_geoip_country_code(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["destination", "geoip", "country-code", value]

    def get_match_destination_geoip_asn(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        """One value of a ``multi:`` leaf (set or delete)."""
        return self._rule(policy_type, name, rule) + ["destination", "geoip", "asn", value]

    def get_match_destination_geoip_inverse(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["destination", "geoip", "inverse-match"]

    def get_match_tcp_mss(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["tcp", "mss", value]

    def get_match_tcp_mss_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["tcp", "mss"]

    def get_set_vrf(self, policy_type: str, name: str, rule: str, value: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "vrf", value]

    def get_set_vrf_path(self, policy_type: str, name: str, rule: str) -> List[str]:
        return self._rule(policy_type, name, rule) + ["set", "vrf"]
