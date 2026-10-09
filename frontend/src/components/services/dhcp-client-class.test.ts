import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { clientClassOperations, duplicateClassName } from "./dhcp-client-class";

const stored = {
  name: "LAN",
  disable: true,
  circuit_id: "ge-0",
  remote_id: "aa",
};

describe("clientClassOperations", () => {
  it("deletes cleared relay fields on the existing class", () => {
    const ops = clientClassOperations(
      { name: "LAN", disable: false, circuitId: "", remoteId: "", originalName: "LAN" },
      stored,
    );
    assert.deepEqual(ops.map((op) => op.op), [
      "set_client_class",
      "delete_client_class_disable",
      "delete_client_class_circuit_id",
      "delete_client_class_remote_id",
    ]);
    assert.ok(ops.every((op) => op.value === "LAN" || op.value?.startsWith("LAN|")));
  });

  it("does not delete relay fields on the new name when the class is renamed", () => {
    const ops = clientClassOperations(
      { name: "WAN", disable: false, circuitId: "", remoteId: "bb", originalName: "LAN" },
      stored,
    );
    assert.deepEqual(ops, [
      { op: "delete_client_class", value: "LAN" },
      { op: "set_client_class", value: "WAN" },
      { op: "set_client_class_remote_id", value: "WAN|bb" },
    ]);
    assert.equal(ops.some((op) => op.op.startsWith("delete_client_class_")), false);
  });

  it("rejects a rename onto a class that already exists", () => {
    assert.equal(
      duplicateClassName("WAN", [{ name: "LAN" }, { name: "WAN" }], "LAN"),
      "A client class with that name already exists",
    );
    assert.equal(duplicateClassName("LAN", [{ name: "LAN" }], "LAN"), null);
    assert.equal(duplicateClassName("NEW", [{ name: "LAN" }], null), null);
  });

  it("the modal rejects a taken name before it saves", () => {
    const text = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "DHCPClientClassModal.tsx"),
      "utf8",
    );
    const call = text.indexOf("duplicateClassName(");
    const save = text.indexOf("batchConfigure(");
    assert.notEqual(call, -1);
    assert.ok(call < save);
    assert.ok(text.indexOf("return;", call) < save);
  });
});
