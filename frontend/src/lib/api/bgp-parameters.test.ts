import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bgpService, type BgpParameters } from "./bgp";

function params(bestpath: Partial<BgpParameters["bestpath"]> = {}, flags: Partial<BgpParameters> = {}): BgpParameters {
  return {
    router_id: null,
    cluster_id: null,
    default_local_pref: null,
    minimum_holdtime: null,
    labeled_unicast: null,
    log_neighbor_changes: false,
    always_compare_med: false,
    deterministic_med: false,
    ebgp_requires_policy: false,
    graceful_shutdown: false,
    no_client_to_client_reflection: false,
    no_fast_external_failover: false,
    allow_martian_nexthop: false,
    disable_ebgp_connected_route_check: false,
    fast_convergence: false,
    network_import_check: false,
    reject_as_sets: false,
    route_reflector_allow_outbound_policy: false,
    suppress_fib_pending: false,
    shutdown: false,
    no_hard_administrative_reset: false,
    no_suppress_duplicates: false,
    no_ipv6_auto_ra: false,
    bestpath: {
      as_path_confed: false,
      as_path_ignore: false,
      as_path_multipath_relax: false,
      bandwidth: null,
      compare_routerid: false,
      med: null,
      peer_type_multipath_relax: false,
      ...bestpath,
    },
    dampening: { half_life: null, re_use: null, start_suppress_time: null, max_suppress_time: null },
    confederation: { identifier: null, peers: null },
    distance_global: { external: null, internal: null, local: null },
    graceful_restart_stalepath_time: null,
    conditional_advertisement_timer: null,
    tcp_keepalive: { idle: null, interval: null, probes: null },
    as_notation: null,
    input_queue_limit: null,
    output_queue_limit: null,
    update_delay_establish_wait: null,
    update_delay_max_delay: null,
    ...flags,
  };
}

async function sent(current: BgpParameters, updated: BgpParameters): Promise<unknown[]> {
  const calls: unknown[] = [];
  const service = Object.create(bgpService) as typeof bgpService;
  service.batchConfigure = async (request) => {
    calls.push(request.operations);
    return { success: true };
  };
  const result = await service.saveParameters(current, updated);
  if (calls.length === 0) return result.success ? [] : ["failed"];
  return calls[0] as unknown[];
}

describe("bgp saveParameters bestpath", () => {
  it("sets bandwidth and does not delete the value it replaces", async () => {
    assert.deepEqual(
      await sent(params(), params({ bandwidth: " ignore " })),
      [{ op: "set_parameters_bestpath_bandwidth", value: "ignore" }],
    );
    assert.deepEqual(
      await sent(params({ bandwidth: "ignore" }), params({ bandwidth: "skip-missing" })),
      [{ op: "set_parameters_bestpath_bandwidth", value: "skip-missing" }],
    );
  });

  it("deletes only bandwidth when a sibling bestpath leaf remains", async () => {
    assert.deepEqual(
      await sent(
        params({ bandwidth: "ignore", compare_routerid: true }),
        params({ compare_routerid: true }),
      ),
      [{ op: "delete_parameters_bestpath_bandwidth" }],
    );
  });

  it("sets and deletes med values without dropping the one that stays", async () => {
    assert.deepEqual(
      await sent(params(), params({ med: ["missing-as-worst", "confed"] })),
      [
        { op: "set_parameters_bestpath_med", value: "confed" },
        { op: "set_parameters_bestpath_med", value: "missing-as-worst" },
      ],
    );
    assert.deepEqual(
      await sent(
        params({ med: ["confed", "missing-as-worst"] }),
        params({ med: ["  confed  "] }),
      ),
      [{ op: "delete_parameters_bestpath_med", value: "missing-as-worst" }],
    );
  });

  it("deletes the bestpath node when every leaf is cleared", async () => {
    assert.deepEqual(
      await sent(
        params({ bandwidth: "ignore", med: ["confed"], as_path_ignore: true }),
        params(),
      ),
      [{ op: "delete_parameters_bestpath" }],
    );
  });

  it("does not emit for padded, blank, or reordered values", async () => {
    assert.deepEqual(
      await sent(
        params({ bandwidth: "ignore", med: ["confed", "missing-as-worst"] }),
        params({ bandwidth: " ignore ", med: ["missing-as-worst", " confed ", ""] }),
      ),
      [],
    );
  });

  it("emits the no-hard-administrative-reset flag", async () => {
    assert.deepEqual(
      await sent(params(), params({}, { no_hard_administrative_reset: true })),
      [{ op: "set_parameters_no_hard_administrative_reset" }],
    );
    assert.deepEqual(
      await sent(params({}, { no_hard_administrative_reset: true }), params()),
      [{ op: "delete_parameters_no_hard_administrative_reset" }],
    );
  });
});
