import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_SELECT_VALUE,
  fromSelectValue,
  interfaceSelectOptions,
  toSelectValue,
} from "./interface-select-options";

const eth0 = { name: "eth0", type: "ethernet", description: "WAN" };
const eth1 = { name: "eth1", type: "ethernet", description: null };

describe("interfaceSelectOptions", () => {
  it("returns the list unchanged when the value is listed", () => {
    const list = [eth0, eth1];
    assert.equal(interfaceSelectOptions(list, "eth1", undefined), list);
  });

  it("returns the list unchanged for an empty value", () => {
    const list = [eth0];
    assert.equal(interfaceSelectOptions(list, "", undefined), list);
  });

  it("returns the list unchanged when the value is the none sentinel", () => {
    const list = [eth0];
    assert.equal(interfaceSelectOptions(list, "any", "any"), list);
  });

  it("keeps a configured value the list does not report", () => {
    assert.deepEqual(interfaceSelectOptions([eth0], "ifb0", undefined), [
      { name: "ifb0", type: "", description: null },
      eth0,
    ]);
  });

  it("keeps a configured value when the list fetch returned nothing", () => {
    assert.deepEqual(interfaceSelectOptions([], "eth3", ""), [
      { name: "eth3", type: "", description: null },
    ]);
  });
});

describe("select value mapping", () => {
  it("maps an empty value onto the sentinel only for an empty none option", () => {
    assert.equal(toSelectValue("", ""), EMPTY_SELECT_VALUE);
    assert.equal(toSelectValue("", undefined), "");
    assert.equal(toSelectValue("", "any"), "");
    assert.equal(toSelectValue("eth0", ""), "eth0");
  });

  it("maps the sentinel back to an empty value and leaves names alone", () => {
    assert.equal(fromSelectValue(EMPTY_SELECT_VALUE), "");
    assert.equal(fromSelectValue("eth0"), "eth0");
    assert.equal(fromSelectValue("any"), "any");
  });
});
