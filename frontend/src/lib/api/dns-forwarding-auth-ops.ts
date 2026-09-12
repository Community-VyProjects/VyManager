import type { AuthDomainRecords, BatchOperation } from "./dns-forwarding";

export function buildAuthDomainOps(
  domain: string,
  disabled: boolean,
  records: AuthDomainRecords
): BatchOperation[] {
  const ops: BatchOperation[] = [
    { op: "delete_authoritative_domain", value: domain },
    { op: "set_authoritative_domain", value: domain },
  ];
  if (disabled) ops.push({ op: "set_authoritative_domain_disable", value: domain });

  for (const r of records.a) {
    if (r.address) ops.push({ op: "set_auth_a_address", value: `${domain},${r.hostname},${r.address}` });
    if (r.ttl != null) ops.push({ op: "set_auth_a_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_a_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.aaaa) {
    if (r.address) ops.push({ op: "set_auth_aaaa_address", value: `${domain},${r.hostname},${r.address}` });
    if (r.ttl != null) ops.push({ op: "set_auth_aaaa_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_aaaa_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.cname) {
    if (r.target) ops.push({ op: "set_auth_cname_target", value: `${domain},${r.hostname},${r.target}` });
    if (r.ttl != null) ops.push({ op: "set_auth_cname_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_cname_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.mx) {
    for (const srv of r.servers) {
      const priority = srv.priority ?? 10;
      ops.push({ op: "set_auth_mx_server_priority", value: `${domain},${r.hostname},${srv.server},${priority}` });
    }
    if (r.ttl != null) ops.push({ op: "set_auth_mx_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_mx_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.txt) {
    if (r.value) ops.push({ op: "set_auth_txt_value", value: `${domain},${r.hostname},${r.value}` });
    if (r.ttl != null) ops.push({ op: "set_auth_txt_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_txt_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.ns) {
    if (r.target) ops.push({ op: "set_auth_ns_target", value: `${domain},${r.hostname},${r.target}` });
    if (r.ttl != null) ops.push({ op: "set_auth_ns_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_ns_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.ptr) {
    if (r.target) ops.push({ op: "set_auth_ptr_target", value: `${domain},${r.hostname},${r.target}` });
    if (r.ttl != null) ops.push({ op: "set_auth_ptr_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_ptr_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.naptr) {
    if (r.ttl != null) ops.push({ op: "set_auth_naptr_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_naptr_disable", value: `${domain},${r.hostname}` });
    for (const rule of r.rules) {
      ops.push({ op: "set_auth_naptr_rule", value: `${domain},${r.hostname},${rule.rule}` });
      if (rule.order != null) ops.push({ op: "set_auth_naptr_rule_order", value: `${domain},${r.hostname},${rule.rule},${rule.order}` });
      if (rule.preference != null) ops.push({ op: "set_auth_naptr_rule_preference", value: `${domain},${r.hostname},${rule.rule},${rule.preference}` });
      if (rule.lookup_a) ops.push({ op: "set_auth_naptr_rule_lookup_a", value: `${domain},${r.hostname},${rule.rule}` });
      if (rule.lookup_srv) ops.push({ op: "set_auth_naptr_rule_lookup_srv", value: `${domain},${r.hostname},${rule.rule}` });
      if (rule.protocol_specific) ops.push({ op: "set_auth_naptr_rule_protocol_specific", value: `${domain},${r.hostname},${rule.rule}` });
      if (rule.resolve_uri) ops.push({ op: "set_auth_naptr_rule_resolve_uri", value: `${domain},${r.hostname},${rule.rule}` });
      if (rule.regexp) ops.push({ op: "set_auth_naptr_rule_regexp", value: `${domain},${r.hostname},${rule.rule},${rule.regexp}` });
      if (rule.replacement) ops.push({ op: "set_auth_naptr_rule_replacement", value: `${domain},${r.hostname},${rule.rule},${rule.replacement}` });
      if (rule.service) ops.push({ op: "set_auth_naptr_rule_service", value: `${domain},${r.hostname},${rule.rule},${rule.service}` });
    }
  }
  for (const r of records.spf) {
    if (r.value) ops.push({ op: "set_auth_spf_value", value: `${domain},${r.hostname},${r.value}` });
    if (r.ttl != null) ops.push({ op: "set_auth_spf_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_spf_disable", value: `${domain},${r.hostname}` });
  }
  for (const r of records.srv) {
    if (r.ttl != null) ops.push({ op: "set_auth_srv_ttl", value: `${domain},${r.hostname},${r.ttl}` });
    if (r.disabled) ops.push({ op: "set_auth_srv_disable", value: `${domain},${r.hostname}` });
    for (const e of r.entries) {
      ops.push({ op: "set_auth_srv_entry", value: `${domain},${r.hostname},${e.entry}` });
      if (e.hostname) ops.push({ op: "set_auth_srv_entry_hostname", value: `${domain},${r.hostname},${e.entry},${e.hostname}` });
      if (e.port != null) ops.push({ op: "set_auth_srv_entry_port", value: `${domain},${r.hostname},${e.entry},${e.port}` });
      if (e.priority != null) ops.push({ op: "set_auth_srv_entry_priority", value: `${domain},${r.hostname},${e.entry},${e.priority}` });
      if (e.weight != null) ops.push({ op: "set_auth_srv_entry_weight", value: `${domain},${r.hostname},${e.entry},${e.weight}` });
    }
  }
  return ops;
}
