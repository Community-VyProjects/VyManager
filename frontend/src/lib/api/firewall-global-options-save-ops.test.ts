import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  draftFromConfig,
  globalOptionsProblem,
  globalOptionsSaveOps,
  MASKED_SECRET,
  RESOLVER_INTERVAL_RANGE,
  TIMEOUT_RANGE,
  type GlobalOptionsDraft,
} from "./firewall-global-options-save-ops";
import {
  firewallGlobalOptionsService,
  type FirewallGlobalOptionsConfig,
  type GlobalOptionsBatchOperation,
} from "./firewall-global-options";
import { apiClient } from "./client";

const RANGES = { resolverInterval: RESOLVER_INTERVAL_RANGE, timeout: TIMEOUT_RANGE };

function emptyConfig(): FirewallGlobalOptionsConfig {
  const state = () => ({ action: null, log: false, log_level: null });
  return {
    configured: false,
    all_ping: null,
    broadcast_ping: null,
    directed_broadcast: null,
    ip_src_route: null,
    ipv6_src_route: null,
    receive_redirects: null,
    ipv6_receive_redirects: null,
    send_redirects: null,
    log_martians: null,
    source_validation: null,
    ipv6_source_validation: null,
    syn_cookies: null,
    twa_hazards_protection: null,
    resolver_cache: false,
    resolver_interval: null,
    state_policy: { established: state(), invalid: state(), related: state(), offload_target: null },
    bridged_traffic: { ipv4: false, ipv6: false, accept_invalid_ethernet_types: [] },
    geoip: {
      provider: null,
      maxmind_account_id: null,
      maxmind_license_key: null,
      maxmind_lite: false,
      source_address: null,
      vrf: null,
    },
    timeouts: {
      icmp: null,
      other: null,
      tcp_close: null,
      tcp_close_wait: null,
      tcp_established: null,
      tcp_fin_wait: null,
      tcp_last_ack: null,
      tcp_syn_recv: null,
      tcp_syn_sent: null,
      tcp_time_wait: null,
      udp_other: null,
      udp_stream: null,
    },
  };
}

function fullConfig(): FirewallGlobalOptionsConfig {
  const config = emptyConfig();
  config.configured = true;
  config.all_ping = "enable";
  config.directed_broadcast = "disable";
  config.ipv6_source_validation = "loose";
  config.resolver_cache = true;
  config.resolver_interval = 60;
  config.state_policy.established = { action: "accept", log: true, log_level: "info" };
  config.state_policy.invalid = { action: "drop", log: false, log_level: null };
  config.state_policy.offload_target = "FT1";
  config.bridged_traffic = { ipv4: true, ipv6: false, accept_invalid_ethernet_types: ["arp", "dhcp"] };
  config.geoip = {
    provider: "maxmind",
    maxmind_account_id: "123",
    maxmind_license_key: MASKED_SECRET,
    maxmind_lite: true,
    source_address: "10.0.0.1",
    vrf: "RED",
  };
  config.timeouts.icmp = 30;
  config.timeouts.tcp_established = 3600;
  config.timeouts.udp_stream = 120;
  return config;
}

function edit(config: FirewallGlobalOptionsConfig, change: (draft: GlobalOptionsDraft) => void) {
  const original = draftFromConfig(config);
  const updated = structuredClone(original);
  change(updated);
  return { original, updated, ops: globalOptionsSaveOps(original, updated) };
}

describe("globalOptionsSaveOps", () => {
  it("emits nothing for an untouched draft", () => {
    assert.deepEqual(edit(fullConfig(), () => {}).ops, []);
    assert.deepEqual(edit(emptyConfig(), () => {}).ops, []);
  });

  it("sets a changed single-value leaf and deletes a cleared one", () => {
    const { ops } = edit(fullConfig(), (d) => {
      d.toggles.all_ping = "disable";
      d.toggles.directed_broadcast = "";
      d.toggles.syn_cookies = " enable ";
      d.resolver_interval = "";
    });
    assert.deepEqual(ops, [
      { op: "set_all_ping", value: "disable" },
      { op: "delete_directed_broadcast" },
      { op: "set_syn_cookies", value: "enable" },
      { op: "delete_resolver_interval" },
    ]);
  });

  it("toggles valueless flags", () => {
    const { ops } = edit(fullConfig(), (d) => {
      d.resolver_cache = false;
      d.states.established.log = false;
      d.states.related.log = true;
    });
    assert.deepEqual(ops, [
      { op: "delete_resolver_cache" },
      { op: "delete_state_policy_established_log" },
      { op: "set_state_policy_related_log" },
    ]);
  });

  it("deletes a state node when every leaf under it is cleared", () => {
    const { ops } = edit(fullConfig(), (d) => {
      d.states.invalid = { action: "", log: false, log_level: "" };
      d.states.established.log_level = "";
    });
    assert.deepEqual(ops, [
      { op: "delete_state_policy_established_log_level" },
      { op: "delete_state_policy_invalid" },
    ]);
  });

  it("sets the offload target and clears it with the offload delete", () => {
    assert.deepEqual(edit(fullConfig(), (d) => (d.offload_target = "FT2")).ops, [
      { op: "set_state_policy_offload_target", value: "FT2" },
    ]);
    assert.deepEqual(edit(fullConfig(), (d) => (d.offload_target = "")).ops, [
      { op: "delete_state_policy_offload" },
    ]);
  });

  it("deletes state-policy when every state and the offload target are cleared", () => {
    const { ops } = edit(fullConfig(), (d) => {
      d.states.established = { action: "", log: false, log_level: "" };
      d.states.invalid = { action: "", log: false, log_level: "" };
      d.offload_target = "";
    });
    assert.deepEqual(ops, [{ op: "delete_state_policy" }]);
  });

  it("adds and removes bridged ethernet types by value", () => {
    const { ops } = edit(fullConfig(), (d) => {
      d.bridged_ethernet_types = ["dhcp", "wol"];
      d.bridged_ipv6 = true;
    });
    assert.deepEqual(ops, [
      { op: "set_apply_to_bridged_traffic_ipv6" },
      { op: "delete_apply_to_bridged_traffic_accept_invalid_ethernet_type", value: "arp" },
      { op: "set_apply_to_bridged_traffic_accept_invalid_ethernet_type", value: "wol" },
    ]);
  });

  it("deletes accept-invalid when the last type is removed, and the section when all is cleared", () => {
    assert.deepEqual(edit(fullConfig(), (d) => (d.bridged_ethernet_types = [])).ops, [
      { op: "delete_apply_to_bridged_traffic_accept_invalid" },
    ]);
    assert.deepEqual(
      edit(fullConfig(), (d) => {
        d.bridged_ethernet_types = [];
        d.bridged_ipv4 = false;
      }).ops,
      [{ op: "delete_apply_to_bridged_traffic" }],
    );
  });

  it("keeps the masked license key, deletes a cleared one and sets new text", () => {
    assert.deepEqual(edit(fullConfig(), (d) => (d.geoip.provider = "db-ip")).ops, [
      { op: "set_geoip_provider", value: "db-ip" },
    ]);
    assert.deepEqual(
      edit(fullConfig(), (d) => {
        d.geoip.provider = "";
        d.geoip.maxmind_license_key = "";
      }).ops,
      [{ op: "delete_geoip_provider" }, { op: "delete_geoip_maxmind_license_key" }],
    );
    assert.deepEqual(edit(fullConfig(), (d) => (d.geoip.maxmind_license_key = " NEWKEY ")).ops, [
      { op: "set_geoip_maxmind_license_key", value: "NEWKEY" },
    ]);
  });

  it("deletes geoip when every geoip field is cleared", () => {
    const { ops } = edit(fullConfig(), (d) => {
      d.geoip = {
        provider: "",
        maxmind_account_id: "",
        maxmind_license_key: "",
        maxmind_lite: false,
        source_address: "",
        vrf: "",
      };
    });
    assert.deepEqual(ops, [{ op: "delete_geoip" }]);
  });

  it("deletes the tcp, udp and timeout nodes when their leaves are cleared", () => {
    assert.deepEqual(edit(fullConfig(), (d) => (d.timeouts.tcp_established = "")).ops, [
      { op: "delete_timeout_tcp" },
    ]);
    assert.deepEqual(
      edit(fullConfig(), (d) => {
        d.timeouts.udp_stream = "";
        d.timeouts.udp_other = "30";
      }).ops,
      [
        { op: "delete_timeout_udp_stream" },
        { op: "set_timeout_udp_other", value: "30" },
      ],
    );
    assert.deepEqual(
      edit(fullConfig(), (d) => {
        d.timeouts.icmp = "";
        d.timeouts.tcp_established = "";
        d.timeouts.udp_stream = "";
      }).ops,
      [{ op: "delete_timeout" }],
    );
  });

  it("deletes the whole node when every field is cleared", () => {
    const original = draftFromConfig(fullConfig());
    const updated = draftFromConfig(emptyConfig());
    assert.deepEqual(globalOptionsSaveOps(original, updated), [{ op: "delete_global_options" }]);
  });

  it("builds every leaf from an empty config", () => {
    const original = draftFromConfig(emptyConfig());
    const updated = draftFromConfig(fullConfig());
    updated.geoip.maxmind_license_key = "KEY";
    assert.deepEqual(globalOptionsSaveOps(original, updated), [
      { op: "set_all_ping", value: "enable" },
      { op: "set_directed_broadcast", value: "disable" },
      { op: "set_ipv6_source_validation", value: "loose" },
      { op: "set_resolver_cache" },
      { op: "set_resolver_interval", value: "60" },
      { op: "set_state_policy_established_action", value: "accept" },
      { op: "set_state_policy_established_log" },
      { op: "set_state_policy_established_log_level", value: "info" },
      { op: "set_state_policy_invalid_action", value: "drop" },
      { op: "set_state_policy_offload_target", value: "FT1" },
      { op: "set_apply_to_bridged_traffic_ipv4" },
      { op: "set_apply_to_bridged_traffic_accept_invalid_ethernet_type", value: "arp" },
      { op: "set_apply_to_bridged_traffic_accept_invalid_ethernet_type", value: "dhcp" },
      { op: "set_geoip_provider", value: "maxmind" },
      { op: "set_geoip_maxmind_account_id", value: "123" },
      { op: "set_geoip_source_address", value: "10.0.0.1" },
      { op: "set_geoip_vrf", value: "RED" },
      { op: "set_geoip_maxmind_license_key", value: "KEY" },
      { op: "set_geoip_maxmind_lite" },
      { op: "set_timeout_icmp", value: "30" },
      { op: "set_timeout_tcp_established", value: "3600" },
      { op: "set_timeout_udp_stream", value: "120" },
    ]);
  });
});

describe("globalOptionsProblem", () => {
  const check = (config: FirewallGlobalOptionsConfig, change: (d: GlobalOptionsDraft) => void) => {
    const { original, updated } = edit(config, change);
    return globalOptionsProblem(original, updated, RANGES)?.key ?? null;
  };

  it("accepts an untouched config", () => {
    assert.equal(check(fullConfig(), () => {}), null);
  });

  it("checks the resolver interval and timeout ranges", () => {
    assert.equal(check(emptyConfig(), (d) => (d.resolver_interval = "9")), "resolverIntervalRange");
    assert.equal(check(emptyConfig(), (d) => (d.resolver_interval = "3601")), "resolverIntervalRange");
    assert.equal(check(emptyConfig(), (d) => (d.resolver_interval = " 10 ")), null);
    assert.equal(check(emptyConfig(), (d) => (d.timeouts.tcp_close = "0")), "timeoutRange");
    assert.equal(check(emptyConfig(), (d) => (d.timeouts.tcp_close = "1.5")), "timeoutRange");
    assert.equal(check(emptyConfig(), (d) => (d.timeouts.tcp_close = "21474837")), "timeoutRange");
  });

  it("requires the MaxMind account id and license key together with that provider", () => {
    assert.equal(check(fullConfig(), (d) => (d.geoip.maxmind_account_id = " ")), "maxmindAccountRequired");
    assert.equal(check(fullConfig(), (d) => (d.geoip.maxmind_license_key = "")), "maxmindKeyRequired");
    assert.equal(
      check(emptyConfig(), (d) => {
        d.geoip.provider = "maxmind";
        d.geoip.maxmind_account_id = "1";
      }),
      "maxmindKeyRequired",
    );
  });

  it("rejects the mask typed as a new key", () => {
    assert.equal(check(emptyConfig(), (d) => (d.geoip.maxmind_license_key = MASKED_SECRET)), "licenseKeyIsMask");
  });

  it("checks the geoip source address", () => {
    assert.equal(check(emptyConfig(), (d) => (d.geoip.source_address = "10.0.0.256")), "sourceAddressInvalid");
    assert.equal(check(emptyConfig(), (d) => (d.geoip.source_address = "2001:db8::1")), null);
  });
});

describe("firewallGlobalOptionsService.save", () => {
  it("posts the trimmed ops and skips the POST when nothing changed", async () => {
    const posted: GlobalOptionsBatchOperation[][] = [];
    const original = apiClient.post;
    (apiClient as unknown as { post: unknown }).post = async (_url: string, body: { operations: GlobalOptionsBatchOperation[] }) => {
      posted.push(body.operations);
      return { success: true };
    };
    try {
      const draft = draftFromConfig(fullConfig());
      await firewallGlobalOptionsService.save(draft, structuredClone(draft));
      assert.equal(posted.length, 0);
      const updated = structuredClone(draft);
      updated.geoip.maxmind_account_id = " 456 ";
      updated.geoip.maxmind_license_key = MASKED_SECRET;
      await firewallGlobalOptionsService.save(draft, updated);
      assert.deepEqual(posted, [[{ op: "set_geoip_maxmind_account_id", value: "456" }]]);
    } finally {
      (apiClient as unknown as { post: unknown }).post = original;
    }
  });

  it("throws the device error of a rejected commit", async () => {
    const original = apiClient.post;
    (apiClient as unknown as { post: unknown }).post = async () => ({ success: false, error: "Commit failed" });
    try {
      const draft = draftFromConfig(emptyConfig());
      const updated = structuredClone(draft);
      updated.toggles.all_ping = "disable";
      await assert.rejects(firewallGlobalOptionsService.save(draft, updated), { message: "Commit failed" });
    } finally {
      (apiClient as unknown as { post: unknown }).post = original;
    }
  });
});
