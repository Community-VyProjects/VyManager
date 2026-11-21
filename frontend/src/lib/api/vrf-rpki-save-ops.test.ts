import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RPKI_RANGES,
  buildVrfRpkiSaveOps,
  deleteVrfRpkiOps,
  enableVrfRpkiOps,
  vrfRpkiFields,
  vrfRpkiProblem,
  type VrfRpkiCacheFields,
  type VrfRpkiFields,
} from "./vrf-rpki-save-ops";
import { vrfService, type VrfBatchOperation, type VrfRpkiConfig } from "./vrf";

const VRF = "blue";

function cache(partial: Partial<VrfRpkiCacheFields> = {}): VrfRpkiCacheFields {
  return {
    name: "192.0.2.10",
    port: "3323",
    preference: "1",
    sourceAddress: "",
    sshUsername: "",
    sshKey: "",
    ...partial,
  };
}

function fields(partial: Partial<VrfRpkiFields> = {}): VrfRpkiFields {
  return { expire: "", polling: "", retry: "", caches: [], ...partial };
}

const LOADED: VrfRpkiConfig = {
  caches: [
    {
      name: "192.0.2.10",
      port: 3323,
      preference: 1,
      source_address: "192.0.2.1",
      ssh: { key: "K1", username: "rpki" },
    },
  ],
  expire_interval: 7200,
  polling_period: null,
  retry_interval: 600,
};

describe("vrfRpkiFields", () => {
  it("reads the typed config response", () => {
    assert.deepEqual(vrfRpkiFields(LOADED), {
      expire: "7200",
      polling: "",
      retry: "600",
      caches: [cache({ sourceAddress: "192.0.2.1", sshUsername: "rpki", sshKey: "K1" })],
    });
    assert.deepEqual(vrfRpkiFields(null), fields());
  });
});

describe("buildVrfRpkiSaveOps", () => {
  it("emits nothing for an untouched save", () => {
    const loaded = vrfRpkiFields(LOADED);
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, loaded, vrfRpkiFields(LOADED)), []);
  });

  it("sets a changed leaf and deletes only a cleared one", () => {
    const loaded = vrfRpkiFields(LOADED);
    const edited = vrfRpkiFields(LOADED);
    edited.expire = " 9000 ";
    edited.polling = "300";
    edited.retry = "";
    edited.caches[0].sourceAddress = "";
    edited.caches[0].preference = "2";
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, loaded, edited), [
      { op: "set_vrf_rpki_expire_interval", value: "blue,9000" },
      { op: "set_vrf_rpki_polling_period", value: "blue,300" },
      { op: "delete_vrf_rpki_retry_interval", value: "blue" },
      { op: "set_vrf_rpki_cache_preference", value: "blue,192.0.2.10,2" },
      { op: "delete_vrf_rpki_cache_source_address", value: "blue,192.0.2.10" },
    ]);
  });

  it("creates a new cache and deletes a removed one in one batch", () => {
    const loaded = vrfRpkiFields(LOADED);
    const edited = fields({
      expire: "7200",
      retry: "600",
      caches: [cache({ name: " rpki.example.net ", port: "8282", preference: "3" })],
    });
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, loaded, edited), [
      { op: "delete_vrf_rpki_cache", value: "blue,192.0.2.10" },
      { op: "set_vrf_rpki_cache", value: "blue,rpki.example.net" },
      { op: "set_vrf_rpki_cache_port", value: "blue,rpki.example.net,8282" },
      { op: "set_vrf_rpki_cache_preference", value: "blue,rpki.example.net,3" },
    ]);
  });

  it("drops a blank row the user never filled", () => {
    const edited = fields({ caches: [cache({ name: "", port: "", preference: "" })] });
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, fields(), edited), []);
  });

  it("clears SSH by deleting its parent", () => {
    const loaded = vrfRpkiFields(LOADED);
    const edited = vrfRpkiFields(LOADED);
    edited.caches[0].sshKey = "";
    edited.caches[0].sshUsername = " ";
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, loaded, edited), [
      { op: "delete_vrf_rpki_cache_ssh", value: "blue,192.0.2.10" },
    ]);
  });

  it("replaces one SSH leaf with a set and adds SSH to a cache", () => {
    const loaded = vrfRpkiFields(LOADED);
    const edited = vrfRpkiFields(LOADED);
    edited.caches[0].sshUsername = "other";
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, loaded, edited), [
      { op: "set_vrf_rpki_cache_ssh_username", value: "blue,192.0.2.10,other" },
    ]);
    const plain = fields({ caches: [cache()] });
    const withSsh = fields({ caches: [cache({ sshUsername: "rpki", sshKey: "K1" })] });
    assert.deepEqual(buildVrfRpkiSaveOps(VRF, plain, withSsh), [
      { op: "set_vrf_rpki_cache_ssh_username", value: "blue,192.0.2.10,rpki" },
      { op: "set_vrf_rpki_cache_ssh_key", value: "blue,192.0.2.10,K1" },
    ]);
  });

  it("enable and remove act on the RPKI root", () => {
    assert.deepEqual(enableVrfRpkiOps(VRF), [{ op: "set_vrf_rpki", value: "blue" }]);
    assert.deepEqual(deleteVrfRpkiOps(VRF), [{ op: "delete_vrf_rpki", value: "blue" }]);
  });
});

describe("vrfRpkiProblem", () => {
  it("accepts a valid edit", () => {
    assert.equal(vrfRpkiProblem(vrfRpkiFields(LOADED)), null);
    assert.equal(vrfRpkiProblem(fields({ caches: [cache({ name: "", port: "", preference: "" })] })), null);
  });

  it("requires a name on a row that holds data", () => {
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ name: " " })] })), { key: "cacheNameRequired" });
  });

  it("rejects duplicate names after trim and a comma in a name", () => {
    assert.deepEqual(
      vrfRpkiProblem(fields({ caches: [cache(), cache({ name: " 192.0.2.10 " })] })),
      { key: "cacheNameDuplicate", name: "192.0.2.10" },
    );
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ name: "a,b" })] })), {
      key: "cacheNameComma",
      name: "a,b",
    });
  });

  it("requires port and preference, which the lab commit needs", () => {
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ port: " " })] })), {
      key: "portRequired",
      name: "192.0.2.10",
    });
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ preference: "" })] })), {
      key: "preferenceRequired",
      name: "192.0.2.10",
    });
  });

  it("requires both SSH leaves or neither", () => {
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ sshUsername: "rpki" })] })), {
      key: "sshIncomplete",
      name: "192.0.2.10",
    });
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ sshKey: "K1" })] })), {
      key: "sshIncomplete",
      name: "192.0.2.10",
    });
  });

  it("checks the lab ranges", () => {
    const { min, max } = RPKI_RANGES.expire;
    assert.deepEqual(vrfRpkiProblem(fields({ expire: String(min - 1) })), { key: "range", field: "expire", min, max });
    assert.deepEqual(vrfRpkiProblem(fields({ retry: "7201" })), {
      key: "range",
      field: "retry",
      ...RPKI_RANGES.retry,
    });
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ port: "65536" })] })), {
      key: "range",
      field: "port",
      ...RPKI_RANGES.port,
      name: "192.0.2.10",
    });
    assert.deepEqual(vrfRpkiProblem(fields({ caches: [cache({ preference: "1.5" })] })), {
      key: "range",
      field: "preference",
      ...RPKI_RANGES.preference,
      name: "192.0.2.10",
    });
    assert.equal(vrfRpkiProblem(fields({ expire: String(max), polling: "86400" })), null);
  });
});

describe("vrfService RPKI methods", () => {
  function stub() {
    const sent: VrfBatchOperation[][] = [];
    const service = Object.create(vrfService) as typeof vrfService;
    service.batchConfigure = async (operations: VrfBatchOperation[]) => {
      sent.push(operations);
      return { success: true };
    };
    return { service, sent };
  }

  it("skips the request when nothing changed", async () => {
    const { service, sent } = stub();
    assert.equal(await service.saveRpki(VRF, vrfRpkiFields(LOADED), vrfRpkiFields(LOADED)), null);
    assert.deepEqual(sent, []);
  });

  it("sends padded values trimmed", async () => {
    const { service, sent } = stub();
    const edited = vrfRpkiFields(LOADED);
    edited.caches[0].sshKey = " K2 ";
    edited.caches[0].port = "3323 ";
    await service.saveRpki(VRF, vrfRpkiFields(LOADED), edited);
    assert.deepEqual(sent, [[{ op: "set_vrf_rpki_cache_ssh_key", value: "blue,192.0.2.10,K2" }]]);
  });

  it("enable and remove post the root op", async () => {
    const { service, sent } = stub();
    await service.enableRpki(VRF);
    await service.deleteRpki(VRF);
    assert.deepEqual(sent, [
      [{ op: "set_vrf_rpki", value: "blue" }],
      [{ op: "delete_vrf_rpki", value: "blue" }],
    ]);
  });
});
