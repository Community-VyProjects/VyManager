import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAuthDomainOps } from "./dns-forwarding-auth-ops";
import type { AuthDomainRecords } from "./dns-forwarding";

function emptyRecords(): AuthDomainRecords {
  return { a: [], aaaa: [], cname: [], mx: [], txt: [], ns: [], ptr: [], naptr: [], spf: [], srv: [] };
}

describe("buildAuthDomainOps", () => {
  it("emits set_auth_naptr_rule when a rule has no child leaves", () => {
    const records = emptyRecords();
    records.naptr = [{
      hostname: "www",
      rules: [{
        rule: "10",
        lookup_a: false,
        lookup_srv: false,
        protocol_specific: false,
        resolve_uri: false,
      }],
      disabled: false,
    }];
    const ops = buildAuthDomainOps("example.com", false, records);
    assert.deepEqual(
      ops.filter((op) => op.op.startsWith("set_auth_naptr")),
      [{ op: "set_auth_naptr_rule", value: "example.com,www,10" }],
    );
  });

  it("emits set_auth_srv_entry when an entry has no child leaves", () => {
    const records = emptyRecords();
    records.srv = [{
      hostname: "_sip._tcp",
      entries: [{ entry: "10" }],
      disabled: false,
    }];
    const ops = buildAuthDomainOps("example.com", false, records);
    assert.deepEqual(
      ops.filter((op) => op.op.startsWith("set_auth_srv")),
      [{ op: "set_auth_srv_entry", value: "example.com,_sip._tcp,10" }],
    );
  });
});
