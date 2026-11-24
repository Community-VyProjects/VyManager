import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASKED_SECRET,
  serviceMonitoringService,
  type BatchOperation,
  type NetworkEventConfig,
  type TelegrafInfluxDB,
  type TelegrafLoki,
  type TelegrafPrometheusClient,
  type ZabbixConfig,
} from "./service-monitoring";

function stubbed(): { service: typeof serviceMonitoringService; sent: BatchOperation[][] } {
  const sent: BatchOperation[][] = [];
  const service = Object.create(serviceMonitoringService) as typeof serviceMonitoringService;
  service.batchConfigure = async (operations: BatchOperation[]) => {
    sent.push(operations);
    return { success: true };
  };
  return { service, sent };
}

function zabbix(overrides: Partial<ZabbixConfig> = {}): ZabbixConfig {
  return {
    host_name: null,
    port: null,
    listen_addresses: [],
    directory: null,
    timeout: null,
    servers: ["192.0.2.9"],
    servers_active: [],
    authentication: { mode: null, psk_id: null, psk_secret: null },
    limits: { buffer_flush_interval: null, buffer_size: null },
    log: { debug_level: null, size: null, remote_commands: false },
    ...overrides,
  };
}

const influx: TelegrafInfluxDB = {
  url: "https://influx.example",
  port: null,
  bucket: null,
  authentication: { token: MASKED_SECRET, organization: "ops" },
};

describe("required secrets", () => {
  it("keep the stored token when the field is blank and never delete it", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafInfluxDB(influx, {
      ...influx,
      authentication: { token: null, organization: "ops" },
    });
    assert.deepEqual(sent, []);
  });

  it("set a typed token and skip a typed mask", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafInfluxDB(influx, {
      ...influx,
      authentication: { token: "T-new", organization: "ops" },
    });
    await service.saveTelegrafInfluxDB(influx, {
      ...influx,
      authentication: { token: MASKED_SECRET, organization: "ops" },
    });
    assert.deepEqual(sent, [[{ op: "set_telegraf_influxdb_auth_token", value: "T-new" }]]);
  });
});

describe("loki authentication", () => {
  const loki: TelegrafLoki = {
    url: "https://loki.example",
    port: null,
    metric_name_label: null,
    authentication: { username: "u1", password: MASKED_SECRET },
  };

  it("deletes the authentication node when both leaves are cleared", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafLoki(loki, {
      ...loki,
      authentication: { username: null, password: null },
    });
    assert.deepEqual(sent, [[{ op: "delete_telegraf_loki_auth" }]]);
  });

  it("keeps the stored password and sets a new username", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafLoki(loki, {
      ...loki,
      authentication: { username: "u2", password: null },
    });
    assert.deepEqual(sent, [[{ op: "set_telegraf_loki_auth_username", value: "u2" }]]);
  });

  it("deletes the authentication node when only the username is cleared", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafLoki(loki, {
      ...loki,
      authentication: { username: null, password: null },
    });
    await service.saveTelegrafLoki(loki, {
      ...loki,
      authentication: { username: "", password: MASKED_SECRET },
    });
    assert.deepEqual(sent, [
      [{ op: "delete_telegraf_loki_auth" }],
      [{ op: "delete_telegraf_loki_auth" }],
    ]);
  });
});

describe("telegraf general settings", () => {
  const general = {
    sources: ["system"],
    vrf: null,
    frr_metrics: false,
    global_tags: [{ name: "site", value: "dc1" }, { name: "env", value: "prod" }],
  };

  it("diffs global tags by name and sets a changed value without deleting it", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafSources(general, {
      ...general,
      global_tags: [{ name: "site", value: "dc2,rack 4" }, { name: "role", value: "edge" }],
    });
    await service.saveTelegrafSources(general, { ...general, global_tags: [] });
    assert.deepEqual(sent, [
      [
        { op: "delete_telegraf_global_tag", value: "env" },
        { op: "set_telegraf_global_tag", value: "site,dc2,rack 4" },
        { op: "set_telegraf_global_tag", value: "role,edge" },
      ],
      [{ op: "delete_telegraf_all_global_tags" }],
    ]);
  });

  it("toggles frr-metrics", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafSources(general, { ...general, frr_metrics: true });
    await service.saveTelegrafSources({ ...general, frr_metrics: true }, general);
    assert.deepEqual(sent, [
      [{ op: "set_telegraf_frr_metrics" }],
      [{ op: "delete_telegraf_frr_metrics" }],
    ]);
  });
});

describe("prometheus client", () => {
  const client: TelegrafPrometheusClient = {
    port: null,
    listen_address: "127.0.0.1",
    metric_version: null,
    allow_from: [],
    authentication: { username: "u1", password: MASKED_SECRET },
  };

  it("emits the listen address and treats the masked password as unchanged", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafPrometheusClient(client, { ...client, listen_address: "::1" });
    await service.saveTelegrafPrometheusClient(client, { ...client, listen_address: null });
    assert.deepEqual(sent, [
      [{ op: "set_telegraf_prometheus_client_listen_address", value: "::1" }],
      [{ op: "delete_telegraf_prometheus_client_listen_address" }],
    ]);
  });

  it("deletes a cleared optional password", async () => {
    const { service, sent } = stubbed();
    await service.saveTelegrafPrometheusClient(client, {
      ...client,
      authentication: { username: "u1", password: null },
    });
    assert.deepEqual(sent, [[{ op: "delete_telegraf_prometheus_client_auth_password" }]]);
  });
});

describe("zabbix", () => {
  const psk = zabbix({
    authentication: { mode: "pre-shared-secret", psk_id: "id1", psk_secret: MASKED_SECRET },
    servers_active: [{ address: "192.0.2.10", port: null }, { address: "192.0.2.11", port: 10051 }],
  });

  it("deletes the authentication node when the mode is cleared, even with the masked secret", async () => {
    const { service, sent } = stubbed();
    await service.saveZabbix(psk, {
      ...psk,
      authentication: { mode: null, psk_id: null, psk_secret: null },
    });
    assert.deepEqual(sent, [[{ op: "delete_zabbix_auth" }]]);
  });

  it("keeps the masked PSK secret and sets a changed id", async () => {
    const { service, sent } = stubbed();
    await service.saveZabbix(psk, {
      ...psk,
      authentication: { mode: "pre-shared-secret", psk_id: "id2", psk_secret: MASKED_SECRET },
    });
    assert.deepEqual(sent, [[{ op: "set_zabbix_auth_psk_id", value: "id2" }]]);
  });

  it("deletes each cleared leaf alone and keeps the rest", async () => {
    const { service, sent } = stubbed();
    await service.saveZabbix(psk, {
      ...psk,
      authentication: { mode: null, psk_id: "id1", psk_secret: MASKED_SECRET },
    });
    await service.saveZabbix(psk, {
      ...psk,
      authentication: { mode: "pre-shared-secret", psk_id: "id1", psk_secret: null },
    });
    await service.saveZabbix(psk, {
      ...psk,
      authentication: { mode: "pre-shared-secret", psk_id: "id1", psk_secret: "T-new" },
    });
    assert.deepEqual(sent, [
      [{ op: "delete_zabbix_auth_mode" }],
      [{ op: "delete_zabbix_auth_psk_secret" }],
      [{ op: "set_zabbix_auth_psk_secret", value: "T-new" }],
    ]);
  });

  it("leaves a stored PSK with no mode alone on an unrelated save", async () => {
    const { service, sent } = stubbed();
    const orphan = zabbix({ authentication: { mode: null, psk_id: "id1", psk_secret: MASKED_SECRET } });
    await service.saveZabbix(orphan, { ...orphan, host_name: "probe" });
    assert.deepEqual(sent, [[{ op: "set_zabbix_host_name", value: "probe" }]]);
  });

  it("sets and deletes the VRF", async () => {
    const { service, sent } = stubbed();
    await service.saveZabbix(psk, { ...psk, vrf: "MGMT" });
    await service.saveZabbix({ ...psk, vrf: "MGMT" }, { ...psk, vrf: null });
    assert.deepEqual(sent, [
      [{ op: "set_zabbix_vrf", value: "MGMT" }],
      [{ op: "delete_zabbix_vrf" }],
    ]);
  });

  it("deletes every active server at once when the list is emptied", async () => {
    const { service, sent } = stubbed();
    await service.saveZabbix(psk, { ...psk, servers_active: [] });
    assert.deepEqual(sent, [[{ op: "delete_zabbix_all_server_active" }]]);
  });
});

describe("presence on create", () => {
  it("writes the bare node when a create sets no leaf", async () => {
    const { service, sent } = stubbed();
    const base = { port: null, listen_addresses: [], vrf: null };
    await service.savePrometheusNodeExporter(null, { ...base, textfile_collector: false });
    await service.savePrometheusFrrExporter(null, {
      ...base, collectors: [], bgp_options: [], bgp_peer_description: null, ospf_instances: [],
    });
    await service.savePrometheusBlackboxExporter(null, { ...base, icmp_modules: [], dns_modules: [] });
    await service.saveBlackboxICMPModule(null, {
      name: "ping", preferred_ip_protocol: null, ip_protocol_fallback: false, timeout: null,
    });
    await service.saveNetworkEvent(null, { log_level: null, queue_size: null, events: [] });
    await service.saveTelegrafPrometheusClient(null, {
      port: null, listen_address: null, metric_version: null, allow_from: [],
      authentication: { username: null, password: null },
    });
    assert.deepEqual(sent, [
      [{ op: "set_prometheus_node_exporter" }],
      [{ op: "set_prometheus_frr_exporter" }],
      [{ op: "set_prometheus_blackbox_exporter" }],
      [{ op: "set_prometheus_blackbox_icmp_module", value: "ping" }],
      [{ op: "set_network_event" }],
      [{ op: "set_telegraf_prometheus_client" }],
    ]);
  });
});

describe("frr exporter collectors", () => {
  const frr = {
    port: null,
    listen_addresses: [],
    vrf: null,
    collectors: ["pim"],
    bgp_options: ["peer-type"],
    bgp_peer_description: "json",
    ospf_instances: ["1", "2"],
  };

  it("diffs collectors, bgp options, peer description and OSPF instances", async () => {
    const { service, sent } = stubbed();
    await service.savePrometheusFrrExporter(frr, {
      ...frr,
      collectors: ["bgp-l2-vpn"],
      bgp_options: ["peer-type", "peer-group"],
      bgp_peer_description: null,
      ospf_instances: ["2", "3"],
    });
    await service.savePrometheusFrrExporter(frr, { ...frr, ospf_instances: [] });
    assert.deepEqual(sent, [
      [
        { op: "delete_prometheus_frr_exporter_collector", value: "pim" },
        { op: "set_prometheus_frr_exporter_collector", value: "bgp-l2-vpn" },
        { op: "set_prometheus_frr_exporter_bgp_option", value: "peer-group" },
        { op: "delete_prometheus_frr_exporter_bgp_peer_description" },
        { op: "delete_prometheus_frr_exporter_ospf_instance", value: "1" },
        { op: "set_prometheus_frr_exporter_ospf_instance", value: "3" },
      ],
      [{ op: "delete_prometheus_frr_exporter_all_ospf_instances" }],
    ]);
  });

  it("deletes telegraf frr-metrics in the same batch as the exporter", async () => {
    const { service, sent } = stubbed();
    await service.deletePrometheusFrrExporter(true);
    await service.deletePrometheus(true);
    assert.deepEqual(sent, [
      [{ op: "delete_telegraf_frr_metrics" }, { op: "delete_prometheus_frr_exporter" }],
      [{ op: "delete_telegraf_frr_metrics" }, { op: "delete_prometheus" }],
    ]);
  });
});

describe("network event", () => {
  const events: NetworkEventConfig = { log_level: null, queue_size: null, events: ["addr", "link"] };

  it("deletes the event node when every event is removed", async () => {
    const { service, sent } = stubbed();
    await service.saveNetworkEvent(events, { ...events, events: [] });
    await service.saveNetworkEvent(events, { ...events, events: ["link", "route"] });
    assert.deepEqual(sent, [
      [{ op: "delete_network_event_all_events" }],
      [
        { op: "delete_network_event_event", value: "addr" },
        { op: "set_network_event_event", value: "route" },
      ],
    ]);
  });
});

describe("whole-section deletes", () => {
  it("emit the parent delete ops", async () => {
    const { service, sent } = stubbed();
    await service.deleteServiceMonitoring();
    await service.deleteTelegraf();
    await service.deletePrometheus();
    assert.deepEqual(sent, [
      [{ op: "delete_service_monitoring" }],
      [{ op: "delete_telegraf" }],
      [{ op: "delete_prometheus" }],
    ]);
  });

  it("skips the POST when nothing changed", async () => {
    const { service, sent } = stubbed();
    const result = await service.saveTelegrafInfluxDB(influx, {
      ...influx,
      authentication: { token: null, organization: "ops" },
    });
    assert.deepEqual(result, { success: true });
    assert.deepEqual(sent, []);
  });
});
