import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  challengeMethods,
  interpretSignInResult,
  parseTwoFactorQuery,
  totpSecretFromUri,
} from "./two-factor";

describe("interpretSignInResult", () => {
  it("returns the error message from a failed password", () => {
    assert.deepEqual(
      interpretSignInResult({ error: { message: "Invalid password" } }),
      { kind: "error", message: "Invalid password" },
    );
  });

  it("uses a fallback when the error has no message", () => {
    assert.deepEqual(interpretSignInResult({ error: {} }), {
      kind: "error",
      message: "Login failed",
    });
  });

  it("starts a 2FA challenge instead of a session", () => {
    assert.deepEqual(
      interpretSignInResult({
        data: { twoFactorRedirect: true, twoFactorMethods: ["totp", "otp"] },
      }),
      { kind: "twoFactor", methods: ["totp", "otp"] },
    );
  });

  it("does not treat a completed sign-in as a challenge", () => {
    assert.deepEqual(interpretSignInResult({ data: {} }), { kind: "session" });
  });
});

describe("challengeMethods", () => {
  it("offers TOTP and backup when the server lists totp", () => {
    assert.deepEqual(challengeMethods(["totp"]), ["totp", "backup"]);
  });

  it("offers email OTP only when the server listed it", () => {
    assert.deepEqual(challengeMethods(["totp", "otp"]), ["totp", "otp", "backup"]);
    assert.equal(challengeMethods(["totp"]).includes("otp"), false);
  });

  it("still offers TOTP when the method list is empty", () => {
    assert.deepEqual(challengeMethods([]), ["totp", "backup"]);
  });
});

describe("totpSecretFromUri", () => {
  it("reads the secret query from an otpauth URI", () => {
    const uri =
      "otpauth://totp/VyManager:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=VyManager";
    assert.equal(totpSecretFromUri(uri), "JBSWY3DPEHPK3PXP");
  });

  it("returns null for junk", () => {
    assert.equal(totpSecretFromUri("not a uri"), null);
  });
});

describe("parseTwoFactorQuery", () => {
  it("ignores a bare login URL", () => {
    assert.deepEqual(parseTwoFactorQuery(""), {
      challenge: false,
      methods: [],
    });
  });

  it("does not treat from as a 2FA challenge", () => {
    assert.deepEqual(parseTwoFactorQuery("?from=/sites"), {
      challenge: false,
      methods: [],
    });
  });

  it("reads twoFactor=1 and the method list", () => {
    assert.deepEqual(parseTwoFactorQuery("?twoFactor=1&methods=totp,otp"), {
      challenge: true,
      methods: ["totp", "otp"],
    });
  });
});
