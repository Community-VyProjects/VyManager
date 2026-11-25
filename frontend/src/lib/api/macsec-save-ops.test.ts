import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  macsecDeleteOps,
  macsecDraft,
  macsecSaveOps,
  macsecSaveProblem,
  MASKED_SECRET,
  nextMacsecName,
  nextPdId,
  nextPeerName,
  type MacsecDraft,
  type MacsecProblemKey,
} from "./macsec-save-ops";
import {
  macsecService,
  type MacsecBatchOperation,
  type MacsecCapabilities,
  type MacsecInterface,
} from "./macsec";

const K128 = "0123456789abcdef0123456789abcdef";
const K128B = "fedcba9876543210fedcba9876543210";
const K256 = K128 + K128;

function caps(v15: boolean): MacsecCapabilities {
  const f = (supported: boolean) => ({ supported, description: "" });
  return {
    version: v15 ? "1.5" : "1.4",
    features: {
      address: f(true),
      ipv6_address_interface_identifier: f(v15),
      dhcpv6_options_no_request_dns: f(v15),
      dhcpv6_options_no_request_domain_name: f(v15),
    },
    values: { cipher: ["gcm-aes-128", "gcm-aes-256"], source_validation: ["strict", "loose", "disable"] },
  };
}
const CAPS14 = caps(false);
const CAPS15 = caps(true);

function ip(over: Partial<NonNullable<MacsecInterface["ip"]>> = {}): NonNullable<MacsecInterface["ip"]> {
  return {
    adjust_mss: null,
    arp_cache_timeout: null,
    disable_arp_filter: false,
    disable_forwarding: false,
    enable_arp_accept: false,
    enable_arp_announce: false,
    enable_arp_ignore: false,
    enable_directed_broadcast: false,
    enable_proxy_arp: false,
    proxy_arp_pvlan: false,
    source_validation: null,
    ...over,
  };
}

function ipv6(over: Partial<NonNullable<MacsecInterface["ipv6"]>> = {}): NonNullable<MacsecInterface["ipv6"]> {
  return {
    accept_dad: null,
    address_autoconf: false,
    address_eui64: [],
    address_no_default_link_local: false,
    address_interface_identifier: null,
    adjust_mss: null,
    base_reachable_time: null,
    disable_forwarding: false,
    dup_addr_detect_transmits: null,
    source_validation: null,
    ...over,
  };
}

/** A loaded MKA interface (keys masked as GET /config returns them). */
function iface(over: Partial<MacsecInterface> = {}): MacsecInterface {
  return {
    name: "macsec0",
    type: "macsec",
    addresses: [],
    description: null,
    disabled: false,
    mtu: null,
    source_interface: "eth1",
    vrf: null,
    security: {
      cipher: "gcm-aes-128",
      encrypt: true,
      replay_window: null,
      mka: { cak: MASKED_SECRET, ckn: "abcd", priority: null },
      static: null,
    },
    ip: ip(),
    ipv6: ipv6(),
    dhcp_options: null,
    dhcpv6_options: null,
    mirror_ingress: null,
    mirror_egress: null,
    mirror_configured: false,
    redirect: null,
    ...over,
  };
}

/** A loaded static-key interface with two peers. */
function staticIface(over: Partial<MacsecInterface> = {}, encrypt = false): MacsecInterface {
  return iface({
    security: {
      cipher: "gcm-aes-128",
      encrypt,
      replay_window: null,
      mka: null,
      static: {
        key: MASKED_SECRET,
        peers: [
          { name: "p1", key: MASKED_SECRET, mac: "00:11:22:33:44:55", disable: false },
          { name: "p2", key: MASKED_SECRET, mac: "00:11:22:33:44:66", disable: true },
        ],
      },
    },
    ...over,
  });
}

/** Every field the dialog edits, filled (MKA mode). */
function fullDraft(c: MacsecCapabilities = CAPS15): MacsecDraft {
  const d = macsecDraft(null, c);
  return {
    ...d,
    name: "macsec1",
    source_interface: "eth1",
    description: "link",
    mtu: "1500",
    vrf: "red",
    disabled: true,
    addresses: ["10.0.0.1/24", "2001:db8::1/64"],
    dhcp: true,
    dhcpv6: true,
    cipher: "gcm-aes-128",
    encrypt: true,
    replay_window: "10",
    mode: "mka",
    mka_cak: K128,
    mka_ckn: "abcd",
    mka_priority: "10",
    ip: {
      adjust_mss: "1400",
      arp_cache_timeout: "300",
      disable_arp_filter: true,
      disable_forwarding: true,
      enable_arp_accept: true,
      enable_arp_announce: true,
      enable_arp_ignore: true,
      enable_directed_broadcast: true,
      enable_proxy_arp: true,
      proxy_arp_pvlan: true,
      source_validation: "strict",
    },
    ipv6: {
      accept_dad: "1",
      address_autoconf: true,
      address_eui64: ["2001:db8:1::/64"],
      address_no_default_link_local: true,
      address_interface_identifier: "::1",
      adjust_mss: "clamp-mss-to-pmtu",
      base_reachable_time: "30",
      disable_forwarding: true,
      dup_addr_detect_transmits: "1",
      source_validation: "loose",
    },
    dhcp_options: {
      client_id: "cid",
      default_route_distance: "10",
      host_name: "host1",
      mtu: true,
      no_default_route: true,
      reject: ["192.0.2.1", "198.51.100.0/24"],
      user_class: "uc",
      vendor_class_id: "vc",
    },
    dhcpv6_options: {
      duid: "00:01",
      no_release: true,
      no_request_dns: true,
      no_request_domain_name: true,
      parameters_only: true,
      rapid_commit: true,
      temporary: true,
      pd: [{ id: "0", length: "56", interfaces: [{ name: "eth2", address: "1", sla_id: "0" }] }],
    },
    mirror_ingress: "eth3",
    mirror_egress: "",
    redirect: "",
  };
}

/** What GET /config returns after the full draft committed (1.5). */
function fullIface(): MacsecInterface {
  return iface({
    name: "macsec1",
    description: "link",
    mtu: "1500",
    vrf: "red",
    disabled: true,
    addresses: ["10.0.0.1/24", "2001:db8::1/64", "dhcp", "dhcpv6"],
    security: {
      cipher: "gcm-aes-128",
      encrypt: true,
      replay_window: "10",
      mka: { cak: MASKED_SECRET, ckn: "abcd", priority: "10" },
      static: null,
    },
    ip: ip({
      adjust_mss: "1400",
      arp_cache_timeout: "300",
      disable_arp_filter: true,
      disable_forwarding: true,
      enable_arp_accept: true,
      enable_arp_announce: true,
      enable_arp_ignore: true,
      enable_directed_broadcast: true,
      enable_proxy_arp: true,
      proxy_arp_pvlan: true,
      source_validation: "strict",
    }),
    ipv6: ipv6({
      accept_dad: "1",
      address_autoconf: true,
      address_eui64: ["2001:db8:1::/64"],
      address_no_default_link_local: true,
      address_interface_identifier: "::1",
      adjust_mss: "clamp-mss-to-pmtu",
      base_reachable_time: "30",
      disable_forwarding: true,
      dup_addr_detect_transmits: "1",
      source_validation: "loose",
    }),
    dhcp_options: {
      client_id: "cid",
      default_route_distance: "10",
      host_name: "host1",
      mtu: true,
      no_default_route: true,
      reject: ["192.0.2.1", "198.51.100.0/24"],
      user_class: "uc",
      vendor_class_id: "vc",
    },
    dhcpv6_options: {
      duid: "00:01",
      no_release: true,
      no_request_dns: true,
      no_request_domain_name: true,
      parameters_only: true,
      rapid_commit: true,
      temporary: true,
      pd: { "0": { length: "56", interfaces: { eth2: { address: "1", sla_id: "0" } } } },
    },
    mirror_ingress: "eth3",
    mirror_configured: true,
  });
}

const VERSION_ONLY_OPS = [
  { op: "set_ipv6_address_interface_identifier", value: "::1" },
  { op: "set_dhcpv6_options_no_request_dns" },
  { op: "set_dhcpv6_options_no_request_domain_name" },
];

const FULL_CREATE_OPS: MacsecBatchOperation[] = [
  { op: "set_source_interface", value: "eth1" },
  { op: "set_interface_description", value: "link" },
  { op: "set_mtu", value: "1500" },
  { op: "set_vrf", value: "red" },
  { op: "set_interface_disable" },
  { op: "set_interface_address", value: "10.0.0.1/24" },
  { op: "set_interface_address", value: "2001:db8::1/64" },
  { op: "set_interface_address", value: "dhcp" },
  { op: "set_interface_address", value: "dhcpv6" },
  { op: "set_security_cipher", value: "gcm-aes-128" },
  { op: "set_security_encrypt" },
  { op: "set_security_replay_window", value: "10" },
  { op: "set_security_mka_cak", value: K128 },
  { op: "set_security_mka_ckn", value: "abcd" },
  { op: "set_security_mka_priority", value: "10" },
  { op: "set_ip_adjust_mss", value: "1400" },
  { op: "set_ip_arp_cache_timeout", value: "300" },
  { op: "set_ip_disable_arp_filter" },
  { op: "set_ip_disable_forwarding" },
  { op: "set_ip_enable_arp_accept" },
  { op: "set_ip_enable_arp_announce" },
  { op: "set_ip_enable_arp_ignore" },
  { op: "set_ip_enable_directed_broadcast" },
  { op: "set_ip_enable_proxy_arp" },
  { op: "set_ip_proxy_arp_pvlan" },
  { op: "set_ip_source_validation", value: "strict" },
  { op: "set_ipv6_accept_dad", value: "1" },
  { op: "set_ipv6_address_autoconf" },
  { op: "set_ipv6_address_eui64", value: "2001:db8:1::/64" },
  { op: "set_ipv6_address_no_default_link_local" },
  { op: "set_ipv6_address_interface_identifier", value: "::1" },
  { op: "set_ipv6_adjust_mss_clamp_to_pmtu" },
  { op: "set_ipv6_base_reachable_time", value: "30" },
  { op: "set_ipv6_disable_forwarding" },
  { op: "set_ipv6_dup_addr_detect_transmits", value: "1" },
  { op: "set_ipv6_source_validation", value: "loose" },
  { op: "set_dhcp_options_client_id", value: "cid" },
  { op: "set_dhcp_options_default_route_distance", value: "10" },
  { op: "set_dhcp_options_host_name", value: "host1" },
  { op: "set_dhcp_options_mtu" },
  { op: "set_dhcp_options_no_default_route" },
  { op: "set_dhcp_options_reject", value: "192.0.2.1" },
  { op: "set_dhcp_options_reject", value: "198.51.100.0/24" },
  { op: "set_dhcp_options_user_class", value: "uc" },
  { op: "set_dhcp_options_vendor_class_id", value: "vc" },
  { op: "set_dhcpv6_options_duid", value: "00:01" },
  { op: "set_dhcpv6_options_no_release" },
  { op: "set_dhcpv6_options_no_request_dns" },
  { op: "set_dhcpv6_options_no_request_domain_name" },
  { op: "set_dhcpv6_options_parameters_only" },
  { op: "set_dhcpv6_options_rapid_commit" },
  { op: "set_dhcpv6_options_temporary" },
  { op: "set_dhcpv6_options_pd", value: "0" },
  { op: "set_dhcpv6_options_pd_length", value: "0:56" },
  { op: "set_dhcpv6_options_pd_interface", value: "0:eth2" },
  { op: "set_dhcpv6_options_pd_interface_address", value: "0:eth2:1" },
  { op: "set_dhcpv6_options_pd_interface_sla_id", value: "0:eth2:0" },
  { op: "set_mirror_ingress", value: "eth3" },
];

/** Draft of a loaded interface with a patch applied. */
function edit(original: MacsecInterface, patch: (d: MacsecDraft) => void, c: MacsecCapabilities = CAPS15): MacsecDraft {
  const d = structuredClone(macsecDraft(original, c));
  patch(d);
  return d;
}

describe("create", () => {
  it("sets every field on 1.5", () => {
    const d = fullDraft(CAPS15);
    assert.equal(macsecSaveProblem(null, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(null, d, CAPS15), FULL_CREATE_OPS);
  });

  it("drops the 1.5-only leaves on 1.4", () => {
    const d = fullDraft(CAPS14);
    assert.equal(macsecSaveProblem(null, d, CAPS14), null);
    const expected = FULL_CREATE_OPS.filter((o) => !VERSION_ONLY_OPS.some((v) => v.op === o.op));
    assert.deepEqual(macsecSaveOps(null, d, CAPS14), expected);
    assert.equal(expected.length, FULL_CREATE_OPS.length - 3);
  });

  it("drops the 1.5-only leaves when capabilities are missing", () => {
    const ops = macsecSaveOps(null, fullDraft(CAPS15), null).map((o) => o.op);
    for (const v of VERSION_ONLY_OPS) assert.ok(!ops.includes(v.op));
  });

  it("creates a static-key interface with its peers", () => {
    const d = {
      ...macsecDraft(null, CAPS15),
      source_interface: "eth1",
      encrypt: false,
      mode: "static" as const,
      static_key: K128,
      peers: [
        { name: "p1", key: K128B, mac: "00:11:22:33:44:55", disable: false },
        { name: "p2", key: "", mac: "", disable: true },
      ],
    };
    assert.equal(macsecSaveProblem(null, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(null, d, CAPS15), [
      { op: "set_source_interface", value: "eth1" },
      { op: "set_security_cipher", value: "gcm-aes-128" },
      { op: "set_security_static_key", value: K128 },
      { op: "set_security_static_peer", value: "p1" },
      { op: "set_security_static_peer_key", value: `p1:${K128B}` },
      { op: "set_security_static_peer_mac", value: "p1:00:11:22:33:44:55" },
      { op: "set_security_static_peer", value: "p2" },
      { op: "set_security_static_peer_disable", value: "p2" },
    ]);
  });

  it("seeds a new draft from capabilities and the next free name", () => {
    const d = macsecDraft(null, CAPS15, ["macsec0", "macsec2"]);
    assert.equal(d.name, "macsec1");
    assert.equal(d.cipher, "gcm-aes-128");
    assert.equal(macsecDraft(null, null).cipher, "");
    assert.equal(nextMacsecName([]), "macsec0");
  });
});

describe("edit", () => {
  it("emits nothing for an untouched save", () => {
    for (const c of [CAPS14, CAPS15]) {
      assert.deepEqual(macsecSaveOps(fullIface(), macsecDraft(fullIface(), c), c), []);
      assert.deepEqual(macsecSaveOps(staticIface(), macsecDraft(staticIface(), c), c), []);
      assert.deepEqual(macsecSaveOps(iface(), macsecDraft(iface(), c), c), []);
    }
  });

  it("deletes each cleared leaf", () => {
    const cases: [(d: MacsecDraft) => void, MacsecBatchOperation[]][] = [
      [(d) => { d.description = ""; }, [{ op: "delete_interface_description" }]],
      [(d) => { d.mtu = " "; }, [{ op: "delete_mtu" }]],
      [(d) => { d.vrf = ""; }, [{ op: "delete_vrf" }]],
      [(d) => { d.disabled = false; }, [{ op: "delete_interface_disable" }]],
      [(d) => { d.replay_window = ""; }, [{ op: "delete_security_replay_window" }]],
      [(d) => { d.mka_priority = ""; }, [{ op: "delete_security_mka_priority" }]],
      [(d) => { d.encrypt = false; d.mka_ckn = ""; }, [{ op: "delete_security_encrypt" }, { op: "delete_security_mka_ckn" }]],
      [(d) => { d.encrypt = false; d.mka_cak = ""; }, [{ op: "delete_security_encrypt" }, { op: "delete_security_mka_cak" }]],
      [(d) => { d.ip.adjust_mss = ""; }, [{ op: "delete_ip_adjust_mss" }]],
      [(d) => { d.ip.arp_cache_timeout = ""; }, [{ op: "delete_ip_arp_cache_timeout" }]],
      [(d) => { d.ip.disable_arp_filter = false; }, [{ op: "delete_ip_disable_arp_filter" }]],
      [(d) => { d.ip.disable_forwarding = false; }, [{ op: "delete_ip_disable_forwarding" }]],
      [(d) => { d.ip.enable_arp_accept = false; }, [{ op: "delete_ip_enable_arp_accept" }]],
      [(d) => { d.ip.enable_arp_announce = false; }, [{ op: "delete_ip_enable_arp_announce" }]],
      [(d) => { d.ip.enable_arp_ignore = false; }, [{ op: "delete_ip_enable_arp_ignore" }]],
      [(d) => { d.ip.enable_directed_broadcast = false; }, [{ op: "delete_ip_enable_directed_broadcast" }]],
      [(d) => { d.ip.enable_proxy_arp = false; }, [{ op: "delete_ip_enable_proxy_arp" }]],
      [(d) => { d.ip.proxy_arp_pvlan = false; }, [{ op: "delete_ip_proxy_arp_pvlan" }]],
      [(d) => { d.ip.source_validation = ""; }, [{ op: "delete_ip_source_validation" }]],
      [(d) => { d.ipv6.accept_dad = ""; }, [{ op: "delete_ipv6_accept_dad" }]],
      [(d) => { d.ipv6.address_autoconf = false; }, [{ op: "delete_ipv6_address_autoconf" }]],
      [(d) => { d.ipv6.address_eui64 = []; }, [{ op: "delete_ipv6_address_eui64", value: "2001:db8:1::/64" }]],
      [(d) => { d.ipv6.address_no_default_link_local = false; }, [{ op: "delete_ipv6_address_no_default_link_local" }]],
      [(d) => { d.ipv6.address_interface_identifier = ""; }, [{ op: "delete_ipv6_address_interface_identifier" }]],
      [(d) => { d.ipv6.adjust_mss = ""; }, [{ op: "delete_ipv6_adjust_mss" }]],
      [(d) => { d.ipv6.base_reachable_time = ""; }, [{ op: "delete_ipv6_base_reachable_time" }]],
      [(d) => { d.ipv6.disable_forwarding = false; }, [{ op: "delete_ipv6_disable_forwarding" }]],
      [(d) => { d.ipv6.dup_addr_detect_transmits = ""; }, [{ op: "delete_ipv6_dup_addr_detect_transmits" }]],
      [(d) => { d.ipv6.source_validation = ""; }, [{ op: "delete_ipv6_source_validation" }]],
      [(d) => { d.dhcp_options.client_id = ""; }, [{ op: "delete_dhcp_options_client_id" }]],
      [(d) => { d.dhcp_options.default_route_distance = ""; }, [{ op: "delete_dhcp_options_default_route_distance" }]],
      [(d) => { d.dhcp_options.host_name = ""; }, [{ op: "delete_dhcp_options_host_name" }]],
      [(d) => { d.dhcp_options.mtu = false; }, [{ op: "delete_dhcp_options_mtu" }]],
      [(d) => { d.dhcp_options.no_default_route = false; }, [{ op: "delete_dhcp_options_no_default_route" }]],
      [(d) => { d.dhcp_options.reject = ["198.51.100.0/24"]; }, [{ op: "delete_dhcp_options_reject", value: "192.0.2.1" }]],
      [(d) => { d.dhcp_options.user_class = ""; }, [{ op: "delete_dhcp_options_user_class" }]],
      [(d) => { d.dhcp_options.vendor_class_id = ""; }, [{ op: "delete_dhcp_options_vendor_class_id" }]],
      [(d) => { d.dhcpv6_options.duid = ""; }, [{ op: "delete_dhcpv6_options_duid" }]],
      [(d) => { d.dhcpv6_options.no_release = false; }, [{ op: "delete_dhcpv6_options_no_release" }]],
      [(d) => { d.dhcpv6_options.no_request_dns = false; }, [{ op: "delete_dhcpv6_options_no_request_dns" }]],
      [(d) => { d.dhcpv6_options.no_request_domain_name = false; }, [{ op: "delete_dhcpv6_options_no_request_domain_name" }]],
      [(d) => { d.dhcpv6_options.parameters_only = false; }, [{ op: "delete_dhcpv6_options_parameters_only" }]],
      [(d) => { d.dhcpv6_options.rapid_commit = false; }, [{ op: "delete_dhcpv6_options_rapid_commit" }]],
      [(d) => { d.dhcpv6_options.temporary = false; }, [{ op: "delete_dhcpv6_options_temporary" }]],
      [(d) => { d.dhcpv6_options.pd[0].length = ""; }, [{ op: "delete_dhcpv6_options_pd_length", value: "0" }]],
      [(d) => { d.dhcpv6_options.pd[0].interfaces[0].address = ""; }, [{ op: "delete_dhcpv6_options_pd_interface_address", value: "0:eth2" }]],
      [(d) => { d.dhcpv6_options.pd[0].interfaces[0].sla_id = ""; }, [{ op: "delete_dhcpv6_options_pd_interface_sla_id", value: "0:eth2" }]],
      [(d) => { d.dhcpv6_options.pd[0].interfaces = []; }, [{ op: "delete_dhcpv6_options_pd_interface", value: "0:eth2" }]],
      [(d) => { d.mirror_ingress = ""; d.mirror_egress = "eth4"; }, [{ op: "delete_mirror_ingress" }, { op: "set_mirror_egress", value: "eth4" }]],
    ];
    for (const [patch, expected] of cases) {
      const d = edit(fullIface(), patch);
      assert.equal(macsecSaveProblem(fullIface(), d, CAPS15), null, JSON.stringify(expected));
      assert.deepEqual(macsecSaveOps(fullIface(), d, CAPS15), expected);
    }
  });

  it("deletes a section the edit leaves without a leaf", () => {
    const f = fullIface();
    assert.deepEqual(macsecSaveOps(f, edit(f, (d) => { d.ip = macsecDraft(null, CAPS15).ip; }), CAPS15), [{ op: "delete_ip_settings" }]);
    assert.deepEqual(macsecSaveOps(f, edit(f, (d) => { d.ipv6 = macsecDraft(null, CAPS15).ipv6; }), CAPS15), [{ op: "delete_ipv6_settings" }]);
    assert.deepEqual(
      macsecSaveOps(f, edit(f, (d) => { d.dhcp_options = macsecDraft(null, CAPS15).dhcp_options; }), CAPS15),
      [{ op: "delete_dhcp_options" }],
    );
    assert.deepEqual(
      macsecSaveOps(f, edit(f, (d) => { d.dhcpv6_options = macsecDraft(null, CAPS15).dhcpv6_options; }), CAPS15),
      [{ op: "delete_dhcpv6_options" }],
    );
    assert.deepEqual(macsecSaveOps(f, edit(f, (d) => { d.mirror_ingress = ""; }), CAPS15), [{ op: "delete_mirror" }]);
  });

  it("turning a DHCP address off clears its options section", () => {
    const f = fullIface();
    assert.deepEqual(macsecSaveOps(f, edit(f, (d) => { d.dhcp = false; }), CAPS15), [
      { op: "delete_interface_address", value: "dhcp" },
      { op: "delete_dhcp_options" },
    ]);
    assert.deepEqual(macsecSaveOps(f, edit(f, (d) => { d.dhcpv6 = false; }), CAPS15), [
      { op: "delete_interface_address", value: "dhcpv6" },
      { op: "delete_dhcpv6_options" },
    ]);
    // Options configured while the address is off stay untouched.
    const hidden = iface({ dhcp_options: { ...f.dhcp_options! } });
    assert.deepEqual(macsecSaveOps(hidden, macsecDraft(hidden, CAPS15), CAPS15), []);
    // No options node: turning the address off deletes only the address.
    const bare = iface({ addresses: ["dhcp"] });
    assert.deepEqual(macsecSaveOps(bare, edit(bare, (d) => { d.dhcp = false; }), CAPS15), [
      { op: "delete_interface_address", value: "dhcp" },
    ]);
  });

  it("clears mirror before setting redirect", () => {
    const f = fullIface();
    const d = edit(f, (x) => { x.mirror_ingress = ""; x.redirect = "eth5"; });
    assert.equal(macsecSaveProblem(f, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(f, d, CAPS15), [{ op: "delete_mirror" }, { op: "set_redirect", value: "eth5" }]);
    const r = iface({ redirect: "eth5" });
    assert.deepEqual(macsecSaveOps(r, edit(r, (x) => { x.redirect = ""; }), CAPS15), [{ op: "delete_redirect" }]);
  });

  it("deletes a bare mirror node, and never a missing one", () => {
    const bare = iface({ mirror_configured: true });
    const d = edit(bare, (x) => { x.redirect = "eth5"; });
    assert.equal(macsecSaveProblem(bare, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(bare, d, CAPS15), [{ op: "delete_mirror" }, { op: "set_redirect", value: "eth5" }]);
    assert.deepEqual(macsecSaveOps(iface(), edit(iface(), (x) => { x.redirect = "eth5"; }), CAPS15), [
      { op: "set_redirect", value: "eth5" },
    ]);
    // a kept mirror leaf keeps the node and diffs the leaves
    const f = fullIface();
    assert.deepEqual(macsecSaveOps(f, edit(f, (x) => { x.mirror_ingress = ""; x.mirror_egress = "eth4"; }), CAPS15), [
      { op: "delete_mirror_ingress" },
      { op: "set_mirror_egress", value: "eth4" },
    ]);
  });

  it("drops the other mode's node whenever the device has both", () => {
    const both = iface({
      security: {
        cipher: "gcm-aes-128",
        encrypt: false,
        replay_window: null,
        mka: { cak: MASKED_SECRET, ckn: "abcd", priority: null },
        static: { key: MASKED_SECRET, peers: [{ name: "p1", key: MASKED_SECRET, mac: "00:11:22:33:44:55", disable: false }] },
      },
    });
    // the draft opens in static mode: an untouched save still drops mka
    const asStatic = macsecDraft(both, CAPS15);
    assert.equal(asStatic.mode, "static");
    assert.equal(macsecSaveProblem(both, asStatic, CAPS15), null);
    assert.deepEqual(macsecSaveOps(both, asStatic, CAPS15), [{ op: "delete_security_mka" }]);
    assert.deepEqual(
      macsecSaveOps(both, edit(both, (x) => { x.static_key = K128B; }), CAPS15),
      [{ op: "delete_security_mka" }, { op: "set_security_static_key", value: K128B }],
    );
    // in MKA mode the stored mka leaves are kept and static is dropped first
    const asMka = edit(both, (x) => { x.mode = "mka"; x.mka_priority = "5"; });
    assert.equal(macsecSaveProblem(both, asMka, CAPS15), null);
    assert.deepEqual(macsecSaveOps(both, asMka, CAPS15), [
      { op: "delete_security_static" },
      { op: "set_security_mka_priority", value: "5" },
    ]);
  });

  it("switches mka to static and back in one batch", () => {
    const toStatic = edit(iface(), (d) => {
      d.mode = "static";
      d.static_key = K128;
      d.peers = [{ name: "p1", key: K128B, mac: "00:11:22:33:44:55", disable: false }];
    });
    assert.equal(macsecSaveProblem(iface(), toStatic, CAPS15), null);
    assert.deepEqual(macsecSaveOps(iface(), toStatic, CAPS15), [
      { op: "delete_security_mka" },
      { op: "set_security_static_key", value: K128 },
      { op: "set_security_static_peer", value: "p1" },
      { op: "set_security_static_peer_key", value: `p1:${K128B}` },
      { op: "set_security_static_peer_mac", value: "p1:00:11:22:33:44:55" },
    ]);

    const st = staticIface();
    const toMka = edit(st, (d) => {
      d.mode = "mka";
      d.mka_cak = K128;
      d.mka_ckn = "ab";
    });
    assert.equal(macsecSaveProblem(st, toMka, CAPS15), null);
    assert.deepEqual(macsecSaveOps(st, toMka, CAPS15), [
      { op: "delete_security_static" },
      { op: "set_security_mka_cak", value: K128 },
      { op: "set_security_mka_ckn", value: "ab" },
    ]);
  });

  it("treats the mask as the stored key", () => {
    const st = staticIface();
    // unchanged mask: no op
    assert.deepEqual(macsecSaveOps(st, macsecDraft(st, CAPS15), CAPS15), []);
    // new text: set
    assert.deepEqual(macsecSaveOps(iface(), edit(iface(), (d) => { d.mka_cak = ` ${K128B} `; }), CAPS15), [
      { op: "set_security_mka_cak", value: K128B },
    ]);
    assert.deepEqual(macsecSaveOps(st, edit(st, (d) => { d.static_key = K128B; d.peers[0].key = K128; }), CAPS15), [
      { op: "set_security_static_key", value: K128B },
      { op: "set_security_static_peer_key", value: `p1:${K128}` },
    ]);
    // cleared: delete where the lab allows it, an error otherwise
    const p2Cleared = edit(st, (d) => { d.peers[1].key = ""; });
    assert.equal(macsecSaveProblem(st, p2Cleared, CAPS15), null);
    assert.deepEqual(macsecSaveOps(st, p2Cleared, CAPS15), [{ op: "delete_security_static_peer_key", value: "p2" }]);
    const encrypted = staticIface({}, true);
    assert.equal(macsecSaveProblem(encrypted, edit(encrypted, (d) => { d.peers[1].key = ""; }), CAPS15)?.key, "peerKeyRequired");
    assert.equal(macsecSaveProblem(st, edit(st, (d) => { d.peers[0].key = ""; }), CAPS15)?.key, "peerKeyRequired");
    assert.equal(macsecSaveProblem(st, edit(st, (d) => { d.static_key = ""; }), CAPS15)?.key, "staticKeyRequired");
    assert.equal(macsecSaveProblem(iface(), edit(iface(), (d) => { d.mka_cak = ""; }), CAPS15)?.key, "cakRequired");
    // typed mask with nothing stored
    const noCak = iface({ security: { ...iface().security!, encrypt: false, mka: { cak: null, ckn: null, priority: null } } });
    const typed = edit(noCak, (d) => { d.mka_cak = MASKED_SECRET; });
    assert.equal(macsecSaveProblem(noCak, typed, CAPS15)?.key, "cakMask");
    assert.deepEqual(macsecSaveOps(noCak, typed, CAPS15), []);
    // a mode switch drops the old node whatever its masks hold
    assert.equal(macsecSaveProblem(st, edit(st, (d) => { d.mode = "mka"; d.mka_cak = MASKED_SECRET; d.mka_ckn = "ab"; }), CAPS15)?.key, "cakMask");
    assert.equal(
      macsecSaveProblem(iface(), edit(iface(), (d) => {
        d.mode = "static";
        d.static_key = MASKED_SECRET;
      }), CAPS15)?.key,
      "staticKeyMask",
    );
  });

  it("needs every masked key typed again for a new cipher or for encrypt turned on", () => {
    const mka = iface();
    const newCipher = edit(mka, (x) => { x.cipher = "gcm-aes-256"; });
    assert.equal(macsecSaveProblem(mka, newCipher, CAPS15)?.key, "cakMask");
    const typed = edit(mka, (x) => { x.cipher = "gcm-aes-256"; x.mka_cak = K256; });
    assert.equal(macsecSaveProblem(mka, typed, CAPS15), null);
    assert.deepEqual(macsecSaveOps(mka, typed, CAPS15), [
      { op: "set_security_cipher", value: "gcm-aes-256" },
      { op: "set_security_mka_cak", value: K256 },
    ]);
    // encrypt turned on, same cipher
    const off = iface({ security: { ...iface().security!, encrypt: false } });
    assert.equal(macsecSaveProblem(off, edit(off, (x) => { x.encrypt = true; }), CAPS15)?.key, "cakMask");
    // a new cipher with encrypt off checks nothing against the cipher
    assert.equal(macsecSaveProblem(off, edit(off, (x) => { x.cipher = "gcm-aes-256"; }), CAPS15), null);

    const st = staticIface();
    assert.equal(macsecSaveProblem(st, edit(st, (x) => { x.encrypt = true; }), CAPS15)?.key, "staticKeyMask");
    const peerMasked = edit(st, (x) => { x.encrypt = true; x.static_key = K128B; x.peers[0].key = K128; });
    // the disabled peer p2 still holds the mask
    assert.deepEqual(macsecSaveProblem(st, peerMasked, CAPS15), { key: "peerKeyMask", values: { name: "p2" } });
    const enc = staticIface({}, true);
    const encNewCipher = edit(enc, (x) => { x.cipher = "gcm-aes-256"; x.static_key = K256; x.peers[1].key = K256; });
    assert.deepEqual(macsecSaveProblem(enc, encNewCipher, CAPS15), { key: "peerKeyMask", values: { name: "p1" } });
    const allTyped = edit(st, (x) => { x.encrypt = true; x.static_key = K128B; x.peers[0].key = K128; x.peers[1].key = K128B; });
    assert.equal(macsecSaveProblem(st, allTyped, CAPS15), null);
  });

  it("keeps the masks when encrypt was already on and the cipher is unchanged", () => {
    const mka = iface();
    const d = edit(mka, (x) => { x.mka_priority = "7"; });
    assert.equal(macsecSaveProblem(mka, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(mka, d, CAPS15), [{ op: "set_security_mka_priority", value: "7" }]);
    const enc = staticIface({}, true);
    const e = edit(enc, (x) => { x.description = "x"; x.peers[1].key = MASKED_SECRET; });
    assert.equal(macsecSaveProblem(enc, e, CAPS15), null);
    assert.deepEqual(macsecSaveOps(enc, e, CAPS15), [{ op: "set_interface_description", value: "x" }]);
  });

  it("numbers a row by its place on screen", () => {
    const st = staticIface();
    const d = edit(st, (x) => {
      x.peers = [
        { name: "", key: "", mac: "", disable: false },
        { name: "p1", key: MASKED_SECRET, mac: "00:11:22:33:44:55", disable: false },
        { name: "", key: K128, mac: "", disable: false },
      ];
    });
    assert.deepEqual(macsecSaveProblem(st, d, CAPS15), { key: "peerNameRequired", values: { n: 3 } });
    const f = fullIface();
    const pd = edit(f, (x) => {
      x.dhcpv6_options.pd = [
        { id: "", length: "", interfaces: [] },
        { id: "0", length: "56", interfaces: [] },
        { id: "", length: "60", interfaces: [] },
      ];
    });
    assert.deepEqual(macsecSaveProblem(f, pd, CAPS15), { key: "pdIdRequired", values: { n: 3 } });
  });

  it("trims padded values and ignores blank ones", () => {
    const d = edit(iface(), (x) => {
      x.description = "  link  ";
      x.addresses = [" 10.0.0.1/24 ", "", "10.0.0.1/24"];
      x.mtu = " 1500 ";
      x.ipv6.address_eui64 = [" 2001:db8:1::/64 ", " "];
    });
    assert.equal(macsecSaveProblem(iface(), d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(iface(), d, CAPS15), [
      { op: "set_interface_description", value: "link" },
      { op: "set_mtu", value: "1500" },
      { op: "set_interface_address", value: "10.0.0.1/24" },
      { op: "set_ipv6_address_eui64", value: "2001:db8:1::/64" },
    ]);
    // a padded name of a kept peer is the same peer
    const st = staticIface();
    assert.deepEqual(macsecSaveOps(st, edit(st, (x) => { x.peers[0].name = " p1 "; x.peers[0].mac = " 00:11:22:33:44:55 "; }), CAPS15), []);
  });

  it("diffs multi leaves by value", () => {
    const loaded = iface({
      addresses: ["10.0.0.1/24", "10.0.1.1/24"],
      ipv6: ipv6({ address_eui64: ["2001:db8:1::/64", "2001:db8:2::/64"] }),
      dhcp_options: {
        client_id: null, default_route_distance: null, host_name: null, mtu: false, no_default_route: false,
        reject: ["192.0.2.1", "192.0.2.2"], user_class: null, vendor_class_id: null,
      },
    });
    const d = edit(loaded, (x) => {
      x.addresses = ["10.0.1.1/24", "10.0.2.1/24"];
      x.ipv6.address_eui64 = ["2001:db8:2::/64", "2001:db8:3::/64"];
      x.dhcp = true;
      x.dhcp_options.reject = ["192.0.2.2", "192.0.2.0/24"];
    });
    assert.equal(macsecSaveProblem(loaded, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(loaded, d, CAPS15), [
      { op: "delete_interface_address", value: "10.0.0.1/24" },
      { op: "set_interface_address", value: "10.0.2.1/24" },
      { op: "set_interface_address", value: "dhcp" },
      { op: "delete_ipv6_address_eui64", value: "2001:db8:1::/64" },
      { op: "set_ipv6_address_eui64", value: "2001:db8:3::/64" },
      { op: "delete_dhcp_options_reject", value: "192.0.2.1" },
      { op: "set_dhcp_options_reject", value: "192.0.2.0/24" },
    ]);
  });

  it("diffs static peers by name", () => {
    const st = staticIface();
    const d = edit(st, (x) => {
      x.peers = [
        { name: "p3", key: K128, mac: "00:11:22:33:44:77", disable: false },
        { name: "p2", key: MASKED_SECRET, mac: "00:11:22:33:44:88", disable: false },
        { name: "p4", key: "", mac: "", disable: true },
      ];
    });
    assert.equal(macsecSaveProblem(st, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(st, d, CAPS15), [
      { op: "delete_security_static_peer", value: "p1" },
      { op: "set_security_static_peer", value: "p3" },
      { op: "set_security_static_peer_key", value: `p3:${K128}` },
      { op: "set_security_static_peer_mac", value: "p3:00:11:22:33:44:77" },
      { op: "set_security_static_peer_mac", value: "p2:00:11:22:33:44:88" },
      { op: "delete_security_static_peer_disable", value: "p2" },
      { op: "set_security_static_peer", value: "p4" },
      { op: "set_security_static_peer_disable", value: "p4" },
    ]);
    // a renamed peer cannot carry the mask over
    const renamed = edit(st, (x) => { x.peers[0].name = "p9"; });
    assert.deepEqual(macsecSaveProblem(st, renamed, CAPS15), { key: "peerKeyMask", values: { name: "p9" } });
    // clearing a peer mac deletes it (a disabled peer needs none)
    assert.deepEqual(macsecSaveOps(st, edit(st, (x) => { x.peers[1].mac = ""; }), CAPS15), [
      { op: "delete_security_static_peer_mac", value: "p2" },
    ]);
    assert.deepEqual(macsecSaveOps(st, edit(st, (x) => { x.peers[0].disable = true; }), CAPS15), [
      { op: "set_security_static_peer_disable", value: "p1" },
    ]);
  });

  it("diffs prefix delegations by id and interface", () => {
    const f = fullIface();
    const d = edit(f, (x) => {
      x.dhcpv6_options.pd = [
        { id: "0", length: "60", interfaces: [{ name: "eth2", address: "2", sla_id: "0" }, { name: "eth4", address: "", sla_id: "5" }] },
        { id: "1", length: "", interfaces: [] },
      ];
    });
    assert.equal(macsecSaveProblem(f, d, CAPS15), null);
    assert.deepEqual(macsecSaveOps(f, d, CAPS15), [
      { op: "set_dhcpv6_options_pd_length", value: "0:60" },
      { op: "set_dhcpv6_options_pd_interface_address", value: "0:eth2:2" },
      { op: "set_dhcpv6_options_pd_interface", value: "0:eth4" },
      { op: "set_dhcpv6_options_pd_interface_sla_id", value: "0:eth4:5" },
      { op: "set_dhcpv6_options_pd", value: "1" },
    ]);
    const removed = edit(f, (x) => {
      x.dhcpv6_options.pd = [];
    });
    assert.deepEqual(macsecSaveOps(f, removed, CAPS15), [{ op: "delete_dhcpv6_options_pd", value: "0" }]);
    // a blank row the user just added is dropped
    const blank = edit(f, (x) => {
      x.dhcpv6_options.pd.push({ id: "", length: "", interfaces: [] });
      x.dhcpv6_options.pd[0].interfaces.push({ name: "", address: "", sla_id: "" });
      x.peers.push({ name: "", key: "", mac: "", disable: false });
    });
    assert.equal(macsecSaveProblem(f, blank, CAPS15), null);
    assert.deepEqual(macsecSaveOps(f, blank, CAPS15), []);
  });

  it("picks ids no row and no stored entry use", () => {
    const st = staticIface();
    assert.equal(nextPeerName([{ name: "peer0", key: "", mac: "", disable: false }], st), "peer1");
    const withStored = staticIface({
      security: { ...st.security!, static: { key: MASKED_SECRET, peers: [{ name: "peer0", key: null, mac: null, disable: true }] } },
    });
    assert.equal(nextPeerName([], withStored), "peer1");
    const f = fullIface();
    assert.equal(nextPdId([], f), "1");
    assert.equal(nextPdId([{ id: "1", length: "", interfaces: [] }], f), "2");
  });

  it("never sends a 1.5-only leaf when the device lacks it", () => {
    const loaded = iface({ addresses: ["dhcpv6"] });
    const d = edit(loaded, (x) => {
      x.ipv6.address_interface_identifier = "::1";
      x.dhcpv6_options.no_request_dns = true;
      x.dhcpv6_options.no_request_domain_name = true;
      x.dhcpv6_options.rapid_commit = true;
    }, CAPS14);
    assert.equal(macsecSaveProblem(loaded, d, CAPS14), null);
    assert.deepEqual(macsecSaveOps(loaded, d, CAPS14), [{ op: "set_dhcpv6_options_rapid_commit" }]);
    // an invalid hidden identifier does not block a 1.4 save
    const bad = edit(loaded, (x) => { x.ipv6.address_interface_identifier = "bad"; }, CAPS14);
    assert.equal(macsecSaveProblem(loaded, bad, CAPS14), null);
  });

  it("deletes the interface", () => {
    assert.deepEqual(macsecDeleteOps(), [{ op: "delete_interface" }]);
  });
});

describe("save checks", () => {
  const validCreate = (): MacsecDraft => ({
    ...macsecDraft(null, CAPS15),
    source_interface: "eth1",
    mka_cak: K128,
    mka_ckn: "abcd",
  });
  const validStatic = (): MacsecDraft => ({
    ...validCreate(),
    mode: "static",
    static_key: K128,
    peers: [{ name: "p1", key: K128B, mac: "00:11:22:33:44:55", disable: false }],
  });
  const peer = (patch: Partial<MacsecDraft["peers"][number]>) => ({ name: "p1", key: K128B, mac: "00:11:22:33:44:55", disable: false, ...patch });
  const pd = (patch: Partial<MacsecDraft["dhcpv6_options"]["pd"][number]>) => ({ id: "0", length: "56", interfaces: [], ...patch });
  const withDhcpv6 = (pds: MacsecDraft["dhcpv6_options"]["pd"], duid = ""): Partial<MacsecDraft> => ({
    dhcpv6: true,
    dhcpv6_options: { ...validCreate().dhcpv6_options, duid, pd: pds },
  });

  const cases: [MacsecProblemKey, Partial<MacsecDraft> | ((d: MacsecDraft) => void), string[]?][] = [
    ["nameRequired", { name: "  " }],
    ["nameFormat", { name: "mac0" }],
    ["nameExists", {}, ["macsec0"]],
    ["sourceRequired", { source_interface: " " }],
    ["descriptionTooLong", { description: "x".repeat(256) }],
    ["mtuRange", { mtu: "67" }],
    ["addressInvalid", { addresses: ["10.0.0.1"] }],
    ["cipherRequired", { cipher: "" }],
    ["replayWindowRange", { replay_window: "4294967296" }],
    ["cakRequired", { mka_cak: "" }],
    ["cakInvalid", { mka_cak: "xyz" }],
    ["cakLength", { mka_cak: K256 }],
    ["cakMask", { mka_cak: MASKED_SECRET }],
    ["cknRequired", { mka_ckn: "" }],
    ["cknInvalid", { mka_ckn: "zz" }],
    ["mkaPriorityRange", { mka_priority: "256" }],
    ["staticKeyRequired", { ...validStatic(), static_key: "" }],
    ["staticKeyInvalid", { ...validStatic(), static_key: "zz" }],
    ["staticKeyLength", { ...validStatic(), static_key: K256 }],
    ["staticKeyMask", { ...validStatic(), static_key: MASKED_SECRET }],
    ["peerRequired", { ...validStatic(), peers: [] }],
    ["peerNameRequired", { ...validStatic(), peers: [peer({ name: " " })] }],
    ["peerNameInvalid", { ...validStatic(), peers: [peer({ name: "a:b" })] }],
    ["peerNameDuplicate", { ...validStatic(), peers: [peer({}), peer({ name: " p1 " })] }],
    ["peerKeyRequired", { ...validStatic(), peers: [peer({ key: "" })] }],
    ["peerKeyInvalid", { ...validStatic(), peers: [peer({ key: "zz" })] }],
    ["peerKeyLength", { ...validStatic(), peers: [peer({ key: K256 })] }],
    ["peerKeyMask", { ...validStatic(), peers: [peer({ key: MASKED_SECRET })] }],
    ["peerMacRequired", { ...validStatic(), peers: [peer({ mac: "" })] }],
    ["peerMacInvalid", { ...validStatic(), peers: [peer({ mac: "00:11" })] }],
    ["ipAdjustMssRange", (d) => { d.ip.adjust_mss = "535"; }],
    ["arpCacheTimeoutRange", (d) => { d.ip.arp_cache_timeout = "0"; }],
    ["ipv6AdjustMssRange", (d) => { d.ipv6.adjust_mss = "65536"; }],
    ["baseReachableTimeRange", (d) => { d.ipv6.base_reachable_time = "86401"; }],
    ["dadTransmitsRange", (d) => { d.ipv6.dup_addr_detect_transmits = "1.5"; }],
    ["eui64Invalid", (d) => { d.ipv6.address_eui64 = ["2001:db8::/48"]; }],
    ["interfaceIdentifierInvalid", (d) => { d.ipv6.address_interface_identifier = "1::"; }],
    ["dhcpClientIdInvalid", (d) => { d.dhcp = true; d.dhcp_options.client_id = "a/b"; }],
    ["dhcpHostNameInvalid", (d) => { d.dhcp = true; d.dhcp_options.host_name = "-a"; }],
    ["dhcpUserClassInvalid", (d) => { d.dhcp = true; d.dhcp_options.user_class = "a/b"; }],
    ["dhcpVendorClassIdInvalid", (d) => { d.dhcp = true; d.dhcp_options.vendor_class_id = "a/b"; }],
    ["defaultRouteDistanceRange", (d) => { d.dhcp = true; d.dhcp_options.default_route_distance = "256"; }],
    ["dhcpRejectInvalid", (d) => { d.dhcp = true; d.dhcp_options.reject = ["300.1.1.1"]; }],
    ["duidInvalid", withDhcpv6([], "zz")],
    ["pdIdRequired", withDhcpv6([pd({ id: " " })])],
    ["pdIdRange", withDhcpv6([pd({ id: "1.5" })])],
    ["pdIdDuplicate", withDhcpv6([pd({}), pd({ id: " 0 " })])],
    ["pdLengthRange", withDhcpv6([pd({ length: "31" })])],
    ["pdInterfaceRequired", withDhcpv6([pd({ interfaces: [{ name: "", address: "1", sla_id: "" }] })])],
    ["pdInterfaceDuplicate", withDhcpv6([pd({ interfaces: [{ name: "eth2", address: "", sla_id: "" }, { name: "eth2", address: "", sla_id: "" }] })])],
    ["pdAddressRange", withDhcpv6([pd({ interfaces: [{ name: "eth2", address: "-1", sla_id: "" }] })])],
    ["pdSlaIdRange", withDhcpv6([pd({ interfaces: [{ name: "eth2", address: "", sla_id: "65536" }] })])],
    ["mirrorRedirect", { mirror_egress: "eth3", redirect: "eth4" }],
  ];

  it("passes a valid create in both modes", () => {
    assert.equal(macsecSaveProblem(null, validCreate(), CAPS15), null);
    assert.equal(macsecSaveProblem(null, validStatic(), CAPS15), null);
    // without encrypt MKA keys are optional and a disabled peer needs no key or mac
    assert.equal(macsecSaveProblem(null, { ...validCreate(), encrypt: false, mka_cak: "", mka_ckn: "" }, CAPS15), null);
    assert.equal(
      macsecSaveProblem(null, { ...validStatic(), encrypt: false, peers: [peer({ key: "", mac: "", disable: true })] }, CAPS15),
      null,
    );
    // encrypt with a 256 cipher needs 64 digits; without encrypt either length passes
    assert.equal(macsecSaveProblem(null, { ...validCreate(), cipher: "gcm-aes-256", mka_cak: K256 }, CAPS15), null);
    assert.equal(macsecSaveProblem(null, { ...validCreate(), encrypt: false, mka_cak: K256 }, CAPS15), null);
  });

  it("returns every keyed problem", () => {
    const seen = new Set<MacsecProblemKey>();
    for (const [key, patch, existing] of cases) {
      const d = structuredClone(validCreate());
      if (typeof patch === "function") patch(d);
      else Object.assign(d, structuredClone(patch));
      const issue = macsecSaveProblem(null, d, CAPS15, existing ?? []);
      assert.equal(issue?.key, key, `${key}: ${JSON.stringify(issue)}`);
      seen.add(key);
    }
    const read = (name: string) => JSON.parse(readFileSync(new URL(`../../../messages/en/${name}`, import.meta.url), "utf8"));
    const catalog = read("macsec.json");
    for (const key of seen) {
      // An empty name renders the shared common message.
      if (key === "nameRequired") assert.equal(typeof read("common.json").interfaceNameRequired, "string");
      else assert.equal(typeof catalog.modal.errors[key], "string", key);
    }
    assert.equal(seen.size, cases.length);
  });

  it("follows the lab hex-colon form for DHCP option strings (three octets or more)", () => {
    for (const [value, key] of [["aa:bb", "dhcpClientIdInvalid"], ["aa:bb:cc", null]] as const) {
      const d = structuredClone(validCreate());
      d.dhcp = true;
      d.dhcp_options.client_id = value;
      assert.equal(macsecSaveProblem(null, d, CAPS15)?.key ?? null, key, value);
    }
  });

  it("names the bounds and the row in the problem values", () => {
    assert.deepEqual(macsecSaveProblem(null, { ...validCreate(), mtu: "1.5" }, CAPS15), {
      key: "mtuRange",
      values: { min: 68, max: 16000 },
    });
    const d = structuredClone(validCreate());
    Object.assign(d, withDhcpv6([pd({ interfaces: [{ name: "eth2", address: "", sla_id: "65536" }] })]));
    assert.deepEqual(macsecSaveProblem(null, d, CAPS15), {
      key: "pdSlaIdRange",
      values: { id: "0", name: "eth2", min: 0, max: 65535 },
    });
  });

  it("checks the name only on create", () => {
    const loaded = iface();
    assert.equal(macsecSaveProblem(loaded, macsecDraft(loaded, CAPS15), CAPS15, ["macsec0"]), null);
  });
});

describe("service", () => {
  function stub() {
    const sent: [string, MacsecBatchOperation[]][] = [];
    const service = Object.create(macsecService) as typeof macsecService;
    service.batchConfigure = async (name: string, operations: MacsecBatchOperation[]) => {
      sent.push([name, operations]);
      return { success: true };
    };
    return { service, sent };
  }

  it("update sends the exact normalized diff", async () => {
    const { service, sent } = stub();
    const st = staticIface();
    await service.updateInterface(st, macsecDraft(st, CAPS15), CAPS15);
    await service.updateInterface(
      st,
      edit(st, (d) => {
        d.description = "  uplink ";
        d.peers[0].name = " p1 ";
        d.peers[1].key = "";
        d.peers.push({ name: " p3 ", key: ` ${K128} `, mac: "00:11:22:33:44:99", disable: false });
        d.peers.push({ name: "", key: "", mac: "", disable: false });
        d.static_key = MASKED_SECRET;
      }),
      CAPS15,
    );
    await service.createInterface({ ...macsecDraft(null, CAPS15), name: " macsec3 ", source_interface: "eth1", mka_cak: K128, mka_ckn: "ab" }, CAPS15);
    await service.deleteInterface("macsec0");
    assert.deepEqual(sent, [
      ["macsec0", []],
      [
        "macsec0",
        [
          { op: "set_interface_description", value: "uplink" },
          { op: "delete_security_static_peer_key", value: "p2" },
          { op: "set_security_static_peer", value: "p3" },
          { op: "set_security_static_peer_key", value: `p3:${K128}` },
          { op: "set_security_static_peer_mac", value: "p3:00:11:22:33:44:99" },
        ],
      ],
      [
        "macsec3",
        [
          { op: "set_source_interface", value: "eth1" },
          { op: "set_security_cipher", value: "gcm-aes-128" },
          { op: "set_security_encrypt" },
          { op: "set_security_mka_cak", value: K128 },
          { op: "set_security_mka_ckn", value: "ab" },
        ],
      ],
      ["macsec0", [{ op: "delete_interface" }]],
    ]);
  });
});
