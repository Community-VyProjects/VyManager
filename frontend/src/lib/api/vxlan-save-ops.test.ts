import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  nextVxlanName,
  vxlanCreateOps,
  vxlanDeleteOps,
  vxlanForm,
  vxlanProblem,
  vxlanUpdateOps,
  type VxlanForm,
  type VxlanProblemKey,
  type VxlanSaveContext,
} from "./vxlan-save-ops";
import {
  vxlanService,
  type VxlanBatchOperation,
  type VxlanCapabilities,
  type VxlanInterface,
} from "./vxlan";
import { apiClient } from "./client";

function caps(v15: boolean): VxlanCapabilities {
  const f = (supported: boolean) => ({ supported, description: "" });
  return {
    version: v15 ? "1.5" : "1.4",
    features: {
      vxlan: f(true),
      ipv6_address_interface_identifier: f(v15),
      vlan_to_vni_description: f(v15),
      // 1.4 verify rejects gpe; the backend reports it unsupported there.
      gpe: f(v15),
    },
  };
}
const CAPS14 = caps(false);
const CAPS15 = caps(true);

/** A loaded interface with nothing but its name and VNI. */
function bare(over: Partial<VxlanInterface> = {}): VxlanInterface {
  return {
    name: "vxlan0",
    addresses: [],
    description: null,
    disabled: false,
    gpe: false,
    group: null,
    ip: {
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
    },
    ipv6: {
      accept_dad: null,
      address: { autoconf: false, eui64: [], interface_identifier: null, no_default_link_local: false },
      adjust_mss: null,
      base_reachable_time: null,
      disable_forwarding: false,
      dup_addr_detect_transmits: null,
      source_validation: null,
    },
    mac: null,
    mirror: { egress: null, ingress: null },
    mirror_configured: false,
    mtu: null,
    parameters: {
      external: false,
      ip: { df: null, tos: null, ttl: null },
      ipv6: { flowlabel: null },
      neighbor_suppress: false,
      nolearning: false,
      vni_filter: false,
    },
    port: null,
    redirect: null,
    remotes: [],
    source_address: "192.0.2.1",
    source_interface: null,
    vlan_to_vni: [],
    vni: "100",
    vrf: null,
    ...over,
  };
}

/** A loaded interface with every leaf the screen edits set (as GET /config returns it). */
function full(): VxlanInterface {
  return bare({
    name: "vxlan1",
    addresses: ["10.0.0.1/24", "2001:db8::1/64"],
    description: "overlay",
    disabled: true,
    gpe: true,
    group: "239.1.1.1",
    ip: {
      adjust_mss: "1400",
      arp_cache_timeout: "30",
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
      address: { autoconf: true, eui64: ["2001:db8:1::/64"], interface_identifier: "::1", no_default_link_local: true },
      adjust_mss: "clamp-mss-to-pmtu",
      base_reachable_time: "30",
      disable_forwarding: true,
      dup_addr_detect_transmits: "1",
      source_validation: "loose",
    },
    mac: "00:11:22:33:44:55",
    mirror: { egress: "eth2", ingress: "eth1" },
    mirror_configured: true,
    mtu: "1450",
    parameters: {
      external: true,
      ip: { df: "set", tos: "10", ttl: "64" },
      ipv6: { flowlabel: "0x1" },
      neighbor_suppress: true,
      nolearning: true,
      vni_filter: true,
    },
    port: "4789",
    redirect: "eth3",
    remotes: ["192.0.2.2", "192.0.2.3"],
    source_address: "192.0.2.1",
    source_interface: "eth0",
    vlan_to_vni: [
      { vlan_id: "10", vni: "10010", description: "users" },
      { vlan_id: "20-21", vni: "20020-20021", description: null },
    ],
    vni: "100",
    vrf: "red",
  });
}

/** Every op that turns nothing into `full()` on 1.5, in emit order (after set_interface). */
const FULL_SETS: VxlanBatchOperation[] = [
  { op: "set_vni", value: "100" },
  { op: "set_description", value: "overlay" },
  { op: "set_address", value: "10.0.0.1/24" },
  { op: "set_address", value: "2001:db8::1/64" },
  { op: "set_source_address", value: "192.0.2.1" },
  { op: "set_source_interface", value: "eth0" },
  { op: "set_group", value: "239.1.1.1" },
  { op: "set_remote", value: "192.0.2.2" },
  { op: "set_remote", value: "192.0.2.3" },
  { op: "set_port", value: "4789" },
  { op: "set_mtu", value: "1450" },
  { op: "set_mac", value: "00:11:22:33:44:55" },
  { op: "set_vrf", value: "red" },
  { op: "set_disable" },
  { op: "set_gpe" },
  { op: "set_parameters_external" },
  { op: "set_parameters_nolearning" },
  { op: "set_parameters_neighbor_suppress" },
  { op: "set_parameters_vni_filter" },
  { op: "set_parameters_ip_df", value: "set" },
  { op: "set_parameters_ip_tos", value: "10" },
  { op: "set_parameters_ip_ttl", value: "64" },
  { op: "set_parameters_ipv6_flowlabel", value: "0x1" },
  { op: "set_mirror_ingress", value: "eth1" },
  { op: "set_mirror_egress", value: "eth2" },
  { op: "set_redirect", value: "eth3" },
  { op: "set_ip_adjust_mss", value: "1400" },
  { op: "set_ip_arp_cache_timeout", value: "30" },
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
  { op: "set_ipv6_address_interface_identifier", value: "::1" },
  { op: "set_ipv6_address_no_default_link_local" },
  { op: "set_ipv6_adjust_mss", value: "clamp-mss-to-pmtu" },
  { op: "set_ipv6_base_reachable_time", value: "30" },
  { op: "set_ipv6_disable_forwarding" },
  { op: "set_ipv6_dup_addr_detect_transmits", value: "1" },
  { op: "set_ipv6_source_validation", value: "loose" },
  { op: "set_vlan_to_vni", value: "10" },
  { op: "set_vlan_to_vni_vni", value: "10|10010" },
  { op: "set_vlan_to_vni_description", value: "10|users" },
  { op: "set_vlan_to_vni", value: "20-21" },
  { op: "set_vlan_to_vni_vni", value: "20-21|20020-20021" },
];

/** Every op that clears `full()` down to a name, in emit order. */
const FULL_DELETES: VxlanBatchOperation[] = [
  { op: "delete_vni" },
  { op: "delete_description" },
  { op: "delete_all_addresses" },
  { op: "delete_source_address" },
  { op: "delete_source_interface" },
  { op: "delete_group" },
  { op: "delete_all_remotes" },
  { op: "delete_port" },
  { op: "delete_mtu" },
  { op: "delete_mac" },
  { op: "delete_vrf" },
  { op: "delete_disable" },
  { op: "delete_gpe" },
  { op: "delete_parameters_external" },
  { op: "delete_parameters_nolearning" },
  { op: "delete_parameters_neighbor_suppress" },
  { op: "delete_parameters_vni_filter" },
  { op: "delete_parameters_ip_df" },
  { op: "delete_parameters_ip_tos" },
  { op: "delete_parameters_ip_ttl" },
  { op: "delete_parameters_ipv6_flowlabel" },
  { op: "delete_mirror" },
  { op: "delete_redirect" },
  { op: "delete_ip_adjust_mss" },
  { op: "delete_ip_arp_cache_timeout" },
  { op: "delete_ip_disable_arp_filter" },
  { op: "delete_ip_disable_forwarding" },
  { op: "delete_ip_enable_arp_accept" },
  { op: "delete_ip_enable_arp_announce" },
  { op: "delete_ip_enable_arp_ignore" },
  { op: "delete_ip_enable_directed_broadcast" },
  { op: "delete_ip_enable_proxy_arp" },
  { op: "delete_ip_proxy_arp_pvlan" },
  { op: "delete_ip_source_validation" },
  { op: "delete_ipv6_accept_dad" },
  { op: "delete_ipv6_address_autoconf" },
  { op: "delete_all_ipv6_address_eui64" },
  { op: "delete_ipv6_address_interface_identifier" },
  { op: "delete_ipv6_address_no_default_link_local" },
  { op: "delete_ipv6_adjust_mss" },
  { op: "delete_ipv6_base_reachable_time" },
  { op: "delete_ipv6_disable_forwarding" },
  { op: "delete_ipv6_dup_addr_detect_transmits" },
  { op: "delete_ipv6_source_validation" },
  { op: "delete_all_vlan_to_vni" },
];

const is14Only = (o: VxlanBatchOperation) =>
  !o.op.includes("interface_identifier") && !o.op.includes("vlan_to_vni_description") && !o.op.endsWith("_gpe");

/** The full interface as a create form. */
function fullForm(): VxlanForm {
  return vxlanForm(full());
}

function edit(original: VxlanInterface, change: (f: VxlanForm) => void): VxlanForm {
  const f = structuredClone(vxlanForm(original));
  change(f);
  return f;
}

/** A create the save check accepts. */
function validCreate(): VxlanForm {
  return { ...vxlanForm(null, ["vxlan0"]), vni: "100", remotes: ["192.0.2.2"], source_address: "192.0.2.1" };
}

/**
 * Device state for the save checks: one other VXLAN (`vxlan0`), and this
 * interface a bridge member so mapping rows reach their own checks.
 */
const CTX: VxlanSaveContext = { others: [bare()], bridgeMember: true };

describe("create", () => {
  it("sets every field on 1.5", () => {
    assert.deepEqual(vxlanCreateOps(fullForm(), CAPS15), [{ op: "set_interface" }, ...FULL_SETS]);
  });

  it("drops the 1.5-only leaves on 1.4", () => {
    assert.deepEqual(vxlanCreateOps(fullForm(), CAPS14), [{ op: "set_interface" }, ...FULL_SETS.filter(is14Only)]);
  });

  it("drops the 1.5-only leaves when capabilities are missing", () => {
    assert.deepEqual(vxlanCreateOps(fullForm(), null), [{ op: "set_interface" }, ...FULL_SETS.filter(is14Only)]);
  });

  it("sends only set_interface for a blank form", () => {
    assert.deepEqual(vxlanCreateOps(vxlanForm(null), CAPS15), [{ op: "set_interface" }]);
  });

  it("seeds a new form with the next free name", () => {
    assert.equal(vxlanForm(null, ["vxlan0", "vxlan2"]).name, "vxlan1");
    assert.equal(nextVxlanName([]), "vxlan0");
  });
});

describe("edit", () => {
  it("emits nothing for an untouched save", () => {
    assert.deepEqual(vxlanUpdateOps(full(), vxlanForm(full()), CAPS15), []);
    assert.deepEqual(vxlanUpdateOps(full(), vxlanForm(full()), CAPS14), []);
    assert.deepEqual(vxlanUpdateOps(bare(), vxlanForm(bare()), CAPS15), []);
  });

  it("deletes every cleared field, with the bulk delete for emptied lists", () => {
    const cleared = { ...vxlanForm(null), name: "vxlan1" };
    assert.deepEqual(vxlanUpdateOps(full(), cleared, CAPS15), FULL_DELETES);
  });

  it("never deletes a 1.5-only leaf or gpe on 1.4", () => {
    const cleared = { ...vxlanForm(null), name: "vxlan1" };
    assert.deepEqual(vxlanUpdateOps(full(), cleared, CAPS14), FULL_DELETES.filter(is14Only));
  });

  it("sends gpe only where the device supports it", () => {
    const on = edit(bare(), (d) => {
      d.gpe = true;
    });
    const off = { ...vxlanForm(full()), gpe: false };
    assert.deepEqual(vxlanUpdateOps(bare(), on, CAPS15), [{ op: "set_gpe" }]);
    assert.deepEqual(vxlanUpdateOps(full(), off, CAPS15), [{ op: "delete_gpe" }]);
    for (const c of [CAPS14, null]) {
      assert.deepEqual(vxlanUpdateOps(bare(), on, c), []);
      assert.deepEqual(vxlanUpdateOps(full(), off, c), []);
      assert.ok(!vxlanCreateOps(fullForm(), c).some((o) => o.op.endsWith("_gpe")));
    }
  });

  it("removes a mirror that ends empty as one node", () => {
    const both = edit(full(), (d) => {
      d.mirror_ingress = "";
      d.mirror_egress = "";
    });
    assert.deepEqual(vxlanUpdateOps(full(), both, CAPS15), [{ op: "delete_mirror" }]);
    const one = edit(full(), (d) => {
      d.mirror_ingress = "";
    });
    assert.deepEqual(vxlanUpdateOps(full(), one, CAPS15), [{ op: "delete_mirror_ingress" }]);
    const swapped = edit(full(), (d) => {
      d.mirror_egress = "";
      d.mirror_ingress = "eth9";
    });
    assert.deepEqual(vxlanUpdateOps(full(), swapped, CAPS15), [
      { op: "set_mirror_ingress", value: "eth9" },
      { op: "delete_mirror_egress" },
    ]);
  });

  it("leaves a bare mirror node alone until redirect needs it gone", () => {
    const bareMirror = bare({ mirror_configured: true });
    assert.deepEqual(vxlanUpdateOps(bareMirror, vxlanForm(bareMirror), CAPS15), []);
    const redirect = { ...vxlanForm(bareMirror), redirect: "eth3" };
    assert.deepEqual(vxlanUpdateOps(bareMirror, redirect, CAPS15), [
      { op: "delete_mirror" },
      { op: "set_redirect", value: "eth3" },
    ]);
    // Without a mirror node, redirect is set on its own.
    assert.deepEqual(vxlanUpdateOps(bare(), { ...vxlanForm(bare()), redirect: "eth3" }, CAPS15), [
      { op: "set_redirect", value: "eth3" },
    ]);
    // Re-filling a bare node sets the leaf, never deletes the node.
    assert.deepEqual(vxlanUpdateOps(bareMirror, { ...vxlanForm(bareMirror), mirror_egress: "eth2" }, CAPS15), [
      { op: "set_mirror_egress", value: "eth2" },
    ]);
  });

  it("sets every field of an emptied interface", () => {
    const empty = bare({ name: "vxlan1", vni: null, source_address: null });
    assert.deepEqual(vxlanUpdateOps(empty, fullForm(), CAPS15), FULL_SETS);
  });

  it("changes every field to a new value", () => {
    const f = edit(full(), (d) => {
      d.vni = "200";
      d.description = "core";
      d.source_address = "192.0.2.9";
      d.source_interface = "eth9";
      d.group = "239.2.2.2";
      d.port = "8472";
      d.mtu = "1500";
      d.mac = "00:11:22:33:44:66";
      d.vrf = "blue";
      d.parameters.ip_df = "unset";
      d.parameters.ip_tos = "20";
      d.parameters.ip_ttl = "0";
      d.parameters.ipv6_flowlabel = "inherit";
      d.mirror_ingress = "eth4";
      d.mirror_egress = "eth5";
      d.redirect = "eth6";
      d.ip.adjust_mss = "clamp-mss-to-pmtu";
      d.ip.arp_cache_timeout = "60";
      d.ip.source_validation = "loose";
      d.ipv6.accept_dad = "2";
      d.ipv6.address_interface_identifier = "::2";
      d.ipv6.adjust_mss = "1300";
      d.ipv6.base_reachable_time = "60";
      d.ipv6.dup_addr_detect_transmits = "0";
      d.ipv6.source_validation = "disable";
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [
      { op: "set_vni", value: "200" },
      { op: "set_description", value: "core" },
      { op: "set_source_address", value: "192.0.2.9" },
      { op: "set_source_interface", value: "eth9" },
      { op: "set_group", value: "239.2.2.2" },
      { op: "set_port", value: "8472" },
      { op: "set_mtu", value: "1500" },
      { op: "set_mac", value: "00:11:22:33:44:66" },
      { op: "set_vrf", value: "blue" },
      { op: "set_parameters_ip_df", value: "unset" },
      { op: "set_parameters_ip_tos", value: "20" },
      { op: "set_parameters_ip_ttl", value: "0" },
      { op: "set_parameters_ipv6_flowlabel", value: "inherit" },
      { op: "set_mirror_ingress", value: "eth4" },
      { op: "set_mirror_egress", value: "eth5" },
      { op: "set_redirect", value: "eth6" },
      { op: "set_ip_adjust_mss", value: "clamp-mss-to-pmtu" },
      { op: "set_ip_arp_cache_timeout", value: "60" },
      { op: "set_ip_source_validation", value: "loose" },
      { op: "set_ipv6_accept_dad", value: "2" },
      { op: "set_ipv6_address_interface_identifier", value: "::2" },
      { op: "set_ipv6_adjust_mss", value: "1300" },
      { op: "set_ipv6_base_reachable_time", value: "60" },
      { op: "set_ipv6_dup_addr_detect_transmits", value: "0" },
      { op: "set_ipv6_source_validation", value: "disable" },
    ]);
  });

  it("diffs multi leaves by value and never re-sets a kept one", () => {
    const f = edit(full(), (d) => {
      d.addresses = ["2001:db8::1/64", "10.0.0.2/24"];
      d.remotes = ["192.0.2.3", "192.0.2.4"];
      d.ipv6.address_eui64 = ["2001:db8:1::/64", "2001:db8:2::/64"];
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [
      { op: "delete_address", value: "10.0.0.1/24" },
      { op: "set_address", value: "10.0.0.2/24" },
      { op: "delete_remote", value: "192.0.2.2" },
      { op: "set_remote", value: "192.0.2.4" },
      { op: "set_ipv6_address_eui64", value: "2001:db8:2::/64" },
    ]);
  });

  it("removes one value of a list with its per-value delete", () => {
    const f = edit(full(), (d) => {
      d.addresses = ["10.0.0.1/24"];
      d.ipv6.address_eui64 = ["2001:db8:1::/64"];
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [{ op: "delete_address", value: "2001:db8::1/64" }]);
  });

  it("empties each list with its bulk delete", () => {
    const f = edit(full(), (d) => {
      d.addresses = [];
      d.remotes = [];
      d.ipv6.address_eui64 = [];
      d.vlan_to_vni = [];
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [
      { op: "delete_all_addresses" },
      { op: "delete_all_remotes" },
      { op: "delete_all_ipv6_address_eui64" },
      { op: "delete_all_vlan_to_vni" },
    ]);
  });

  it("toggles every flag off and back on", () => {
    const off = edit(full(), (d) => {
      d.disabled = false;
      d.gpe = false;
      d.parameters.external = false;
      d.parameters.nolearning = false;
      d.parameters.neighbor_suppress = false;
      d.parameters.vni_filter = false;
      Object.assign(d.ip, {
        disable_arp_filter: false,
        disable_forwarding: false,
        enable_arp_accept: false,
        enable_arp_announce: false,
        enable_arp_ignore: false,
        enable_directed_broadcast: false,
        enable_proxy_arp: false,
        proxy_arp_pvlan: false,
      });
      d.ipv6.address_autoconf = false;
      d.ipv6.address_no_default_link_local = false;
      d.ipv6.disable_forwarding = false;
    });
    const names = vxlanUpdateOps(full(), off, CAPS15).map((o) => o.op);
    assert.deepEqual(names, [
      "delete_disable",
      "delete_gpe",
      "delete_parameters_external",
      "delete_parameters_nolearning",
      "delete_parameters_neighbor_suppress",
      "delete_parameters_vni_filter",
      "delete_ip_disable_arp_filter",
      "delete_ip_disable_forwarding",
      "delete_ip_enable_arp_accept",
      "delete_ip_enable_arp_announce",
      "delete_ip_enable_arp_ignore",
      "delete_ip_enable_directed_broadcast",
      "delete_ip_enable_proxy_arp",
      "delete_ip_proxy_arp_pvlan",
      "delete_ipv6_address_autoconf",
      "delete_ipv6_address_no_default_link_local",
      "delete_ipv6_disable_forwarding",
    ]);
    assert.ok(vxlanUpdateOps(full(), off, CAPS15).every((o) => o.value === undefined));
  });

  it("trims padded values and ignores blank ones", () => {
    const f = edit(bare(), (d) => {
      d.vni = " 100 ";
      d.description = "  core ";
      d.addresses = [" 10.0.0.1/24 ", "", "10.0.0.1/24"];
      d.remotes = ["  "];
      d.mtu = " ";
      d.vlan_to_vni = [
        { vlan_id: " 10 ", vni: " 10010 ", description: " users " },
        { vlan_id: "", vni: "", description: "" },
      ];
    });
    assert.deepEqual(vxlanUpdateOps(bare(), f, CAPS15), [
      { op: "set_description", value: "core" },
      { op: "set_address", value: "10.0.0.1/24" },
      { op: "set_vlan_to_vni", value: "10" },
      { op: "set_vlan_to_vni_vni", value: "10|10010" },
      { op: "set_vlan_to_vni_description", value: "10|users" },
    ]);
  });

  it("keeps a description with a pipe whole in the last value part", () => {
    const f = edit(bare(), (d) => {
      d.vlan_to_vni = [{ vlan_id: "10", vni: "10", description: "a|b" }];
    });
    assert.deepEqual(vxlanUpdateOps(bare(), f, CAPS15).at(-1), { op: "set_vlan_to_vni_description", value: "10|a|b" });
  });
});

describe("vlan-to-vni diff", () => {
  it("adds a mapping without touching the kept ones", () => {
    const f = edit(full(), (d) => {
      d.vlan_to_vni.push({ vlan_id: "30", vni: "30030", description: "" });
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [
      { op: "set_vlan_to_vni", value: "30" },
      { op: "set_vlan_to_vni_vni", value: "30|30030" },
    ]);
  });

  it("removes one mapping by id", () => {
    const f = edit(full(), (d) => {
      d.vlan_to_vni = d.vlan_to_vni.filter((r) => r.vlan_id !== "10");
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [{ op: "delete_vlan_to_vni", value: "10" }]);
  });

  it("removes every mapping with one op, unless one is added", () => {
    const none = edit(full(), (d) => {
      d.vlan_to_vni = [];
    });
    assert.deepEqual(vxlanUpdateOps(full(), none, CAPS15), [{ op: "delete_all_vlan_to_vni" }]);
    const replaced = edit(full(), (d) => {
      d.vlan_to_vni = [{ vlan_id: "40", vni: "40040", description: "" }];
    });
    assert.deepEqual(vxlanUpdateOps(full(), replaced, CAPS15), [
      { op: "delete_vlan_to_vni", value: "10" },
      { op: "delete_vlan_to_vni", value: "20-21" },
      { op: "set_vlan_to_vni", value: "40" },
      { op: "set_vlan_to_vni_vni", value: "40|40040" },
    ]);
  });

  it("changes only the VNI of a kept mapping", () => {
    const f = edit(full(), (d) => {
      d.vlan_to_vni[0].vni = "10099";
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [{ op: "set_vlan_to_vni_vni", value: "10|10099" }]);
  });

  it("sets, changes and clears a description", () => {
    const f = edit(full(), (d) => {
      d.vlan_to_vni[0].description = "";
      d.vlan_to_vni[1].description = "guests";
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [
      { op: "delete_vlan_to_vni_description", value: "10" },
      { op: "set_vlan_to_vni_description", value: "20-21|guests" },
    ]);
    const changed = edit(full(), (d) => {
      d.vlan_to_vni[0].description = "staff";
    });
    assert.deepEqual(vxlanUpdateOps(full(), changed, CAPS15), [
      { op: "set_vlan_to_vni_description", value: "10|staff" },
    ]);
  });

  it("treats an edited VLAN id as remove old plus add new", () => {
    const f = edit(full(), (d) => {
      d.vlan_to_vni[0].vlan_id = "11";
    });
    assert.deepEqual(vxlanUpdateOps(full(), f, CAPS15), [
      { op: "delete_vlan_to_vni", value: "10" },
      { op: "set_vlan_to_vni", value: "11" },
      { op: "set_vlan_to_vni_vni", value: "11|10010" },
      { op: "set_vlan_to_vni_description", value: "11|users" },
    ]);
  });

  it("never sends a description on 1.4", () => {
    const loaded = bare({ vlan_to_vni: [{ vlan_id: "10", vni: "10", description: null }] });
    const f = edit(loaded, (d) => {
      d.vlan_to_vni[0].description = "users";
      d.vlan_to_vni.push({ vlan_id: "20", vni: "20", description: "guests" });
    });
    assert.deepEqual(vxlanUpdateOps(loaded, f, CAPS14), [
      { op: "set_vlan_to_vni", value: "20" },
      { op: "set_vlan_to_vni_vni", value: "20|20" },
    ]);
  });

  it("never emits delete_vlan_to_vni_vni", () => {
    const f = edit(full(), (d) => {
      d.vlan_to_vni[0].vni = "";
    });
    assert.ok(!vxlanUpdateOps(full(), f, CAPS15).some((o) => o.op === "delete_vlan_to_vni_vni"));
  });
});

describe("save checks", () => {
  const key = (original: VxlanInterface | null, f: VxlanForm, c: VxlanCapabilities = CAPS15, ctx: VxlanSaveContext = CTX) =>
    vxlanProblem(original, f, c, ctx)?.key ?? null;

  it("passes a valid create and an untouched edit", () => {
    assert.equal(key(null, validCreate()), null);
    assert.equal(key(bare(), vxlanForm(bare())), null);
  });

  const NOT_MEMBER: VxlanSaveContext = { ...CTX, bridgeMember: false };
  const cases: [VxlanProblemKey, (f: VxlanForm) => void, VxlanSaveContext?][] = [
    ["nameRequired", (f) => { f.name = " "; }],
    ["nameFormat", (f) => { f.name = "vx1"; }],
    ["nameExists", (f) => { f.name = " vxlan0 "; }],
    ["vniRange", (f) => { f.vni = "16777215"; }],
    ["descriptionTooLong", (f) => { f.description = "x".repeat(256); }],
    ["addressInvalid", (f) => { f.addresses = ["10.0.0.1"]; }],
    ["sourceAddressInvalid", (f) => { f.source_address = "300.1.1.1"; }],
    ["groupInvalid", (f) => { f.group = "10.0.0.1"; }],
    ["remoteInvalid", (f) => { f.remotes = ["nope"]; }],
    ["portRange", (f) => { f.port = "0"; }],
    ["mtuRange", (f) => { f.mtu = "1199"; }],
    ["macInvalid", (f) => { f.mac = "00:11:22"; }],
    ["vniOrExternal", (f) => { f.vni = ""; }],
    ["vniWithExternal", (f) => { f.parameters.external = true; }],
    ["gpeNeedsExternal", (f) => { f.gpe = true; }],
    ["endpointRequired", (f) => { f.remotes = []; f.source_address = ""; }],
    ["groupNeedsSourceInterface", (f) => { f.remotes = []; f.group = "239.1.1.1"; }],
    ["groupWithRemote", (f) => { f.group = "239.1.1.1"; f.source_interface = "eth0"; }],
    ["addressFamilyMixed", (f) => { f.remotes = ["2001:db8::2"]; }],
    ["tosRange", (f) => { f.parameters.ip_tos = "100"; }],
    ["ttlRange", (f) => { f.parameters.ip_ttl = "256"; }],
    ["flowlabelInvalid", (f) => { f.parameters.ipv6_flowlabel = "0x100000"; }],
    ["ipAdjustMssRange", (f) => { f.ip.adjust_mss = "535"; }],
    ["arpCacheTimeoutRange", (f) => { f.ip.arp_cache_timeout = "0"; }],
    ["ipv6AdjustMssRange", (f) => { f.ipv6.adjust_mss = "1e3"; }],
    ["baseReachableTimeRange", (f) => { f.ipv6.base_reachable_time = "86401"; }],
    ["dadTransmitsRange", (f) => { f.ipv6.dup_addr_detect_transmits = "-1"; }],
    ["eui64Invalid", (f) => { f.ipv6.address_eui64 = ["2001:db8::/48"]; }],
    ["interfaceIdentifierInvalid", (f) => { f.ipv6.address_interface_identifier = "1::"; }],
    ["vlanIdRequired", (f) => { f.vlan_to_vni = [{ vlan_id: " ", vni: "10", description: "" }]; }],
    ["vlanIdInvalid", (f) => { f.vlan_to_vni = [{ vlan_id: "4095", vni: "10", description: "" }]; }],
    ["vlanIdOverlap", (f) => {
      f.vlan_to_vni = [{ vlan_id: "10", vni: "10", description: "" }, { vlan_id: " 10 ", vni: "11", description: "" }];
    }],
    ["vlanVniRequired", (f) => { f.vlan_to_vni = [{ vlan_id: "10", vni: "", description: "users" }]; }],
    ["vlanVniInvalid", (f) => { f.vlan_to_vni = [{ vlan_id: "10", vni: "16777215", description: "" }]; }],
    ["vlanVniRangeLength", (f) => { f.vlan_to_vni = [{ vlan_id: "10-12", vni: "100-101", description: "" }]; }],
    ["vniReused", (f) => {
      f.vlan_to_vni = [{ vlan_id: "10", vni: "100", description: "" }, { vlan_id: "11", vni: "100", description: "" }];
    }],
    ["vlanDescriptionTooLong", (f) => { f.vlan_to_vni = [{ vlan_id: "10", vni: "10", description: "x".repeat(256) }]; }],
    ["mtuNeedsIpv6Off", (f) => { f.mtu = "1250"; }],
    ["externalNeedsVniFilter", (f) => { f.vni = ""; f.parameters.external = true; }],
    ["externalOthersNeedVniFilter", (f) => { f.vni = ""; f.parameters.external = true; f.parameters.vni_filter = true; }],
    ["vniFilterNeedsExternal", (f) => { f.parameters.vni_filter = true; }],
    ["externalPortInUse", () => {}, { ...CTX, others: [bare({ parameters: { ...bare().parameters, external: true } })] }],
    ["mirrorWithRedirect", (f) => { f.mirror_ingress = "eth1"; f.redirect = "eth2"; }],
    ["bridgeMemberVrf", (f) => { f.vrf = "red"; }],
    ["bridgeMemberAddress", (f) => { f.addresses = ["10.0.0.1/24"]; }],
    ["vlanToVniNeedsBridge", (f) => { f.vlan_to_vni = [{ vlan_id: "10", vni: "10", description: "" }]; }, NOT_MEMBER],
    ["neighborSuppressNeedsBridge", (f) => { f.parameters.neighbor_suppress = true; }, NOT_MEMBER],
  ];

  it("returns every keyed problem, each with a message in both locales", () => {
    const seen = new Set<VxlanProblemKey>();
    for (const [expected, change, ctx] of cases) {
      const f = structuredClone(validCreate());
      change(f);
      assert.equal(key(null, f, CAPS15, ctx ?? CTX), expected, expected);
      seen.add(expected);
    }
    for (const locale of ["en", "zh-CN"]) {
      const read = (name: string) =>
        JSON.parse(readFileSync(new URL(`../../../messages/${locale}/${name}`, import.meta.url), "utf8"));
      const catalog = read("vxlan.json");
      for (const k of seen) {
        // An empty name renders the shared common message.
        if (k === "nameRequired") assert.equal(typeof read("common.json").interfaceNameRequired, "string");
        else assert.equal(typeof catalog.modal.errors[k], "string", `${locale} ${k}`);
      }
    }
    assert.equal(seen.size, cases.length);
  });

  it("accepts the keyword and range forms the lab accepts", () => {
    const f = structuredClone(validCreate());
    f.ip.adjust_mss = "clamp-mss-to-pmtu";
    f.ipv6.adjust_mss = "536";
    f.parameters.ipv6_flowlabel = "0x0fffff";
    f.parameters.ip_ttl = "0";
    f.ipv6.dup_addr_detect_transmits = "0";
    f.vlan_to_vni = [
      { vlan_id: "0", vni: "0", description: "" },
      { vlan_id: "10-12", vni: "100-102", description: "" },
      { vlan_id: "", vni: "", description: "" },
    ];
    assert.equal(key(null, f), null);
    for (const label of ["12345", "0xfffff", "0x1", "abc"]) {
      f.parameters.ipv6_flowlabel = label;
      assert.equal(key(null, f), null, label);
    }
  });

  it("rejects a reversed range", () => {
    const f = structuredClone(validCreate());
    f.vlan_to_vni = [{ vlan_id: "12-10", vni: "100-102", description: "" }];
    assert.equal(key(null, f), "vlanIdInvalid");
  });

  it("rejects mixed underlay families, with or without a source address", () => {
    const f = structuredClone(validCreate());
    f.source_address = "";
    f.remotes = ["192.0.2.2", "2001:db8::2"];
    assert.equal(key(null, f), "addressFamilyMixed");
    f.remotes = ["2001:db8::2", "2001:db8::3"];
    assert.equal(key(null, f), null);
    f.source_address = "2001:db8::1";
    assert.equal(key(null, f), null);
  });

  it("expands VLAN ranges and compares ids as numbers", () => {
    const f = structuredClone(validCreate());
    const rows = (...r: [string, string][]) => r.map(([vlan_id, vni]) => ({ vlan_id, vni, description: "" }));
    f.vlan_to_vni = rows(["10", "100"], ["5-15", "200-210"]);
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), { key: "vlanIdOverlap", values: { vlan: "10" } });
    f.vlan_to_vni = rows(["10", "100"], ["010", "101"]);
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), { key: "vlanIdOverlap", values: { vlan: "10" } });
    f.vlan_to_vni = rows(["5-9", "100-104"], ["10-15", "105-110"]);
    assert.equal(key(null, f), null);
  });

  it("expands VNI ranges and gives each VNI to one VLAN only", () => {
    const f = structuredClone(validCreate());
    const rows = (...r: [string, string][]) => r.map(([vlan_id, vni]) => ({ vlan_id, vni, description: "" }));
    f.vlan_to_vni = rows(["10", "100"], ["11", "100"]);
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), { key: "vniReused", values: { vni: "100" } });
    f.vlan_to_vni = rows(["10-12", "100-102"], ["20", "0101"]);
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), { key: "vniReused", values: { vni: "101" } });
    f.vlan_to_vni = rows(["10-12", "100-102"], ["20", "103"]);
    assert.equal(key(null, f), null);
  });

  it("limits a mapping description on 1.5 and ignores it on 1.4", () => {
    const f = structuredClone(validCreate());
    f.vlan_to_vni = [{ vlan_id: "10", vni: "10", description: "x".repeat(256) }];
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), {
      key: "vlanDescriptionTooLong",
      values: { vlan: "10", max: 255 },
    });
    assert.equal(key(null, f, CAPS14), null);
    f.vlan_to_vni[0].description = "x".repeat(255);
    assert.equal(key(null, f), null);
  });

  it("drops gpe on 1.4, so its external check cannot fire there", () => {
    const f = { ...structuredClone(validCreate()), gpe: true };
    assert.equal(key(null, f, CAPS15), "gpeNeedsExternal");
    assert.equal(key(null, f, CAPS14), null);
  });

  it("allows an MTU below 1280 only with IPv6 off", () => {
    const off = (): VxlanForm => {
      const f = structuredClone(validCreate());
      f.mtu = "1250";
      f.ipv6.address_no_default_link_local = true;
      return f;
    };
    assert.equal(key(null, off()), null);
    assert.equal(key(null, { ...off(), mtu: "1280" }), null);
    const triggers: [string, (f: VxlanForm) => void][] = [
      ["link-local", (f) => { f.ipv6.address_no_default_link_local = false; }],
      ["ipv6 address", (f) => { f.addresses = ["2001:db8::1/64"]; }],
      ["autoconf", (f) => { f.ipv6.address_autoconf = true; }],
      ["eui64", (f) => { f.ipv6.address_eui64 = ["2001:db8::/64"]; }],
      ["interface identifier", (f) => { f.ipv6.address_interface_identifier = "::1"; }],
    ];
    const notMember = { ...CTX, bridgeMember: false };
    for (const [label, change] of triggers) {
      const f = off();
      change(f);
      assert.deepEqual(vxlanProblem(null, f, CAPS15, notMember), { key: "mtuNeedsIpv6Off", values: { min: 1280 } }, label);
    }
    // An IPv4 address alone keeps IPv6 off; the 1.4 interface identifier is never read.
    assert.equal(key(null, { ...off(), addresses: ["10.0.0.1/24"] }, CAPS15, notMember), null);
    const iid = off();
    iid.ipv6.address_interface_identifier = "::1";
    assert.equal(key(null, iid, CAPS14), null);
  });

  it("rejects mirror with redirect", () => {
    for (const side of ["mirror_ingress", "mirror_egress"] as const) {
      const f = { ...structuredClone(validCreate()), [side]: "eth1", redirect: "eth2" };
      assert.equal(key(null, f), "mirrorWithRedirect", side);
    }
  });

  it("checks external with other VXLAN interfaces for vni-filter here and on at least one other", () => {
    const f = structuredClone(validCreate());
    f.vni = "";
    f.parameters.external = true;
    // Alone on the device, external needs no vni-filter.
    assert.equal(key(null, f, CAPS15, { bridgeMember: true, others: [] }), null);
    assert.equal(key(null, f), "externalNeedsVniFilter");
    f.parameters.vni_filter = true;
    assert.equal(key(null, f), "externalOthersNeedVniFilter");
    const filtered = bare({ name: "vxlan5", parameters: { ...bare().parameters, external: true, vni_filter: true } });
    assert.equal(key(null, f, CAPS15, { bridgeMember: true, others: [filtered] }), null);
    // One other tunnel with vni-filter is enough; a plain tunnel on another port may stay.
    const plain = bare({ port: "4790" });
    assert.equal(key(null, f, CAPS15, { bridgeMember: true, others: [plain, filtered] }), null);
  });

  it("rejects vni-filter without external", () => {
    const f = structuredClone(validCreate());
    f.parameters.vni_filter = true;
    assert.equal(key(null, f, CAPS15, { bridgeMember: true, others: [] }), "vniFilterNeedsExternal");
  });

  it("rejects an external and a non-external tunnel on the same UDP port, both ways", () => {
    const other = (port: string | null, external: boolean) =>
      bare({ name: "vxlan7", port, parameters: { ...bare().parameters, external, vni_filter: external } });
    const ctx = (port: string | null, external: boolean) => ({ bridgeMember: true, others: [other(port, external)] });
    const plain = structuredClone(validCreate());
    // Both unset: both on the default port.
    assert.deepEqual(vxlanProblem(null, plain, CAPS15, ctx(null, true)), {
      key: "externalPortInUse",
      values: { port: "4789", name: "vxlan7" },
    });
    assert.equal(key(null, plain, CAPS15, ctx("4789", true)), "externalPortInUse");
    assert.equal(key(null, plain, CAPS15, ctx("4790", true)), null);
    plain.port = "4790";
    assert.equal(key(null, plain, CAPS15, ctx("4790", true)), "externalPortInUse");
    assert.equal(key(null, plain, CAPS15, ctx(null, true)), null);
    // Two plain tunnels may share a port.
    assert.equal(key(null, plain, CAPS15, ctx("4790", false)), null);

    const external = structuredClone(validCreate());
    external.vni = "";
    external.parameters.external = true;
    external.parameters.vni_filter = true;
    const filtered = bare({ name: "vxlan5", port: "4791", parameters: { ...bare().parameters, external: true, vni_filter: true } });
    const withPlain = (port: string | null) => ({ bridgeMember: true, others: [filtered, other(port, false)] });
    assert.equal(key(null, external, CAPS15, withPlain(null)), "externalPortInUse");
    assert.equal(key(null, external, CAPS15, withPlain("4790")), null);
    // Two external tunnels may share a port.
    assert.equal(key(null, external, CAPS15, { bridgeMember: true, others: [bare({ ...filtered, port: null })] }), null);
  });

  it("checks bridge membership rules", () => {
    const member = { ...CTX, bridgeMember: true };
    const notMember = { ...CTX, bridgeMember: false };
    const f = structuredClone(validCreate());
    f.vlan_to_vni = [{ vlan_id: "10", vni: "10", description: "" }];
    f.parameters.neighbor_suppress = true;
    assert.equal(key(null, f, CAPS15, member), null);
    assert.equal(key(null, f, CAPS15, notMember), "vlanToVniNeedsBridge");
    f.vlan_to_vni = [];
    assert.equal(key(null, f, CAPS15, notMember), "neighborSuppressNeedsBridge");
    // A non-member may hold a VRF and addresses.
    assert.equal(key(null, { ...validCreate(), vrf: "red", addresses: ["10.0.0.1/24"] }, CAPS15, notMember), null);
    assert.equal(key(null, { ...validCreate(), vrf: "red" }, CAPS15, member), "bridgeMemberVrf");
    assert.equal(key(null, { ...validCreate(), addresses: ["2001:db8::1/64"] }, CAPS15, member), "bridgeMemberAddress");
  });

  it("rejects an IPv4 network address below /31, never an IPv6 one", () => {
    const notMember = { ...CTX, bridgeMember: false };
    const check = (address: string) => key(null, { ...validCreate(), addresses: [address] }, CAPS15, notMember);
    assert.equal(check("192.0.2.0/24"), "addressInvalid");
    assert.equal(check("10.0.0.0/8"), "addressInvalid");
    assert.equal(check("192.0.2.64/26"), "addressInvalid");
    assert.equal(check("192.0.2.1/24"), null);
    assert.equal(check("192.0.2.65/26"), null);
    assert.equal(check("192.0.2.0/31"), null);
    assert.equal(check("192.0.2.0/32"), null);
    assert.equal(check("2001:db8:9::/64"), null);
  });

  it("names the bounds and the row in the problem values", () => {
    assert.deepEqual(vxlanProblem(null, { ...validCreate(), mtu: "1.5" }, CAPS15), {
      key: "mtuRange",
      values: { min: 1200, max: 16000 },
    });
    const f = structuredClone(validCreate());
    f.vlan_to_vni = [
      { vlan_id: "10", vni: "10", description: "" },
      { vlan_id: "", vni: "", description: "" },
      { vlan_id: "", vni: "20", description: "" },
    ];
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), { key: "vlanIdRequired", values: { n: 3 } });
    f.vlan_to_vni = [{ vlan_id: "10", vni: " ", description: "" }];
    assert.deepEqual(vxlanProblem(null, f, CAPS15, CTX), { key: "vlanVniRequired", values: { vlan: "10" } });
  });

  it("ignores a description-only row on 1.4, where the leaf is hidden", () => {
    const f = structuredClone(validCreate());
    f.vlan_to_vni = [{ vlan_id: "", vni: "", description: "users" }];
    assert.equal(key(null, f, CAPS14), null);
    assert.equal(key(null, f, CAPS15), "vlanIdRequired");
  });

  it("checks the name only on create", () => {
    const loaded = bare();
    assert.equal(vxlanProblem(loaded, vxlanForm(loaded), CAPS15, CTX), null);
  });
});

describe("service", () => {
  function stub() {
    const sent: [string, VxlanBatchOperation[]][] = [];
    const service = Object.create(vxlanService) as typeof vxlanService;
    service.batchConfigure = async (name: string, operations: VxlanBatchOperation[]) => {
      sent.push([name, operations]);
      return { success: true };
    };
    return { service, sent };
  }

  it("sends the exact normalized diff", async () => {
    const { service, sent } = stub();
    const loaded = bare({ addresses: ["10.0.0.1/24"] });
    await service.updateInterface(loaded, vxlanForm(loaded), CAPS15);
    await service.updateInterface(
      loaded,
      edit(loaded, (d) => {
        d.description = "  uplink ";
        d.addresses = [" 10.0.0.1/24 ", " 10.0.0.2/24"];
        d.vlan_to_vni = [{ vlan_id: " 10 ", vni: " 20 ", description: "  " }];
      }),
      CAPS15,
    );
    await service.createInterface({ ...validCreate(), name: " vxlan3 " }, CAPS14);
    await service.deleteInterface("vxlan0");
    assert.deepEqual(sent, [
      ["vxlan0", []],
      [
        "vxlan0",
        [
          { op: "set_description", value: "uplink" },
          { op: "set_address", value: "10.0.0.2/24" },
          { op: "set_vlan_to_vni", value: "10" },
          { op: "set_vlan_to_vni_vni", value: "10|20" },
        ],
      ],
      [
        "vxlan3",
        [
          { op: "set_interface" },
          { op: "set_vni", value: "100" },
          { op: "set_source_address", value: "192.0.2.1" },
          { op: "set_remote", value: "192.0.2.2" },
        ],
      ],
      ["vxlan0", [{ op: "delete_interface" }]],
    ]);
  });

  it("deletes the interface with a name-only op", () => {
    assert.deepEqual(vxlanDeleteOps(), [{ op: "delete_interface" }]);
  });
});

describe("batchConfigure", () => {
  /** Stub the POST and the cache refresh; `reply` is what POST /batch returns. */
  async function withStubs(
    reply: { success: boolean; error?: string },
    refreshFails: boolean,
    run: (log: { posts: unknown[]; refreshes: number }) => Promise<void>,
  ) {
    const log = { posts: [] as unknown[], refreshes: 0 };
    const originalPost = apiClient.post;
    const originalRefresh = vxlanService.refreshConfig;
    apiClient.post = (async (endpoint: string, body?: unknown) => {
      log.posts.push([endpoint, body]);
      return reply;
    }) as typeof apiClient.post;
    vxlanService.refreshConfig = async () => {
      log.refreshes += 1;
      if (refreshFails) throw new Error("refresh failed");
      return { success: true };
    };
    try {
      await run(log);
    } finally {
      apiClient.post = originalPost;
      vxlanService.refreshConfig = originalRefresh;
    }
  }

  it("makes no POST for an empty op list", async () => {
    await withStubs({ success: true }, false, async (log) => {
      assert.deepEqual(await vxlanService.batchConfigure("vxlan0", []), { success: true });
      assert.deepEqual(log, { posts: [], refreshes: 0 });
    });
  });

  it("throws the device error on a rejected commit and does not refresh", async () => {
    await withStubs({ success: false, error: "Commit failed" }, false, async (log) => {
      await assert.rejects(vxlanService.batchConfigure("vxlan0", [{ op: "delete_interface" }]), {
        message: "Commit failed",
      });
      assert.deepEqual(log.posts, [
        ["/vyos/vxlan/batch", { interface_name: "vxlan0", operations: [{ op: "delete_interface" }] }],
      ]);
      assert.equal(log.refreshes, 0);
    });
  });

  it("refreshes after a successful commit", async () => {
    await withStubs({ success: true }, false, async (log) => {
      assert.deepEqual(await vxlanService.batchConfigure("vxlan0", [{ op: "set_gpe" }]), { success: true });
      assert.equal(log.posts.length, 1);
      assert.equal(log.refreshes, 1);
    });
  });

  it("does not reject when the refresh after a commit fails", async () => {
    await withStubs({ success: true }, true, async (log) => {
      assert.deepEqual(await vxlanService.batchConfigure("vxlan0", [{ op: "set_gpe" }]), { success: true });
      assert.equal(log.refreshes, 1);
    });
  });
});
