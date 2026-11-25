import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COUNTRIES, filterCountries, localizeCountries } from "./countries";

describe("country names", () => {
  it("one list of unique ISO codes", () => {
    const codes = COUNTRIES.map((country) => country.code);
    assert.equal(new Set(codes).size, codes.length);
    assert.ok(codes.every((code) => /^[A-Z]{2}$/.test(code)));
  });

  it("names follow the locale", () => {
    const zh = localizeCountries("zh-CN");
    assert.equal(zh.find((c) => c.code === "DE")?.name, "德国");
    assert.equal(localizeCountries("en").find((c) => c.code === "DE")?.name, "Germany");
    assert.equal(zh.length, COUNTRIES.length);
  });

  it("falls back to the English name when Intl has none or echoes the code", () => {
    const list = [{ code: "XX", name: "Nowhere" }, { code: "DE", name: "Germany" }];
    assert.deepEqual(localizeCountries("zh-CN", list).map((c) => c.name), ["Nowhere", "德国"]);
    // An invalid locale tag makes Intl throw; the English names stay.
    assert.deepEqual(localizeCountries("not a locale!!", list), list);
  });

  it("search matches the localized name or the code", () => {
    const zh = localizeCountries("zh-CN");
    assert.deepEqual(filterCountries(zh, "德国").map((c) => c.code), ["DE"]);
    assert.ok(filterCountries(zh, "de").some((c) => c.code === "DE"));
    assert.equal(filterCountries(zh, "  ").length, zh.length);
    assert.ok(filterCountries(localizeCountries("en"), "germ").some((c) => c.code === "DE"));
  });
});
