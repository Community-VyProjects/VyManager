import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FieldSpec } from "@/components/vrf/schema/types";
import {
  MASKED_SECRET,
  buildSchemaOps,
  initialSchemaValue,
  schemaFieldKey,
  schemaSecretProblem,
  type SchemaRaw,
  type SchemaValue,
} from "./vrf-schema-save-ops";

const PASSWORD: FieldSpec = {
  op: "vrf_bgp_neighbor_password",
  label: "Password",
  type: "text",
  secret: true,
  path: ["password"],
};
const DESCRIPTION: FieldSpec = {
  op: "vrf_bgp_neighbor_description",
  label: "Description",
  type: "text",
  path: ["description"],
};
const FIELDS = [PASSWORD, DESCRIPTION];
const PREFIX = ["BLUE", "192.0.2.2"];

function initial(raw: SchemaRaw): Record<string, SchemaValue> {
  return Object.fromEntries(FIELDS.map((f) => [schemaFieldKey(f), initialSchemaValue(f, raw)]));
}

function edit(raw: SchemaRaw, password: string, description?: string) {
  const before = initial(raw);
  const values = { ...before, [schemaFieldKey(PASSWORD)]: password };
  if (description !== undefined) values[schemaFieldKey(DESCRIPTION)] = description;
  return {
    problem: schemaSecretProblem(FIELDS, before, values),
    ops: buildSchemaOps(FIELDS, PREFIX, before, values),
  };
}

const STORED: SchemaRaw = { password: MASKED_SECRET, description: "peer" };

describe("VRF schema secret fields", () => {
  it("loads the masked secret as the mask", () => {
    assert.equal(initial(STORED)[schemaFieldKey(PASSWORD)], MASKED_SECRET);
    assert.equal(initial({})[schemaFieldKey(PASSWORD)], "");
  });

  it("skips an unchanged mask while another field changes", () => {
    const { problem, ops } = edit(STORED, MASKED_SECRET, "core");
    assert.equal(problem, null);
    assert.deepEqual(ops, [{ op: "set_vrf_bgp_neighbor_description", value: "BLUE,192.0.2.2,core" }]);
  });

  it("sets a new secret, trimmed", () => {
    const { problem, ops } = edit(STORED, "  s3cret,x ");
    assert.equal(problem, null);
    assert.deepEqual(ops, [{ op: "set_vrf_bgp_neighbor_password", value: "BLUE,192.0.2.2,s3cret,x" }]);
  });

  it("deletes a cleared secret by name only", () => {
    const { problem, ops } = edit(STORED, "   ");
    assert.equal(problem, null);
    assert.deepEqual(ops, [{ op: "delete_vrf_bgp_neighbor_password", value: "BLUE,192.0.2.2" }]);
  });

  it("rejects a typed mask on an unset or a stored secret", () => {
    assert.equal(edit({}, MASKED_SECRET).problem, PASSWORD);
    assert.equal(edit(STORED, ` ${MASKED_SECRET} `).problem, PASSWORD);
  });

  it("emits nothing for blank input on an unset leaf", () => {
    const { problem, ops } = edit({}, "  ", "  ");
    assert.equal(problem, null);
    assert.deepEqual(ops, []);
  });

  it("does not treat a mask in a non-secret field as a problem", () => {
    const before = initial({});
    const values = { ...before, [schemaFieldKey(DESCRIPTION)]: MASKED_SECRET };
    assert.equal(schemaSecretProblem(FIELDS, before, values), null);
  });
});
