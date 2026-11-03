import assert from "node:assert/strict";
import { describe, it } from "node:test";

function cookieNamed(setCookies: string[], name: string): string {
  const match = setCookies.find((header) => header.startsWith(`${name}=`));
  assert.ok(match, `missing Set-Cookie for ${name}`);
  return match;
}

describe("POST /api/auth/trust-device", () => {
  it("expires the secure trust cookie with the attributes better-auth set", async () => {
    const { POST } = await import("./route");
    const response = await POST();
    assert.equal(response.status, 200);
    const secure = cookieNamed(
      response.headers.getSetCookie(),
      "__Secure-better-auth.trust_device",
    );
    assert.match(secure, /^__Secure-better-auth\.trust_device=;/);
    assert.match(secure, /(?:^|; )Path=\//);
    assert.match(secure, /(?:^|; )Max-Age=0(?:;|$)/);
    assert.match(secure, /(?:^|; )Secure(?:;|$)/);
    assert.match(secure, /(?:^|; )HttpOnly(?:;|$)/);
    assert.match(secure, /(?:^|; )SameSite=lax(?:;|$)/);
  });

  it("expires the plain trust cookie without Secure so HTTP deletion still matches", async () => {
    const { POST } = await import("./route");
    const response = await POST();
    const plain = cookieNamed(
      response.headers.getSetCookie(),
      "better-auth.trust_device",
    );
    assert.match(plain, /^better-auth\.trust_device=;/);
    assert.equal(/\bSecure\b/.test(plain), false);
    assert.match(plain, /(?:^|; )Path=\//);
    assert.match(plain, /(?:^|; )Max-Age=0(?:;|$)/);
    assert.match(plain, /(?:^|; )HttpOnly(?:;|$)/);
    assert.match(plain, /(?:^|; )SameSite=lax(?:;|$)/);
  });
});
