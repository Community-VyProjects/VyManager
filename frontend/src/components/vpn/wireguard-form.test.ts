import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WireGuardInterface, WireGuardPeer } from "@/lib/api/wireguard";
import {
  buildInterfaceCreateConfig,
  buildInterfaceUpdateConfig,
  buildPeerCreateConfig,
  buildPeerUpdateConfig,
  interfaceDraftFrom,
  peerDraftFrom,
  validateInterfaceCreate,
  validatePeer,
  type InterfaceDraft,
  type PeerDraft,
} from "./wireguard-form";

const storedInterface: WireGuardInterface = {
  name: "wg0",
  description: "Main tunnel",
  addresses: ["10.0.0.1/24"],
  port: "51820",
  private_key: "***",
  mtu: "1420",
  per_client_thread: false,
  mss_clamping: null,
  disabled: false,
  peers: [],
  peer_count: 0,
};

const storedPeer: WireGuardPeer = {
  name: "laptop",
  public_key: "PUBKEY",
  preshared_key: "***",
  allowed_ips: ["10.0.0.2/32"],
  address: "203.0.113.1",
  port: "51820",
  persistent_keepalive: "25",
  description: "Work laptop",
  disabled: false,
  host_name: null,
};

const emptyInterfaceDraft: InterfaceDraft = {
  name: "",
  description: "",
  addresses: "",
  port: "",
  privateKey: "",
  mtu: "",
  perClientThread: false,
  mssClamping: "off",
  mssCustomValue: "",
  disabled: false,
};

const emptyPeerDraft: PeerDraft = {
  name: "",
  publicKey: "",
  allowedIps: "",
  presharedKey: "",
  address: "",
  port: "",
  persistentKeepalive: "",
  description: "",
  disabled: false,
  hostName: "",
};

describe("validateInterfaceCreate", () => {
  it("rejects a name already used by another interface", () => {
    const draft = { ...emptyInterfaceDraft, name: "wg0", privateKey: "KEY" };
    assert.equal(
      validateInterfaceCreate(draft, ["wg0"]),
      "Interface wg0 already exists",
    );
  });

  it("rejects a name that is not wgN", () => {
    const draft = { ...emptyInterfaceDraft, name: "tun0", privateKey: "KEY" };
    assert.equal(
      validateInterfaceCreate(draft, []),
      "Interface name must be in format 'wg0', 'wg1', etc.",
    );
  });

  it("requires a private key", () => {
    const draft = { ...emptyInterfaceDraft, name: "wg1" };
    assert.equal(
      validateInterfaceCreate(draft, []),
      "Private key is required. Use 'Generate Key' to create one.",
    );
  });

  it("accepts a fresh name with a key", () => {
    const draft = { ...emptyInterfaceDraft, name: "wg1", privateKey: "KEY" };
    assert.equal(validateInterfaceCreate(draft, ["wg0"]), null);
  });
});

describe("buildInterfaceCreateConfig", () => {
  it("omits untouched optional fields instead of sending empty values", () => {
    const draft = { ...emptyInterfaceDraft, name: "wg1", privateKey: "KEY" };
    assert.deepEqual(buildInterfaceCreateConfig(draft, true), {
      name: "wg1",
      private_key: "KEY",
    });
  });

  it("never emits a null, so create cannot delete a leaf", () => {
    const draft: InterfaceDraft = {
      ...emptyInterfaceDraft,
      name: "wg1",
      privateKey: "KEY",
      addresses: "10.0.0.1/24, fd00::1/64",
      port: "51820",
      mtu: "1420",
      mssClamping: "auto",
      disabled: true,
    };
    const config = buildInterfaceCreateConfig(draft, true);
    assert.deepEqual(config, {
      name: "wg1",
      private_key: "KEY",
      addresses: ["10.0.0.1/24", "fd00::1/64"],
      port: "51820",
      mtu: "1420",
      mss_clamping: "clamp-mss-to-pmtu",
    });
    assert.equal(Object.values(config).includes(null), false);
    // create_interface has no disable op, so the draft flag must not leak.
    assert.equal("disabled" in config, false);
  });

  it("drops per-client-thread when the device does not support it", () => {
    const draft = {
      ...emptyInterfaceDraft,
      name: "wg1",
      privateKey: "KEY",
      perClientThread: true,
    };
    assert.equal("per_client_thread" in buildInterfaceCreateConfig(draft, false), false);
    assert.equal(buildInterfaceCreateConfig(draft, true).per_client_thread, true);
  });
});

describe("buildInterfaceUpdateConfig", () => {
  it("sends nothing when the operator changed nothing", () => {
    assert.equal(
      buildInterfaceUpdateConfig(interfaceDraftFrom(storedInterface), storedInterface),
      null,
    );
  });

  it("sends only the changed field", () => {
    const draft = { ...interfaceDraftFrom(storedInterface), port: "51821" };
    assert.deepEqual(buildInterfaceUpdateConfig(draft, storedInterface), {
      port: "51821",
    });
  });

  it("deletes a cleared field with null", () => {
    const draft = { ...interfaceDraftFrom(storedInterface), description: "" };
    assert.deepEqual(buildInterfaceUpdateConfig(draft, storedInterface), {
      description: null,
    });
  });

  it("does not resend the masked private key", () => {
    const draft = { ...interfaceDraftFrom(storedInterface), mtu: "1400" };
    const updated = buildInterfaceUpdateConfig(draft, storedInterface);
    assert.equal(updated?.private_key, undefined);
    assert.equal(updated?.mtu, "1400");
  });

  it("sends a replaced private key", () => {
    const draft = { ...interfaceDraftFrom(storedInterface), privateKey: "NEWKEY" };
    assert.deepEqual(buildInterfaceUpdateConfig(draft, storedInterface), {
      private_key: "NEWKEY",
    });
  });

  it("round-trips a custom MSS value without reporting a change", () => {
    const custom = { ...storedInterface, mss_clamping: "1380" };
    const draft = interfaceDraftFrom(custom);
    assert.equal(draft.mssClamping, "custom");
    assert.equal(draft.mssCustomValue, "1380");
    assert.equal(buildInterfaceUpdateConfig(draft, custom), null);
  });

  it("sends the disable flag when the operator toggles it", () => {
    const draft = { ...interfaceDraftFrom(storedInterface), disabled: true };
    assert.deepEqual(buildInterfaceUpdateConfig(draft, storedInterface), {
      disabled: true,
    });
  });
});

describe("validatePeer", () => {
  it("accepts an edit of a peer under its own stored name", () => {
    assert.equal(
      validatePeer(peerDraftFrom(storedPeer), {
        isCreate: false,
        existingPeerNames: ["laptop", "phone"],
      }),
      null,
    );
  });

  it("rejects a create that reuses an existing peer name", () => {
    assert.equal(
      validatePeer(peerDraftFrom(storedPeer), {
        isCreate: true,
        existingPeerNames: ["laptop", "phone"],
      }),
      "Peer 'laptop' already exists on this interface",
    );
  });

  it("rejects a create with a blank or spaced name", () => {
    const base = { ...emptyPeerDraft, publicKey: "K", allowedIps: "10.0.0.2/32" };
    assert.equal(
      validatePeer(base, { isCreate: true, existingPeerNames: [] }),
      "Peer name is required",
    );
    assert.equal(
      validatePeer({ ...base, name: "my laptop" }, { isCreate: true, existingPeerNames: [] }),
      "Peer name cannot contain spaces",
    );
  });

  it("checks required fields in both modes", () => {
    const noKey = { ...peerDraftFrom(storedPeer), publicKey: "" };
    const noIps = { ...peerDraftFrom(storedPeer), allowedIps: "" };
    for (const isCreate of [true, false]) {
      assert.equal(
        validatePeer(noKey, { isCreate, existingPeerNames: [] }),
        "Public key is required",
      );
      assert.equal(
        validatePeer(noIps, { isCreate, existingPeerNames: [] }),
        "At least one allowed IP is required",
      );
    }
  });
});

describe("buildPeerCreateConfig", () => {
  it("omits untouched optional fields and never emits a null", () => {
    const draft = {
      ...emptyPeerDraft,
      name: "phone",
      publicKey: "PUB",
      allowedIps: "10.0.0.3/32",
    };
    const config = buildPeerCreateConfig(draft);
    assert.deepEqual(config, {
      name: "phone",
      public_key: "PUB",
      allowed_ips: ["10.0.0.3/32"],
    });
    assert.equal(Object.values(config).includes(null), false);
  });

  it("carries every optional field the operator filled in", () => {
    const draft: PeerDraft = {
      name: "phone",
      publicKey: "PUB",
      allowedIps: "10.0.0.3/32, 192.168.1.0/24",
      presharedKey: "PSK",
      address: "203.0.113.9",
      port: "51820",
      persistentKeepalive: "25",
      description: "Phone",
      disabled: true,
      hostName: "vpn.example.com",
    };
    assert.deepEqual(buildPeerCreateConfig(draft), {
      name: "phone",
      public_key: "PUB",
      allowed_ips: ["10.0.0.3/32", "192.168.1.0/24"],
      preshared_key: "PSK",
      address: "203.0.113.9",
      port: "51820",
      persistent_keepalive: "25",
      description: "Phone",
      disabled: true,
      host_name: "vpn.example.com",
    });
  });
});

describe("buildPeerUpdateConfig", () => {
  it("sends nothing when the operator changed nothing", () => {
    assert.equal(buildPeerUpdateConfig(peerDraftFrom(storedPeer), storedPeer), null);
  });

  it("sends only the changed field", () => {
    const draft = { ...peerDraftFrom(storedPeer), persistentKeepalive: "30" };
    assert.deepEqual(buildPeerUpdateConfig(draft, storedPeer), {
      persistent_keepalive: "30",
    });
  });

  it("deletes a cleared endpoint with null", () => {
    const draft = { ...peerDraftFrom(storedPeer), address: "" };
    assert.deepEqual(buildPeerUpdateConfig(draft, storedPeer), { address: null });
  });

  it("does not resend the masked preshared key", () => {
    const draft = { ...peerDraftFrom(storedPeer), description: "Updated" };
    const updated = buildPeerUpdateConfig(draft, storedPeer);
    assert.equal(updated?.preshared_key, undefined);
    assert.equal(updated?.description, "Updated");
  });

  it("clears the preshared key when the operator empties the field", () => {
    const draft = { ...peerDraftFrom(storedPeer), presharedKey: "" };
    assert.deepEqual(buildPeerUpdateConfig(draft, storedPeer), {
      preshared_key: null,
    });
  });

  it("replaces allowed IPs as a whole list", () => {
    const draft = { ...peerDraftFrom(storedPeer), allowedIps: "10.0.0.2/32, 10.0.1.0/24" };
    assert.deepEqual(buildPeerUpdateConfig(draft, storedPeer), {
      allowed_ips: ["10.0.0.2/32", "10.0.1.0/24"],
    });
  });
});
