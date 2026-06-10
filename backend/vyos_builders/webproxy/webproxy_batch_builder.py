"""Web Proxy (Squid) Service Batch Builder.

Generates VyOS set/delete operations for the webproxy service.

Configuration lives under: service webproxy

Sections:
  - Global settings: ports, cache sizing, object size limits, logging
  - Global lists: domain-block, domain-noncache, reply-block-mime, safe-ports
  - Authentication: LDAP proxy authentication
  - Cache peers: upstream/sibling caches (tag node)
  - Listen addresses: per-address port + transparent mode (tag node)
  - URL filtering (squidGuard): categories, local lists, rules, source-groups,
    and time-periods

The webproxy CLI is identical on VyOS 1.4 and 1.5, so there are no
version-specific operations.

Multi-value lists follow a delete-all-then-add pattern: callers delete the
whole list then re-add each desired value.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class WebProxyBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["webproxy"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "WebProxyBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "WebProxyBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Top-level
    # -----------------------------------------------------------------------

    def delete_webproxy(self):
        return self.add_delete(self.m.get_webproxy_delete())

    # -----------------------------------------------------------------------
    # Global scalar settings
    # -----------------------------------------------------------------------

    def set_append_domain(self, value: str):
        return self.add_set(self.m.get_append_domain(value))

    def delete_append_domain(self):
        return self.add_delete(self.m.get_append_domain_delete())

    def set_cache_size(self, value: str):
        return self.add_set(self.m.get_cache_size(value))

    def delete_cache_size(self):
        return self.add_delete(self.m.get_cache_size_delete())

    def set_default_port(self, value: str):
        return self.add_set(self.m.get_default_port(value))

    def delete_default_port(self):
        return self.add_delete(self.m.get_default_port_delete())

    def set_maximum_object_size(self, value: str):
        return self.add_set(self.m.get_maximum_object_size(value))

    def delete_maximum_object_size(self):
        return self.add_delete(self.m.get_maximum_object_size_delete())

    def set_mem_cache_size(self, value: str):
        return self.add_set(self.m.get_mem_cache_size(value))

    def delete_mem_cache_size(self):
        return self.add_delete(self.m.get_mem_cache_size_delete())

    def set_minimum_object_size(self, value: str):
        return self.add_set(self.m.get_minimum_object_size(value))

    def delete_minimum_object_size(self):
        return self.add_delete(self.m.get_minimum_object_size_delete())

    def set_outgoing_address(self, value: str):
        return self.add_set(self.m.get_outgoing_address(value))

    def delete_outgoing_address(self):
        return self.add_delete(self.m.get_outgoing_address_delete())

    def set_reply_body_max_size(self, value: str):
        return self.add_set(self.m.get_reply_body_max_size(value))

    def delete_reply_body_max_size(self):
        return self.add_delete(self.m.get_reply_body_max_size_delete())

    def set_disable_access_log(self):
        return self.add_set(self.m.get_disable_access_log())

    def delete_disable_access_log(self):
        return self.add_delete(self.m.get_disable_access_log())

    # -----------------------------------------------------------------------
    # Global multi-value lists
    # -----------------------------------------------------------------------

    def add_domain_block(self, value: str):
        return self.add_set(self.m.get_domain_block(value))

    def delete_domain_block_all(self):
        return self.add_delete(self.m.get_domain_block_all_delete())

    def add_domain_noncache(self, value: str):
        return self.add_set(self.m.get_domain_noncache(value))

    def delete_domain_noncache_all(self):
        return self.add_delete(self.m.get_domain_noncache_all_delete())

    def add_reply_block_mime(self, value: str):
        return self.add_set(self.m.get_reply_block_mime(value))

    def delete_reply_block_mime_all(self):
        return self.add_delete(self.m.get_reply_block_mime_all_delete())

    def add_safe_port(self, value: str):
        return self.add_set(self.m.get_safe_port(value))

    def delete_safe_port_all(self):
        return self.add_delete(self.m.get_safe_port_all_delete())

    def add_ssl_safe_port(self, value: str):
        return self.add_set(self.m.get_ssl_safe_port(value))

    def delete_ssl_safe_port_all(self):
        return self.add_delete(self.m.get_ssl_safe_port_all_delete())

    # -----------------------------------------------------------------------
    # Authentication
    # -----------------------------------------------------------------------

    def delete_authentication(self):
        return self.add_delete(self.m.get_authentication_delete())

    def set_authentication_children(self, value: str):
        return self.add_set(self.m.get_authentication_children(value))

    def delete_authentication_children(self):
        return self.add_delete(self.m.get_authentication_children_delete())

    def set_authentication_credentials_ttl(self, value: str):
        return self.add_set(self.m.get_authentication_credentials_ttl(value))

    def delete_authentication_credentials_ttl(self):
        return self.add_delete(self.m.get_authentication_credentials_ttl_delete())

    def set_authentication_method(self, value: str):
        return self.add_set(self.m.get_authentication_method(value))

    def delete_authentication_method(self):
        return self.add_delete(self.m.get_authentication_method_delete())

    def set_authentication_realm(self, value: str):
        return self.add_set(self.m.get_authentication_realm(value))

    def delete_authentication_realm(self):
        return self.add_delete(self.m.get_authentication_realm_delete())

    # LDAP scalars
    def set_ldap_base_dn(self, value: str):
        return self.add_set(self.m.get_ldap_base_dn(value))

    def delete_ldap_base_dn(self):
        return self.add_delete(self.m.get_ldap_base_dn_delete())

    def set_ldap_bind_dn(self, value: str):
        return self.add_set(self.m.get_ldap_bind_dn(value))

    def delete_ldap_bind_dn(self):
        return self.add_delete(self.m.get_ldap_bind_dn_delete())

    def set_ldap_filter_expression(self, value: str):
        return self.add_set(self.m.get_ldap_filter_expression(value))

    def delete_ldap_filter_expression(self):
        return self.add_delete(self.m.get_ldap_filter_expression_delete())

    def set_ldap_password(self, value: str):
        return self.add_set(self.m.get_ldap_password(value))

    def delete_ldap_password(self):
        return self.add_delete(self.m.get_ldap_password_delete())

    def set_ldap_server(self, value: str):
        return self.add_set(self.m.get_ldap_server(value))

    def delete_ldap_server(self):
        return self.add_delete(self.m.get_ldap_server_delete())

    def set_ldap_username_attribute(self, value: str):
        return self.add_set(self.m.get_ldap_username_attribute(value))

    def delete_ldap_username_attribute(self):
        return self.add_delete(self.m.get_ldap_username_attribute_delete())

    def set_ldap_port(self, value: str):
        return self.add_set(self.m.get_ldap_port(value))

    def delete_ldap_port(self):
        return self.add_delete(self.m.get_ldap_port_delete())

    def set_ldap_version(self, value: str):
        return self.add_set(self.m.get_ldap_version(value))

    def delete_ldap_version(self):
        return self.add_delete(self.m.get_ldap_version_delete())

    # LDAP flags
    def set_ldap_persistent_connection(self):
        return self.add_set(self.m.get_ldap_persistent_connection())

    def delete_ldap_persistent_connection(self):
        return self.add_delete(self.m.get_ldap_persistent_connection())

    def set_ldap_use_ssl(self):
        return self.add_set(self.m.get_ldap_use_ssl())

    def delete_ldap_use_ssl(self):
        return self.add_delete(self.m.get_ldap_use_ssl())

    # -----------------------------------------------------------------------
    # Cache peer (tag node)
    # -----------------------------------------------------------------------

    def set_cache_peer(self, name: str):
        return self.add_set(self.m.get_cache_peer(name))

    def delete_cache_peer(self, name: str):
        return self.add_delete(self.m.get_cache_peer(name))

    def set_cache_peer_address(self, name: str, value: str):
        return self.add_set(self.m.get_cache_peer_address(name, value))

    def delete_cache_peer_address(self, name: str):
        return self.add_delete(self.m.get_cache_peer_address_delete(name))

    def set_cache_peer_http_port(self, name: str, value: str):
        return self.add_set(self.m.get_cache_peer_http_port(name, value))

    def delete_cache_peer_http_port(self, name: str):
        return self.add_delete(self.m.get_cache_peer_http_port_delete(name))

    def set_cache_peer_icp_port(self, name: str, value: str):
        return self.add_set(self.m.get_cache_peer_icp_port(name, value))

    def delete_cache_peer_icp_port(self, name: str):
        return self.add_delete(self.m.get_cache_peer_icp_port_delete(name))

    def set_cache_peer_options(self, name: str, value: str):
        return self.add_set(self.m.get_cache_peer_options(name, value))

    def delete_cache_peer_options(self, name: str):
        return self.add_delete(self.m.get_cache_peer_options_delete(name))

    def set_cache_peer_type(self, name: str, value: str):
        return self.add_set(self.m.get_cache_peer_type(name, value))

    def delete_cache_peer_type(self, name: str):
        return self.add_delete(self.m.get_cache_peer_type_delete(name))

    # -----------------------------------------------------------------------
    # Listen address (tag node)
    # -----------------------------------------------------------------------

    def set_listen_address(self, address: str):
        return self.add_set(self.m.get_listen_address(address))

    def delete_listen_address(self, address: str):
        return self.add_delete(self.m.get_listen_address(address))

    def set_listen_address_port(self, address: str, value: str):
        return self.add_set(self.m.get_listen_address_port(address, value))

    def delete_listen_address_port(self, address: str):
        return self.add_delete(self.m.get_listen_address_port_delete(address))

    def set_listen_address_disable_transparent(self, address: str):
        return self.add_set(self.m.get_listen_address_disable_transparent(address))

    def delete_listen_address_disable_transparent(self, address: str):
        return self.add_delete(self.m.get_listen_address_disable_transparent(address))

    # -----------------------------------------------------------------------
    # URL filtering
    # -----------------------------------------------------------------------

    def delete_url_filtering(self):
        return self.add_delete(self.m.get_url_filtering_delete())

    def set_url_filtering_disable(self):
        return self.add_set(self.m.get_url_filtering_disable())

    def delete_url_filtering_disable(self):
        return self.add_delete(self.m.get_url_filtering_disable())

    # squidGuard global
    def delete_squidguard(self):
        return self.add_delete(self.m.get_squidguard_delete())

    def add_squidguard_allow_category(self, value: str):
        return self.add_set(self.m.get_squidguard_allow_category(value))

    def delete_squidguard_allow_category_all(self):
        return self.add_delete(self.m.get_squidguard_allow_category_all_delete())

    def add_squidguard_block_category(self, value: str):
        return self.add_set(self.m.get_squidguard_block_category(value))

    def delete_squidguard_block_category_all(self):
        return self.add_delete(self.m.get_squidguard_block_category_all_delete())

    def add_squidguard_log(self, value: str):
        return self.add_set(self.m.get_squidguard_log(value))

    def delete_squidguard_log_all(self):
        return self.add_delete(self.m.get_squidguard_log_all_delete())

    def add_squidguard_local_block(self, value: str):
        return self.add_set(self.m.get_squidguard_local_block(value))

    def delete_squidguard_local_block_all(self):
        return self.add_delete(self.m.get_squidguard_local_block_all_delete())

    def add_squidguard_local_block_keyword(self, value: str):
        return self.add_set(self.m.get_squidguard_local_block_keyword(value))

    def delete_squidguard_local_block_keyword_all(self):
        return self.add_delete(self.m.get_squidguard_local_block_keyword_all_delete())

    def add_squidguard_local_block_url(self, value: str):
        return self.add_set(self.m.get_squidguard_local_block_url(value))

    def delete_squidguard_local_block_url_all(self):
        return self.add_delete(self.m.get_squidguard_local_block_url_all_delete())

    def add_squidguard_local_ok(self, value: str):
        return self.add_set(self.m.get_squidguard_local_ok(value))

    def delete_squidguard_local_ok_all(self):
        return self.add_delete(self.m.get_squidguard_local_ok_all_delete())

    def add_squidguard_local_ok_url(self, value: str):
        return self.add_set(self.m.get_squidguard_local_ok_url(value))

    def delete_squidguard_local_ok_url_all(self):
        return self.add_delete(self.m.get_squidguard_local_ok_url_all_delete())

    def set_squidguard_allow_ipaddr_url(self):
        return self.add_set(self.m.get_squidguard_allow_ipaddr_url())

    def delete_squidguard_allow_ipaddr_url(self):
        return self.add_delete(self.m.get_squidguard_allow_ipaddr_url())

    def set_squidguard_enable_safe_search(self):
        return self.add_set(self.m.get_squidguard_enable_safe_search())

    def delete_squidguard_enable_safe_search(self):
        return self.add_delete(self.m.get_squidguard_enable_safe_search())

    def set_squidguard_default_action(self, value: str):
        return self.add_set(self.m.get_squidguard_default_action(value))

    def delete_squidguard_default_action(self):
        return self.add_delete(self.m.get_squidguard_default_action_delete())

    def set_squidguard_redirect_url(self, value: str):
        return self.add_set(self.m.get_squidguard_redirect_url(value))

    def delete_squidguard_redirect_url(self):
        return self.add_delete(self.m.get_squidguard_redirect_url_delete())

    def set_squidguard_auto_update_hour(self, value: str):
        return self.add_set(self.m.get_squidguard_auto_update_hour(value))

    def delete_squidguard_auto_update(self):
        return self.add_delete(self.m.get_squidguard_auto_update_delete())

    # squidGuard rule (tag node)
    def set_squidguard_rule(self, number: str):
        return self.add_set(self.m.get_squidguard_rule(number))

    def delete_squidguard_rule(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule(number))

    def add_squidguard_rule_allow_category(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_allow_category(number, value))

    def delete_squidguard_rule_allow_category_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_allow_category_all_delete(number))

    def add_squidguard_rule_block_category(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_block_category(number, value))

    def delete_squidguard_rule_block_category_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_block_category_all_delete(number))

    def add_squidguard_rule_log(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_log(number, value))

    def delete_squidguard_rule_log_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_log_all_delete(number))

    def add_squidguard_rule_local_block(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_local_block(number, value))

    def delete_squidguard_rule_local_block_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_local_block_all_delete(number))

    def add_squidguard_rule_local_block_keyword(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_local_block_keyword(number, value))

    def delete_squidguard_rule_local_block_keyword_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_local_block_keyword_all_delete(number))

    def add_squidguard_rule_local_block_url(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_local_block_url(number, value))

    def delete_squidguard_rule_local_block_url_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_local_block_url_all_delete(number))

    def add_squidguard_rule_local_ok(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_local_ok(number, value))

    def delete_squidguard_rule_local_ok_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_local_ok_all_delete(number))

    def add_squidguard_rule_local_ok_url(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_local_ok_url(number, value))

    def delete_squidguard_rule_local_ok_url_all(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_local_ok_url_all_delete(number))

    def set_squidguard_rule_allow_ipaddr_url(self, number: str):
        return self.add_set(self.m.get_squidguard_rule_allow_ipaddr_url(number))

    def delete_squidguard_rule_allow_ipaddr_url(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_allow_ipaddr_url(number))

    def set_squidguard_rule_enable_safe_search(self, number: str):
        return self.add_set(self.m.get_squidguard_rule_enable_safe_search(number))

    def delete_squidguard_rule_enable_safe_search(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_enable_safe_search(number))

    def set_squidguard_rule_default_action(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_default_action(number, value))

    def delete_squidguard_rule_default_action(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_default_action_delete(number))

    def set_squidguard_rule_redirect_url(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_redirect_url(number, value))

    def delete_squidguard_rule_redirect_url(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_redirect_url_delete(number))

    def set_squidguard_rule_source_group(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_source_group(number, value))

    def delete_squidguard_rule_source_group(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_source_group_delete(number))

    def set_squidguard_rule_time_period(self, number: str, value: str):
        return self.add_set(self.m.get_squidguard_rule_time_period(number, value))

    def delete_squidguard_rule_time_period(self, number: str):
        return self.add_delete(self.m.get_squidguard_rule_time_period_delete(number))

    # squidGuard source-group (tag node)
    def set_squidguard_source_group(self, name: str):
        return self.add_set(self.m.get_squidguard_source_group(name))

    def delete_squidguard_source_group(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group(name))

    def add_squidguard_source_group_address(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_source_group_address(name, value))

    def delete_squidguard_source_group_address_all(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group_address_all_delete(name))

    def add_squidguard_source_group_domain(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_source_group_domain(name, value))

    def delete_squidguard_source_group_domain_all(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group_domain_all_delete(name))

    def add_squidguard_source_group_ldap_ip_search(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_source_group_ldap_ip_search(name, value))

    def delete_squidguard_source_group_ldap_ip_search_all(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group_ldap_ip_search_all_delete(name))

    def add_squidguard_source_group_ldap_user_search(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_source_group_ldap_user_search(name, value))

    def delete_squidguard_source_group_ldap_user_search_all(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group_ldap_user_search_all_delete(name))

    def set_squidguard_source_group_description(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_source_group_description(name, value))

    def delete_squidguard_source_group_description(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group_description_delete(name))

    def set_squidguard_source_group_user(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_source_group_user(name, value))

    def delete_squidguard_source_group_user(self, name: str):
        return self.add_delete(self.m.get_squidguard_source_group_user_delete(name))

    # squidGuard time-period (tag node)
    def set_squidguard_time_period(self, name: str):
        return self.add_set(self.m.get_squidguard_time_period(name))

    def delete_squidguard_time_period(self, name: str):
        return self.add_delete(self.m.get_squidguard_time_period(name))

    def set_squidguard_time_period_description(self, name: str, value: str):
        return self.add_set(self.m.get_squidguard_time_period_description(name, value))

    def delete_squidguard_time_period_description(self, name: str):
        return self.add_delete(self.m.get_squidguard_time_period_description_delete(name))

    def set_squidguard_time_period_day_time(self, name: str, day: str, value: str):
        return self.add_set(self.m.get_squidguard_time_period_day_time(name, day, value))

    def delete_squidguard_time_period_day(self, name: str, day: str):
        return self.add_delete(self.m.get_squidguard_time_period_day_delete(name, day))

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "global_settings": {
                    "supported": True,
                    "description": "Global proxy ports, cache sizing and object limits",
                },
                "authentication": {
                    "supported": True,
                    "description": "LDAP proxy authentication",
                },
                "cache_peer": {
                    "supported": True,
                    "description": "Upstream/sibling cache peers",
                },
                "listen_address": {
                    "supported": True,
                    "description": "Listen addresses with per-address port and transparent mode",
                },
                "url_filtering": {
                    "supported": True,
                    "description": "squidGuard URL filtering with categories, rules, source-groups and time-periods",
                },
            },
            "options": {
                "cache_peer_type": ["parent", "sibling", "multicast"],
                "default_action": ["allow", "block"],
                "ldap_version": ["2", "3"],
                "auth_method": ["ldap"],
                "time_period_days": [
                    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
                    "weekdays", "weekend", "all",
                ],
                "reply_block_mime": [
                    "application/pdf", "application/zip", "application/octet-stream",
                    "application/x-msdownload", "application/x-shockwave-flash",
                    "audio/mpeg", "image/gif", "image/jpeg", "image/png",
                    "text/html", "text/plain", "video/mpeg", "video/quicktime",
                    "video/x-msvideo",
                ],
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
