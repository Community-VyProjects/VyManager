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

  it("maps Simplified Chinese and English regions onto the one supported locale", () => {
    assert.equal(matchAcceptLanguage("zh"), "zh-CN");
    assert.equal(matchAcceptLanguage("zh-Hans"), "zh-CN");
    assert.equal(matchAcceptLanguage("zh-Hans-CN"), "zh-CN");
    assert.equal(matchAcceptLanguage("zh-SG"), "zh-CN");
    assert.equal(matchAcceptLanguage("en-GB"), "en");
  });

  it("does not treat Traditional Chinese as Simplified Chinese", () => {
    assert.equal(matchAcceptLanguage("zh-TW"), undefined);
    assert.equal(matchAcceptLanguage("zh-Hant"), undefined);
    assert.equal(matchAcceptLanguage("zh-HK"), undefined);
    assert.equal(matchAcceptLanguage("zh-TW,zh;q=0.8"), "zh-CN");
  });

  it("keeps scripts apart once both Chinese locales exist", () => {
    const supported = ["en", "zh-CN", "zh-TW"] as const;
    const families = [
      { locale: "zh-CN", language: "zh", script: "hans", regions: ["cn", "sg", "my"] },
      { locale: "zh-TW", language: "zh", script: "hant", regions: ["tw", "hk", "mo"] },
    ];
    assert.equal(matchAcceptLanguage("zh-TW", supported, families), "zh-TW");
    assert.equal(matchAcceptLanguage("zh-Hant", supported, families), "zh-TW");
    assert.equal(matchAcceptLanguage("zh-HK", supported, families), "zh-TW");
    assert.equal(matchAcceptLanguage("zh-Hans", supported, families), "zh-CN");
    assert.equal(matchAcceptLanguage("zh-SG", supported, families), "zh-CN");
    assert.equal(matchAcceptLanguage("zh", supported, families), undefined);
    assert.equal(matchAcceptLanguage("en-GB", supported, families), "en");
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
    assert.equal(isLocale("zh-TW"), false);
    assert.equal(isLocale(undefined), false);
  });
});
