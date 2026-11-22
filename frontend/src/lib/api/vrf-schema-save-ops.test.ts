import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as bgpEntities from "@/components/vrf/schema/bgpEntities";
import * as dhcpEntities from "@/components/vrf/schema/dhcpEntities";
import * as dhcpv6Entities from "@/components/vrf/schema/dhcpv6Entities";
import * as isisEntities from "@/components/vrf/schema/isisEntities";
import * as ospfEntities from "@/components/vrf/schema/ospfEntities";
import * as ospfv3Entities from "@/components/vrf/schema/ospfv3Entities";
import * as schemas from "@/components/vrf/schema/schemas";
import type { EntityGroupSpec, FieldSpec, SectionSpec } from "@/components/vrf/schema/types";
import {
  MASKED_SECRET,
  SECRET_OPS,
  buildSchemaOps,
  initialSchemaValue,
  schemaFieldKey,
  schemaSecretProblem,
  type SchemaRaw,
  type SchemaValue,
} from "./vrf-schema-save-ops";

function initial(fields: FieldSpec[], raw: SchemaRaw): Record<string, SchemaValue> {
  return Object.fromEntries(fields.map((f) => [schemaFieldKey(f), initialSchemaValue(f, raw)]));
}

function save(fields: FieldSpec[], raw: SchemaRaw, edits: Record<string, SchemaValue>, prefix: string[]) {
  const before = initial(fields, raw);
  const values = { ...before, ...edits };
  return {
    problem: schemaSecretProblem(fields, before, values),
    ops: buildSchemaOps(fields, prefix, before, values),
  };
}

const PASSWORD: FieldSpec = { op: "vrf_bgp_neighbor_password", label: "Password", type: "text", path: ["password"] };
const DESCRIPTION: FieldSpec = { op: "vrf_bgp_neighbor_description", label: "Description", type: "text", path: ["description"] };
const NEIGHBOR = [PASSWORD, DESCRIPTION];
const PEER = ["BLUE", "192.0.2.2"];
const STORED: SchemaRaw = { password: MASKED_SECRET, description: "peer" };

describe("VRF schema secret fields", () => {
  it("loads the masked secret as the mask", () => {
    assert.equal(initial(NEIGHBOR, STORED)[PASSWORD.op], MASKED_SECRET);
    assert.equal(initial(NEIGHBOR, {})[PASSWORD.op], "");
  });

  it("skips an unchanged mask while another field changes", () => {
    const { problem, ops } = save(NEIGHBOR, STORED, { [DESCRIPTION.op]: "core" }, PEER);
    assert.equal(problem, null);
    assert.deepEqual(ops, [{ op: "set_vrf_bgp_neighbor_description", value: "BLUE,192.0.2.2,core" }]);
  });

  it("treats a padded mask on a stored secret as unchanged", () => {
    const { problem, ops } = save(NEIGHBOR, STORED, { [PASSWORD.op]: ` ${MASKED_SECRET} ` }, PEER);
    assert.equal(problem, null);
    assert.deepEqual(ops, []);
  });

  it("sets a new secret, trimmed", () => {
    const { problem, ops } = save(NEIGHBOR, STORED, { [PASSWORD.op]: "  s3cret,x " }, PEER);
    assert.equal(problem, null);
    assert.deepEqual(ops, [{ op: "set_vrf_bgp_neighbor_password", value: "BLUE,192.0.2.2,s3cret,x" }]);
  });

  it("deletes a cleared secret by name only", () => {
    const { problem, ops } = save(NEIGHBOR, STORED, { [PASSWORD.op]: "   " }, PEER);
    assert.equal(problem, null);
    assert.deepEqual(ops, [{ op: "delete_vrf_bgp_neighbor_password", value: "BLUE,192.0.2.2" }]);
  });

  it("rejects a typed mask on an unset secret", () => {
    assert.equal(save(NEIGHBOR, {}, { [PASSWORD.op]: MASKED_SECRET }, PEER).problem, PASSWORD);
    assert.equal(save(NEIGHBOR, {}, { [PASSWORD.op]: ` ${MASKED_SECRET}` }, PEER).problem, PASSWORD);
  });

  it("does not treat a mask in a non-secret field as a problem", () => {
    assert.equal(save(NEIGHBOR, {}, { [DESCRIPTION.op]: MASKED_SECRET }, PEER).problem, null);
  });

  it("emits nothing for blank input on unset leaves", () => {
    assert.deepEqual(save(NEIGHBOR, {}, { [PASSWORD.op]: "  ", [DESCRIPTION.op]: " " }, PEER).ops, []);
  });
});

describe("VRF schema op order and list compare", () => {
  const MD5: FieldSpec = {
    op: "vrf_isis_interface_password_md5",
    delOp: "vrf_isis_interface_password",
    label: "Password MD5",
    type: "text",
    path: ["password", "md5"],
  };
  const PLAIN: FieldSpec = {
    op: "vrf_isis_interface_password_plaintext_password",
    delOp: "vrf_isis_interface_password",
    label: "Password plaintext",
    type: "text",
    path: ["password", "plaintext-password"],
  };

  it("runs a shared parent delete before the new set", () => {
    const raw = { password: { "plaintext-password": MASKED_SECRET } };
    const { problem, ops } = save([MD5, PLAIN], raw, { [MD5.op]: "newkey", [PLAIN.op]: "" }, ["BLUE", "eth1"]);
    assert.equal(problem, null);
    assert.deepEqual(ops, [
      { op: "delete_vrf_isis_interface_password", value: "BLUE,eth1" },
      { op: "set_vrf_isis_interface_password_md5", value: "BLUE,eth1,newkey" },
    ]);
  });

  const NAME_SERVER: FieldSpec = {
    op: "vrf_dhcp_subnet_option",
    args: ["name-server"],
    label: "name-server",
    type: "list",
    listClearAll: true,
    path: ["option", "name-server"],
  };

  it("emits nothing for an equal list in a new array", () => {
    const raw = { option: { "name-server": ["192.0.2.53"] } };
    const before = initial([NAME_SERVER], raw);
    const values = { [schemaFieldKey(NAME_SERVER)]: ["192.0.2.53"] };
    assert.deepEqual(buildSchemaOps([NAME_SERVER], ["BLUE", "LAN", "10.0.0.0/24"], before, values), []);
    assert.deepEqual(buildSchemaOps([NAME_SERVER], ["BLUE"], initial([NAME_SERVER], {}), { [schemaFieldKey(NAME_SERVER)]: [] }), []);
  });

  it("clears and re-adds a changed clear-all list, delete first", () => {
    const raw = { option: { "name-server": ["192.0.2.53"] } };
    const { ops } = save([NAME_SERVER], raw, { [schemaFieldKey(NAME_SERVER)]: ["192.0.2.53", "192.0.2.54"] }, ["B", "N", "S"]);
    assert.deepEqual(ops, [
      { op: "delete_vrf_dhcp_subnet_option", value: "B,N,S,name-server" },
      { op: "set_vrf_dhcp_subnet_option", value: "B,N,S,name-server,192.0.2.53" },
      { op: "set_vrf_dhcp_subnet_option", value: "B,N,S,name-server,192.0.2.54" },
    ]);
  });
});

function sectionFields(sections: SectionSpec[]): FieldSpec[] {
  return sections.flatMap((s) => s.fields);
}

function groupFields(group: EntityGroupSpec): FieldSpec[] {
  return [...sectionFields(group.schema), ...(group.children ?? []).flatMap(groupFields)];
}

function allFields(): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const mod of [bgpEntities, dhcpEntities, dhcpv6Entities, isisEntities, ospfEntities, ospfv3Entities, schemas]) {
    for (const value of Object.values(mod) as unknown[]) {
      if (Array.isArray(value)) out.push(...sectionFields(value as SectionSpec[]));
      else if (value && typeof value === "object" && "schema" in value) out.push(...groupFields(value as EntityGroupSpec));
    }
  }
  return out;
}

// Lab leaf names that hold a secret under `vrf name <vrf>`.
const SECRET_LEAVES = new Set(["password", "plaintext-password", "md5", "md5-key", "secret"]);

describe("VRF secret op list", () => {
  const fields = allFields();

  it("names only ops a VRF schema field uses", () => {
    const ops = new Set(fields.map((f) => f.op));
    for (const op of SECRET_OPS) assert.ok(ops.has(op), op);
  });

  it("covers every schema field whose leaf is a secret", () => {
    const secret = fields.filter((f) => f.type === "text" && SECRET_LEAVES.has(f.path[f.path.length - 1]));
    assert.ok(secret.length >= SECRET_OPS.size);
    for (const f of secret) assert.ok(SECRET_OPS.has(f.op), f.op);
  });
});
