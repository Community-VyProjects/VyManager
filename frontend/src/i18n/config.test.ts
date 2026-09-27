import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLocale, matchAcceptLanguage } from "./config";

describe("matchAcceptLanguage", () => {
  it("returns undefined for a missing or unsupported header", () => {
    assert.equal(matchAcceptLanguage(undefined), undefined);
    assert.equal(matchAcceptLanguage(""), undefined);
    assert.equal(matchAcceptLanguage("fr-FR,fr;q=0.9"), undefined);
    assert.equal(matchAcceptLanguage("*"), undefined);
  });

  it("matches exact tags case-insensitively", () => {
    assert.equal(matchAcceptLanguage("zh-cn"), "zh-CN");
    assert.equal(matchAcceptLanguage("EN"), "en");
  });

  it("falls back to the primary language subtag", () => {
    assert.equal(matchAcceptLanguage("zh"), "zh-CN");
    assert.equal(matchAcceptLanguage("zh-Hans-CN"), "zh-CN");
    assert.equal(matchAcceptLanguage("en-GB"), "en");
  });

  it("respects q-values and order", () => {
    assert.equal(matchAcceptLanguage("en;q=0.5,zh-CN;q=0.9"), "zh-CN");
    assert.equal(matchAcceptLanguage("fr-FR,zh-CN;q=0.8,en;q=0.7"), "zh-CN");
    assert.equal(matchAcceptLanguage("en-US,zh-CN"), "en");
    assert.equal(matchAcceptLanguage("zh-CN;q=0,en;q=0.1"), "en");
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    assert.equal(isLocale("zh-CN"), true);
    assert.equal(isLocale("zh-cn"), false);
    assert.equal(isLocale(undefined), false);
  });
});
