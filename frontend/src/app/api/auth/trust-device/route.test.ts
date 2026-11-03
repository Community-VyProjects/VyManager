import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { serializeSignedCookie } from "better-call";

// mock.module is only on the ESM test runner, not tsx's CJS loader:
// node --experimental-test-module-mocks --import tsx --test src/app/api/auth/trust-device/route.test.ts

const SECRET = "test-secret";
const TRUST_ID = "trust-device-abcDEF1234567890_-";
const deleted: string[] = [];
let authCalls = 0;
let deleteImpl: (identifier: string) => Promise<void> = async (identifier) => {
  deleted.push(identifier);
};

mock.module("@/lib/auth", {
  exports: {
    getAuth: async () => {
      authCalls += 1;
      return {
        $context: Promise.resolve({
          secret: SECRET,
          internalAdapter: {
            deleteVerificationByIdentifier: (identifier: string) => deleteImpl(identifier),
          },
        }),
      };
    },
  },
});

function cookieNamed(setCookies: string[], name: string): string {
  const match = setCookies.find((header) => header.startsWith(`${name}=`));
  assert.ok(match, `missing Set-Cookie for ${name}`);
  return match;
}

function assertExpired(setCookies: string[]) {
  const secure = cookieNamed(setCookies, "__Secure-better-auth.trust_device");
  assert.match(secure, /^__Secure-better-auth\.trust_device=;/);
  assert.match(secure, /(?:^|; )Path=\//);
  assert.match(secure, /(?:^|; )Max-Age=0(?:;|$)/);
  assert.match(secure, /(?:^|; )Secure(?:;|$)/);
  assert.match(secure, /(?:^|; )HttpOnly(?:;|$)/);
  assert.match(secure, /(?:^|; )SameSite=lax(?:;|$)/);

  const plain = cookieNamed(setCookies, "better-auth.trust_device");
  assert.match(plain, /^better-auth\.trust_device=;/);
  assert.equal(/\bSecure\b/.test(plain), false);
  assert.match(plain, /(?:^|; )Path=\//);
  assert.match(plain, /(?:^|; )Max-Age=0(?:;|$)/);
  assert.match(plain, /(?:^|; )HttpOnly(?:;|$)/);
  assert.match(plain, /(?:^|; )SameSite=lax(?:;|$)/);
}

async function signedCookie(name: string, payload: string, secret = SECRET): Promise<string> {
  const setCookie = await serializeSignedCookie(name, payload, secret, { path: "/" });
  return setCookie.split(";")[0];
}

function post(cookie: string | null): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request("https://vymanager.example/api/auth/trust-device", {
    method: "POST",
    headers,
  });
}

describe("POST /api/auth/trust-device", () => {
  it("expires both trust cookies with the attributes better-auth set", async () => {
    const { POST } = await import("./route");
    deleted.length = 0;
    authCalls = 0;
    const response = await POST(post(null));
    assert.equal(response.status, 200);
    assert.equal(authCalls, 0);
    assert.deepEqual(deleted, []);
    assertExpired(response.headers.getSetCookie());
  });

  it("deletes the verification row named by the signed trust cookie", async () => {
    const { POST } = await import("./route");
    deleted.length = 0;
    authCalls = 0;
    deleteImpl = async (identifier) => {
      deleted.push(identifier);
    };
    const cookie = await signedCookie(
      "__Secure-better-auth.trust_device",
      `hmac-token!${TRUST_ID}`,
    );
    const response = await POST(
      post(`better-auth.session_token=session.sig; ${cookie}`),
    );
    assert.equal(response.status, 200);
    assert.equal(authCalls, 1);
    assert.deepEqual(deleted, [TRUST_ID]);
    assertExpired(response.headers.getSetCookie());
  });

  it("does not delete a row for a forged trust cookie", async () => {
    const { POST } = await import("./route");
    deleted.length = 0;
    const forged = `__Secure-better-auth.trust_device=hmac-token!${TRUST_ID}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=`;
    const response = await POST(post(forged));
    assert.equal(response.status, 200);
    assert.deepEqual(deleted, []);
    assertExpired(response.headers.getSetCookie());
  });

  it("does not report success when the verification delete fails", async () => {
    const { POST } = await import("./route");
    deleted.length = 0;
    deleteImpl = async () => {
      throw new Error("database down");
    };
    const cookie = await signedCookie(
      "__Secure-better-auth.trust_device",
      `hmac-token!${TRUST_ID}`,
    );
    const response = await POST(post(cookie));
    assert.equal(response.status, 500);
    assertExpired(response.headers.getSetCookie());
    deleteImpl = async (identifier) => {
      deleted.push(identifier);
    };
  });
});
