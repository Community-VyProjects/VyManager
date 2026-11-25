import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containerDeleteOps,
  containerNameProblem,
  containerOps,
  containerProblem,
  containerRootDeleteOps,
  emptyContainer,
  MACVLAN_PARENT_TYPES,
  MASKED_SECRET,
  networkDeleteOps,
  networkNameProblem,
  networkOps,
  networkProblem,
  registryDeleteOps,
  registryOps,
  registryProblem,
  removableVolumeDirs,
  type ContainerProblemContext,
} from "./container-save-ops";
import {
  containerService,
  type BatchOperation,
  type ContainerFeatures,
  type ContainerInstance,
  type ContainerNetworkConfig,
  type ContainerRegistry,
  type ContainerValues,
} from "./container";

const ON: ContainerFeatures = {
  allow_host_cgroups: true,
  health_check: true,
  log_driver: true,
  stop_timeout: true,
  network_mac: true,
  tmpfs: true,
  network_gateway: true,
  network_mtu: true,
  network_type: true,
  registry_insecure: true,
  registry_mirror: true,
};
const OFF = Object.fromEntries(Object.keys(ON).map((key) => [key, false])) as unknown as ContainerFeatures;

const VALUES: ContainerValues = {
  capabilities: ["net-admin", "sys-admin", "chown"],
  restart_policies: ["no", "on-failure", "always"],
  log_drivers: ["k8s-file", "journald", "none"],
  port_protocols: ["tcp", "udp"],
  volume_modes: ["ro", "rw"],
  volume_propagations: ["shared", "private"],
  network_types: ["bridge", "macvlan"],
  macvlan_modes: ["bridge", "private", "vepa"],
  registry_password_max_length: 512,
  network_mac_keywords: ["auto"],
  health_check_interval_keywords: ["disable"],
};
const RULES_15 = { name_server_needs_no_name_server: true, unique_attachment_addresses: true };
const RULES_14 = { name_server_needs_no_name_server: false, unique_attachment_addresses: false };
const NO_KEYWORDS: ContainerValues = { ...VALUES, network_mac_keywords: [], health_check_interval_keywords: [] };

const NET: ContainerNetworkConfig = {
  name: "net1",
  description: null,
  gateways: [],
  mtu: null,
  no_name_server: false,
  prefixes: ["10.0.0.0/24"],
  network_type: null,
  macvlan_mode: null,
  macvlan_parent: null,
  vrf: null,
};

function web(overrides: Partial<ContainerInstance> = {}): ContainerInstance {
  return {
    ...emptyContainer("web"),
    image: "nginx:latest",
    networks: [{ name: "net1", addresses: [], mac: null }],
    ...overrides,
  };
}

const ctx = (overrides: Partial<ContainerProblemContext> = {}): ContainerProblemContext => ({
  features: ON,
  existingNames: [],
  networks: [NET],
  values: VALUES,
  rules: RULES_15,
  containers: [],
  ...overrides,
});

const names = (ops: BatchOperation[]) => ops.map((op) => op.op);

describe("containerOps", () => {
  it("creates a container with every leaf it sets", () => {
    const ops = containerOps(null, web({
      description: "d",
      restart: "always",
      capabilities: ["net-admin"],
      environments: [{ name: "A", value: "" }],
      labels: [{ name: "app", value: "x" }],
      ports: [{ name: "http", source: "80", destination: "8080", protocol: "tcp", listen_addresses: ["10.0.0.1"] }],
      health_check: { command: "true", interval: "disable", retry: "", timeout: "" },
    }), ON);
    assert.deepEqual(ops, [
      { op: "set_name", value: "web" },
      { op: "set_name_image", value: "web,nginx:latest" },
      { op: "set_name_description", value: "web,d" },
      { op: "set_name_restart", value: "web,always" },
      { op: "set_name_capability", value: "web,net-admin" },
      { op: "set_name_network", value: "web,net1" },
      { op: "set_name_health_check_command", value: "web,true" },
      { op: "set_name_health_check_interval", value: "web,disable" },
      { op: "set_name_environment", value: "web,A" },
      { op: "set_name_environment_value", value: "web,A," },
      { op: "set_name_label", value: "web,app" },
      { op: "set_name_label_value", value: "web,app,x" },
      { op: "set_name_port", value: "web,http" },
      { op: "set_name_port_source", value: "web,http,80" },
      { op: "set_name_port_destination", value: "web,http,8080" },
      { op: "set_name_port_protocol", value: "web,http,tcp" },
      { op: "set_name_port_listen_address", value: "web,http,10.0.0.1" },
    ]);
  });

  it("emits nothing for an untouched edit", () => {
    const loaded = web({ description: "d", ports: [{ name: "p", source: "1", destination: "2", protocol: null, listen_addresses: [] }] });
    assert.deepEqual(containerOps(loaded, structuredClone(loaded), ON), []);
  });

  it("sets a changed single-value leaf without deleting it first", () => {
    const ops = containerOps(web({ memory: "512", image: "a:1" }), web({ memory: "256", image: "a:2" }), ON);
    assert.deepEqual(ops, [
      { op: "set_name_image", value: "web,a:2" },
      { op: "set_name_memory", value: "web,256" },
    ]);
  });

  it("deletes a cleared leaf and a turned-off flag", () => {
    const ops = containerOps(web({ description: "d", privileged: true }), web({ description: "  " }), ON);
    assert.deepEqual(ops, [
      { op: "delete_name_description", value: "web" },
      { op: "delete_name_privileged", value: "web" },
    ]);
  });

  it("diffs tag entries by name instead of deleting and re-setting them", () => {
    const before = web({
      ports: [
        { name: "http", source: "80", destination: "80", protocol: "tcp", listen_addresses: ["10.0.0.1", "10.0.0.2"] },
        { name: "dns", source: "53", destination: "53", protocol: null, listen_addresses: [] },
      ],
      volumes: [{ name: "data", source: "/s", destination: "/d", mode: "ro", propagation: null }],
    });
    const after = web({
      ports: [{ name: "http", source: "8080", destination: "80", protocol: "", listen_addresses: ["10.0.0.2", "10.0.0.3"] }],
      volumes: [{ name: "data", source: "/s", destination: "/d", mode: "", propagation: "private" }],
    });
    assert.deepEqual(containerOps(before, after, ON), [
      { op: "delete_name_port", value: "web,dns" },
      { op: "set_name_port_source", value: "web,http,8080" },
      { op: "delete_name_port_protocol", value: "web,http" },
      { op: "delete_name_port_listen_address", value: "web,http,10.0.0.1" },
      { op: "set_name_port_listen_address", value: "web,http,10.0.0.3" },
      { op: "delete_name_volume_mode", value: "web,data" },
      { op: "set_name_volume_propagation", value: "web,data,private" },
    ]);
  });

  it("bulk-deletes an emptied multi leaf and an emptied entry list", () => {
    const before = web({
      capabilities: ["net-admin", "sys-admin"],
      name_servers: ["1.1.1.1"],
      environments: [{ name: "A", value: "1" }],
      labels: [{ name: "x", value: "y" }],
      sysctl_params: [{ name: "kernel.x", value: "1" }],
      ports: [{ name: "p", source: "1", destination: "1", protocol: null, listen_addresses: ["10.0.0.1"] }],
      networks: [{ name: "net1", addresses: ["10.0.0.5"], mac: null }],
    });
    const after = web({
      ports: [{ name: "p", source: "1", destination: "1", protocol: null, listen_addresses: [] }],
    });
    assert.deepEqual(names(containerOps(before, after, ON)), [
      "delete_name_capabilities",
      "delete_name_name_servers",
      "delete_name_network_addresses",
      "delete_name_environments",
      "delete_name_labels",
      "delete_name_port_listen_addresses",
      "delete_name_sysctl",
    ]);
  });

  it("moves the single network attachment and switches to host networks", () => {
    const before = web({ networks: [{ name: "net1", addresses: ["10.0.0.5"], mac: "auto" }] });
    assert.deepEqual(containerOps(before, web({ networks: [{ name: "net2", addresses: [], mac: "" }] }), ON), [
      { op: "delete_name_network", value: "web,net1" },
      { op: "set_name_network", value: "web,net2" },
    ]);
    assert.deepEqual(containerOps(before, web({ networks: [], allow_host_networks: true }), ON), [
      { op: "set_name_allow_host_networks", value: "web" },
      { op: "delete_name_network", value: "web,net1" },
    ]);
  });

  it("sets and clears the attachment MAC only where the lab has it", () => {
    const before = web({ networks: [{ name: "net1", addresses: [], mac: "auto" }] });
    const after = web({ networks: [{ name: "net1", addresses: [], mac: "" }] });
    assert.deepEqual(containerOps(before, after, ON), [{ op: "delete_name_network_mac", value: "web,net1" }]);
    assert.deepEqual(containerOps(before, after, OFF), []);
  });

  it("deletes the health-check node when every field is cleared, a leaf otherwise", () => {
    const before = web({ health_check: { command: "true", interval: "30", retry: "3", timeout: null } });
    assert.deepEqual(
      containerOps(before, web({ health_check: { command: "", interval: "", retry: "", timeout: "" } }), ON),
      [{ op: "delete_name_health_check", value: "web" }],
    );
    assert.deepEqual(
      containerOps(before, web({ health_check: { command: "true", interval: "", retry: "3", timeout: "" } }), ON),
      [{ op: "delete_name_health_check_interval", value: "web" }],
    );
    // A bare loaded node with nothing typed is left alone.
    assert.deepEqual(
      containerOps(web({ health_check: { command: null, interval: null, retry: null, timeout: null } }), web({ health_check: {} }), ON),
      [],
    );
  });

  it("keeps 1.5-only leaves out of a 1.4 batch", () => {
    const ops = containerOps(null, web({
      allow_host_cgroups: true,
      stop_timeout: "10",
      log_driver: "journald",
      health_check: { command: "true" },
      tmpfs_mounts: [{ name: "t", destination: "/t", size: "1" }],
    }), OFF);
    assert.deepEqual(names(ops), ["set_name", "set_name_image", "set_name_network"]);
  });

  it("trims names so a padded row matches the stored entry", () => {
    const before = web({ environments: [{ name: "A", value: "1" }] });
    assert.deepEqual(containerOps(before, web({ environments: [{ name: " A ", value: "2" }] }), ON), [
      { op: "set_name_environment_value", value: "web,A,2" },
    ]);
  });

  it("deletes with the whole-object ops", () => {
    assert.deepEqual(containerDeleteOps("web"), [{ op: "delete_name", value: "web" }]);
    assert.deepEqual(containerRootDeleteOps(), [{ op: "delete_container_root" }]);
  });
});

describe("containerProblem", () => {
  it("checks the create name against the router regex and configured names", () => {
    assert.equal(containerNameProblem("", [])?.key, "nameRequired");
    assert.equal(containerNameProblem("-x", [])?.key, "nameInvalid");
    assert.equal(containerNameProblem("web", ["web"])?.key, "nameExists");
    assert.equal(containerNameProblem(" web2 ", ["web"]), null);
  });

  it("requires an image and exactly one of network or host networks", () => {
    assert.equal(containerProblem(null, web({ image: "" }), ctx())?.key, "imageRequired");
    assert.equal(containerProblem(null, web({ networks: [] }), ctx())?.key, "networkRequired");
    assert.equal(containerProblem(null, web({ allow_host_networks: true }), ctx())?.key, "networkAndHost");
    assert.equal(containerProblem(null, web(), ctx()), null);
  });

  it("checks value bounds with the lab ranges", () => {
    assert.deepEqual(containerProblem(null, web({ memory: "16385" }), ctx()), {
      key: "memoryRange", values: { min: 0, max: 16384 }, section: undefined,
    });
    assert.equal(containerProblem(null, web({ memory: "1.5" }), ctx())?.key, "memoryRange");
    assert.equal(containerProblem(null, web({ cpu_quota: "0.1234" }), ctx())?.key, "cpuQuotaInvalid");
    assert.equal(containerProblem(null, web({ gid: "5" }), ctx())?.key, "gidNeedsUid");
    assert.equal(containerProblem(null, web({ command: "echo \"hi\"" }), ctx())?.key, "commandInvalid");
    assert.equal(containerProblem(null, web({ stop_timeout: "61" }), ctx())?.key, "stopTimeoutRange");
    assert.equal(containerProblem(null, web({ stop_timeout: "61" }), ctx({ features: OFF })), null);
    assert.equal(
      containerProblem(null, web({ health_check: { interval: "16385" } }), ctx())?.key,
      "healthIntervalRange",
    );
    assert.equal(containerProblem(null, web({ health_check: { interval: "disable", retry: "0" } }), ctx()), null);
    // The keyword comes only from the capability list.
    assert.equal(
      containerProblem(null, web({ health_check: { interval: "disable" } }), ctx({ values: NO_KEYWORDS }))?.key,
      "healthIntervalRange",
    );
  });

  it("checks the attachment addresses, MAC and name servers", () => {
    const net = (addresses: string[], mac = "") => [{ name: "net1", addresses, mac }];
    assert.equal(containerProblem(null, web({ networks: net(["10.0.0.300"]) }), ctx())?.key, "networkAddressInvalid");
    assert.equal(containerProblem(null, web({ networks: net(["10.0.0.2", "10.0.0.3"]) }), ctx())?.key, "networkAddressFamily");
    const dual = [{ ...NET, prefixes: ["10.0.0.0/24", "fd00::/64"] }];
    assert.equal(containerProblem(null, web({ networks: net(["10.0.0.2", "fd00::2"]) }), ctx({ networks: dual })), null);
    assert.equal(containerProblem(null, web({ networks: net([], "zz") }), ctx())?.key, "macInvalid");
    assert.equal(containerProblem(null, web({ networks: net([], "auto") }), ctx()), null);
    assert.equal(containerProblem(null, web({ networks: net([], "02:00:00:00:00:01") }), ctx()), null);
    assert.equal(containerProblem(null, web({ networks: net([], "02-00-00-00-00-01") }), ctx())?.key, "macInvalid");
    assert.equal(containerProblem(null, web({ networks: net([], "auto") }), ctx({ values: NO_KEYWORDS }))?.key, "macInvalid");
    assert.equal(
      containerProblem(null, web({ name_servers: ["1.1.1.1"] }), ctx())?.key,
      "nameServerNeedsNoNameServer",
    );
    assert.equal(
      containerProblem(null, web({ name_servers: ["1.1.1.1"] }), ctx({ networks: [{ ...NET, no_name_server: true }] })),
      null,
    );
    // 1.4 commits a name-server on a network that keeps DNS on.
    assert.equal(containerProblem(null, web({ name_servers: ["1.1.1.1"] }), ctx({ rules: RULES_14 })), null);
  });

  it("keeps attachment addresses inside the network prefix of their family, off the first host", () => {
    const at = (addresses: string[], networks = [NET]) =>
      containerProblem(null, web({ networks: [{ name: "net1", addresses, mac: "" }] }), ctx({ networks, rules: RULES_14 }));
    assert.deepEqual(at(["10.0.1.5"]), {
      key: "networkAddressOutsidePrefix", values: { address: "10.0.1.5", prefix: "10.0.0.0/24" }, section: undefined,
    });
    assert.deepEqual(at(["fd00::5"]), {
      key: "networkAddressNoPrefix", values: { address: "fd00::5", network: "net1" }, section: undefined,
    });
    assert.equal(at(["10.0.0.1"])?.key, "networkAddressReserved");
    assert.equal(at(["10.0.0.0"]), null);
    assert.equal(at(["10.0.0.2"]), null);
    const v6 = [{ ...NET, prefixes: ["fd00:1::/64"] }];
    assert.equal(at(["fd00:1::1"], v6)?.key, "networkAddressReserved");
    assert.equal(at(["fd00:1::2"], v6), null);
    assert.equal(at(["fd00:2::2"], v6)?.key, "networkAddressOutsidePrefix");
    const wide = [{ ...NET, prefixes: ["172.31.0.0/16"] }];
    assert.equal(at(["172.31.0.1"], wide)?.key, "networkAddressReserved");
    assert.equal(at(["172.31.250.1"], wide), null);
  });

  it("rejects an attachment IP or MAC another container uses where the lab does", () => {
    const other = web({ name: "db", networks: [{ name: "net1", addresses: ["10.0.0.5"], mac: "02:00:00:00:00:05" }] });
    const keyword = web({ name: "cache", networks: [{ name: "net1", addresses: [], mac: "auto" }] });
    const draft = (addresses: string[], mac = "") => web({ networks: [{ name: "net1", addresses, mac }] });
    const containers = [other, keyword];
    assert.deepEqual(containerProblem(null, draft(["10.0.0.5"]), ctx({ containers })), {
      key: "networkAddressInUse", values: { address: "10.0.0.5", name: "db" }, section: undefined,
    });
    assert.deepEqual(containerProblem(null, draft([], "02:00:00:00:00:05"), ctx({ containers })), {
      key: "macInUse", values: { mac: "02:00:00:00:00:05", name: "db" }, section: undefined,
    });
    // A keyword MAC is never unique; 1.4 allows both duplicates.
    assert.equal(containerProblem(null, draft([], "auto"), ctx({ containers })), null);
    assert.equal(containerProblem(null, draft(["10.0.0.5"], "02:00:00:00:00:05"), ctx({ containers, rules: RULES_14 })), null);
    // Editing the container that owns the address is not a clash with itself.
    assert.equal(containerProblem(other, structuredClone(other), ctx({ containers })), null);
  });

  it("accepts the port-range forms the lab accepts", () => {
    const port = (source: string) => containerProblem(null, web({
      ports: [{ name: "p", source, destination: "80", protocol: null, listen_addresses: [] }],
    }), ctx())?.key ?? null;
    for (const ok of ["80", "08080", "1", "65535", "80-90", "90-90", "1-65535", "http", "ssh", "x11+tcp"]) {
      assert.equal(port(ok), null, ok);
    }
    for (const bad of ["90-80", "0", "65536", "80:90", "1-", "-1", "0-10", "10-65536", "123456-1", "8 0", "-http"]) {
      assert.equal(port(bad), "portSourceInvalid", bad);
    }
  });

  it("names the row for every per-row error", () => {
    const blank = containerProblem(null, web({ devices: [{ name: "", source: "/dev/x", destination: "" }] }), ctx());
    assert.deepEqual(blank, { key: "rowNameRequired", values: { row: 1 }, section: "devices" });
    // A blank row the user added and never filled is dropped.
    assert.equal(containerProblem(null, web({ devices: [{ name: " ", source: "", destination: "" }] }), ctx()), null);
    const dup = containerProblem(null, web({
      labels: [{ name: "a", value: "1" }, { name: "a ", value: "2" }],
    }), ctx());
    assert.deepEqual(dup, { key: "rowDuplicate", values: { name: "a" }, section: "labels" });
    assert.equal(
      containerProblem(null, web({ ports: [{ name: "a,b", source: "1", destination: "1", protocol: null, listen_addresses: [] }] }), ctx())?.key,
      "rowNameComma",
    );
    assert.deepEqual(containerProblem(null, web({ labels: [{ name: "app", value: "" }] }), ctx()), {
      key: "labelValueRequired", values: { name: "app" }, section: undefined,
    });
    assert.equal(containerProblem(null, web({ environments: [{ name: "A", value: "" }] }), ctx()), null);
    assert.equal(containerProblem(null, web({ environments: [{ name: "A.B", value: "1" }] }), ctx())?.key, "environmentNameInvalid");
    assert.equal(
      containerProblem(null, web({ ports: [{ name: "p", source: "80-70", destination: "80", protocol: null, listen_addresses: [] }] }), ctx())?.key,
      "portSourceInvalid",
    );
    assert.equal(
      containerProblem(null, web({ tmpfs_mounts: [{ name: "t", destination: "/t", size: "65536" }] }), ctx())?.key,
      "tmpfsSizeRange",
    );
    assert.equal(
      containerProblem(null, web({ volumes: [{ name: "v", source: "", destination: "/d" }] }), ctx())?.key,
      "volumeSourceRequired",
    );
    assert.equal(
      containerProblem(null, web({ networks: [], allow_host_networks: true, sysctl_params: [{ name: "net.core.x", value: "1" }] }), ctx())?.key,
      "sysctlHostNetworks",
    );
  });
});

describe("networkOps / networkProblem", () => {
  const macvlan: ContainerNetworkConfig = {
    ...NET,
    prefixes: ["10.0.0.0/24", "fd00::/64"],
    gateways: ["10.0.0.1"],
    network_type: "macvlan",
    macvlan_mode: "bridge",
    macvlan_parent: "eth0",
  };

  it("creates a network with its type and leaves", () => {
    assert.deepEqual(networkOps(null, macvlan, ON), [
      { op: "set_network", value: "net1" },
      { op: "set_network_prefix", value: "net1,10.0.0.0/24" },
      { op: "set_network_prefix", value: "net1,fd00::/64" },
      { op: "set_network_gateway", value: "net1,10.0.0.1" },
      { op: "set_network_type_macvlan", value: "net1" },
      { op: "set_network_type_macvlan_mode", value: "net1,bridge" },
      { op: "set_network_type_macvlan_parent", value: "net1,eth0" },
    ]);
  });

  it("changes the type with a type delete and the new set in one batch", () => {
    assert.deepEqual(networkOps(macvlan, { ...macvlan, network_type: "bridge" }, ON), [
      { op: "delete_network_type", value: "net1" },
      { op: "set_network_type_bridge", value: "net1" },
    ]);
    assert.deepEqual(networkOps(macvlan, { ...macvlan, macvlan_mode: "vepa" }, ON), [
      { op: "set_network_type_macvlan_mode", value: "net1,vepa" },
    ]);
  });

  it("diffs prefixes and gateways per value and bulk-deletes emptied gateways", () => {
    assert.deepEqual(networkOps(macvlan, { ...macvlan, prefixes: ["10.1.0.0/24", "fd00::/64"], gateways: [] }, ON), [
      { op: "delete_network_prefix", value: "net1,10.0.0.0/24" },
      { op: "set_network_prefix", value: "net1,10.1.0.0/24" },
      { op: "delete_network_gateways", value: "net1" },
    ]);
  });

  it("keeps gateway, MTU and type out of a 1.4 batch", () => {
    assert.deepEqual(names(networkOps(null, { ...macvlan, mtu: "1500" }, OFF)), [
      "set_network", "set_network_prefix", "set_network_prefix",
    ]);
  });

  it("checks the lab name regex, prefixes, gateways and MACVLAN", () => {
    const p = (draft: Partial<ContainerNetworkConfig>, original: ContainerNetworkConfig | null = null) =>
      networkProblem(original, { ...NET, ...draft }, {
        features: ON, existingNames: ["used"], rules: RULES_15, containers: [],
      })?.key ?? null;
    assert.equal(networkNameProblem("twelve-chars", [])?.key, "nameInvalid");
    assert.equal(networkNameProblem("a_b-1", []), null);
    assert.equal(p({ name: "used" }), "nameExists");
    assert.equal(p({ prefixes: [] }), "prefixRequired");
    assert.equal(p({ prefixes: ["10.0.0.1/24"] }), "prefixInvalid");
    assert.equal(p({ prefixes: ["fd00::1/64"] }), "prefixInvalid");
    assert.equal(p({ prefixes: ["10.0.0.0/24", "10.1.0.0/24"] }), "prefixFamily");
    assert.equal(p({ gateways: ["10.1.0.1"] }), "gatewayNotInPrefix");
    assert.equal(p({ gateways: ["fd00::1"] }), "gatewayNotInPrefix");
    assert.equal(p({ prefixes: ["10.0.0.0/24", "fd00::/64"], gateways: ["10.0.0.1", "fd00::1"] }), null);
    assert.equal(p({ mtu: "67" }), "mtuRange");
    assert.equal(p({ network_type: "macvlan", macvlan_parent: "eth0" }), "macvlanModeRequired");
    assert.equal(p({ network_type: "macvlan", macvlan_mode: "bridge", macvlan_parent: "lo" }), "macvlanParentInvalid");
    for (const parent of ["eth0", "bond0.10", "br0.10", "eth1.4094"]) {
      assert.equal(p({ network_type: "macvlan", macvlan_mode: "bridge", macvlan_parent: parent }), null, parent);
    }
    assert.equal(p({ network_type: "macvlan", macvlan_mode: "bridge", macvlan_parent: "eth0.10.20" }), "macvlanParentInvalid");
    assert.ok(MACVLAN_PARENT_TYPES.includes("vif"));
    assert.equal(p({ network_type: "macvlan", macvlan_mode: "bridge", macvlan_parent: "eth0.10", vrf: "red" }), "macvlanVrf");
    assert.deepEqual(networkDeleteOps("net1"), [{ op: "delete_network", value: "net1" }]);
  });

  it("keeps an edit from breaking the containers attached to the network", () => {
    const loaded = { ...NET, no_name_server: true };
    const dns = web({ name: "dns", name_servers: ["1.1.1.1"], networks: [{ name: "net1", addresses: ["10.0.0.5"], mac: null }] });
    const elsewhere = web({ name: "x", name_servers: ["1.1.1.1"], networks: [{ name: "net2", addresses: [], mac: null }] });
    const check = (draft: Partial<ContainerNetworkConfig>, rules = RULES_15, containers = [dns, elsewhere]) =>
      networkProblem(loaded, { ...loaded, ...draft }, { features: ON, existingNames: [], rules, containers });
    assert.deepEqual(check({ no_name_server: false }), {
      key: "noNameServerInUse", values: { name: "dns" }, section: undefined,
    });
    assert.equal(check({ no_name_server: false }, RULES_14), null);
    assert.equal(check({ no_name_server: false }, RULES_15, [elsewhere]), null);
    assert.deepEqual(check({ prefixes: ["10.1.0.0/24"] }), {
      key: "prefixInUse", values: { name: "dns", address: "10.0.0.5" }, section: undefined,
    });
    assert.equal(check({ prefixes: ["10.0.0.0/16"] }), null);
  });
});

describe("registryOps / registryProblem", () => {
  const loaded: ContainerRegistry = {
    name: "docker.io",
    disabled: false,
    insecure: false,
    authentication: { username: "u", password: MASKED_SECRET },
    mirror: null,
  };
  const rp = (original: ContainerRegistry | null, draft: ContainerRegistry) =>
    registryProblem(original, draft, { features: ON, values: VALUES, existingNames: ["quay.io"] })?.key ?? null;

  it("never sends the mask and sets a typed password", () => {
    assert.deepEqual(registryOps(loaded, structuredClone(loaded), ON), []);
    assert.deepEqual(registryOps(loaded, { ...loaded, authentication: { username: "u", password: "new" } }, ON), [
      { op: "set_registry_auth_password", value: "docker.io,new" },
    ]);
  });

  it("clears both auth fields with the parent delete and rejects a one-sided clear", () => {
    const cleared = { ...loaded, authentication: { username: "", password: "" } };
    assert.deepEqual(registryOps(loaded, cleared, ON), [{ op: "delete_registry_auth", value: "docker.io" }]);
    assert.equal(rp(loaded, { ...loaded, authentication: { username: "", password: MASKED_SECRET } }), "authBoth");
    assert.equal(rp(null, { ...loaded, name: "r.example", authentication: { username: "u", password: MASKED_SECRET } }), "passwordMask");
    assert.equal(rp(loaded, { ...loaded, authentication: { username: "u", password: "x".repeat(513) } }), "passwordInvalid");
  });

  it("turns a bare mirror on, edits its leaves and removes it", () => {
    const bare = { ...loaded, mirror: { address: null, host_name: null, path: null, port: null } };
    assert.deepEqual(registryOps(loaded, bare, ON), [{ op: "set_registry_mirror", value: "docker.io" }]);
    assert.deepEqual(registryOps(bare, { ...bare, mirror: { address: "10.0.0.9", port: "5000" } }, ON), [
      { op: "set_registry_mirror_address", value: "docker.io,10.0.0.9" },
      { op: "set_registry_mirror_port", value: "docker.io,5000" },
    ]);
    assert.deepEqual(registryOps(bare, loaded, ON), [{ op: "delete_registry_mirror", value: "docker.io" }]);
    assert.deepEqual(registryOps(loaded, bare, OFF), []);
  });

  it("checks the registry name and mirror rules", () => {
    assert.equal(rp(null, { ...loaded, name: "quay.io" }), "nameExists");
    assert.equal(rp(null, { ...loaded, name: "bad name" }), "nameInvalid");
    const m = (mirror: ContainerRegistry["mirror"]) => rp(loaded, { ...loaded, mirror });
    assert.equal(m({ address: "10.0.0.9", host_name: "m.example.com" }), "mirrorExclusive");
    assert.equal(m({ path: "v2" }), "mirrorPathInvalid");
    assert.equal(m({ port: "0" }), "mirrorPortRange");
    assert.equal(m({ host_name: "m.example.com", path: "/v2", port: "5000" }), null);
    assert.equal(m({ host_name: "mirror" }), null);
    assert.equal(m({ host_name: "m-1.example." }), null);
    assert.equal(m({ host_name: "-mirror" }), "mirrorHostNameInvalid");
    assert.equal(m({ host_name: "mirror_1" }), "mirrorHostNameInvalid");
    assert.deepEqual(registryDeleteOps("docker.io"), [{ op: "delete_registry", value: "docker.io" }]);
  });
});

describe("containerService", () => {
  function stub() {
    const sent: BatchOperation[][] = [];
    const service = Object.create(containerService) as typeof containerService;
    service.batchConfigure = async (operations: BatchOperation[]) => {
      if (operations.length > 0) sent.push(operations);
      return { success: true };
    };
    return { service, sent };
  }

  it("posts nothing for an untouched save and the diff otherwise", async () => {
    const { service, sent } = stub();
    const loaded = web({ description: "d" });
    await service.saveContainer(loaded, structuredClone(loaded), ON);
    assert.deepEqual(sent, []);
    await service.saveContainer(loaded, web({ description: " e " }), ON);
    await service.saveRegistry(
      { name: "r", disabled: false, insecure: false, authentication: { username: "u", password: MASKED_SECRET }, mirror: null },
      { name: "r", disabled: false, insecure: false, authentication: { username: " v ", password: MASKED_SECRET }, mirror: null },
      ON,
    );
    await service.deleteContainerRoot();
    assert.deepEqual(sent, [
      [{ op: "set_name_description", value: "web,e" }],
      [{ op: "set_registry_auth_username", value: "r,v" }],
      [{ op: "delete_container_root" }],
    ]);
  });
});

describe("removableVolumeDirs", () => {
  it("keeps a dropped path that equals, contains or sits inside an in-use path", () => {
    assert.deepEqual(
      removableVolumeDirs(
        [
          "/config/containers/web",
          "/config/containers/db/",
          "/config/containers/shared/data",
          "/config/containers/old/",
          "/config/containers/old",
          "/config/containers/",
          "/srv/data",
        ],
        ["/config/containers/web/cfg", "/config/containers/db", "/config/containers/shared/"],
      ),
      ["/config/containers/old"],
    );
  });

  it("removes nothing when the in-use list covers every candidate", () => {
    assert.deepEqual(removableVolumeDirs(["/config/containers/a"], [" /config/containers/a/ "]), []);
    assert.deepEqual(removableVolumeDirs(["/config/containers/a"], ["/config/containers/ab"]), ["/config/containers/a"]);
  });

  it("treats the host root and unnormalized spellings as overlapping", () => {
    assert.deepEqual(removableVolumeDirs(["/config/containers/a"], ["/"]), []);
    assert.deepEqual(removableVolumeDirs(["/config/containers/web"], ["/config//containers/web/data"]), []);
    assert.deepEqual(removableVolumeDirs(["/config/containers/web"], ["/config/containers/./web"]), []);
    assert.deepEqual(removableVolumeDirs(["/config/containers/web"], ["/config/containers/x/../web/db"]), []);
    assert.deepEqual(removableVolumeDirs(["/config/containers/../web"], []), []);
    assert.deepEqual(removableVolumeDirs(["/config//containers/old/"], [""]), ["/config/containers/old"]);
  });
});
