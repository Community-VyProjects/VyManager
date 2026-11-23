import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  afiFamily,
  BMP_MIRROR_BUFFER_RANGE,
  BMP_TARGET_RANGES,
  canonicalPrefix,
  firstRangeProblem,
  inRange,
  isIPv4Address,
  isIPAddress,
  isNetworkPrefix,
  labeledUnicastConflict,
  NEIGHBOR_AF_RANGES,
  NEIGHBOR_RANGES,
  numberText,
  OVERVIEW_RANGES,
  PARAMETERS_RANGES,
  parametersProblem,
  PEER_GROUP_RANGES,
  peerGroupMembersOf,
  peerProblem,
  REDISTRIBUTE_METRIC_RANGE,
  remoteAsNumber,
  sameNeighborAddress,
} from "./bgp-ranges.ts";

const EMPTY = {
  ebgpMultihop: "",
  ttlSecurityHops: "",
  port: "",
  advertisementInterval: "",
  connect: "",
  keepalive: "",
  holdtime: "",
  bfdHoldTime: "",
  localAs: "",
  remoteAs: "",
};

const EMPTY_PARAMS = {
  defaultLocalPref: "",
  inputQueueLimit: "",
  outputQueueLimit: "",
  updateDelayEstablishWait: "",
  updateDelayMaxDelay: "",
  distanceExternal: "",
  distanceInternal: "",
  distanceLocal: "",
};

describe("BGP ranges", () => {
  it("accepts empty values and the lab bounds", () => {
    assert.equal(firstRangeProblem(EMPTY, NEIGHBOR_RANGES), null);
    assert.equal(
      firstRangeProblem(
        {
          ebgpMultihop: "255",
          ttlSecurityHops: "1",
          port: "65535",
          advertisementInterval: "0",
          connect: "0",
          keepalive: "1",
          holdtime: "0",
          bfdHoldTime: "4294967295",
          localAs: "4294967294",
          remoteAs: "4294967294",
        },
        NEIGHBOR_RANGES,
      ),
      null,
    );
  });

  it("rejects values outside the lab range or that are not whole numbers", () => {
    assert.equal(firstRangeProblem({ ...EMPTY, ebgpMultihop: "256" }, NEIGHBOR_RANGES)?.field, "ebgpMultihop");
    assert.equal(firstRangeProblem({ ...EMPTY, ttlSecurityHops: "255" }, NEIGHBOR_RANGES)?.field, "ttlSecurityHops");
    assert.equal(firstRangeProblem({ ...EMPTY, port: "0" }, NEIGHBOR_RANGES)?.field, "port");
    assert.equal(firstRangeProblem({ ...EMPTY, advertisementInterval: "601" }, NEIGHBOR_RANGES)?.field, "advertisementInterval");
    assert.equal(firstRangeProblem({ ...EMPTY, keepalive: "0" }, NEIGHBOR_RANGES)?.field, "keepalive");
    assert.equal(firstRangeProblem({ ...EMPTY, holdtime: "1e3" }, NEIGHBOR_RANGES)?.field, "holdtime");
    assert.equal(firstRangeProblem({ ...EMPTY, bfdHoldTime: "0" }, NEIGHBOR_RANGES)?.field, "bfdHoldTime");
    assert.equal(firstRangeProblem({ ...EMPTY, localAs: "4294967295" }, NEIGHBOR_RANGES)?.field, "localAs");
    assert.deepEqual(firstRangeProblem({ ...EMPTY, connect: "-1" }, NEIGHBOR_RANGES)?.range, { min: 0, max: 65535 });
    assert.equal(
      firstRangeProblem({ ebgpMultihop: "", ttlSecurityHops: "", bfdHoldTime: "1.5", localAs: "", remoteAs: "" }, PEER_GROUP_RANGES)?.field,
      "bfdHoldTime",
    );
    assert.equal(
      firstRangeProblem({ ebgpMultihop: "", ttlSecurityHops: "", bfdHoldTime: "", localAs: "0", remoteAs: "" }, PEER_GROUP_RANGES)?.field,
      "localAs",
    );
    assert.equal(firstRangeProblem({ systemAs: "", keepalive: "65536", holdtime: "" }, OVERVIEW_RANGES)?.field, "keepalive");
    assert.equal(firstRangeProblem({ systemAs: "4294967295", keepalive: "", holdtime: "" }, OVERVIEW_RANGES)?.field, "systemAs");
  });

  it("checks the neighbor address-family numbers", () => {
    assert.equal(firstRangeProblem({ maximumPrefix: "1", allowasIn: "10", weight: "65535" }, NEIGHBOR_AF_RANGES), null);
    assert.equal(firstRangeProblem({ maximumPrefix: "", allowasIn: "11", weight: "" }, NEIGHBOR_AF_RANGES)?.field, "allowasIn");
    assert.equal(firstRangeProblem({ maximumPrefix: "", allowasIn: "", weight: "0" }, NEIGHBOR_AF_RANGES)?.field, "weight");
    assert.equal(firstRangeProblem({ maximumPrefix: "NaN", allowasIn: "", weight: "" }, NEIGHBOR_AF_RANGES)?.field, "maximumPrefix");
  });

  it("checks the page parameters, redistribute metric and BMP numbers", () => {
    assert.equal(firstRangeProblem(EMPTY_PARAMS, PARAMETERS_RANGES), null);
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, defaultLocalPref: "0" }, PARAMETERS_RANGES), null);
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, distanceInternal: "256" }, PARAMETERS_RANGES)?.field, "distanceInternal");
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, inputQueueLimit: "0" }, PARAMETERS_RANGES)?.field, "inputQueueLimit");
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, updateDelayEstablishWait: "3601" }, PARAMETERS_RANGES)?.field, "updateDelayEstablishWait");
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, updateDelayMaxDelay: "0" }, PARAMETERS_RANGES), null);
    assert.equal(firstRangeProblem({ ...EMPTY_PARAMS, distanceLocal: numberText(1.5) }, PARAMETERS_RANGES)?.field, "distanceLocal");
    assert.equal(numberText(null), "");
    assert.equal(inRange("0", REDISTRIBUTE_METRIC_RANGE), false);
    assert.equal(inRange("4294967295", REDISTRIBUTE_METRIC_RANGE), true);
    assert.equal(inRange("4294967295", BMP_MIRROR_BUFFER_RANGE), false);
    assert.equal(firstRangeProblem({ port: "", minRetry: "99", maxRetry: "" }, BMP_TARGET_RANGES)?.field, "minRetry");
    assert.equal(firstRangeProblem({ port: "", minRetry: "", maxRetry: "4294967295" }, BMP_TARGET_RANGES), null);
    assert.equal(firstRangeProblem({ port: "65536", minRetry: "", maxRetry: "" }, BMP_TARGET_RANGES)?.field, "port");
  });

  it("applies the lab verify rules across parameter leaves", () => {
    const none = { distanceExternal: null, distanceInternal: null, distanceLocal: null, updateDelayEstablishWait: null, updateDelayMaxDelay: null };
    assert.equal(parametersProblem(none), null);
    assert.equal(parametersProblem({ ...none, distanceExternal: 20, distanceInternal: 200, distanceLocal: 200 }), null);
    assert.equal(parametersProblem({ ...none, distanceExternal: 20 }), "distanceIncomplete");
    assert.equal(parametersProblem({ ...none, updateDelayMaxDelay: 0 }), null);
    assert.equal(parametersProblem({ ...none, updateDelayEstablishWait: 10 }), "updateDelayNeedsMaxDelay");
    assert.equal(parametersProblem({ ...none, updateDelayEstablishWait: 10, updateDelayMaxDelay: 5 }), "updateDelayEstablishTooLarge");
    assert.equal(parametersProblem({ ...none, updateDelayEstablishWait: 10, updateDelayMaxDelay: 10 }), null);
  });

  it("applies the lab verify rules across neighbor and peer-group leaves", () => {
    const base = { localAs: "", systemAs: "65000", remoteAs: "", ebgpMultihop: "", ttlSecurityHops: "", overrideCapability: false, password: "" };
    const peer = { address: "192.0.2.1", peerGroup: "", peerGroupRemoteAs: null, memberRemoteAs: [] };
    const n = { ...base, remoteAs: "65001" };
    assert.equal(peerProblem(base), null);
    assert.equal(peerProblem({ ...base, localAs: "65000" }), "localAsIsSystemAs");
    assert.equal(peerProblem({ ...n, localAs: "65001", neighbor: peer }), "localAsIsRemoteAs");
    assert.equal(peerProblem({ ...base, localAs: "65001" }), null);
    assert.equal(peerProblem({ ...base, ebgpMultihop: "2", ttlSecurityHops: "1" }), "multihopWithTtl");
    assert.equal(peerProblem({ ...base, overrideCapability: true, strictCapabilityMatch: true }), "overrideWithStrict");
    assert.equal(peerProblem({ ...base, password: "a b" }), "passwordWhitespace");
    assert.equal(peerProblem({ ...base, password: " ab " }), null);
    assert.equal(peerProblem({ ...base, neighbor: peer }), "remoteAsRequired");
    assert.equal(peerProblem({ ...base, neighbor: { ...peer, peerGroup: "PG" } }), "remoteAsRequired");
    assert.equal(peerProblem({ ...base, neighbor: { ...peer, peerGroup: "PG", peerGroupRemoteAs: "65002" } }), null);
    assert.equal(peerProblem({ ...n, neighbor: { ...peer, peerGroup: "PG", peerGroupRemoteAs: "65002" } }), "remoteAsOverridesPeerGroup");
    // Interface neighbors take remote-as and peer-group under the interface node.
    assert.equal(peerProblem({ ...base, neighbor: { ...peer, address: "eth0" } }), null);
    assert.equal(peerProblem({ ...n, neighbor: { ...peer, address: "eth0" } }), "interfaceRemoteAs");
    assert.equal(peerProblem({ ...base, neighbor: { ...peer, address: "eth0", peerGroup: "PG" } }), "interfaceRemoteAs");
    // Local-AS is allowed only for eBGP peers.
    assert.equal(peerProblem({ ...base, remoteAs: "65000", localAs: "65009", neighbor: peer }), "localAsNeedsEbgp");
    assert.equal(peerProblem({ ...base, localAs: "65009", neighbor: { ...peer, peerGroup: "PG", peerGroupRemoteAs: "65000" } }), "localAsNeedsEbgp");
    assert.equal(peerProblem({ ...base, remoteAs: "internal", localAs: "65009", neighbor: peer }), null);
    assert.equal(peerProblem({ ...base, remoteAs: "65000", localAs: "65009" }), "localAsNeedsEbgp");
    // Peer-group members must be all internal or all external.
    const member = { ...peer, peerGroup: "PG" };
    assert.equal(peerProblem({ ...n, neighbor: { ...member, memberRemoteAs: ["65002", null] } }), null);
    assert.equal(peerProblem({ ...n, neighbor: { ...member, memberRemoteAs: ["internal"] } }), "peerGroupMixed");
    assert.equal(peerProblem({ ...n, neighbor: { ...member, memberRemoteAs: ["65000"] } }), "peerGroupMixed");
    assert.equal(peerProblem({ ...base, remoteAs: "internal", neighbor: { ...member, memberRemoteAs: ["65000"] } }), null);
    // A peer group's members.
    assert.equal(peerProblem({ ...n, members: [{ address: "192.0.2.1", remoteAs: null, localAs: null }] }), null);
    assert.equal(peerProblem({ ...n, members: [{ address: "192.0.2.1", remoteAs: "65003", localAs: null }] }), "memberOverridesRemoteAs");
    assert.equal(peerProblem({ ...base, members: [{ address: "192.0.2.1", remoteAs: null, localAs: null }] }), "memberNeedsRemoteAs");
    assert.equal(peerProblem({ ...base, members: [{ address: "192.0.2.1", remoteAs: "65003", localAs: null }] }), null);
    assert.equal(peerProblem({ ...base, members: [{ address: "eth0", remoteAs: null, localAs: null }] }), null);
    assert.equal(peerProblem({ ...base, remoteAs: "65000", members: [{ address: "192.0.2.1", remoteAs: null, localAs: "65010" }] }), "memberLocalAsNeedsEbgp");
    assert.equal(peerProblem({ ...n, members: [{ address: "192.0.2.1", remoteAs: null, localAs: "65010" }] }), null);
    assert.equal(peerProblem({ ...base, remoteAs: "internal", members: [{ address: "192.0.2.1", remoteAs: null, localAs: "65010" }] }), null);
    assert.deepEqual(
      peerGroupMembersOf([
        { address: "192.0.2.1", remote_as: null, peer_group: "PG", local_as: { asn: null } },
        { address: "192.0.2.2", remote_as: "65003", peer_group: null, local_as: { asn: null } },
        { address: "192.0.2.3", remote_as: "65004", peer_group: "PG", local_as: { asn: "65010" } },
      ]),
      { PG: [{ address: "192.0.2.1", remoteAs: null, localAs: null }, { address: "192.0.2.3", remoteAs: "65004", localAs: "65010" }] },
    );
    assert.equal(labeledUnicastConflict(["ipv4-unicast", "ipv6-labeled-unicast"]), null);
    assert.equal(labeledUnicastConflict(["ipv4-unicast", "ipv4-labeled-unicast"]), "IPv4");
    assert.equal(labeledUnicastConflict(new Set(["ipv6-unicast", "ipv6-labeled-unicast"])), "IPv6");
    assert.equal(remoteAsNumber("65001"), "65001");
    assert.equal(remoteAsNumber("internal"), "");
    assert.equal(firstRangeProblem({ ...EMPTY, remoteAs: remoteAsNumber("4294967295") }, NEIGHBOR_RANGES)?.field, "remoteAs");
    assert.equal(firstRangeProblem({ ebgpMultihop: "", ttlSecurityHops: "", bfdHoldTime: "", localAs: "", remoteAs: remoteAsNumber("0") }, PEER_GROUP_RANGES)?.field, "remoteAs");
    assert.equal(firstRangeProblem({ ...EMPTY, remoteAs: remoteAsNumber("external") }, NEIGHBOR_RANGES), null);
  });

  it("accepts only network prefixes the lab ipaddrcheck accepts", () => {
    assert.equal(isNetworkPrefix("10.0.0.0/24", "ipv4"), true);
    assert.equal(isNetworkPrefix("0.0.0.0/0", "ipv4"), true);
    assert.equal(isNetworkPrefix("10.0.0.1/24", "ipv4"), false);
    assert.equal(isNetworkPrefix("010.0.0.0/24", "ipv4"), false);
    assert.equal(isNetworkPrefix("10.0.0.0", "ipv4"), false);
    assert.equal(isNetworkPrefix("10.0.0.0/33", "ipv4"), false);
    assert.equal(isNetworkPrefix("2001:db8::/32", "ipv4"), false);
    assert.equal(isNetworkPrefix("2001:db8::/32", "ipv6"), true);
    assert.equal(isNetworkPrefix("::/0", "ipv6"), true);
    assert.equal(isNetworkPrefix("2001:db8::1/32", "ipv6"), false);
    assert.equal(isNetworkPrefix("2001:db8::/129", "ipv6"), false);
    assert.equal(isNetworkPrefix("2001:db8::", "ipv6"), false);
    assert.equal(isNetworkPrefix("10.0.0.0/24", "ipv6"), false);
    assert.equal(afiFamily("ipv6-unicast"), "ipv6");
    assert.equal(afiFamily("ipv4-multicast"), "ipv4");
  });

  it("accepts only addresses the lab ipaddrcheck accepts", () => {
    assert.equal(isIPAddress("192.0.2.1"), true);
    assert.equal(isIPAddress("2001:db8::1"), true);
    assert.equal(isIPAddress("192.0.2.01"), false);
    assert.equal(isIPAddress("fe80::1%eth0"), false);
    assert.equal(isIPAddress("foo.bar"), false);
    assert.equal(isIPAddress("eth0"), false);
    assert.equal(isIPv4Address("10.0.0.1"), true);
    assert.equal(isIPv4Address("10.0.0.01"), false);
    assert.equal(isIPv4Address("2001:db8::1"), false);
  });

  it("treats other spellings of one address or prefix as the same", () => {
    assert.equal(sameNeighborAddress("2001:DB8::1", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress("2001:db8:0::1", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress("2001:0db8::0001", "2001:db8::1"), true);
    assert.equal(sameNeighborAddress(" 192.0.2.1 ", "192.0.2.1"), true);
    assert.equal(sameNeighborAddress("192.0.2.1", "192.0.2.2"), false);
    assert.equal(canonicalPrefix("2001:DB8:0::/32"), canonicalPrefix("2001:db8::/32"));
    assert.notEqual(canonicalPrefix("10.0.0.0/24"), canonicalPrefix("10.0.0.0/25"));
  });
});
