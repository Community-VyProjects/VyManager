"""Web Proxy (Squid) Service Command Mapper.

Maps webproxy configuration attributes to VyOS config-tree paths under:
    service webproxy

The webproxy templates are identical between VyOS 1.4 and 1.5, so there are
no version-specific path overrides — the version subclasses are empty.

SET paths include the value as the last list element. DELETE paths stop at the
attribute key. Presence flags use the same path for set and delete.
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "webproxy"]
AUTH = BASE + ["authentication"]
LDAP = AUTH + ["ldap"]
SG = BASE + ["url-filtering", "squidguard"]


class WebProxyMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Top-level service
    # ========================================================================

    def get_webproxy_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Global scalar settings
    # ========================================================================

    def get_append_domain(self, value: str) -> List[str]:
        return BASE + ["append-domain", value]

    def get_append_domain_delete(self) -> List[str]:
        return BASE + ["append-domain"]

    def get_cache_size(self, value: str) -> List[str]:
        return BASE + ["cache-size", value]

    def get_cache_size_delete(self) -> List[str]:
        return BASE + ["cache-size"]

    def get_default_port(self, value: str) -> List[str]:
        return BASE + ["default-port", value]

    def get_default_port_delete(self) -> List[str]:
        return BASE + ["default-port"]

    def get_maximum_object_size(self, value: str) -> List[str]:
        return BASE + ["maximum-object-size", value]

    def get_maximum_object_size_delete(self) -> List[str]:
        return BASE + ["maximum-object-size"]

    def get_mem_cache_size(self, value: str) -> List[str]:
        return BASE + ["mem-cache-size", value]

    def get_mem_cache_size_delete(self) -> List[str]:
        return BASE + ["mem-cache-size"]

    def get_minimum_object_size(self, value: str) -> List[str]:
        return BASE + ["minimum-object-size", value]

    def get_minimum_object_size_delete(self) -> List[str]:
        return BASE + ["minimum-object-size"]

    def get_outgoing_address(self, value: str) -> List[str]:
        return BASE + ["outgoing-address", value]

    def get_outgoing_address_delete(self) -> List[str]:
        return BASE + ["outgoing-address"]

    def get_reply_body_max_size(self, value: str) -> List[str]:
        return BASE + ["reply-body-max-size", value]

    def get_reply_body_max_size_delete(self) -> List[str]:
        return BASE + ["reply-body-max-size"]

    # Presence flag
    def get_disable_access_log(self) -> List[str]:
        return BASE + ["disable-access-log"]

    # ========================================================================
    # Global multi-value settings
    # ========================================================================

    def get_domain_block(self, value: str) -> List[str]:
        return BASE + ["domain-block", value]

    def get_domain_block_all_delete(self) -> List[str]:
        return BASE + ["domain-block"]

    def get_domain_noncache(self, value: str) -> List[str]:
        return BASE + ["domain-noncache", value]

    def get_domain_noncache_all_delete(self) -> List[str]:
        return BASE + ["domain-noncache"]

    def get_reply_block_mime(self, value: str) -> List[str]:
        return BASE + ["reply-block-mime", value]

    def get_reply_block_mime_all_delete(self) -> List[str]:
        return BASE + ["reply-block-mime"]

    def get_safe_port(self, value: str) -> List[str]:
        return BASE + ["safe-ports", value]

    def get_safe_port_all_delete(self) -> List[str]:
        return BASE + ["safe-ports"]

    def get_ssl_safe_port(self, value: str) -> List[str]:
        return BASE + ["ssl-safe-ports", value]

    def get_ssl_safe_port_all_delete(self) -> List[str]:
        return BASE + ["ssl-safe-ports"]

    # ========================================================================
    # Authentication
    # ========================================================================

    def get_authentication_delete(self) -> List[str]:
        return AUTH

    def get_authentication_children(self, value: str) -> List[str]:
        return AUTH + ["children", value]

    def get_authentication_children_delete(self) -> List[str]:
        return AUTH + ["children"]

    def get_authentication_credentials_ttl(self, value: str) -> List[str]:
        return AUTH + ["credentials-ttl", value]

    def get_authentication_credentials_ttl_delete(self) -> List[str]:
        return AUTH + ["credentials-ttl"]

    def get_authentication_method(self, value: str) -> List[str]:
        return AUTH + ["method", value]

    def get_authentication_method_delete(self) -> List[str]:
        return AUTH + ["method"]

    def get_authentication_realm(self, value: str) -> List[str]:
        return AUTH + ["realm", value]

    def get_authentication_realm_delete(self) -> List[str]:
        return AUTH + ["realm"]

    # LDAP scalars
    def get_ldap_base_dn(self, value: str) -> List[str]:
        return LDAP + ["base-dn", value]

    def get_ldap_base_dn_delete(self) -> List[str]:
        return LDAP + ["base-dn"]

    def get_ldap_bind_dn(self, value: str) -> List[str]:
        return LDAP + ["bind-dn", value]

    def get_ldap_bind_dn_delete(self) -> List[str]:
        return LDAP + ["bind-dn"]

    def get_ldap_filter_expression(self, value: str) -> List[str]:
        return LDAP + ["filter-expression", value]

    def get_ldap_filter_expression_delete(self) -> List[str]:
        return LDAP + ["filter-expression"]

    def get_ldap_password(self, value: str) -> List[str]:
        return LDAP + ["password", value]

    def get_ldap_password_delete(self) -> List[str]:
        return LDAP + ["password"]

    def get_ldap_server(self, value: str) -> List[str]:
        return LDAP + ["server", value]

    def get_ldap_server_delete(self) -> List[str]:
        return LDAP + ["server"]

    def get_ldap_username_attribute(self, value: str) -> List[str]:
        return LDAP + ["username-attribute", value]

    def get_ldap_username_attribute_delete(self) -> List[str]:
        return LDAP + ["username-attribute"]

    def get_ldap_port(self, value: str) -> List[str]:
        return LDAP + ["port", value]

    def get_ldap_port_delete(self) -> List[str]:
        return LDAP + ["port"]

    def get_ldap_version(self, value: str) -> List[str]:
        return LDAP + ["version", value]

    def get_ldap_version_delete(self) -> List[str]:
        return LDAP + ["version"]

    # LDAP flags
    def get_ldap_persistent_connection(self) -> List[str]:
        return LDAP + ["persistent-connection"]

    def get_ldap_use_ssl(self) -> List[str]:
        return LDAP + ["use-ssl"]

    # ========================================================================
    # Cache peer (tag node keyed by name)
    # ========================================================================

    def get_cache_peer(self, name: str) -> List[str]:
        return BASE + ["cache-peer", name]

    def get_cache_peer_address(self, name: str, value: str) -> List[str]:
        return BASE + ["cache-peer", name, "address", value]

    def get_cache_peer_address_delete(self, name: str) -> List[str]:
        return BASE + ["cache-peer", name, "address"]

    def get_cache_peer_http_port(self, name: str, value: str) -> List[str]:
        return BASE + ["cache-peer", name, "http-port", value]

    def get_cache_peer_http_port_delete(self, name: str) -> List[str]:
        return BASE + ["cache-peer", name, "http-port"]

    def get_cache_peer_icp_port(self, name: str, value: str) -> List[str]:
        return BASE + ["cache-peer", name, "icp-port", value]

    def get_cache_peer_icp_port_delete(self, name: str) -> List[str]:
        return BASE + ["cache-peer", name, "icp-port"]

    def get_cache_peer_options(self, name: str, value: str) -> List[str]:
        return BASE + ["cache-peer", name, "options", value]

    def get_cache_peer_options_delete(self, name: str) -> List[str]:
        return BASE + ["cache-peer", name, "options"]

    def get_cache_peer_type(self, name: str, value: str) -> List[str]:
        return BASE + ["cache-peer", name, "type", value]

    def get_cache_peer_type_delete(self, name: str) -> List[str]:
        return BASE + ["cache-peer", name, "type"]

    # ========================================================================
    # Listen address (tag node keyed by IPv4)
    # ========================================================================

    def get_listen_address(self, address: str) -> List[str]:
        return BASE + ["listen-address", address]

    def get_listen_address_port(self, address: str, value: str) -> List[str]:
        return BASE + ["listen-address", address, "port", value]

    def get_listen_address_port_delete(self, address: str) -> List[str]:
        return BASE + ["listen-address", address, "port"]

    def get_listen_address_disable_transparent(self, address: str) -> List[str]:
        return BASE + ["listen-address", address, "disable-transparent"]

    # ========================================================================
    # URL filtering
    # ========================================================================

    def get_url_filtering_delete(self) -> List[str]:
        return BASE + ["url-filtering"]

    def get_url_filtering_disable(self) -> List[str]:
        return BASE + ["url-filtering", "disable"]

    # ------------------------------------------------------------------
    # squidGuard global
    # ------------------------------------------------------------------

    def get_squidguard_delete(self) -> List[str]:
        return SG

    def get_squidguard_allow_category(self, value: str) -> List[str]:
        return SG + ["allow-category", value]

    def get_squidguard_allow_category_all_delete(self) -> List[str]:
        return SG + ["allow-category"]

    def get_squidguard_block_category(self, value: str) -> List[str]:
        return SG + ["block-category", value]

    def get_squidguard_block_category_all_delete(self) -> List[str]:
        return SG + ["block-category"]

    def get_squidguard_log(self, value: str) -> List[str]:
        return SG + ["log", value]

    def get_squidguard_log_all_delete(self) -> List[str]:
        return SG + ["log"]

    def get_squidguard_local_block(self, value: str) -> List[str]:
        return SG + ["local-block", value]

    def get_squidguard_local_block_all_delete(self) -> List[str]:
        return SG + ["local-block"]

    def get_squidguard_local_block_keyword(self, value: str) -> List[str]:
        return SG + ["local-block-keyword", value]

    def get_squidguard_local_block_keyword_all_delete(self) -> List[str]:
        return SG + ["local-block-keyword"]

    def get_squidguard_local_block_url(self, value: str) -> List[str]:
        return SG + ["local-block-url", value]

    def get_squidguard_local_block_url_all_delete(self) -> List[str]:
        return SG + ["local-block-url"]

    def get_squidguard_local_ok(self, value: str) -> List[str]:
        return SG + ["local-ok", value]

    def get_squidguard_local_ok_all_delete(self) -> List[str]:
        return SG + ["local-ok"]

    def get_squidguard_local_ok_url(self, value: str) -> List[str]:
        return SG + ["local-ok-url", value]

    def get_squidguard_local_ok_url_all_delete(self) -> List[str]:
        return SG + ["local-ok-url"]

    def get_squidguard_allow_ipaddr_url(self) -> List[str]:
        return SG + ["allow-ipaddr-url"]

    def get_squidguard_enable_safe_search(self) -> List[str]:
        return SG + ["enable-safe-search"]

    def get_squidguard_default_action(self, value: str) -> List[str]:
        return SG + ["default-action", value]

    def get_squidguard_default_action_delete(self) -> List[str]:
        return SG + ["default-action"]

    def get_squidguard_redirect_url(self, value: str) -> List[str]:
        return SG + ["redirect-url", value]

    def get_squidguard_redirect_url_delete(self) -> List[str]:
        return SG + ["redirect-url"]

    def get_squidguard_auto_update_hour(self, value: str) -> List[str]:
        return SG + ["auto-update", "update-hour", value]

    def get_squidguard_auto_update_delete(self) -> List[str]:
        return SG + ["auto-update"]

    # ------------------------------------------------------------------
    # squidGuard rule (tag node keyed by number)
    # ------------------------------------------------------------------

    def get_squidguard_rule(self, number: str) -> List[str]:
        return SG + ["rule", number]

    def get_squidguard_rule_allow_category(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "allow-category", value]

    def get_squidguard_rule_allow_category_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "allow-category"]

    def get_squidguard_rule_block_category(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "block-category", value]

    def get_squidguard_rule_block_category_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "block-category"]

    def get_squidguard_rule_log(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "log", value]

    def get_squidguard_rule_log_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "log"]

    def get_squidguard_rule_local_block(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "local-block", value]

    def get_squidguard_rule_local_block_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "local-block"]

    def get_squidguard_rule_local_block_keyword(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "local-block-keyword", value]

    def get_squidguard_rule_local_block_keyword_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "local-block-keyword"]

    def get_squidguard_rule_local_block_url(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "local-block-url", value]

    def get_squidguard_rule_local_block_url_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "local-block-url"]

    def get_squidguard_rule_local_ok(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "local-ok", value]

    def get_squidguard_rule_local_ok_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "local-ok"]

    def get_squidguard_rule_local_ok_url(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "local-ok-url", value]

    def get_squidguard_rule_local_ok_url_all_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "local-ok-url"]

    def get_squidguard_rule_allow_ipaddr_url(self, number: str) -> List[str]:
        return SG + ["rule", number, "allow-ipaddr-url"]

    def get_squidguard_rule_enable_safe_search(self, number: str) -> List[str]:
        return SG + ["rule", number, "enable-safe-search"]

    def get_squidguard_rule_default_action(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "default-action", value]

    def get_squidguard_rule_default_action_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "default-action"]

    def get_squidguard_rule_redirect_url(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "redirect-url", value]

    def get_squidguard_rule_redirect_url_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "redirect-url"]

    def get_squidguard_rule_source_group(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "source-group", value]

    def get_squidguard_rule_source_group_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "source-group"]

    def get_squidguard_rule_time_period(self, number: str, value: str) -> List[str]:
        return SG + ["rule", number, "time-period", value]

    def get_squidguard_rule_time_period_delete(self, number: str) -> List[str]:
        return SG + ["rule", number, "time-period"]

    # ------------------------------------------------------------------
    # squidGuard source-group (tag node keyed by name)
    # ------------------------------------------------------------------

    def get_squidguard_source_group(self, name: str) -> List[str]:
        return SG + ["source-group", name]

    def get_squidguard_source_group_address(self, name: str, value: str) -> List[str]:
        return SG + ["source-group", name, "address", value]

    def get_squidguard_source_group_address_all_delete(self, name: str) -> List[str]:
        return SG + ["source-group", name, "address"]

    def get_squidguard_source_group_domain(self, name: str, value: str) -> List[str]:
        return SG + ["source-group", name, "domain", value]

    def get_squidguard_source_group_domain_all_delete(self, name: str) -> List[str]:
        return SG + ["source-group", name, "domain"]

    def get_squidguard_source_group_ldap_ip_search(self, name: str, value: str) -> List[str]:
        return SG + ["source-group", name, "ldap-ip-search", value]

    def get_squidguard_source_group_ldap_ip_search_all_delete(self, name: str) -> List[str]:
        return SG + ["source-group", name, "ldap-ip-search"]

    def get_squidguard_source_group_ldap_user_search(self, name: str, value: str) -> List[str]:
        return SG + ["source-group", name, "ldap-user-search", value]

    def get_squidguard_source_group_ldap_user_search_all_delete(self, name: str) -> List[str]:
        return SG + ["source-group", name, "ldap-user-search"]

    def get_squidguard_source_group_description(self, name: str, value: str) -> List[str]:
        return SG + ["source-group", name, "description", value]

    def get_squidguard_source_group_description_delete(self, name: str) -> List[str]:
        return SG + ["source-group", name, "description"]

    def get_squidguard_source_group_user(self, name: str, value: str) -> List[str]:
        return SG + ["source-group", name, "user", value]

    def get_squidguard_source_group_user_delete(self, name: str) -> List[str]:
        return SG + ["source-group", name, "user"]

    # ------------------------------------------------------------------
    # squidGuard time-period (tag node keyed by name)
    # ------------------------------------------------------------------

    def get_squidguard_time_period(self, name: str) -> List[str]:
        return SG + ["time-period", name]

    def get_squidguard_time_period_description(self, name: str, value: str) -> List[str]:
        return SG + ["time-period", name, "description", value]

    def get_squidguard_time_period_description_delete(self, name: str) -> List[str]:
        return SG + ["time-period", name, "description"]

    def get_squidguard_time_period_day_time(self, name: str, day: str, value: str) -> List[str]:
        return SG + ["time-period", name, "days", day, "time", value]

    def get_squidguard_time_period_day_delete(self, name: str, day: str) -> List[str]:
        return SG + ["time-period", name, "days", day]
